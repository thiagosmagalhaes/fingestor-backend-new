import { SupabaseClient } from '@supabase/supabase-js';
import { PDFDocument } from 'pdf-lib';
import { supabaseAdmin } from '../config/database';
import { HrContractType, HrEmployeeStatus } from '../types/hr.types';

// ─── CPF Utilities ──────────────────────────────────────────

/** Strip all non-digit characters from a CPF string. */
function normalizeCpf(raw: string): string {
    return raw.replace(/\D/g, '');
}

function normalizeOptionalDate(raw?: string): string | null {
    if (raw === undefined || raw === null) {
        return null;
    }

    const trimmed = raw.trim();
    return trimmed.length > 0 ? trimmed : null;
}

/** Validate CPF check digits (Brazilian algorithm). */
export function validateCpf(cpf: string): boolean {
    const digits = normalizeCpf(cpf);
    if (digits.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(digits)) return false; // all same digits

    let sum = 0;
    for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i);
    let rem = (sum * 10) % 11;
    if (rem === 10 || rem === 11) rem = 0;
    if (rem !== parseInt(digits[9])) return false;

    sum = 0;
    for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * (11 - i);
    rem = (sum * 10) % 11;
    if (rem === 10 || rem === 11) rem = 0;
    return rem === parseInt(digits[10]);
}


/** Convert competencia "YYYY-MM" to "YYYY-MM-01" (first day of month). */
export function competenciaToDate(competencia: string): string {
    const [year, month] = competencia.split('-');
    return `${year}-${month.padStart(2, '0')}-01`;
}

// ─── HR Service ─────────────────────────────────────────────

export class HrService {

    async resolveManagerCompanyId(authUserId: string): Promise<string> {
        const companyIds = new Set<string>();

        const { data: ownedCompanies, error: ownedCompaniesError } = await supabaseAdmin
            .from('companies')
            .select('id')
            .eq('user_id', authUserId);

        if (ownedCompaniesError) {
            throw ownedCompaniesError;
        }

        (ownedCompanies ?? []).forEach((c) => companyIds.add(c.id));

        const { data: accessProfiles, error: accessProfilesError } = await supabaseAdmin
            .from('perfis_acesso')
            .select('empresa_id, papel')
            .eq('auth_user_id', authUserId)
            .in('papel', ['ADMIN', 'MANAGER']);

        if (accessProfilesError) {
            throw accessProfilesError;
        }

        (accessProfiles ?? []).forEach((p) => companyIds.add(p.empresa_id));

        const resolved = Array.from(companyIds);

        if (resolved.length === 0) {
            throw Object.assign(
                new Error('Usuário não tem permissão de gestor em nenhuma empresa'),
                { statusCode: 403 },
            );
        }

        if (resolved.length > 1) {
            throw Object.assign(
                new Error('Usuário possui acesso a múltiplas empresas e não foi possível determinar uma empresa única automaticamente'),
                { statusCode: 409 },
            );
        }

        return resolved[0];
    }

    async resolveEmployeeCompanyId(authUserId: string): Promise<string> {
        const companyIds = new Set<string>();

        const { data: employeeProfiles, error: employeeProfilesError } = await supabaseAdmin
            .from('perfis_acesso')
            .select('empresa_id')
            .eq('auth_user_id', authUserId)
            .eq('papel', 'EMPLOYEE');

        if (employeeProfilesError) {
            throw employeeProfilesError;
        }

        (employeeProfiles ?? []).forEach((p) => companyIds.add(p.empresa_id));

        // Backward compatibility when perfis_acesso is missing.
        if (companyIds.size === 0) {
            const { data: colaboradores, error: colaboradoresError } = await supabaseAdmin
                .from('colaboradores')
                .select('empresa_id')
                .eq('auth_user_id', authUserId);

            if (colaboradoresError) {
                throw colaboradoresError;
            }

            (colaboradores ?? []).forEach((c) => companyIds.add(c.empresa_id));
        }

        const resolved = Array.from(companyIds);

        if (resolved.length === 0) {
            throw Object.assign(
                new Error('Usuário colaborador não está vinculado a nenhuma empresa'),
                { statusCode: 403 },
            );
        }

        if (resolved.length > 1) {
            throw Object.assign(
                new Error('Usuário colaborador está vinculado a múltiplas empresas e não foi possível determinar uma empresa única automaticamente'),
                { statusCode: 409 },
            );
        }

        return resolved[0];
    }

    async ensureCompanyAccessProfile(authUserId: string, companyId: string): Promise<void> {
        const { data: company, error: companyError } = await supabaseAdmin
            .from('companies')
            .select('id, user_id')
            .eq('id', companyId)
            .maybeSingle();

        if (companyError) {
            throw companyError;
        }

        if (!company) {
            throw Object.assign(new Error('Empresa não encontrada'), { statusCode: 404 });
        }

        if (company.user_id !== authUserId) {
            const { data: existingProfile, error: profileError } = await supabaseAdmin
                .from('perfis_acesso')
                .select('id, papel')
                .eq('auth_user_id', authUserId)
                .eq('empresa_id', companyId)
                .maybeSingle();

            if (profileError) {
                throw profileError;
            }

            if (!existingProfile) {
                throw Object.assign(new Error('Usuário não tem permissão para acessar esta empresa'), { statusCode: 403 });
            }

            return;
        }

        const { error: upsertError } = await supabaseAdmin
            .from('perfis_acesso')
            .upsert(
                {
                    auth_user_id: authUserId,
                    empresa_id: companyId,
                    papel: 'ADMIN',
                },
                { onConflict: 'auth_user_id,empresa_id' },
            );

        if (upsertError) {
            throw upsertError;
        }
    }

    // ── Employee (Colaborador) operations ───────────────────────

    async listColaboradores(
        supabase: SupabaseClient,
        companyId: string,
        status?: string,
        search?: string,
    ) {
        let query = supabase
            .from('colaboradores')
            .select('*')
            .eq('empresa_id', companyId)
            .order('nome_completo', { ascending: true });

        if (status) {
            query = query.eq('status', status);
        }

        if (search && search.trim().length > 0) {
            const s = search.trim();
            query = query.or(`nome_completo.ilike.%${s}%,cpf.ilike.%${s}%`);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data ?? [];
    }

    async getColaboradorById(supabase: SupabaseClient, id: string, companyId: string) {
        const { data, error } = await supabase
            .from('colaboradores')
            .select('*')
            .eq('id', id)
            .eq('empresa_id', companyId)
            .maybeSingle();
        if (error) throw error;
        return data;
    }

    async createColaborador(
        supabase: SupabaseClient,
        companyId: string,
        payload: {
            nomeCompleto: string;
            cpf?: string;
            email?: string;
            cargo?: string;
            departamento?: string;
            dataAdmissao?: string;
            salarioBase?: number;
            tipoContrato?: HrContractType;
            banco?: string;
            agencia?: string;
            conta?: string;
            chavePix?: string;
        },
    ) {
        const cpf = payload.cpf?.trim() ? normalizeCpf(payload.cpf) : null;
        if (cpf !== null && !validateCpf(cpf)) {
            throw Object.assign(new Error('CPF inválido'), { statusCode: 400 });
        }

        const { data, error } = await supabase
            .from('colaboradores')
            .insert({
                empresa_id: companyId,
                nome_completo: payload.nomeCompleto.trim(),
                cpf,
                email: payload.email?.trim() ?? null,
                cargo: payload.cargo?.trim() ?? null,
                departamento: payload.departamento?.trim() ?? null,
                data_admissao: normalizeOptionalDate(payload.dataAdmissao),
                salario_base: payload.salarioBase ?? null,
                tipo_contrato: payload.tipoContrato ?? 'CLT',
                banco: payload.banco?.trim() ?? null,
                agencia: payload.agencia?.trim() ?? null,
                conta: payload.conta?.trim() ?? null,
                chave_pix: payload.chavePix?.trim() ?? null,
            })
            .select()
            .single();

        if (error) {
            if (error.code === '23505') {
                throw Object.assign(new Error('Já existe um colaborador com este CPF nesta empresa'), { statusCode: 409 });
            }
            throw error;
        }
        return data;
    }

    async updateColaborador(
        supabase: SupabaseClient,
        id: string,
        companyId: string,
        updates: {
            nomeCompleto?: string;
            email?: string;
            cargo?: string;
            departamento?: string;
            dataAdmissao?: string;
            dataDemissao?: string;
            salarioBase?: number;
            tipoContrato?: HrContractType;
            status?: HrEmployeeStatus;
            banco?: string;
            agencia?: string;
            conta?: string;
            chavePix?: string;
        },
    ) {
        const patch: Record<string, unknown> = {};
        if (updates.nomeCompleto !== undefined) patch.nome_completo = updates.nomeCompleto.trim();
        if (updates.email !== undefined) patch.email = updates.email?.trim() ?? null;
        if (updates.cargo !== undefined) patch.cargo = updates.cargo?.trim() ?? null;
        if (updates.departamento !== undefined) patch.departamento = updates.departamento?.trim() ?? null;
        if (updates.dataAdmissao !== undefined) patch.data_admissao = normalizeOptionalDate(updates.dataAdmissao);
        if (updates.dataDemissao !== undefined) patch.data_demissao = normalizeOptionalDate(updates.dataDemissao);
        if (updates.salarioBase !== undefined) patch.salario_base = updates.salarioBase;
        if (updates.tipoContrato !== undefined) patch.tipo_contrato = updates.tipoContrato;
        if (updates.status !== undefined) patch.status = updates.status;
        if (updates.banco !== undefined) patch.banco = updates.banco?.trim() ?? null;
        if (updates.agencia !== undefined) patch.agencia = updates.agencia?.trim() ?? null;
        if (updates.conta !== undefined) patch.conta = updates.conta?.trim() ?? null;
        if (updates.chavePix !== undefined) patch.chave_pix = updates.chavePix?.trim() ?? null;

        const { data, error } = await supabase
            .from('colaboradores')
            .update(patch)
            .eq('id', id)
            .eq('empresa_id', companyId)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async deactivateColaborador(supabase: SupabaseClient, id: string, companyId: string, dataDemissao?: string) {
        const patch: Record<string, unknown> = { status: 'inactive' };
        const normalizedDataDemissao = normalizeOptionalDate(dataDemissao);
        if (normalizedDataDemissao !== null) patch.data_demissao = normalizedDataDemissao;

        const { data, error } = await supabase
            .from('colaboradores')
            .update(patch)
            .eq('id', id)
            .eq('empresa_id', companyId)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async inviteColaborador(
        supabase: SupabaseClient,
        id: string,
        companyId: string,
        authUserId: string,
    ) {
        const { data, error } = await supabase
            .from('colaboradores')
            .update({ auth_user_id: authUserId })
            .eq('id', id)
            .eq('empresa_id', companyId)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    // ── Payroll Batch (Folha Lote) operations ────────────────────

    async listBatches(supabase: SupabaseClient, companyId: string) {
        const { data, error } = await supabase
            .from('folhas_lote')
            .select('*')
            .eq('empresa_id', companyId)
            .order('competencia', { ascending: false });
        if (error) throw error;
        return data ?? [];
    }

    async getBatchById(supabase: SupabaseClient, id: string, companyId: string) {
        const { data, error } = await supabase
            .from('folhas_lote')
            .select('*')
            .eq('id', id)
            .eq('empresa_id', companyId)
            .maybeSingle();
        if (error) throw error;
        return data;
    }

    /**
     * Creates a new payroll batch record with status PROCESSING.
     * Rejects duplicate (empresa_id, competencia).
     */
    async createBatch(
        supabase: SupabaseClient,
        companyId: string,
        competencia: string,
        storagePath: string,
        uploadedBy: string,
    ) {
        const competenciaDate = competenciaToDate(competencia);

        const { data, error } = await supabase
            .from('folhas_lote')
            .insert({
                empresa_id: companyId,
                competencia: competenciaDate,
                arquivo_original: storagePath,
                status: 'PROCESSING',
                uploaded_by: uploadedBy,
            })
            .select()
            .single();

        if (error) {
            if (error.code === '23505') {
                throw Object.assign(
                    new Error(`Já existe uma folha de pagamento para a competência ${competencia} nesta empresa`),
                    { statusCode: 409 },
                );
            }
            throw error;
        }
        return data;
    }

    /**
     * Processes a batch PDF:
      * 1. Splits into single pages.
      * 2. Stores each page in Storage.
      * 3. Creates one PENDING holerite per page without employee pre-link.
      * 4. Updates batch to AWAITING_REVIEW.
      *
      * Manual assignment is done later in the review endpoint by the frontend.
     */
    async processBatchPdf(
        supabase: SupabaseClient,
        companyId: string,
        batchId: string,
        competencia: string,
        pdfBuffer: Buffer,
    ): Promise<void> {
        const competenciaDate = competenciaToDate(competencia);

        // Split pages from the original vector PDF.
        const sourcePdf = await PDFDocument.load(pdfBuffer);
        const totalPages = sourcePdf.getPageCount();

        const errors: string[] = [];

        for (let i = 0; i < totalPages; i++) {
            try {
                // Create single-page PDF
                const singlePagePdf = await PDFDocument.create();
                const [page] = await singlePagePdf.copyPages(sourcePdf, [i]);
                singlePagePdf.addPage(page);
                const pageBytes = await singlePagePdf.save();

                // Upload split page to Storage
                const pageNumber = i + 1;
                const storagePath = `${companyId}/${competenciaDate}/pagina-${pageNumber}.pdf`;
                const { error: uploadError } = await supabase.storage
                    .from('holerites')
                    .upload(storagePath, pageBytes, { contentType: 'application/pdf', upsert: true });
                if (uploadError) throw uploadError;

                // Insert holerite row
                const { error: insertError } = await supabase.from('holerites').insert({
                    lote_id: batchId,
                    empresa_id: companyId,
                    colaborador_id: null,
                    competencia: competenciaDate,
                    numero_pagina: pageNumber,
                    arquivo_pdf: storagePath,
                    cpf_detectado: null,
                    status: 'PENDING',
                });
                if (insertError) throw insertError;

            } catch (err: any) {
                errors.push(`Página ${i + 1}: ${err.message}`);
            }
        }

        // Update batch to AWAITING_REVIEW with total page count
        await supabase
            .from('folhas_lote')
            .update({ status: 'AWAITING_REVIEW', total_paginas: totalPages })
            .eq('id', batchId);

        if (errors.length > 0) {
            console.warn(`[HR] Batch ${batchId} processed with extraction warnings:\n${errors.join('\n')}`);
        }
    }

    // ── Review operations ────────────────────────────────────────

    async listBatchPayslips(
        supabase: SupabaseClient,
        batchId: string,
        companyId: string,
    ) {
        const { data, error } = await supabase
            .from('holerites')
            .select(`
        *,
        colaboradores (
          id,
          nome_completo,
          cpf
        )
      `)
            .eq('lote_id', batchId)
            .eq('empresa_id', companyId)
            .order('numero_pagina', { ascending: true });

        if (error) throw error;
        return data ?? [];
    }

    async assignPayslip(
        supabase: SupabaseClient,
        payslipId: string,
        companyId: string,
        colaboradorId: string,
    ) {
        // Validate the employee belongs to this company
        const { data: emp, error: empError } = await supabase
            .from('colaboradores')
            .select('id')
            .eq('id', colaboradorId)
            .eq('empresa_id', companyId)
            .maybeSingle();

        if (empError) throw empError;
        if (!emp) {
            throw Object.assign(new Error('Colaborador não encontrado nesta empresa'), { statusCode: 404 });
        }

        const { data, error } = await supabase
            .from('holerites')
            .update({ colaborador_id: colaboradorId })
            .eq('id', payslipId)
            .eq('empresa_id', companyId)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async confirmBatch(
        supabase: SupabaseClient,
        batchId: string,
        companyId: string,
    ): Promise<{ confirmed: number; pending: number; warnings: string[] }> {
        // Fetch all payslips for this batch
        const { data: payslips, error: fetchError } = await supabase
            .from('holerites')
            .select('id, colaborador_id, numero_pagina')
            .eq('lote_id', batchId)
            .eq('empresa_id', companyId);

        if (fetchError) throw fetchError;
        if (!payslips || payslips.length === 0) {
            throw Object.assign(new Error('Nenhum holerite encontrado para este lote'), { statusCode: 404 });
        }

        // Split payslips into assigned and unassigned
        const assigned = payslips.filter((p) => p.colaborador_id);
        const unassigned = payslips.filter((p) => !p.colaborador_id);

        // Warn about duplicate assignments (same employee on 2+ pages in one batch)
        const warnings: string[] = [];
        const colabCounts = new Map<string, number[]>();
        for (const p of assigned) {
            const pages = colabCounts.get(p.colaborador_id!) ?? [];
            pages.push(p.numero_pagina);
            colabCounts.set(p.colaborador_id!, pages);
        }
        colabCounts.forEach((pages, colabId) => {
            if (pages.length > 1) {
                warnings.push(`Colaborador ${colabId} aparece em múltiplas páginas: ${pages.join(', ')}`);
            }
        });

        // Add warning if there are unassigned pages
        if (unassigned.length > 0) {
            warnings.push(
                `${unassigned.length} página(s) não associada(s) permanece(m) em aberto: ${unassigned.map((p) => p.numero_pagina).join(', ')}`,
            );
        }

        // Confirm only assigned payslips
        if (assigned.length > 0) {
            const assignedIds = assigned.map((p) => p.id);
            const { error: updatePayslipsError } = await supabase
                .from('holerites')
                .update({ status: 'CONFIRMED' })
                .in('id', assignedIds)
                .eq('empresa_id', companyId);

            if (updatePayslipsError) throw updatePayslipsError;
        }

        // Mark batch as COMPLETED (even if some pages remain unassigned)
        const { error: updateBatchError } = await supabase
            .from('folhas_lote')
            .update({ status: 'COMPLETED' })
            .eq('id', batchId)
            .eq('empresa_id', companyId);

        if (updateBatchError) throw updateBatchError;

        return { confirmed: assigned.length, pending: unassigned.length, warnings };
    }

    // ── Signed URL generation ────────────────────────────────────

    /**
     * Generates a short-lived signed URL for a payslip PDF.
     * Validates that the payslip belongs to the requesting user (via RLS context).
     */
    async getPayslipSignedUrl(
        supabase: SupabaseClient,
        payslipId: string,
        companyId: string,
    ): Promise<string> {
        const { data: payslip, error } = await supabase
            .from('holerites')
            .select('arquivo_pdf, status, empresa_id')
            .eq('id', payslipId)
            .eq('empresa_id', companyId)
            .maybeSingle();

        if (error) throw error;
        if (!payslip) {
            throw Object.assign(new Error('Holerite não encontrado'), { statusCode: 404 });
        }

        const { data: signedData, error: signError } = await supabase.storage
            .from('holerites')
            .createSignedUrl(payslip.arquivo_pdf, 300); // 5-minute expiry

        if (signError) throw signError;
        if (!signedData?.signedUrl) {
            throw new Error('Não foi possível gerar o URL assinado');
        }

        return signedData.signedUrl;
    }

    // ── Employee self-service portal ─────────────────────────────

    async getMyPayslips(supabase: SupabaseClient, authUserId: string) {
        // Find the employee linked to this auth user (RLS will also enforce this)
        const { data: employee, error: empError } = await supabase
            .from('colaboradores')
            .select('id, empresa_id')
            .eq('auth_user_id', authUserId)
            .maybeSingle();

        if (empError) throw empError;
        if (!employee) {
            throw Object.assign(new Error('Colaborador não encontrado para este usuário'), { statusCode: 404 });
        }

        const { data, error } = await supabase
            .from('holerites')
            .select('id, competencia, status, numero_pagina, created_at')
            .eq('colaborador_id', employee.id)
            .eq('status', 'CONFIRMED')
            .order('competencia', { ascending: false });

        if (error) throw error;
        return data ?? [];
    }

    async getMyPayslipsMonthly(supabase: SupabaseClient, authUserId: string) {
        const payslips = await this.getMyPayslips(supabase, authUserId);

        const monthNamesPt = [
            'Janeiro',
            'Fevereiro',
            'Marco',
            'Abril',
            'Maio',
            'Junho',
            'Julho',
            'Agosto',
            'Setembro',
            'Outubro',
            'Novembro',
            'Dezembro',
        ];

        const grouped = new Map<string, {
            competencia: string;
            label: string;
            items: Array<{
                id: string;
                numero_pagina: number;
                status: string;
                created_at: string;
            }>;
        }>();

        for (const p of payslips) {
            const competencia = p.competencia;
            const dt = new Date(`${competencia}T00:00:00`);
            const monthLabel = Number.isNaN(dt.getTime())
                ? competencia
                : `${monthNamesPt[dt.getMonth()]}/${dt.getFullYear()}`;

            if (!grouped.has(competencia)) {
                grouped.set(competencia, {
                    competencia,
                    label: monthLabel,
                    items: [],
                });
            }

            grouped.get(competencia)!.items.push({
                id: p.id,
                numero_pagina: p.numero_pagina,
                status: p.status,
                created_at: p.created_at,
            });
        }

        return Array.from(grouped.values()).sort((a, b) => b.competencia.localeCompare(a.competencia));
    }

    async getMyPayslipSignedUrl(
        supabase: SupabaseClient,
        payslipId: string,
        authUserId: string,
    ): Promise<string> {
        // Verify ownership — RLS already restricts to confirmed + own payslips
        const { data: emp, error: empError } = await supabase
            .from('colaboradores')
            .select('id')
            .eq('auth_user_id', authUserId)
            .maybeSingle();

        if (empError) throw empError;
        if (!emp) {
            throw Object.assign(new Error('Colaborador não encontrado para este usuário'), { statusCode: 404 });
        }

        const { data: payslip, error } = await supabase
            .from('holerites')
            .select('arquivo_pdf, status, colaborador_id')
            .eq('id', payslipId)
            .eq('colaborador_id', emp.id)
            .eq('status', 'CONFIRMED')
            .maybeSingle();

        if (error) throw error;
        if (!payslip) {
            throw Object.assign(new Error('Holerite não encontrado ou não disponível'), { statusCode: 404 });
        }

        // Ownership is already validated above using the authenticated user's RLS context.
        // Use admin client for Storage signed URL generation to avoid employee storage policy denial.
        const { data: signedData, error: signError } = await supabaseAdmin.storage
            .from('holerites')
            .createSignedUrl(payslip.arquivo_pdf, 300);

        if (signError) throw signError;
        if (!signedData?.signedUrl) {
            throw new Error('Não foi possível gerar o URL assinado');
        }

        return signedData.signedUrl;
    }

    // ── Portal Access Management ─────────────────────────────────

    /**
     * Creates a new auth user with email/password and links it to a colaborador.
     * Ensures the colaborador belongs to the specified company and validates permissions.
     */
    async createPortalAccess(
        id: string,
        companyId: string,
        email: string,
        password: string,
    ): Promise<any> {
        // Validate inputs
        if (!email || !password) {
            throw Object.assign(new Error('Email e senha são obrigatórios'), { statusCode: 400 });
        }

        if (password.length < 8) {
            throw Object.assign(new Error('Senha deve ter no mínimo 8 caracteres'), { statusCode: 400 });
        }

        // Verify que colaborador exists and belongs to company
        const { data: colaborador, error: colabError } = await supabaseAdmin
            .from('colaboradores')
            .select('id, empresa_id, auth_user_id')
            .eq('id', id)
            .eq('empresa_id', companyId)
            .maybeSingle();

        if (colabError) throw colabError;
        if (!colaborador) {
            throw Object.assign(
                new Error('Colaborador não encontrado nesta empresa'),
                { statusCode: 404 },
            );
        }

        // Check if colaborador already has portal access
        if (colaborador.auth_user_id) {
            throw Object.assign(
                new Error('Este colaborador já possui acesso ao portal'),
                { statusCode: 409 },
            );
        }

        // Check if email already exists in auth.users
        const { data: existingUsers, error: checkError } = await supabaseAdmin.auth.admin.listUsers();
        if (checkError) throw checkError;

        const emailExists = existingUsers.users.some((u) => u.email === email);
        if (emailExists) {
            throw Object.assign(
                new Error('Este email já está cadastrado no sistema'),
                { statusCode: 409 },
            );
        }

        // Create auth user
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true, // Auto-confirm email
        });

        if (authError) {
            if (authError.message?.includes('already registered')) {
                throw Object.assign(
                    new Error('Este email já está cadastrado'),
                    { statusCode: 409 },
                );
            }
            throw authError;
        }

        if (!authData.user?.id) {
            throw new Error('Falha ao criar usuário de autenticação');
        }

        // Link auth user to colaborador
        const { data: updated, error: updateError } = await supabaseAdmin
            .from('colaboradores')
            .update({ auth_user_id: authData.user.id })
            .eq('id', id)
            .eq('empresa_id', companyId)
            .select()
            .single();

        if (updateError) throw updateError;
        // Create EMPLOYEE access profile for the new auth user
        const { error: accessError } = await supabaseAdmin
            .from('perfis_acesso')
            .insert({
                auth_user_id: authData.user.id,
                empresa_id: companyId,
                papel: 'EMPLOYEE',
            });

        if (accessError) throw accessError;

        return updated;
    }
}

export default new HrService();
