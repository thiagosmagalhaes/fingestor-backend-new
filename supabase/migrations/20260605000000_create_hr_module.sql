-- ============================================================
-- HR Module Migration
-- Human Resources: employees, payroll batches, payslips
-- ============================================================

-- ── Enums ───────────────────────────────────────────────────

CREATE TYPE hr_employee_status AS ENUM ('active', 'inactive', 'on_leave');

CREATE TYPE hr_contract_type   AS ENUM ('CLT', 'PJ', 'intern');

CREATE TYPE hr_batch_status    AS ENUM ('PROCESSING', 'AWAITING_REVIEW', 'COMPLETED');

CREATE TYPE hr_payslip_status  AS ENUM ('PENDING', 'CONFIRMED');

CREATE TYPE hr_role            AS ENUM ('ADMIN', 'MANAGER', 'EMPLOYEE');

-- ── perfis_acesso (access profiles) ─────────────────────────
-- Links a Supabase auth user to a company with a role.
-- Managers (ADMIN/MANAGER) can manage the HR module for their company.
-- Employees (EMPLOYEE) can only view their own confirmed payslips.

CREATE TABLE IF NOT EXISTS perfis_acesso (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    auth_user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    empresa_id UUID NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
    papel hr_role NOT NULL DEFAULT 'MANAGER',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (auth_user_id, empresa_id)
);

CREATE INDEX idx_perfis_acesso_auth_user_id ON perfis_acesso (auth_user_id);

CREATE INDEX idx_perfis_acesso_empresa_id ON perfis_acesso (empresa_id);

ALTER TABLE perfis_acesso ENABLE ROW LEVEL SECURITY;

-- Each user can only see their own profile link
CREATE POLICY "perfis_acesso: own record" ON perfis_acesso FOR
SELECT USING (auth_user_id = auth.uid ());

-- ── Helper function: is_gestor ───────────────────────────────

CREATE OR REPLACE FUNCTION is_gestor(p_empresa_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM perfis_acesso
    WHERE auth_user_id = auth.uid()
      AND empresa_id   = p_empresa_id
      AND papel        IN ('ADMIN', 'MANAGER')
  );
$$;

-- ── colaboradores (employees) ────────────────────────────────

CREATE TABLE IF NOT EXISTS colaboradores (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  auth_user_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,

-- Personal data
nome_completo TEXT NOT NULL,
cpf TEXT NOT NULL, -- digits only, 11 chars
email TEXT,

-- Contractual data
cargo TEXT,
departamento TEXT,
data_admissao DATE,
data_demissao DATE,
salario_base NUMERIC(12, 2),
tipo_contrato hr_contract_type NOT NULL DEFAULT 'CLT',
status hr_employee_status NOT NULL DEFAULT 'active',

-- Banking data
banco           TEXT,
  agencia         TEXT,
  conta           TEXT,
  chave_pix       TEXT,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (empresa_id, cpf)
);

CREATE INDEX idx_colaboradores_empresa_id ON colaboradores (empresa_id);

CREATE INDEX idx_colaboradores_cpf ON colaboradores (empresa_id, cpf);

CREATE INDEX idx_colaboradores_auth_user_id ON colaboradores (auth_user_id);

ALTER TABLE colaboradores ENABLE ROW LEVEL SECURITY;

-- Manager: full access within their company
CREATE POLICY "colaboradores: manager full access" ON colaboradores FOR ALL USING (is_gestor (empresa_id))
WITH
    CHECK (is_gestor (empresa_id));

-- Employee: read only their own record
CREATE POLICY "colaboradores: employee self read" ON colaboradores FOR
SELECT USING (auth_user_id = auth.uid ());

-- ── folhas_lote (payroll batches) ────────────────────────────

CREATE TABLE IF NOT EXISTS folhas_lote (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    empresa_id UUID NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
    competencia DATE NOT NULL, -- always 1st day of month, e.g. 2026-03-01
    arquivo_original TEXT NOT NULL, -- path in Storage
    total_paginas INT,
    status hr_batch_status NOT NULL DEFAULT 'PROCESSING',
    uploaded_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (empresa_id, competencia)
);

CREATE INDEX idx_folhas_lote_empresa_id ON folhas_lote (empresa_id);

CREATE INDEX idx_folhas_lote_competencia ON folhas_lote (empresa_id, competencia);

ALTER TABLE folhas_lote ENABLE ROW LEVEL SECURITY;

CREATE POLICY "folhas_lote: manager only" ON folhas_lote FOR ALL USING (is_gestor (empresa_id))
WITH
    CHECK (is_gestor (empresa_id));

-- ── holerites (payslips) ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS holerites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    lote_id UUID NOT NULL REFERENCES folhas_lote (id) ON DELETE CASCADE,
    empresa_id UUID NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
    colaborador_id UUID REFERENCES colaboradores (id) ON DELETE SET NULL,
    competencia DATE NOT NULL,
    numero_pagina INT NOT NULL,
    arquivo_pdf TEXT NOT NULL, -- split-page path in Storage
    cpf_detectado TEXT, -- digits only; null if extraction failed
    status hr_payslip_status NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_holerites_colaborador_id ON holerites (colaborador_id);

CREATE INDEX idx_holerites_lote_id ON holerites (lote_id);

CREATE INDEX idx_holerites_competencia ON holerites (empresa_id, competencia);

ALTER TABLE holerites ENABLE ROW LEVEL SECURITY;

-- Manager: full access within their company
CREATE POLICY "holerites: manager full access" ON holerites FOR ALL USING (is_gestor (empresa_id))
WITH
    CHECK (is_gestor (empresa_id));

-- Employee: only confirmed payslips that belong to them
CREATE POLICY "holerites: employee confirmed self read" ON holerites FOR
SELECT USING (
        status = 'CONFIRMED'
        AND colaborador_id IN (
            SELECT id
            FROM colaboradores
            WHERE
                auth_user_id = auth.uid ()
        )
    );

-- ── updated_at triggers ──────────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_colaboradores_updated_at
  BEFORE UPDATE ON colaboradores
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_folhas_lote_updated_at
  BEFORE UPDATE ON folhas_lote
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_holerites_updated_at
  BEFORE UPDATE ON holerites
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_perfis_acesso_updated_at
  BEFORE UPDATE ON perfis_acesso
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();