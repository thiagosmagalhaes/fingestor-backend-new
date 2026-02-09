# API de Categorias - Documentação

Endpoints para gerenciar categorias de receitas e despesas das empresas.

**Base URL**: `/api/categories`

**Autenticação**: Todas as rotas requerem token JWT no header `Authorization: Bearer <token>`

---

## Endpoints

### 1. Listar Categorias
**GET** `/api/categories?companyId={companyId}`

Lista todas as categorias de uma empresa específica, ordenadas por tipo e nome.

#### Query Parameters:
- `companyId` (string, obrigatório) - ID da empresa

#### Respostas:

**200 OK**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "company_id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Salário",
    "type": "income",
    "color": "#10B981",
    "nature": null,
    "created_at": "2026-01-20T10:00:00Z"
  },
  {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "company_id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Alimentação",
    "type": "expense",
    "color": "#EF4444",
    "nature": "EXPENSE",
    "created_at": "2026-01-20T10:00:00Z"
  }
]
```

**400 Bad Request**
```json
{
  "error": "companyId é obrigatório"
}
```

#### Exemplo cURL:
```bash
curl -X GET "http://localhost:3000/api/categories?companyId=123e4567-e89b-12d3-a456-426614174000" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### 2. Obter Categoria Específica
**GET** `/api/categories/:id?companyId={companyId}`

Retorna os detalhes de uma categoria específica.

#### Path Parameters:
- `id` (string, obrigatório) - ID da categoria

#### Query Parameters:
- `companyId` (string, obrigatório) - ID da empresa

#### Respostas:

**200 OK**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "company_id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Salário",
  "type": "income",
  "color": "#10B981",
  "nature": null,
  "created_at": "2026-01-20T10:00:00Z"
}
```

**400 Bad Request**
```json
{
  "error": "companyId é obrigatório"
}
```

**404 Not Found**
```json
{
  "error": "Categoria não encontrada"
}
```

#### Exemplo cURL:
```bash
curl -X GET "http://localhost:3000/api/categories/550e8400-e29b-41d4-a716-446655440000?companyId=123e4567-e89b-12d3-a456-426614174000" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### 3. Criar Categoria
**POST** `/api/categories`

Cria uma nova categoria para uma empresa.

#### Body (JSON):
```json
{
  "companyId": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Investimentos",
  "type": "expense",
  "color": "#8B5CF6",
  "nature": "COST"
}
```

#### Campos:
- `companyId` (string, obrigatório) - ID da empresa
- `name` (string, obrigatório) - Nome da categoria (mínimo 2 caracteres)
- `type` (string, obrigatório) - Tipo: "income" ou "expense"
- `color` (string, obrigatório) - Cor em hexadecimal (#RRGGBB)
- `nature` (string, condicional) - Natureza: "COST" ou "EXPENSE" (obrigatório apenas para type="expense")

#### Validações:
- ✅ Nome deve ter pelo menos 2 caracteres
- ✅ Tipo deve ser "income" ou "expense"
- ✅ Cor deve estar no formato #RRGGBB
- ✅ Nature deve ser "COST" ou "EXPENSE" (se fornecido)
- ✅ Nature é obrigatória para categorias de despesa (type="expense")
- ✅ Nature não pode ser definida para categorias de receita (type="income")
- ✅ Não pode existir categoria com mesmo nome e tipo na empresa
- ✅ A empresa deve existir e pertencer ao usuário

#### Respostas:

**201 Created**
```json
{
  "id": "770e8400-e29b-41d4-a716-446655440002",
  "company_id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Investimentos",
  "type": "expense",
  "color": "#8B5CF6",
  "nature": "COST",
  "created_at": "2026-01-20T12:30:00Z"
}
```

**400 Bad Request**
```json
{
  "error": "Nome da categoria deve ter pelo menos 2 caracteres"
}
```

```json
{
  "error": "Nature é obrigatória para categorias de despesa (expense)"
}
```

```json
{
  "error": "Nature só pode ser definida para categorias de despesa (expense)"
}
```

**404 Not Found**
```json
{
  "error": "Empresa não encontrada ou você não tem permissão"
}
```

**409 Conflict**
```json
{
  "error": "Já existe uma categoria com este nome e tipo"
}
```

#### Exemplo cURL:
```bash
curl -X POST "http://localhost:3000/api/categories" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Investimentos",
    "type": "expense",
    "color": "#8B5CF6",
    "nature": "COST"
  }'
```

---

### 4. Atualizar Categoria
**PUT** `/api/categories/:id?companyId={companyId}`

Atualiza uma categoria existente. Todos os campos são opcionais.

#### Path Parameters:
- `id` (string, obrigatório) - ID da categoria

#### Query Parameters:
- `companyId` (string, obrigatório) - ID da empresa

#### Body (JSON):
```json
{
  "name": "Investimentos Financeiros",
  "type": "income",
  "color": "#3B82F6"
}
```

#### Campos (todos opcionais):
- `name` (string) - Nome da categoria (mínimo 2 caracteres)
- `type` (string) - Tipo: "income" ou "expense"
- `color` (string) - Cor em hexadecimal (#RRGGBB)
- `nature` (string) - Natureza: "COST" ou "EXPENSE" (apenas para type="expense")

#### Validações:
- ✅ Nome deve ter pelo menos 2 caracteres (se fornecido)
- ✅ Tipo deve ser "income" ou "expense" (se fornecido)
- ✅ Cor deve estar no formato #RRGGBB (se fornecido)
- ✅ Nature deve ser "COST" ou "EXPENSE" (se fornecido)
- ✅ Nature só pode ser definida para categorias de despesa
- ✅ Ao mudar para expense, nature é obrigatória
- ✅ Ao mudar para income, nature será automaticamente removida
- ✅ Não pode criar duplicata (mesmo nome e tipo na empresa)
- ✅ Pelo menos um campo deve ser fornecido

#### Respostas:

**200 OK**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "company_id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Investimentos Financeiros",
  "type": "income",
  "color": "#3B82F6",
  "nature": null,
  "created_at": "2026-01-20T10:00:00Z"
}
```

**400 Bad Request**
```json
{
  "error": "Nenhum campo para atualizar"
}
```

```json
{
  "error": "Nature só pode ser definida para categorias de despesa (expense)"
}
```

```json
{
  "error": "Nature é obrigatória ao mudar para categoria de despesa (expense)"
}
```

**404 Not Found**
```json
{
  "error": "Categoria não encontrada ou você não tem permissão"
}
```

**409 Conflict**
```json
{
  "error": "Já existe uma categoria com este nome e tipo"
}
```

#### Exemplo cURL:
```bash
curl -X PUT "http://localhost:3000/api/categories/550e8400-e29b-41d4-a716-446655440000?companyId=123e4567-e89b-12d3-a456-426614174000" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Investimentos Financeiros",
    "color": "#3B82F6"
  }'
```

---

### 5. Deletar Categoria
**DELETE** `/api/categories/:id?companyId={companyId}`

Deleta uma categoria.

#### Path Parameters:
- `id` (string, obrigatório) - ID da categoria

#### Query Parameters:
- `companyId` (string, obrigatório) - ID da empresa

#### Respostas:

**200 OK**
```json
{
  "message": "Categoria deletada com sucesso"
}
```

**400 Bad Request**
```json
{
  "error": "companyId é obrigatório"
}
```

**409 Conflict**
```json
{
  "error": "Não é possível deletar esta categoria pois existem transações vinculadas a ela. Remova ou reatribua as transações antes de deletar a categoria."
}
```

#### Exemplo cURL:
```bash
curl -X DELETE "http://localhost:3000/api/categories/550e8400-e29b-41d4-a716-446655440000?companyId=123e4567-e89b-12d3-a456-426614174000" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## Natureza de Despesas (Nature)

A coluna `nature` classifica despesas em dois tipos:

### COST (Custos)
Gastos diretamente relacionados à produção ou aquisição de bens/serviços vendidos:
- Matéria-prima
- Mão de obra direta
- Custos de produção
- Mercadorias para revenda

### EXPENSE (Despesas)
Gastos necessários para manter a operação do negócio:
- Aluguel
- Salários administrativos
- Marketing e publicidade
- Contas de água, luz, internet

**Exemplos de CURLs:**

```bash
# Criar categoria de CUSTO
curl -X POST "http://localhost:3000/api/categories" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Matéria Prima",
    "type": "expense",
    "color": "#DC2626",
    "nature": "COST"
  }'

# Criar categoria de DESPESA
curl -X POST "http://localhost:3000/api/categories" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Marketing",
    "type": "expense",
    "color": "#8B5CF6",
    "nature": "EXPENSE"
  }'

# Criar categoria de RECEITA (nature não é necessária)
curl -X POST "http://localhost:3000/api/categories" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Vendas",
    "type": "income",
    "color": "#10B981"
  }'

# Atualizar apenas a nature de uma categoria
curl -X PUT "http://localhost:3000/api/categories/550e8400-e29b-41d4-a716-446655440000?companyId=123e4567-e89b-12d3-a456-426614174000" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "nature": "COST"
  }'
```

---

## Exemplos de Cores Sugeridas

### Receitas (Income):
- 🟢 Verde: `#10B981` (Salário, Rendimentos)
- 🔵 Azul: `#3B82F6` (Investimentos, Dividendos)
- 🟡 Amarelo: `#F59E0B` (Freelance, Bônus)

### Despesas (Expense):
- 🔴 Vermelho: `#EF4444` (Alimentação, Moradia)
- 🟣 Roxo: `#8B5CF6` (Lazer, Entretenimento)
- 🟠 Laranja: `#F97316` (Transporte, Viagens)

---

## Segurança

- ✅ Todas as rotas requerem autenticação JWT
- ✅ Row Level Security (RLS) no Supabase garante isolamento de dados
- ✅ Validação de propriedade da empresa antes de criar categoria
- ✅ Validação de duplicatas (nome + tipo)
- ✅ Sanitização de inputs (trim, uppercase para cores)
