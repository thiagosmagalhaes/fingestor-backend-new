-- ============================================================
-- HR Storage policies for bucket: holerites
-- ============================================================
-- This migration ensures authenticated users can upload/download
-- files in the private bucket, scoped by company folder and role.

-- 1) Ensure bucket exists and is private
INSERT INTO
    storage.buckets (id, name, public)
VALUES (
        'holerites',
        'holerites',
        false
    )
ON CONFLICT (id) DO
UPDATE
SET
    public = false;

-- 2) Helper: check if authenticated user can manage HR files for a company
CREATE OR REPLACE FUNCTION public.can_manage_hr_company(p_empresa_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.perfis_acesso pa
    WHERE pa.auth_user_id = auth.uid()
      AND pa.empresa_id   = p_empresa_id
      AND pa.papel        IN ('ADMIN', 'MANAGER')
  )
  OR EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE c.id = p_empresa_id
      AND c.user_id = auth.uid()
  );
$$;

-- 3) Drop old policies if they already exist (idempotent migration)
DROP POLICY IF EXISTS "hr_holerites_select" ON storage.objects;

DROP POLICY IF EXISTS "hr_holerites_insert" ON storage.objects;

DROP POLICY IF EXISTS "hr_holerites_update" ON storage.objects;

DROP POLICY IF EXISTS "hr_holerites_delete" ON storage.objects;

-- 4) Read policy
CREATE POLICY "hr_holerites_select" ON storage.objects FOR
SELECT USING (
        bucket_id = 'holerites'
        AND public.can_manage_hr_company (
            (storage.foldername (name)) [1]::uuid
        )
    );

-- 5) Upload policy
CREATE POLICY "hr_holerites_insert" ON storage.objects FOR INSERT
WITH
    CHECK (
        bucket_id = 'holerites'
        AND public.can_manage_hr_company (
            (storage.foldername (name)) [1]::uuid
        )
    );

-- 6) Update policy
CREATE POLICY "hr_holerites_update" ON storage.objects
FOR UPDATE
    USING (
        bucket_id = 'holerites'
        AND public.can_manage_hr_company (
            (storage.foldername (name)) [1]::uuid
        )
    )
WITH
    CHECK (
        bucket_id = 'holerites'
        AND public.can_manage_hr_company (
            (storage.foldername (name)) [1]::uuid
        )
    );

-- 7) Delete policy
CREATE POLICY "hr_holerites_delete" ON storage.objects FOR DELETE USING (
    bucket_id = 'holerites'
    AND public.can_manage_hr_company (
        (storage.foldername (name)) [1]::uuid
    )
);