# Sistema de Produtos, Orçamentos e PDV - Documentação

## 📋 Visão Geral

Esta documentação contém todas as informações necessárias para implementar um sistema completo de **Produtos/Serviços**, **Orçamentos** e **PDV (Ponto de Venda)** no seu SaaS, utilizando Supabase como backend.

O sistema foi projetado para trabalhar com a estrutura existente do seu banco de dados, aproveitando as tabelas `companies` e `auth.users` já presentes.

## 📁 Estrutura da Documentação

### Features Principais

1. **[01_produtos_servicos.md](./01_produtos_servicos.md)** - Cadastro de Produtos e Serviços
   - Tabelas: `product_categories`, `products_services`, `inventory_movements`
   - Gestão de estoque automática
   - Categorização hierárquica
   - Suporte a produtos e serviços

2. **[02_orcamentos.md](./02_orcamentos.md)** - Sistema de Orçamentos
   - Tabelas: `customers`, `budgets`, `budget_items`
   - Geração automática de números
   - Controle de status e validade
   - Conversão para vendas

3. **[03_pdv.md](./03_pdv.md)** - PDV (Ponto de Venda)
   - Tabelas: `sales`, `sale_items`, `payment_installments`
   - Vendas à vista e parceladas
   - Múltiplos métodos de pagamento
   - Integração com estoque

### Arquivo de Migrations

**[migrations_complete.sql](./migrations_complete.sql)** - SQL completo para implementação
- Todas as tabelas
- Todas as funções e triggers
- Views úteis
- Configuração de RLS
- Pronto para executar no Supabase

## 🚀 Como Implementar

### Passo 1: Backup

Antes de qualquer coisa, faça backup do seu banco de dados:

```bash
# No Supabase Dashboard
Settings → Database → Backups
```

### Passo 2: Executar Migrations

Você tem duas opções:

#### Opção A: Executar tudo de uma vez

```sql
-- Execute o arquivo migrations_complete.sql no SQL Editor do Supabase
-- Isso criará todas as tabelas, funções, triggers e views
```

#### Opção B: Implementar por partes

Execute as migrations na ordem:

1. Primeiro execute a seção de **Produtos e Serviços**
2. Depois a seção de **Orçamentos**
3. Por último a seção de **PDV**

Isso permite testar cada feature isoladamente.

### Passo 3: Configurar RLS

As políticas básicas de RLS já estão incluídas no arquivo de migrations, mas você pode precisar ajustá-las conforme sua necessidade de permissões.

### Passo 4: Testar

Execute algumas queries de teste para garantir que tudo está funcionando:

```sql
-- Teste 1: Criar uma categoria
INSERT INTO product_categories (company_id, name, category_type)
SELECT id, 'Eletrônicos', 'product'
FROM companies
WHERE user_id = auth.uid()
LIMIT 1;

-- Teste 2: Criar um produto
-- (veja exemplos completos em cada documentação)
```

## 📊 Diagramas de Relacionamento

### Feature 1: Produtos e Serviços

```
companies (1) ──────< (N) product_categories
    │                         │
    │                         │
    └──────< (N) products_services
                    │
                    └──────< (N) inventory_movements
```

### Feature 2: Orçamentos

```
companies (1) ──────< (N) customers
    │                         │
    │                         │
    ├──────< (N) budgets ────┘
    │              │
    │              └──────< (N) budget_items
    │                              │
    └──────< (N) products_services ┘
```

### Feature 3: PDV

```
companies (1) ──────< (N) sales
    │                      │
    │                      ├──────< (N) sale_items
    │                      │
    │                      └──────< (N) payment_installments
    │
    └──────< (N) customers (opcional)
```

## 🔑 Principais Recursos

### Automações Incluídas

- ✅ Atualização automática de `updated_at` em todas as tabelas
- ✅ Cálculo automático de totais em orçamentos e vendas
- ✅ Controle automático de estoque nas vendas
- ✅ Geração automática de números sequenciais
- ✅ Validação de estoque antes de vender

### Funções Úteis

- `generate_budget_number(company_id)` - Gera número de orçamento
- `generate_sale_number(company_id)` - Gera número de venda
- `add_product_stock(product_id, quantity, ...)` - Adiciona estoque
- `cancel_sale(sale_id, reason)` - Cancela venda e reverte estoque
- `convert_budget_to_sale(budget_id, ...)` - Converte orçamento em venda

### Views Disponíveis

- `vw_low_stock_products` - Produtos com estoque baixo
- `vw_budgets_complete` - Orçamentos com informações completas
- `vw_sales_complete` - Vendas com totais calculados

## 💡 Exemplos Práticos

### Fluxo Completo: Do Orçamento à Venda

```sql
-- 1. Criar cliente
INSERT INTO customers (company_id, name, email, ...)
VALUES (...) RETURNING id;

-- 2. Criar orçamento
INSERT INTO budgets (company_id, customer_id, budget_number, ...)
VALUES (..., generate_budget_number('company-uuid'), ...) RETURNING id;

-- 3. Adicionar itens ao orçamento
INSERT INTO budget_items (budget_id, product_service_id, ...)
VALUES (...);

-- 4. Aprovar orçamento
UPDATE budgets SET status = 'approved', approved_at = NOW()
WHERE id = 'budget-uuid';

-- 5. Converter em venda
SELECT convert_budget_to_sale(
  'budget-uuid',
  'credit_card', -- método de pagamento
  3 -- parcelas
);

-- Pronto! Venda criada, estoque atualizado automaticamente
```

### Venda Direta (sem orçamento)

```sql
-- 1. Criar venda
INSERT INTO sales (company_id, sale_number, payment_method, ...)
VALUES (..., generate_sale_number('company-uuid'), 'pix', ...)
RETURNING id;

-- 2. Adicionar itens
INSERT INTO sale_items (sale_id, product_service_id, quantity, ...)
VALUES (...);

-- 3. Marcar como paga
UPDATE sales SET payment_status = 'paid' WHERE id = 'sale-uuid';

-- Estoque é atualizado automaticamente pelo trigger!
```

## 🔒 Segurança (RLS)

Todas as tabelas possuem Row Level Security habilitado. As políticas garantem que:

- Usuários só veem dados das suas próprias empresas
- Não é possível acessar dados de outras empresas
- Todas as operações (SELECT, INSERT, UPDATE, DELETE) são protegidas

Exemplo de política:

```sql
CREATE POLICY "Users can view products of their companies"
  ON products_services FOR SELECT
  USING (
    company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
  );
```

## 📈 Considerações de Performance

### Índices Criados

Todos os índices necessários já estão incluídos nas migrations:

- Índices em `company_id` (todas as tabelas)
- Índices em chaves estrangeiras
- Índices em campos de busca (nome, SKU, código de barras)
- Índices full-text search em campos de texto

### Para Grande Volume de Dados

Se você espera ter muitas vendas (>100k registros):

1. Considere particionar a tabela `sales` por data
2. Use views materializadas para relatórios
3. Implemente arquivamento de vendas antigas

Exemplos incluídos na documentação de cada feature.

## 🎨 Frontend - Integrações Sugeridas

### Supabase Client

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// Buscar produtos
const { data: products } = await supabase
  .from('products_services')
  .select('*, category:product_categories(*)')
  .eq('company_id', companyId)
  .eq('is_active', true)

// Criar venda
const { data: sale } = await supabase
  .rpc('convert_budget_to_sale', {
    p_budget_id: budgetId,
    p_payment_method: 'credit_card',
    p_installments: 3
  })
```

### Upload de Imagens

Configure um bucket no Supabase Storage:

```typescript
// Upload de imagem do produto
const { data, error } = await supabase.storage
  .from('products')
  .upload(`${companyId}/${productId}/${filename}`, file)

// Obter URL pública
const { data: { publicUrl } } = supabase.storage
  .from('products')
  .getPublicUrl(path)

// Salvar URL no produto
await supabase
  .from('products_services')
  .update({ 
    images: [...existingImages, publicUrl] 
  })
  .eq('id', productId)
```

## 🐛 Troubleshooting

### Erro: "Estoque insuficiente"

O trigger de venda verifica o estoque antes de permitir a venda. Se aparecer este erro:

1. Verifique o estoque atual: `SELECT current_stock FROM products_services WHERE id = '...'`
2. Adicione estoque se necessário: `SELECT add_product_stock('product-uuid', 100, ...)`

### Erro: "Orçamento não encontrado ou não aprovado"

A conversão de orçamento só funciona para orçamentos com status 'approved':

```sql
UPDATE budgets SET status = 'approved' WHERE id = 'budget-uuid';
```

### RLS bloqueando acesso

Se não conseguir acessar os dados mesmo com permissões corretas:

1. Verifique se está autenticado: `SELECT auth.uid()`
2. Verifique se a empresa pertence ao usuário: `SELECT * FROM companies WHERE user_id = auth.uid()`

## 📞 Suporte

Cada documentação de feature contém:

- Exemplos de uso completos
- Queries SQL prontas para usar
- Considerações de implementação
- Dicas de performance

Consulte os arquivos individuais para detalhes específicos.

## 🔄 Atualizações Futuras

Recursos que podem ser adicionados:

- [ ] Múltiplos estoques/filiais
- [ ] Transferências entre estoques
- [ ] Kits/Combos de produtos
- [ ] Controle de lotes e validade
- [ ] Integração com balanças/código de barras
- [ ] Emissão de NF-e/NFC-e
- [ ] Relatórios avançados (DRE, curva ABC)

## 📝 Licença

Esta documentação foi criada para uso no seu projeto SaaS. Sinta-se livre para adaptar conforme necessário.

---

**Criado em:** 2026-02-07  
**Versão:** 1.0.0  
**Plataforma:** Supabase (PostgreSQL 15+)
