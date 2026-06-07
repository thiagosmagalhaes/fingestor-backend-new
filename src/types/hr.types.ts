// Types for the HR (Human Resources) Module

// ─── Enums ─────────────────────────────────────────────────

export type HrEmployeeStatus = 'active' | 'inactive' | 'on_leave';
export type HrContractType = 'CLT' | 'PJ' | 'intern';
export type HrBatchStatus = 'PROCESSING' | 'AWAITING_REVIEW' | 'COMPLETED';
export type HrPayslipStatus = 'PENDING' | 'CONFIRMED';
export type HrRole = 'ADMIN' | 'MANAGER' | 'EMPLOYEE';

// ─── Employee (Colaborador) ─────────────────────────────────

export interface Colaborador {
    id: string;
    empresa_id: string;
    auth_user_id: string | null;
    nome_completo: string;
    cpf: string;           // digits only
    email: string | null;
    cargo: string | null;
    departamento: string | null;
    data_admissao: string | null;
    data_demissao: string | null;
    salario_base: number | null;
    tipo_contrato: HrContractType;
    status: HrEmployeeStatus;
    banco: string | null;
    agencia: string | null;
    conta: string | null;
    chave_pix: string | null;
    created_at: string;
    updated_at: string;
}

export interface CreateColaboradorRequest {
    companyId: string;
    nomeCompleto: string;
    cpf: string;
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
}

export interface UpdateColaboradorRequest {
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
}

export interface InviteColaboradorRequest {
    authUserId: string;
}

// ─── Payroll Batch (Folha Lote) ─────────────────────────────

export interface FolhaLote {
    id: string;
    empresa_id: string;
    competencia: string;    // YYYY-MM-DD (always 1st of month)
    arquivo_original: string;
    total_paginas: number | null;
    status: HrBatchStatus;
    uploaded_by: string | null;
    created_at: string;
    updated_at: string;
}

// ─── Payslip (Holerite) ─────────────────────────────────────

export interface Holerite {
    id: string;
    lote_id: string;
    empresa_id: string;
    colaborador_id: string | null;
    competencia: string;
    numero_pagina: number;
    arquivo_pdf: string;
    cpf_detectado: string | null;
    status: HrPayslipStatus;
    created_at: string;
    updated_at: string;
}

export interface HoleriteWithEmployee extends Holerite {
    colaboradores?: Pick<Colaborador, 'id' | 'nome_completo' | 'cpf'> | null;
}

// ─── Request bodies ─────────────────────────────────────────

export interface UploadPayrollBatchRequest {
    companyId: string;
    /** YYYY-MM format, e.g. "2026-03" */
    competencia: string;
}

export interface AssignPayslipRequest {
    colaboradorId: string;
}

export interface ConfirmBatchRequest {
    companyId: string;
}
