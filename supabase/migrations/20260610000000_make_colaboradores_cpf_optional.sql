-- Make CPF optional for colaboradores and keep uniqueness only when CPF is present.
ALTER TABLE colaboradores
  ALTER COLUMN cpf DROP NOT NULL;

DROP INDEX IF EXISTS idx_colaboradores_cpf;

CREATE INDEX IF NOT EXISTS idx_colaboradores_cpf
  ON colaboradores (empresa_id, cpf)
  WHERE cpf IS NOT NULL;

ALTER TABLE colaboradores
  DROP CONSTRAINT IF EXISTS colaboradores_empresa_id_cpf_key;

CREATE UNIQUE INDEX IF NOT EXISTS colaboradores_empresa_id_cpf_unique
  ON colaboradores (empresa_id, cpf)
  WHERE cpf IS NOT NULL;
