# Caixa Mestra - Backend API

Backend em Node.js + TypeScript + Express + Supabase para o sistema de gestão financeira Caixa Mestra.

## 🚀 Tecnologias

- **Node.js** - Runtime JavaScript
- **TypeScript** - Superset tipado do JavaScript
- **Express** - Framework web
- **Supabase** - Backend-as-a-Service (PostgreSQL, Auth, Storage)
- **Zod** - Validação de schemas

## 📋 Pré-requisitos

- Node.js 18+ instalado
- Conta no Supabase
- npm ou yarn

## 🔧 Instalação

1. **Clone o repositório e entre na pasta backend:**
   ```bash
   cd backend
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Configure as variáveis de ambiente:**
   
   Copie o arquivo `.env.example` para `.env`:
   ```bash
   copy .env.example .env
   ```
   
   Edite o arquivo `.env` com suas credenciais do Supabase:
   ```env
   PORT=3001
   NODE_ENV=development
   
   # Encontre esses valores em: Supabase Dashboard > Settings > API
   SUPABASE_URL="https://your-project.supabase.co"
   SUPABASE_PUBLISHABLE_KEY="your-anon-key-here"
   
   CORS_ORIGIN=http://localhost:5173
   ```

4. **Configure o banco de dados no Supabase:**
   
   Vá para o SQL Editor no Supabase Dashboard e execute:
   
   ```sql
   -- Tabela de empresas
   CREATE TABLE companies (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     name TEXT NOT NULL,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- Tabela de categorias
   CREATE TABLE categories (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     name TEXT NOT NULL,
     type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
     color TEXT,
     icon TEXT,
     company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- Tabela de cartões de crédito
   CREATE TABLE credit_cards (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     name TEXT NOT NULL,
     last_four_digits TEXT,
     closing_day INTEGER NOT NULL,
     due_day INTEGER NOT NULL,
     limit DECIMAL(12, 2),
     company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- Tabela de transações
   CREATE TABLE transactions (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     description TEXT NOT NULL,
     amount DECIMAL(12, 2) NOT NULL,
     type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
     is_paid BOOLEAN DEFAULT FALSE,
     due_date TIMESTAMP WITH TIME ZONE NOT NULL,
     paid_date TIMESTAMP WITH TIME ZONE,
     category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
     credit_card_id UUID REFERENCES credit_cards(id) ON DELETE SET NULL,
     company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
     is_recurring BOOLEAN DEFAULT FALSE,
     notes TEXT,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- Índices para performance
   CREATE INDEX idx_transactions_company ON transactions(company_id);
   CREATE INDEX idx_transactions_due_date ON transactions(due_date);
   CREATE INDEX idx_transactions_is_paid ON transactions(is_paid);
   CREATE INDEX idx_categories_company ON categories(company_id);
   CREATE INDEX idx_credit_cards_company ON credit_cards(company_id);
   ```

5. **Execute as funções RPC do Supabase:**
   
   No mesmo SQL Editor, execute o conteúdo do arquivo `supabase-functions.sql`:
   ```bash
   # O arquivo contém as funções:
   # - get_dashboard_summary(p_company_id, p_start_date, p_end_date)
   # - get_cash_flow_chart_data(p_company_id, p_months)
   ```

## 🏃 Executando o projeto

### Modo desenvolvimento (com hot reload):
```bash
npm run dev
```

### Build para produção:
```bash
npm run build
npm start
```

O servidor estará rodando em `http://localhost:3001`

## 📡 Endpoints da API

### Health Check
- `GET /health` - Verifica se a API está rodando

### Dashboard

#### Todos os dados em uma requisição
- `GET /api/dashboard/all?companyId={uuid}` - Retorna todos os dados do dashboard

#### Endpoints individuais
- `GET /api/dashboard/summary?companyId={uuid}` - Resumo financeiro do mês
- `GET /api/dashboard/overdue?companyId={uuid}` - Transações vencidas
- `GET /api/dashboard/cash-flow?companyId={uuid}` - Fluxo de caixa (últimos 6 meses)
- `GET /api/dashboard/category-breakdown?companyId={uuid}` - Breakdown por categoria
- `GET /api/dashboard/recent-transactions?companyId={uuid}` - 10 transações mais recentes
- `GET /api/dashboard/credit-card-invoices?companyId={uuid}` - Faturas de cartão de crédito

### Exemplo de resposta - Summary:
```json
{
  "balance": 5000.00,
  "totalIncome": 10000.00,
  "totalExpense": 5000.00,
  "pendingIncome": 2000.00,
  "pendingExpense": 1500.00
}
```

### Exemplo de resposta - Dashboard All:
```json
{
  "summary": {
    "balance": 5000.00,
    "totalIncome": 10000.00,
    "totalExpense": 5000.00,
    "pendingIncome": 2000.00,
    "pendingExpense": 1500.00
  },
  "overdue": {
    "count": 3,
    "total": 850.00
  },
  "cashFlow": [...],
  "categoryBreakdown": [...],
  "recentTransactions": [...],
  "creditCardInvoices": [...]
}
```

## 🗄️ Modelos do Banco de Dados

### Company
- Empresa/Organização

### Category
- Categorias de receitas e despesas

### CreditCard
- Cartões de crédito com dias de fechamento e vencimento

### Transaction
- Transações financeiras (receitas e despesas)
- Tipos: `income`, `expense`
- Status: `paid`, `pending`, `overdue`

## 🛠️ Scripts disponíveis

- `npm run dev` - Inicia servidor em modo desenvolvimento
- `npm run build` - Compila TypeScript para JavaScript
- `npm start` - Inicia servidor em produção

## 📁 Estrutura do projeto

```
backend/
├── prisma/
│   └── schema.prisma          # Schema do banco de dados
├── src/
│   src/
│   ├── config/
│   │   └── database.ts        # Configuração do Supabase Client
│   │   └── errorHandler.ts    # Middleware de erros
│   ├── routes/
│   │   └── dashboard.routes.ts  # Rotas do dashboard
│   ├── types/
│   │   └── dashboard.types.ts  # Tipos TypeScript
│   └── index.ts               # Entrada da aplicação
├── .env                       # Variáveis de ambiente (não commitar)
├── .env.example              # Exemplo de variáveis
├── package.json
└── tsconfig.json
```

## 🔒 Segurança

- ✅ Autenticação JWT com Supabase em todas as rotas do dashboard
- ✅ Validação de `companyId` obrigatória em todas as rotas
- ✅ CORS configurado
- ✅ Variáveis sensíveis em `.env`
- ✅ `.env` no `.gitignore`
- ⚠️ TODO: Implementar autorização (verificar se usuário tem acesso à empresa)
- ⚠️ TODO: Implementar rate limiting

## 📝 Próximos passos

- [ ] Adicionar autenticação JWT
- [ ] Implementar CRUD de transações
- [ ] Implementar CRUD de categorias
- [ ] Implementar CRUD de cartões de crédito
- [ ] Adicionar testes unitários e de integração
- [ ] Implementar paginação nas listagens
- [ ] Adicionar filtros avançados
- [ ] Implementar relatórios em PDF

## 🤝 Contribuindo

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT.
