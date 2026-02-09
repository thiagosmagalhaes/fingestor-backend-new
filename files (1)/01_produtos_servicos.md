# Feature: Cadastro de Produtos e Serviços

## Visão Geral

Sistema de cadastro unificado para produtos (varejo) e serviços, com suporte a controle de estoque, categorização, precificação e gestão de imagens.

## Tabelas

### 1. `product_categories`

Categorias para organização de produtos e serviços (renomeada para não conflitar com `categories` existente).

```sql
CREATE TABLE product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Dados da categoria
  name VARCHAR(100) NOT NULL,
  description TEXT,
  color VARCHAR(7), -- Hex color para UI (#FF5733)
  
  -- Hierarquia (categoria pai)
  parent_id UUID REFERENCES product_categories(id) ON DELETE SET NULL,
  
  -- Tipo
  category_type VARCHAR(20) CHECK (category_type IN ('product', 'service', 'both')),
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(company_id, name)
);

CREATE INDEX idx_product_categories_company_id ON product_categories(company_id);
CREATE INDEX idx_product_categories_parent_id ON product_categories(parent_id);

COMMENT ON TABLE product_categories IS 'Categorias de produtos e serviços';
COMMENT ON COLUMN product_categories.color IS 'Cor em formato hexadecimal (#FF5733) para UI';
```

### 2. `products_services`

Cadastro unificado de produtos e serviços.

```sql
CREATE TABLE products_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  category_id UUID REFERENCES product_categories(id) ON DELETE SET NULL,
  
  -- Identificação
  sku VARCHAR(100),
  barcode VARCHAR(100), -- Código de barras (EAN, UPC, etc)
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Tipo
  item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('product', 'service')),
  
  -- Precificação
  cost_price DECIMAL(15, 2), -- Preço de custo
  sale_price DECIMAL(15, 2) NOT NULL, -- Preço de venda
  
  -- Controle de estoque (apenas para produtos)
  track_inventory BOOLEAN DEFAULT false,
  current_stock DECIMAL(15, 3) DEFAULT 0,
  min_stock DECIMAL(15, 3) DEFAULT 0, -- Estoque mínimo para alerta
  stock_unit VARCHAR(20) DEFAULT 'un', -- un, kg, l, m, etc.
  
  -- Impostos e comissões
  tax_percentage DECIMAL(5, 2) DEFAULT 0,
  commission_percentage DECIMAL(5, 2) DEFAULT 0,
  
  -- Imagens
  images JSONB DEFAULT '[]', -- Array de URLs das imagens
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Metadados adicionais (ex: peso, dimensões, etc)
  metadata JSONB DEFAULT '{}',
  
  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ, -- Soft delete
  
  UNIQUE(company_id, sku)
);

CREATE INDEX idx_products_services_company_id ON products_services(company_id);
CREATE INDEX idx_products_services_category_id ON products_services(category_id);
CREATE INDEX idx_products_services_sku ON products_services(sku);
CREATE INDEX idx_products_services_barcode ON products_services(barcode);
CREATE INDEX idx_products_services_item_type ON products_services(item_type);
CREATE INDEX idx_products_services_is_active ON products_services(is_active);
CREATE INDEX idx_products_services_name ON products_services USING gin(to_tsvector('portuguese', name));

COMMENT ON TABLE products_services IS 'Cadastro unificado de produtos e serviços';
COMMENT ON COLUMN products_services.stock_unit IS 'Unidade de medida: un (unidade), kg, l (litro), m (metro), etc.';
COMMENT ON COLUMN products_services.images IS 'Array JSON de URLs das imagens do produto';
COMMENT ON COLUMN products_services.metadata IS 'Dados adicionais como peso, dimensões, validade, etc.';
```

### 3. `inventory_movements`

Histórico de todas as movimentações de estoque.

```sql
CREATE TABLE inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  product_service_id UUID NOT NULL REFERENCES products_services(id) ON DELETE CASCADE,
  
  -- Tipo de movimentação
  movement_type VARCHAR(20) NOT NULL CHECK (
    movement_type IN ('purchase', 'sale', 'adjustment', 'return', 'transfer', 'loss')
  ),
  
  -- Quantidade (positiva para entrada, negativa para saída)
  quantity DECIMAL(15, 3) NOT NULL,
  previous_stock DECIMAL(15, 3) NOT NULL,
  new_stock DECIMAL(15, 3) NOT NULL,
  
  -- Referências
  sale_id UUID, -- Será adicionado quando criar a tabela sales
  reference_number VARCHAR(100), -- Número de nota fiscal, pedido, etc.
  
  -- Observações
  notes TEXT,
  
  -- Auditoria
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_inventory_movements_company_id ON inventory_movements(company_id);
CREATE INDEX idx_inventory_movements_product_service_id ON inventory_movements(product_service_id);
CREATE INDEX idx_inventory_movements_movement_type ON inventory_movements(movement_type);
CREATE INDEX idx_inventory_movements_created_at ON inventory_movements(created_at DESC);

COMMENT ON TABLE inventory_movements IS 'Histórico de todas as movimentações de estoque';
COMMENT ON COLUMN inventory_movements.movement_type IS 'purchase (compra), sale (venda), adjustment (ajuste), return (devolução), transfer (transferência), loss (perda)';
```

## Triggers e Funções

### Atualização automática de `updated_at`

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_product_categories_updated_at 
  BEFORE UPDATE ON product_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_services_updated_at 
  BEFORE UPDATE ON products_services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Função para adicionar estoque

```sql
CREATE OR REPLACE FUNCTION add_product_stock(
  p_product_id UUID,
  p_quantity DECIMAL,
  p_reference_number VARCHAR DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_product RECORD;
  v_company_id UUID;
BEGIN
  -- Buscar informações do produto
  SELECT * INTO v_product
  FROM products_services
  WHERE id = p_product_id
    AND deleted_at IS NULL;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Produto não encontrado';
  END IF;
  
  IF v_product.item_type != 'product' THEN
    RAISE EXCEPTION 'Apenas produtos podem ter estoque';
  END IF;
  
  IF NOT v_product.track_inventory THEN
    RAISE EXCEPTION 'Este produto não controla estoque';
  END IF;
  
  -- Atualizar estoque
  UPDATE products_services
  SET current_stock = current_stock + p_quantity
  WHERE id = p_product_id;
  
  -- Registrar movimentação
  INSERT INTO inventory_movements (
    company_id,
    product_service_id,
    movement_type,
    quantity,
    previous_stock,
    new_stock,
    reference_number,
    notes,
    created_by
  ) VALUES (
    v_product.company_id,
    p_product_id,
    'purchase',
    p_quantity,
    v_product.current_stock,
    v_product.current_stock + p_quantity,
    p_reference_number,
    p_notes,
    auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION add_product_stock IS 'Adiciona estoque a um produto e registra a movimentação';
```

### Função para ajustar estoque manualmente

```sql
CREATE OR REPLACE FUNCTION adjust_product_stock(
  p_product_id UUID,
  p_new_stock DECIMAL,
  p_notes TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_product RECORD;
  v_quantity_diff DECIMAL;
BEGIN
  -- Buscar produto
  SELECT * INTO v_product
  FROM products_services
  WHERE id = p_product_id
    AND deleted_at IS NULL;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Produto não encontrado';
  END IF;
  
  IF v_product.item_type != 'product' THEN
    RAISE EXCEPTION 'Apenas produtos podem ter estoque';
  END IF;
  
  IF NOT v_product.track_inventory THEN
    RAISE EXCEPTION 'Este produto não controla estoque';
  END IF;
  
  -- Calcular diferença
  v_quantity_diff := p_new_stock - v_product.current_stock;
  
  -- Atualizar estoque
  UPDATE products_services
  SET current_stock = p_new_stock
  WHERE id = p_product_id;
  
  -- Registrar movimentação
  INSERT INTO inventory_movements (
    company_id,
    product_service_id,
    movement_type,
    quantity,
    previous_stock,
    new_stock,
    notes,
    created_by
  ) VALUES (
    v_product.company_id,
    p_product_id,
    'adjustment',
    v_quantity_diff,
    v_product.current_stock,
    p_new_stock,
    p_notes,
    auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION adjust_product_stock IS 'Ajusta manualmente o estoque de um produto';
```

## Views Úteis

### Produtos com baixo estoque

```sql
CREATE OR REPLACE VIEW vw_low_stock_products AS
SELECT
  ps.id,
  ps.company_id,
  ps.sku,
  ps.name,
  ps.current_stock,
  ps.min_stock,
  ps.stock_unit,
  ps.sale_price,
  pc.name AS category_name,
  pc.color AS category_color
FROM products_services ps
LEFT JOIN product_categories pc ON ps.category_id = pc.id
WHERE ps.item_type = 'product'
  AND ps.track_inventory = true
  AND ps.current_stock <= ps.min_stock
  AND ps.is_active = true
  AND ps.deleted_at IS NULL;

COMMENT ON VIEW vw_low_stock_products IS 'Lista produtos com estoque abaixo do mínimo';
```

### Produtos ativos com informações completas

```sql
CREATE OR REPLACE VIEW vw_products_complete AS
SELECT
  ps.id,
  ps.company_id,
  ps.sku,
  ps.barcode,
  ps.name,
  ps.description,
  ps.item_type,
  ps.cost_price,
  ps.sale_price,
  CASE 
    WHEN ps.sale_price > 0 AND ps.cost_price > 0 
    THEN ROUND(((ps.sale_price - ps.cost_price) / ps.sale_price * 100)::NUMERIC, 2)
    ELSE 0
  END AS margin_percentage,
  ps.track_inventory,
  ps.current_stock,
  ps.min_stock,
  ps.stock_unit,
  ps.tax_percentage,
  ps.commission_percentage,
  ps.images,
  ps.is_active,
  ps.metadata,
  pc.id AS category_id,
  pc.name AS category_name,
  pc.color AS category_color,
  ps.created_at,
  ps.updated_at
FROM products_services ps
LEFT JOIN product_categories pc ON ps.category_id = pc.id
WHERE ps.deleted_at IS NULL;

COMMENT ON VIEW vw_products_complete IS 'View completa de produtos com informações de categoria e margem calculada';
```

## Row Level Security (RLS)

```sql
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;

-- Políticas para product_categories
CREATE POLICY "Users can view categories of their companies"
  ON product_categories FOR SELECT
  USING (
    company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert categories to their companies"
  ON product_categories FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update categories of their companies"
  ON product_categories FOR UPDATE
  USING (
    company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete categories of their companies"
  ON product_categories FOR DELETE
  USING (
    company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
  );

-- Políticas similares para products_services
CREATE POLICY "Users can view products of their companies"
  ON products_services FOR SELECT
  USING (
    company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert products to their companies"
  ON products_services FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update products of their companies"
  ON products_services FOR UPDATE
  USING (
    company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete products of their companies"
  ON products_services FOR DELETE
  USING (
    company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
  );

-- Políticas para inventory_movements (apenas visualização)
CREATE POLICY "Users can view inventory movements of their companies"
  ON inventory_movements FOR SELECT
  USING (
    company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
  );
```

## Exemplos de Uso

### Cadastrar uma Categoria

```sql
INSERT INTO product_categories (company_id, name, description, category_type, color)
VALUES (
  'company-uuid',
  'Eletrônicos',
  'Produtos eletrônicos em geral',
  'product',
  '#3B82F6'
);
```

### Cadastrar um Produto

```sql
INSERT INTO products_services (
  company_id,
  category_id,
  sku,
  barcode,
  name,
  description,
  item_type,
  cost_price,
  sale_price,
  track_inventory,
  current_stock,
  min_stock,
  stock_unit,
  tax_percentage,
  images
) VALUES (
  'company-uuid',
  'category-uuid',
  'PROD-001',
  '7891234567890',
  'Smartphone XYZ Pro',
  'Smartphone com 128GB de memória e 6GB RAM',
  'product',
  1500.00,
  2499.00,
  true,
  50,
  10,
  'un',
  18.00,
  '["https://example.com/img1.jpg", "https://example.com/img2.jpg"]'::jsonb
);
```

### Cadastrar um Serviço

```sql
INSERT INTO products_services (
  company_id,
  category_id,
  name,
  description,
  item_type,
  sale_price,
  track_inventory
) VALUES (
  'company-uuid',
  'category-uuid',
  'Instalação de Software',
  'Instalação e configuração completa de software',
  'service',
  150.00,
  false
);
```

### Adicionar Estoque

```sql
SELECT add_product_stock(
  'product-uuid',
  100, -- quantidade
  'NF-12345', -- número da nota fiscal
  'Compra do fornecedor XYZ'
);
```

### Ajustar Estoque

```sql
SELECT adjust_product_stock(
  'product-uuid',
  150, -- novo estoque
  'Ajuste após inventário físico'
);
```

### Buscar Produtos por Nome ou SKU

```sql
SELECT *
FROM vw_products_complete
WHERE company_id = 'company-uuid'
  AND (
    name ILIKE '%smartphone%'
    OR sku ILIKE '%PROD%'
  )
  AND is_active = true
ORDER BY name;
```

### Listar Produtos com Baixo Estoque

```sql
SELECT *
FROM vw_low_stock_products
WHERE company_id = 'company-uuid'
ORDER BY current_stock ASC;
```

### Histórico de Movimentações de um Produto

```sql
SELECT
  im.created_at,
  im.movement_type,
  im.quantity,
  im.previous_stock,
  im.new_stock,
  im.reference_number,
  im.notes
FROM inventory_movements im
WHERE im.product_service_id = 'product-uuid'
ORDER BY im.created_at DESC
LIMIT 50;
```

### Valor Total do Estoque

```sql
SELECT
  COUNT(*) AS total_products,
  SUM(current_stock) AS total_units,
  SUM(current_stock * cost_price) AS total_cost_value,
  SUM(current_stock * sale_price) AS total_sale_value
FROM products_services
WHERE company_id = 'company-uuid'
  AND item_type = 'product'
  AND track_inventory = true
  AND is_active = true
  AND deleted_at IS NULL;
```

## Considerações de Implementação

### 1. Upload de Imagens

O campo `images` armazena apenas URLs. Você precisará:
- Configurar um bucket no Supabase Storage
- Fazer upload das imagens via API
- Armazenar as URLs públicas no campo `images`

Exemplo de estrutura:
```json
[
  "https://seu-projeto.supabase.co/storage/v1/object/public/products/img1.jpg",
  "https://seu-projeto.supabase.co/storage/v1/object/public/products/img2.jpg"
]
```

### 2. Códigos de Barras

- O campo `barcode` suporta diversos formatos (EAN-13, UPC, Code128, etc)
- Recomenda-se validação no frontend antes de salvar
- Criar índice para buscas rápidas por código de barras

### 3. Unidades de Medida

Unidades comuns no campo `stock_unit`:
- `un` - Unidade
- `kg` - Quilograma
- `g` - Grama
- `l` - Litro
- `ml` - Mililitro
- `m` - Metro
- `cm` - Centímetro
- `m²` - Metro quadrado
- `cx` - Caixa
- `pct` - Pacote

### 4. Metadados (JSON)

Exemplos de uso do campo `metadata`:

```json
// Para produtos físicos
{
  "weight": "0.5kg",
  "dimensions": "15x10x5cm",
  "warranty": "12 meses",
  "manufacturer": "Samsung"
}

// Para serviços
{
  "duration": "2 horas",
  "min_people": 1,
  "max_people": 5
}
```

### 5. Soft Delete

- Nunca deletar fisicamente produtos que já tiveram vendas
- Sempre usar `deleted_at` para "excluir"
- Filtrar por `deleted_at IS NULL` nas consultas

---

**Próximas Features:** 
- [02 - Orçamentos](./02_orcamentos.md)
- [03 - PDV (Ponto de Venda)](./03_pdv.md)
