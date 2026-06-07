-- ============================================================
-- HR RLS fix: recognize company owner and backfill access profiles
-- ============================================================

-- Backfill existing company owners into perfis_acesso so HR policies work
-- for companies created before the HR module rollout.
INSERT INTO
    perfis_acesso (
        auth_user_id,
        empresa_id,
        papel
    )
SELECT c.user_id, c.id, 'ADMIN'
FROM companies c
WHERE
    c.user_id IS NOT NULL
ON CONFLICT (auth_user_id, empresa_id) DO
UPDATE
SET
    papel = EXCLUDED.papel,
    updated_at = NOW();

-- Make the security helper resilient: company owners are also gestores.
CREATE OR REPLACE FUNCTION is_gestor(p_empresa_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM perfis_acesso pa
    WHERE pa.auth_user_id = auth.uid()
      AND pa.empresa_id   = p_empresa_id
      AND pa.papel        IN ('ADMIN', 'MANAGER')
  )
  OR EXISTS (
    SELECT 1
    FROM companies c
    WHERE c.id = p_empresa_id
      AND c.user_id = auth.uid()
  );
$$;