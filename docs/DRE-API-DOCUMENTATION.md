# API do DRE - Documentação

Endpoint para obter dados do DRE (Demonstrativo de Resultados do Exercício).

**Base URL**: `/api/dashboard/dre`

**Autenticação**: Requer token JWT no header `Authorization: Bearer <token>`

---

## Endpoint

### GET /api/dashboard/dre

Retorna dados do DRE com base no período solicitado.

#### Query Parameters:
- `companyId` (string, obrigatório) - ID da empresa
- `period` (string, opcional) - Período do relatório:
  - `current` (padrão) - DRE de um mês específico
  - `12months` - DRE dos últimos 12 meses, mês a mês
- `month` (number, opcional) - Mês de 1 a 12 (apenas para period=current, padrão: mês atual)
- `year` (number, opcional) - Ano no formato YYYY (apenas para period=current, padrão: ano atual)

#### Respostas:

**200 OK - DRE do Mês Atual (period=current)**
```json
{
  "current": {
    "receitas": 15000.00,
    "receitas_categorias": [
      {
        "category_name": "Vendas",
        "category_color": "#22c55e",
        "total": 10000.00
      },
      {
        "category_name": "Serviços",
        "category_color": "#3b82f6",
        "total": 5000.00
      }
    ],
    "custos": 5000.00,
    "custos_categorias": [
      {
        "category_name": "Fornecedores",
        "category_color": "#14b8a6",
        "total": 5000.00
      }
    ],
    "despesas": 3000.00,
    "despesas_categorias": [
      {
        "category_name": "Aluguel",
        "category_color": "#f97316",
        "total": 1500.00
      },
      {
        "category_name": "Marketing",
        "category_color": "#ec4899",
        "total": 1000.00
      },
      {
        "category_name": "Utilidades",
        "category_color": "#6366f1",
        "total": 500.00
      }
    ],
    "lucro_bruto": 10000.00,
    "lucro_liquido": 7000.00
  }
}
```

**200 OK - DRE dos Últimos 12 Meses (period=12months)**
```json
{
  "monthly": [
    {
      "month": "2025-02",
      "month_name": "Fev/2025",
      "receitas": 12000.00,
      "receitas_categorias": [
        {
          "category_name": "Vendas",
          "category_color": "#22c55e",
          "total": 8000.00
        },
        {
          "category_name": "Serviços",
          "category_color": "#3b82f6",
          "total": 4000.00
        }
      ],
      "custos": 4000.00,
      "custos_categorias": [
        {
          "category_name": "Fornecedores",
          "category_color": "#14b8a6",
          "total": 4000.00
        }
      ],
      "despesas": 2500.00,
      "despesas_categorias": [
        {
          "category_name": "Aluguel",
          "category_color": "#f97316",
          "total": 1500.00
        },
        {
          "category_name": "Marketing",
          "category_color": "#ec4899",
          "total": 1000.00
        }
      ],
      "lucro_bruto": 8000.00,
      "lucro_liquido": 5500.00
    },
    {
      "month": "2025-03",
      "month_name": "Mar/2025",
      "receitas": 15000.00,
      "receitas_categorias": [
        {
          "category_name": "Vendas",
          "category_color": "#22c55e",
          "total": 10000.00
   receitas_categorias` (array) - Detalhamento das receitas por categoria
  - `category_name` (string) - Nome da categoria
  - `category_color` (string) - Cor da categoria em hexadecimal
  - `total` (number) - Total da categoria
- `custos` (number) - Soma de todas as transações de despesa com nature='COST' pagas no período
- `custos_categorias` (array) - Detalhamento dos custos por categoria
- `despesas` (number) - Soma de todas as transações de despesa com nature='EXPENSE' pagas no período
- `despesas_categorias` (array) - Detalhamento das despesas por categoria
          "category_name": "Serviços",
          "category_color": "#3b82f6",
          "total": 5000.00
        }
      ],
      "custos": 5000.00,
      "custos_categorias": [
        {
          "category_name": "Fornecedores",
          "category_color": "#14b8a6",
          "total": 5000.00
        }
      ],
      "despesas": 3000.00,
      "despesas_categorias": [
        {
          "category_name": "Aluguel",
          "category_color": "#f97316",
          "total": 1500.00
        },
        {
          "category_name": "Marketing",
          "category_color": "#ec4899",
          "total": 1000.00
        },
        {
          "category_name": "Utilidades",
          "category_color": "#6366f1",
          "total": 500.00
        }
      ],
      "lucro_bruto": 10000.00,
      "lucro_liquido": 7000.00
    }
    // ... mais 10 meses
  ]
}
```

**400 Bad Request**
```json
{
  "error": "companyId é obrigatório"
}
```

```json
{
  "error": "period deve ser \"current\" ou \"12months\""
}
```

```json
{
  "error": "month deve ser um número entre 1 e 12"
}
```

```json
{
  "error": "year deve ser um ano válido (2000-2100)"
}
```

**500 Internal Server Error**
```json
{
  "error": "Erro ao buscar dados do DRE"
}
```

---

## Estrutura dos Dados

### Campos do DRE:
- `receitas` (number) - Soma de todas as transações de receita (type='income') pagas no período
- `custos` (number) - Soma de todas as transações de despesa com nature='COST' pagas no período
- `despesas` (number) - Soma de todas as transações de despesa com nature='EXPENSE' pagas no período
- `lucro_bruto` (number) - Receitas - Custos
- `lucro_liquido` (number) - Receitas - Custos - Despesas

### Campos Adicionais (apenas em period=12months):
- `month` (string) - Mês no formato YYYY-MM (ex: "2025-03")
- `month_name` (string) - Nome do mês formatado (ex: "Mar/2025")

---

## Exemplos de cURL

### DRE do Mês Atual
```bash
curl -X GET "http://localhost:3000/api/dashboard/dre?companyId=123e4567-e89b-12d3-a456-426614174000&period=current" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### DRE de um Mês Específico (Janeiro de 2026)
```bash
curl -X GET "http://localhost:3000/api/dashboard/dre?companyId=123e4567-e89b-12d3-a456-426614174000&period=current&month=1&year=2026" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### DRE de Dezembro de 2025
```bash
curl -X GET "http://localhost:3000/api/dashboard/dre?companyId=123e4567-e89b-12d3-a456-426614174000&period=current&month=12&year=2025" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### DRE dos Últimos 12 Meses
```bash
curl -X GET "http://localhost:3000/api/dashboard/dre?companyId=123e4567-e89b-12d3-a456-426614174000&period=12months" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### DRE com Período Padrão (current)
```bash
curl -X GET "http://localhost:3000/api/dashboard/dre?companyId=123e4567-e89b-12d3-a456-426614174000" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## Regras de Negócio

### Classificação de Transações:
1. **Receitas**: Todas as transações com `type='income'` e `status='paid'`
2. **Custos**: Transações com `type='expense'`, `nature='COST'` e `status='paid'`
3. **Despesas**: Transações com `type='expense'`, `nature='EXPENSE'` e `status='paid'`

### Observações:
- ✅ Apenas transações com status='paid' são incluídas no cálculo
- ✅ Transações de despesa sem `nature` definida são consideradas como DESPESAS
- ✅ O período `12months` retorna os últimos 12 meses incluindo o mês atual
- ✅ Os valores são sempre positivos nos campos individuais
- ✅ Lucro bruto e líquido podem ser negativos (prejuízo)
- ✅ Categorias são agrupadas e ordenadas por valor (maior para menor)
- ✅ Cada grupo (receitas, custos, despesas) tem seu array de categorias detalhado
- ✅ Parâmetros `month` e `year` são opcionais e funcionam apenas com `period=current`
- ✅ Se `month` ou `year` não forem informados, usa o mês/ano atual

### Diferença entre COST e EXPENSE:
- **COST (Custos)**: Gastos relacionados à produção/aquisição de produtos/serviços vendidos
  - Exemplos: Matéria-prima, Fornecedores, Mercadorias
- **EXPENSE (Despesas)**: Gastos operacionais necessários para manter o negócio
  - Exemplos: Aluguel, Salários administrativos, Marketing, Contas de luz/água

---

## Cálculos do DRE

```
Receitas Brutas           = Σ transações (type='income', status='paid')
(-) Custos                = Σ transações (type='expense', nature='COST', status='paid')
─────────────────────────
= Lucro Bruto            = Receitas - Custos

(-) Despesas Operacionais = Σ transações (type='expense', nature='EXPENSE', status='paid')
─────────────────────────
= Lucro Líquido          = Lucro Bruto - Despesas
```

---

## Exemplo de Uso

### Cenário: Empresa teve no mês
- Vendas: R$ 50.000,00
- Compra de Mercadorias (COST): R$ 20.000,00
- Aluguel (EXPENSE): R$ 3.000,00
- Salreceitas_categorias": [
      {
        "category_name": "Vendas",
        "category_color": "#22c55e",
        "total": 50000.00
      }
    ],
    "custos": 20000.00,
    "custos_categorias": [
      {
        "category_name": "Fornecedores",
        "category_color": "#14b8a6",
        "total": 20000.00
      }
    ],
    "despesas": 15000.00,
    "despesas_categorias": [
      {
        "category_name": "Salários",
        "category_color": "#ef4444",
        "total": 10000.00
      },
      {
        "category_name": "Aluguel",
        "category_color": "#f97316",
        "total": 3000.00
      },
      {
        "category_name": "Marketing",
        "category_color": "#ec4899",
        "total": 2000.00
      }
    ]$ 2.000,00

### Resultado do DRE:
```json
{
  "current": {
    "receitas": 50000.00,
    "custos": 20000.00,
    "despesas": 15000.00,
    "lucro_bruto": 30000.00,
    "lucro_liquido": 15000.00
  }
}
```

### Interpretação:
- Margem Bruta = (Lucro Bruto / Receitas) × 100 = 60%
- Margem Líquida = (Lucro Líquido / Receitas) × 100 = 30%

---

## Segurança

- ✅ Requer autenticação JWT
- ✅ Row Level Security (RLS) no Supabase garante isolamento de dados
- ✅ Apenas transações da empresa especificada são incluídas
- ✅ Validação de parâmetros obrigatórios
