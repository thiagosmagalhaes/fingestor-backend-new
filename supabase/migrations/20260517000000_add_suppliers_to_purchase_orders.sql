-- ============================================================
-- Add Suppliers to Purchase Orders
-- ============================================================

-- ============================================================
-- TABLE: purchase_suppliers
-- ============================================================
CREATE TABLE purchase_suppliers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  cnpj        TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure unique CNPJ per company when provided
  CONSTRAINT unique_supplier_cnpj_per_company UNIQUE (company_id, cnpj)
);

CREATE INDEX idx_purchase_suppliers_company_id ON purchase_suppliers(company_id);
CREATE INDEX idx_purchase_suppliers_name ON purchase_suppliers USING GIN (to_tsvector('simple', name));
CREATE INDEX idx_purchase_suppliers_cnpj ON purchase_suppliers(cnpj) WHERE cnpj IS NOT NULL;

-- Enable RLS
ALTER TABLE purchase_suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their company purchase suppliers"
  ON purchase_suppliers
  FOR ALL
  USING (
    company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- ALTER: purchase_orders - Add supplier_id
-- ============================================================
ALTER TABLE purchase_orders
  ADD COLUMN supplier_id UUID REFERENCES purchase_suppliers(id) ON DELETE SET NULL;

CREATE INDEX idx_purchase_orders_supplier_id ON purchase_orders(supplier_id);

-- ============================================================
-- Update timestamp trigger for suppliers
-- ============================================================
CREATE OR REPLACE FUNCTION update_purchase_suppliers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_purchase_suppliers_updated_at
  BEFORE UPDATE ON purchase_suppliers
  FOR EACH ROW
  EXECUTE FUNCTION update_purchase_suppliers_updated_at();
