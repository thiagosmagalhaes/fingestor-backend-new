# Documentação de API - Sistema de Produtos e Serviços

## Visão Geral

Esta documentação descreve os endpoints disponíveis para gerenciar produtos, serviços, categorias e controle de estoque no sistema.

## Autenticação

Todos os endpoints requerem autenticação via token Bearer. Inclua o token de acesso no header de todas as requisições:

```
Authorization: Bearer {seu_access_token}
```

---

## 1. Categorias de Produtos

### 1.1. Listar Categorias

**Endpoint:** `GET /api/product-categories`

**Query Parameters:**
- `companyId` (obrigatório): UUID da empresa

**Exemplo de Requisição:**

```bash
curl -X GET "https://api.fingestor.com/api/product-categories?companyId=uuid-da-empresa" \
  -H "Authorization: Bearer seu_token"
```

**Resposta de Sucesso (200):**

```json
[
  {
    "id": "uuid-categoria",
    "company_id": "uuid-da-empresa",
    "name": "Eletrônicos",
    "description": "Produtos eletrônicos em geral",
    "color": "#3B82F6",
    "parent_id": null,
    "category_type": "product",
    "is_active": true,
    "created_at": "2026-02-07T10:00:00Z",
    "updated_at": "2026-02-07T10:00:00Z"
  }
]
```

### 1.2. Criar Categoria

**Endpoint:** `POST /api/product-categories`

**Body:**

```json
{
  "companyId": "uuid-da-empresa",
  "name": "Eletrônicos",
  "description": "Produtos eletrônicos em geral",
  "color": "#3B82F6",
  "categoryType": "product"
}
```

**Exemplo de Requisição:**

```bash
curl -X POST "https://api.fingestor.com/api/product-categories" \
  -H "Authorization: Bearer seu_token" \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "uuid-da-empresa",
    "name": "Eletrônicos",
    "description": "Produtos eletrônicos em geral",
    "color": "#3B82F6",
    "categoryType": "product"
  }'
```

**Resposta de Sucesso (201):**

```json
{
  "id": "uuid-categoria",
  "company_id": "uuid-da-empresa",
  "name": "Eletrônicos",
  "description": "Produtos eletrônicos em geral",
  "color": "#3B82F6",
  "parent_id": null,
  "category_type": "product",
  "is_active": true,
  "created_at": "2026-02-07T10:00:00Z",
  "updated_at": "2026-02-07T10:00:00Z"
}
```

**Erros Possíveis:**
- `400`: Dados obrigatórios não fornecidos
- `409`: Já existe uma categoria com esse nome

### 1.3. Atualizar Categoria

**Endpoint:** `PUT /api/product-categories/:id`

**Query Parameters:**
- `companyId` (obrigatório): UUID da empresa

**Body (todos os campos são opcionais):**

```json
{
  "name": "Eletrônicos e Tecnologia",
  "description": "Nova descrição",
  "color": "#1E40AF",
  "isActive": true
}
```

### 1.4. Excluir Categoria

**Endpoint:** `DELETE /api/product-categories/:id`

**Query Parameters:**
- `companyId` (obrigatório): UUID da empresa

**Resposta de Sucesso:** `204 No Content`

---

## 2. Produtos e Serviços

### 2.1. Listar Produtos/Serviços

**Endpoint:** `GET /api/products-services`

**Query Parameters:**
- `companyId` (obrigatório): UUID da empresa
- `type` (opcional): `product` ou `service`
- `search` (opcional): Busca por nome ou SKU

**Exemplo de Requisição:**

```bash
curl -X GET "https://api.fingestor.com/api/products-services?companyId=uuid-da-empresa&type=product" \
  -H "Authorization: Bearer seu_token"
```

**Resposta de Sucesso (200):**

```json
[
  {
    "id": "uuid-produto",
    "company_id": "uuid-da-empresa",
    "category_id": "uuid-categoria",
    "sku": "PROD-001",
    "barcode": "7891234567890",
    "name": "Smartphone XYZ Pro",
    "description": "Smartphone com 128GB",
    "item_type": "product",
    "cost_price": 1500.00,
    "sale_price": 2499.00,
    "track_inventory": true,
    "current_stock": 50,
    "min_stock": 10,
    "stock_unit": "un",
    "tax_percentage": 18.00,
    "commission_percentage": 5.00,
    "images": ["url1.jpg", "url2.jpg"],
    "is_active": true,
    "metadata": {},
    "created_at": "2026-02-07T10:00:00Z",
    "updated_at": "2026-02-07T10:00:00Z",
    "product_categories": {
      "id": "uuid-categoria",
      "name": "Eletrônicos",
      "color": "#3B82F6"
    }
  }
]
```

### 2.2. Obter Produto/Serviço por ID

**Endpoint:** `GET /api/products-services/:id`

**Query Parameters:**
- `companyId` (obrigatório): UUID da empresa

### 2.3. Listar Produtos com Estoque Baixo

**Endpoint:** `GET /api/products-services/low-stock`

**Query Parameters:**
- `companyId` (obrigatório): UUID da empresa

**Resposta de Sucesso (200):**

```json
[
  {
    "id": "uuid-produto",
    "company_id": "uuid-da-empresa",
    "sku": "PROD-001",
    "name": "Smartphone XYZ Pro",
    "current_stock": 5,
    "min_stock": 10,
    "stock_unit": "un",
    "sale_price": 2499.00,
    "category_name": "Eletrônicos",
    "category_color": "#3B82F6"
  }
]
```

### 2.4. Criar Produto/Serviço

**Endpoint:** `POST /api/products-services`

**Body:**

```json
{
  "companyId": "uuid-da-empresa",
  "categoryId": "uuid-categoria",
  "sku": "PROD-001",
  "barcode": "7891234567890",
  "name": "Smartphone XYZ Pro",
  "description": "Smartphone com 128GB",
  "itemType": "product",
  "costPrice": 1500.00,
  "salePrice": 2499.00,
  "trackInventory": true,
  "currentStock": 50,
  "minStock": 10,
  "stockUnit": "un",
  "taxPercentage": 18.00,
  "commissionPercentage": 5.00,
  "images": ["url1.jpg", "url2.jpg"],
  "metadata": {
    "weight": "200g",
    "warranty": "12 meses"
  }
}
```

**Campos Obrigatórios:**
- `companyId`
- `name`
- `itemType` (`product` ou `service`)
- `salePrice`

**Resposta de Sucesso (201):** Retorna o produto/serviço criado

**Erros Possíveis:**
- `400`: Dados obrigatórios não fornecidos
- `409`: Já existe um produto com esse SKU

### 2.5. Atualizar Produto/Serviço

**Endpoint:** `PUT /api/products-services/:id`

**Query Parameters:**
- `companyId` (obrigatório): UUID da empresa

**Body:** Todos os campos são opcionais, envie apenas o que deseja atualizar

### 2.6. Excluir Produto/Serviço

**Endpoint:** `DELETE /api/products-services/:id`

**Query Parameters:**
- `companyId` (obrigatório): UUID da empresa

**Nota:** Realiza soft delete, não remove fisicamente o registro

---

## 3. Controle de Estoque

### 3.1. Listar Movimentações de Estoque

**Endpoint:** `GET /api/inventory/movements`

**Query Parameters:**
- `companyId` (obrigatório): UUID da empresa
- `productId` (opcional): UUID do produto
- `from` (opcional): Data inicial (formato ISO)
- `to` (opcional): Data final (formato ISO)
- `limit` (opcional): Limite de resultados (padrão: 50)

**Exemplo de Requisição:**

```bash
curl -X GET "https://api.fingestor.com/api/inventory/movements?companyId=uuid-da-empresa&productId=uuid-produto&limit=10" \
  -H "Authorization: Bearer seu_token"
```

**Resposta de Sucesso (200):**

```json
[
  {
    "id": "uuid-movimento",
    "company_id": "uuid-da-empresa",
    "product_service_id": "uuid-produto",
    "movement_type": "purchase",
    "quantity": 100,
    "previous_stock": 50,
    "new_stock": 150,
    "sale_id": null,
    "reference_number": "NF-12345",
    "notes": "Compra do fornecedor XYZ",
    "created_by": "uuid-usuario",
    "created_at": "2026-02-07T10:00:00Z",
    "products_services": {
      "id": "uuid-produto",
      "name": "Smartphone XYZ Pro",
      "sku": "PROD-001"
    }
  }
]
```

**Tipos de Movimentação:**
- `purchase`: Compra/Entrada
- `sale`: Venda/Saída
- `adjustment`: Ajuste manual
- `return`: Devolução
- `transfer`: Transferência
- `loss`: Perda

### 3.2. Adicionar Estoque

**Endpoint:** `POST /api/inventory/add-stock`

**Body:**

```json
{
  "productId": "uuid-produto",
  "quantity": 100,
  "referenceNumber": "NF-12345",
  "notes": "Compra do fornecedor XYZ"
}
```

**Campos Obrigatórios:**
- `productId`
- `quantity` (deve ser maior que zero)

**Exemplo de Requisição:**

```bash
curl -X POST "https://api.fingestor.com/api/inventory/add-stock" \
  -H "Authorization: Bearer seu_token" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "uuid-produto",
    "quantity": 100,
    "referenceNumber": "NF-12345",
    "notes": "Compra do fornecedor XYZ"
  }'
```

**Resposta de Sucesso (200):**

```json
{
  "message": "Estoque adicionado com sucesso"
}
```

**Erros Possíveis:**
- `400`: Produto não encontrado ou não controla estoque
- `400`: Quantidade inválida

### 3.3. Ajustar Estoque Manualmente

**Endpoint:** `POST /api/inventory/adjust-stock`

**Body:**

```json
{
  "productId": "uuid-produto",
  "newStock": 150,
  "notes": "Ajuste após inventário físico"
}
```

**Campos Obrigatórios:**
- `productId`
- `newStock` (não pode ser negativo)

**Resposta de Sucesso (200):**

```json
{
  "message": "Estoque ajustado com sucesso"
}
```

---

## Regras de Negócio

### Para o Frontend

1. **Categorias:**
   - Permitir cores personalizadas para melhor organização visual
   - Suportar hierarquia de categorias (parent_id)
   - Validar unicidade de nomes dentro da empresa

2. **Produtos e Serviços:**
   - Produtos podem ter controle de estoque, serviços não
   - SKU deve ser único por empresa
   - Código de barras é opcional mas recomendado para produtos
   - Permitir múltiplas imagens (array de URLs)
   - Metadata pode armazenar informações customizadas (peso, dimensões, etc)

3. **Estoque:**
   - Apenas produtos com `track_inventory = true` têm controle de estoque
   - Estoque não pode ficar negativo
   - Alertar quando `current_stock <= min_stock`
   - Movimentações são automaticamente criadas ao adicionar/ajustar estoque
   - Na venda, o estoque é descontado automaticamente (trigger do banco)

4. **Soft Delete:**
   - Produtos/categorias não são deletados fisicamente
   - Usar filtro `is_active = true` nas listagens
   - Manter histórico para relatórios

5. **Unidades de Medida:**
   - Sugestões: `un`, `kg`, `g`, `l`, `ml`, `m`, `cm`, `m²`, `cx`, `pct`
   - Permitir unidades customizadas

6. **Imagens:**
   - Fazer upload para Supabase Storage
   - Armazenar apenas URLs no banco
   - Suportar múltiplas imagens por produto
   - Primeira imagem é a principal

## Fluxos Recomendados

### Cadastro de Produto Completo

1. Criar categoria (se não existir)
2. Fazer upload das imagens para o storage
3. Criar produto com as URLs das imagens
4. Se tiver estoque inicial, usar endpoint de adicionar estoque

### Gestão de Estoque

1. Listar produtos com estoque baixo para alertas
2. Usar `add-stock` para entradas (compras)
3. Usar `adjust-stock` para correções e inventários
4. Saídas são automáticas nas vendas

### Busca e Filtros

1. Usar parâmetro `search` para busca rápida
2. Filtrar por `type` para separar produtos de serviços
3. Usar endpoint `low-stock` para alertas de reposição
