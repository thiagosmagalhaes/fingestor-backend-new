import { Request, Response } from 'express';
import supabase, { getSupabaseClient, supabaseAdmin } from '../config/database';
import { AuthRequest } from '../middleware/auth';
import hrService, { competenciaToDate } from '../services/hr.service';

function toHttpStatus(statusCode: unknown, fallback = 500): number {
    if (typeof statusCode === 'number' && Number.isInteger(statusCode)) {
        return statusCode;
    }

    if (typeof statusCode === 'string') {
        const parsed = Number.parseInt(statusCode, 10);
        if (Number.isInteger(parsed)) {
            return parsed;
        }
    }

    return fallback;
}

// ─── Payroll Batches Controller ─────────────────────────────

export class HrPayrollController {
    /**
     * GET /api/hr/payroll/batches?companyId=xxx
     */
    async listBatches(req: Request, res: Response): Promise<Response | void> {
        try {
            const authReq = req as AuthRequest;
            const { companyId } = req.query;

            if (!companyId || typeof companyId !== 'string') {
                return res.status(400).json({ error: 'companyId is required' });
            }

            const supabase = getSupabaseClient(authReq.accessToken!);
            await hrService.ensureCompanyAccessProfile(authReq.user!.id, companyId);
            const data = await hrService.listBatches(supabase, companyId);
            return res.json(data);
        } catch (error: any) {
            console.error('Error in HrPayrollController.listBatches:', error);
            return res.status(500).json({ error: 'Failed to list payroll batches', message: error.message });
        }
    }

    /**
     * GET /api/hr/payroll/batches/:id?companyId=xxx
     */
    async getBatch(req: Request, res: Response): Promise<Response | void> {
        try {
            const authReq = req as AuthRequest;
            const { id } = req.params;
            const { companyId } = req.query;

            if (!companyId || typeof companyId !== 'string') {
                return res.status(400).json({ error: 'companyId is required' });
            }

            const supabase = getSupabaseClient(authReq.accessToken!);
            await hrService.ensureCompanyAccessProfile(authReq.user!.id, companyId);
            const data = await hrService.getBatchById(supabase, id, companyId);

            if (!data) {
                return res.status(404).json({ error: 'Payroll batch not found' });
            }
            return res.json(data);
        } catch (error: any) {
            console.error('Error in HrPayrollController.getBatch:', error);
            return res.status(500).json({ error: 'Failed to get payroll batch', message: error.message });
        }
    }

    /**
     * POST /api/hr/payroll/batches/upload
     * Accepts multipart/form-data with a "pdf" file field.
    * Fields: companyId, competencia (YYYY-MM)
     *
     * Processing is done synchronously in this endpoint for simplicity.
     * For large PDFs, consider delegating to a background job.
     */
    async uploadBatch(req: Request, res: Response): Promise<Response | void> {
        try {
            const authReq = req as AuthRequest;
            const { companyId, competencia } = req.body;

            if (!companyId) {
                return res.status(400).json({ error: 'companyId is required' });
            }

            if (!competencia || !/^\d{4}-\d{2}$/.test(competencia)) {
                return res.status(400).json({ error: 'competencia must be in YYYY-MM format' });
            }
            if (!req.file) {
                return res.status(400).json({ error: 'pdf file is required' });
            }
            if (req.file.mimetype !== 'application/pdf') {
                return res.status(400).json({ error: 'Uploaded file must be a PDF' });
            }

            const supabase = getSupabaseClient(authReq.accessToken!);
            await hrService.ensureCompanyAccessProfile(authReq.user!.id, companyId);
            const pdfBuffer = req.file.buffer;
            const competenciaDate = competenciaToDate(competencia);
            const originalPath = `${companyId}/${competenciaDate}/_original.pdf`;

            // Upload original PDF to Storage
            const { error: storageError } = await supabase.storage
                .from('holerites')
                .upload(originalPath, pdfBuffer, { contentType: 'application/pdf', upsert: false });

            if (storageError) {
                if (storageError.message?.includes('already exists')) {
                    return res.status(409).json({
                        error: `Já existe uma folha de pagamento para a competência ${competencia} nesta empresa`,
                    });
                }
                throw storageError;
            }

            // Create batch record
            const batch = await hrService.createBatch(
                supabase,
                companyId,
                competencia,
                originalPath,
                authReq.user!.id,
            );

            // Process PDF asynchronously (split + CPF extraction + holerites creation)
            // We kick it off and return immediately so the client can poll batch status
            hrService
                .processBatchPdf(supabase, companyId, batch.id, competencia, pdfBuffer)
                .catch((err: Error) => {
                    console.error(`Error processing batch ${batch.id}:`, err);
                });

            return res.status(202).json({
                message: 'Payroll batch accepted for processing. Poll the batch status endpoint.',
                batchId: batch.id,
                competencia,
                status: 'PROCESSING',
            });
        } catch (error: any) {
            const status = toHttpStatus(error.statusCode, 500);
            console.error('Error in HrPayrollController.uploadBatch:', error);
            return res.status(status).json({ error: error.message });
        }
    }

    /**
     * GET /api/hr/payroll/batches/:id/payslips?companyId=xxx
     * Lists all payslips within a batch for review (manager only).
     */
    async listBatchPayslips(req: Request, res: Response): Promise<Response | void> {
        try {
            const authReq = req as AuthRequest;
            const { id } = req.params;
            const { companyId } = req.query;

            if (!companyId || typeof companyId !== 'string') {
                return res.status(400).json({ error: 'companyId is required' });
            }

            const supabase = getSupabaseClient(authReq.accessToken!);
            await hrService.ensureCompanyAccessProfile(authReq.user!.id, companyId);
            const payslips = await hrService.listBatchPayslips(supabase, id, companyId);

            // Generate a signed URL for each payslip's PDF preview
            const result = await Promise.all(
                payslips.map(async (p: any) => {
                    let signedUrl: string | null = null;
                    try {
                        const { data } = await supabase.storage
                            .from('holerites')
                            .createSignedUrl(p.arquivo_pdf, 300);
                        signedUrl = data?.signedUrl ?? null;
                    } catch {
                        // non-fatal
                    }
                    return { ...p, signed_url: signedUrl };
                }),
            );

            return res.json(result);
        } catch (error: any) {
            console.error('Error in HrPayrollController.listBatchPayslips:', error);
            return res.status(500).json({ error: 'Failed to list batch payslips', message: error.message });
        }
    }

    /**
     * PATCH /api/hr/payroll/payslips/:id/assign
     * Assigns (or re-assigns) a payslip page to an employee.
     */
    async assignPayslip(req: Request, res: Response): Promise<Response | void> {
        try {
            const authReq = req as AuthRequest;
            const { id } = req.params;
            const { companyId, colaboradorId } = req.body;

            if (!companyId) {
                return res.status(400).json({ error: 'companyId is required' });
            }
            if (!colaboradorId) {
                return res.status(400).json({ error: 'colaboradorId is required' });
            }

            const supabase = getSupabaseClient(authReq.accessToken!);
            await hrService.ensureCompanyAccessProfile(authReq.user!.id, companyId);
            const data = await hrService.assignPayslip(supabase, id, companyId, colaboradorId);
            return res.json(data);
        } catch (error: any) {
            const status = toHttpStatus(error.statusCode, 500);
            console.error('Error in HrPayrollController.assignPayslip:', error);
            return res.status(status).json({ error: error.message });
        }
    }

    /**
     * POST /api/hr/payroll/batches/:id/confirm
     * Marks all pending payslips as CONFIRMED and the batch as COMPLETED.
     */
    async confirmBatch(req: Request, res: Response): Promise<Response | void> {
        try {
            const authReq = req as AuthRequest;
            const { id } = req.params;
            const { companyId } = req.body;

            if (!companyId) {
                return res.status(400).json({ error: 'companyId is required' });
            }

            const supabase = getSupabaseClient(authReq.accessToken!);
            await hrService.ensureCompanyAccessProfile(authReq.user!.id, companyId);
            const result = await hrService.confirmBatch(supabase, id, companyId);
            return res.json({ message: 'Batch confirmed successfully', ...result });
        } catch (error: any) {
            const status = toHttpStatus(error.statusCode, 500);
            console.error('Error in HrPayrollController.confirmBatch:', error);
            return res.status(status).json({ error: error.message });
        }
    }

    /**
     * GET /api/hr/payroll/payslips/:id/url?companyId=xxx
     * Generates a short-lived signed URL for a payslip PDF (manager access).
     */
    async getPayslipUrl(req: Request, res: Response): Promise<Response | void> {
        try {
            const authReq = req as AuthRequest;
            const { id } = req.params;
            const { companyId } = req.query;

            if (!companyId || typeof companyId !== 'string') {
                return res.status(400).json({ error: 'companyId is required' });
            }

            const supabase = getSupabaseClient(authReq.accessToken!);
            await hrService.ensureCompanyAccessProfile(authReq.user!.id, companyId);
            const signedUrl = await hrService.getPayslipSignedUrl(supabase, id, companyId);
            return res.json({ signedUrl });
        } catch (error: any) {
            const status = toHttpStatus(error.statusCode, 500);
            console.error('Error in HrPayrollController.getPayslipUrl:', error);
            return res.status(status).json({ error: error.message });
        }
    }
}

// ─── Employee Portal Controller ─────────────────────────────

export class HrPortalController {
    /**
     * POST /api/hr/payroll/portal/login
     * Authenticates an employee portal user and validates EMPLOYEE access scope.
     */
    async login(req: Request, res: Response): Promise<Response | void> {
        try {
            const { email, password } = req.body as {
                email?: string;
                password?: string;
            };

            if (!email || !password) {
                return res.status(400).json({ error: 'email and password are required' });
            }

            const { data, error } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password,
            });

            if (error) {
                if (error.message.includes('Invalid login credentials')) {
                    return res.status(401).json({ error: 'Email ou senha inválidos' });
                }
                if (error.message.includes('Email not confirmed')) {
                    return res.status(401).json({ error: 'Email não confirmado. Verifique sua caixa de entrada.' });
                }
                return res.status(401).json({ error: error.message || 'Erro ao realizar login' });
            }

            const userId = data.user?.id;
            if (!userId) {
                return res.status(401).json({ error: 'Falha ao autenticar usuário' });
            }

            const companyId = await hrService.resolveEmployeeCompanyId(userId);

            const { data: accessProfile, error: accessError } = await supabaseAdmin
                .from('perfis_acesso')
                .select('papel')
                .eq('auth_user_id', userId)
                .eq('empresa_id', companyId)
                .maybeSingle();

            if (accessError) throw accessError;
            if (!accessProfile || accessProfile.papel !== 'EMPLOYEE') {
                return res.status(403).json({ error: 'Usuário sem permissão de colaborador para esta empresa' });
            }

            const { data: colaborador, error: colaboradorError } = await supabaseAdmin
                .from('colaboradores')
                .select('id, empresa_id, nome_completo, email, status')
                .eq('auth_user_id', userId)
                .eq('empresa_id', companyId)
                .maybeSingle();

            if (colaboradorError) throw colaboradorError;
            if (!colaborador) {
                return res.status(403).json({ error: 'Usuário não está vinculado a um colaborador nesta empresa' });
            }

            return res.json({
                user: {
                    id: data.user?.id,
                    email: data.user?.email,
                },
                employee: colaborador,
                session: {
                    accessToken: data.session?.access_token,
                    refreshToken: data.session?.refresh_token,
                    expiresIn: data.session?.expires_in,
                    expiresAt: data.session?.expires_at,
                },
            });
        } catch (error: any) {
            const status = toHttpStatus(error.statusCode, 500);
            console.error('Error in HrPortalController.login:', error);
            return res.status(status).json({ error: error.message });
        }
    }

    /**
     * GET /api/hr/portal/payslips
     * Returns the authenticated employee's confirmed payslips.
     */
    async listMyPayslips(req: Request, res: Response): Promise<Response | void> {
        try {
            const authReq = req as AuthRequest;
            const authUserId = authReq.user!.id;

            const supabase = getSupabaseClient(authReq.accessToken!);
            const data = await hrService.getMyPayslips(supabase, authUserId);
            return res.json(data);
        } catch (error: any) {
            const status = toHttpStatus(error.statusCode, 500);
            console.error('Error in HrPortalController.listMyPayslips:', error);
            return res.status(status).json({ error: error.message });
        }
    }

    /**
     * GET /api/hr/portal/payslips/monthly
     * Returns the authenticated employee's confirmed payslips grouped by month.
     */
    async listMyPayslipsMonthly(req: Request, res: Response): Promise<Response | void> {
        try {
            const authReq = req as AuthRequest;
            const authUserId = authReq.user!.id;

            const supabase = getSupabaseClient(authReq.accessToken!);
            const data = await hrService.getMyPayslipsMonthly(supabase, authUserId);
            return res.json(data);
        } catch (error: any) {
            const status = toHttpStatus(error.statusCode, 500);
            console.error('Error in HrPortalController.listMyPayslipsMonthly:', error);
            return res.status(status).json({ error: error.message });
        }
    }

    /**
     * GET /api/hr/portal/payslips/:id/url
     * Returns a short-lived signed URL for the employee's own payslip.
     */
    async getMyPayslipUrl(req: Request, res: Response): Promise<Response | void> {
        try {
            const authReq = req as AuthRequest;
            const { id } = req.params;
            const authUserId = authReq.user!.id;

            const supabase = getSupabaseClient(authReq.accessToken!);
            const signedUrl = await hrService.getMyPayslipSignedUrl(supabase, id, authUserId);
            return res.json({ signedUrl });
        } catch (error: any) {
            const status = toHttpStatus(error.statusCode, 500);
            console.error('Error in HrPortalController.getMyPayslipUrl:', error);
            return res.status(status).json({ error: error.message });
        }
    }
}

export const hrPayrollController = new HrPayrollController();
export const hrPortalController = new HrPortalController();
