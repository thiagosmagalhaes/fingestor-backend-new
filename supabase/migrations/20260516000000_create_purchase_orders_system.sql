-- ============================================================
-- Purchase Order System Migration
-- ============================================================

-- Enum for unit types
CREATE TYPE purchase_unit_type AS ENUM (
  'package',
  'box',
  'unit',
  'kilogram',
  'liter',
  'bag',
  'bundle',
  'sack',
  'tray',
  'other'
);

-- Enum for purchase order statuses
CREATE TYPE purchase_order_status AS ENUM (
  'draft',
  'saved',
  'completed',
  'canceled'
);

-- ============================================================
-- TABLE: purchase_products
-- ============================================================
CREATE TABLE purchase_products (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  unit_type   purchase_unit_type NOT NULL DEFAULT 'unit',
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_purchase_products_company_id ON purchase_products(company_id);
CREATE INDEX idx_purchase_products_name ON purchase_products USING GIN (to_tsvector('simple', name));

-- Enable RLS
ALTER TABLE purchase_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their company purchase products"
  ON purchase_products
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
-- TABLE: purchase_orders
-- ============================================================
CREATE TABLE purchase_orders (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  order_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  status      purchase_order_status NOT NULL DEFAULT 'draft',
  notes       TEXT,
  created_by  UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_purchase_orders_company_id ON purchase_orders(company_id);
CREATE INDEX idx_purchase_orders_order_date ON purchase_orders(order_date DESC);
CREATE INDEX idx_purchase_orders_status ON purchase_orders(status);

-- Enable RLS
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their company purchase orders"
  ON purchase_orders
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
-- TABLE: purchase_order_items
-- ============================================================
CREATE TABLE purchase_order_items (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id     UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id            UUID NOT NULL REFERENCES purchase_products(id),
  product_name_snapshot TEXT NOT NULL,
  unit_type_snapshot    TEXT NOT NULL,
  quantity              NUMERIC(12, 3) NOT NULL CHECK (quantity > 0),
  observation           TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_purchase_order_items_order_id ON purchase_order_items(purchase_order_id);
CREATE INDEX idx_purchase_order_items_product_id ON purchase_order_items(product_id);

-- Enable RLS
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their company purchase order items"
  ON purchase_order_items
  FOR ALL
  USING (
    purchase_order_id IN (
      SELECT po.id FROM purchase_orders po
      WHERE po.company_id IN (
        SELECT id FROM companies WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    purchase_order_id IN (
      SELECT po.id FROM purchase_orders po
      WHERE po.company_id IN (
        SELECT id FROM companies WHERE user_id = auth.uid()
      )
    )
  );

-- ============================================================
-- FUNCTION: updated_at trigger for purchase_products
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER purchase_products_updated_at
  BEFORE UPDATE ON purchase_products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER purchase_orders_updated_at
  BEFORE UPDATE ON purchase_orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
