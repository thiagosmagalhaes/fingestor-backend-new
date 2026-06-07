import { Request, Response } from 'express';
import { getSupabaseClient } from '../config/database';
import { AuthRequest } from '../middleware/auth';
import hrService from '../services/hr.service';
import {
    CreateColaboradorRequest,
    UpdateColaboradorRequest,
    HrContractType,
    HrEmployeeStatus,
} from '../types/hr.types';

const VALID_CONTRACT_TYPES: HrContractType[] = ['CLT', 'PJ', 'intern'];
const VALID_STATUSES: HrEmployeeStatus[] = ['active', 'inactive', 'on_leave'];

export class HrEmployeesController {
    private resolveCompanyId(req: Request, fallbackCompanyId?: string): string | undefined {
        const bodyCompanyId = (req.body as { companyId?: string } | undefined)?.companyId;
        const queryCompanyId = (req.query as { companyId?: string } | undefined)?.companyId;
        return bodyCompanyId || queryCompanyId || fallbackCompanyId;
    }

    private normalizeDateInput(value?: string): string | undefined {
        if (value === undefined || value === null) {
            return undefined;
        }

        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : undefined;
    }

    /**
     * GET /api/hr/employees?companyId=xxx&status=active&search=xxx
     */
    async list(req: Request, res: Response): Promise<Response | void> {
        try {
            const authReq = req as AuthRequest;
            const { companyId, status, search } = req.query;

            if (!companyId || typeof companyId !== 'string') {
                return res.status(400).json({ error: 'companyId is required' });
            }

            const supabase = getSupabaseClient(authReq.accessToken!);
            const resolvedCompanyId = this.resolveCompanyId(req, companyId as string | undefined);
            if (!resolvedCompanyId) {
                return res.status(400).json({ error: 'companyId is required' });
            }

            await hrService.ensureCompanyAccessProfile(authReq.user!.id, resolvedCompanyId);
            const data = await hrService.listColaboradores(
                supabase,
                resolvedCompanyId,
                typeof status === 'string' ? status : undefined,
                typeof search === 'string' ? search : undefined,
            );
            return res.json(data);
        } catch (error: any) {
            console.error('Error in HrEmployeesController.list:', error);
            return res.status(500).json({ error: 'Failed to list employees', message: error.message });
        }
    }

    /**
     * GET /api/hr/employees/:id?companyId=xxx
     */
    async getById(req: Request, res: Response): Promise<Response | void> {
        try {
            const authReq = req as AuthRequest;
            const { id } = req.params;
            const { companyId } = req.query;

            if (!companyId || typeof companyId !== 'string') {
                return res.status(400).json({ error: 'companyId is required' });
            }

            const supabase = getSupabaseClient(authReq.accessToken!);
            await hrService.ensureCompanyAccessProfile(authReq.user!.id, companyId);
            const data = await hrService.getColaboradorById(supabase, id, companyId);

            if (!data) {
                return res.status(404).json({ error: 'Employee not found' });
            }
            return res.json(data);
        } catch (error: any) {
            console.error('Error in HrEmployeesController.getById:', error);
            return res.status(500).json({ error: 'Failed to get employee', message: error.message });
        }
    }

    /**
     * POST /api/hr/employees
     */
    async create(req: Request, res: Response): Promise<Response | void> {
        try {
            const authReq = req as AuthRequest;
            const body = req.body as CreateColaboradorRequest;

            if (!body.companyId) {
                return res.status(400).json({ error: 'companyId is required' });
            }
            if (!body.nomeCompleto || body.nomeCompleto.trim().length === 0) {
                return res.status(400).json({ error: 'nomeCompleto is required' });
            }
            if (!body.cpf) {
                return res.status(400).json({ error: 'cpf is required' });
            }
            if (body.tipoContrato && !VALID_CONTRACT_TYPES.includes(body.tipoContrato)) {
                return res.status(400).json({ error: `tipoContrato must be one of: ${VALID_CONTRACT_TYPES.join(', ')}` });
            }

            const supabase = getSupabaseClient(authReq.accessToken!);
            await hrService.ensureCompanyAccessProfile(authReq.user!.id, body.companyId);

            const data = await hrService.createColaborador(supabase, body.companyId, {
                nomeCompleto: body.nomeCompleto,
                cpf: body.cpf,
                email: body.email,
                cargo: body.cargo,
                departamento: body.departamento,
                dataAdmissao: this.normalizeDateInput(body.dataAdmissao),
                salarioBase: body.salarioBase,
                tipoContrato: body.tipoContrato,
                banco: body.banco,
                agencia: body.agencia,
                conta: body.conta,
                chavePix: body.chavePix,
            });

            return res.status(201).json(data);
        } catch (error: any) {
            const status = error.statusCode ?? 500;
            console.error('Error in HrEmployeesController.create:', error);
            return res.status(status).json({ error: error.message });
        }
    }

    /**
     * PUT /api/hr/employees/:id
     */
    async update(req: Request, res: Response): Promise<Response | void> {
        try {
            const authReq = req as AuthRequest;
            const { id } = req.params;
            const body = req.body as UpdateColaboradorRequest & { companyId: string };

            if (!body.companyId) {
                return res.status(400).json({ error: 'companyId is required' });
            }

            if (body.tipoContrato && !VALID_CONTRACT_TYPES.includes(body.tipoContrato)) {
                return res.status(400).json({ error: `tipoContrato must be one of: ${VALID_CONTRACT_TYPES.join(', ')}` });
            }
            if (body.status && !VALID_STATUSES.includes(body.status)) {
                return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
            }

            const supabase = getSupabaseClient(authReq.accessToken!);
            await hrService.ensureCompanyAccessProfile(authReq.user!.id, body.companyId);
            const data = await hrService.updateColaborador(supabase, id, body.companyId, {
                ...body,
                dataAdmissao: this.normalizeDateInput(body.dataAdmissao),
                dataDemissao: this.normalizeDateInput(body.dataDemissao),
            });

            return res.json(data);
        } catch (error: any) {
            const status = error.statusCode ?? 500;
            console.error('Error in HrEmployeesController.update:', error);
            return res.status(status).json({ error: error.message });
        }
    }

    /**
     * POST /api/hr/employees/:id/deactivate
     */
    async deactivate(req: Request, res: Response): Promise<Response | void> {
        try {
            const authReq = req as AuthRequest;
            const { id } = req.params;
            const { companyId, dataDemissao } = req.body;

            if (!companyId) {
                return res.status(400).json({ error: 'companyId is required' });
            }

            const supabase = getSupabaseClient(authReq.accessToken!);
            await hrService.ensureCompanyAccessProfile(authReq.user!.id, companyId);
            const data = await hrService.deactivateColaborador(supabase, id, companyId, this.normalizeDateInput(dataDemissao));

            return res.json(data);
        } catch (error: any) {
            console.error('Error in HrEmployeesController.deactivate:', error);
            return res.status(500).json({ error: 'Failed to deactivate employee', message: error.message });
        }
    }

    /**
     * POST /api/hr/employees/:id/invite
     * Links an existing auth.users record to an employee for portal access.
     */
    async invite(req: Request, res: Response): Promise<Response | void> {
        try {
            const authReq = req as AuthRequest;
            const { id } = req.params;
            const { companyId, authUserId } = req.body;

            if (!companyId) {
                return res.status(400).json({ error: 'companyId is required' });
            }
            if (!authUserId) {
                return res.status(400).json({ error: 'authUserId is required' });
            }

            const supabase = getSupabaseClient(authReq.accessToken!);
            await hrService.ensureCompanyAccessProfile(authReq.user!.id, companyId);
            const data = await hrService.inviteColaborador(supabase, id, companyId, authUserId);

            return res.json(data);
        } catch (error: any) {
            console.error('Error in HrEmployeesController.invite:', error);
            return res.status(500).json({ error: 'Failed to invite employee', message: error.message });
        }
    }

    /**
     * POST /api/hr/employees/:id/portal-access
     * Creates a new auth user with email/password and links it to a colaborador.
     */
    async createPortalAccess(req: Request, res: Response): Promise<Response | void> {
        try {
            const authReq = req as AuthRequest;
            const { id } = req.params;
            const { companyId, email, password } = req.body;

            if (!companyId) {
                return res.status(400).json({ error: 'companyId is required' });
            }
            if (!email || email.trim().length === 0) {
                return res.status(400).json({ error: 'email is required' });
            }
            if (!password || password.length === 0) {
                return res.status(400).json({ error: 'password is required' });
            }

            await hrService.ensureCompanyAccessProfile(authReq.user!.id, companyId);
            const data = await hrService.createPortalAccess(id, companyId, email.trim(), password);

            return res.json(data);
        } catch (error: any) {
            const status = error.statusCode ?? 500;
            console.error('Error in HrEmployeesController.createPortalAccess:', error);
            return res.status(status).json({ error: error.message });
        }
    }
}

export const hrEmployeesController = new HrEmployeesController();
