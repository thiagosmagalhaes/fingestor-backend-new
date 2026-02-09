# Companies API - Documentação

## Endpoints de Companies (Empresas)

Todos os endpoints requerem autenticação via token JWT no header `Authorization`.

---

## 1. Listar todas as empresas

**Endpoint:** `GET /api/companies`

Retorna todas as empresas do usuário autenticado.

**Exemplo de requisição:**
```bash
curl -X GET "http://localhost:3001/api/companies" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Resposta de sucesso (200 OK):**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Minha Empresa LTDA",
    "cnpj": "12345678000199",
    "created_at": "2026-01-15T10:30:00.000Z",
    "updated_at": "2026-01-15T10:30:00.000Z"
  },
  {
    "id": "650e8400-e29b-41d4-a716-446655440001",
    "user_id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Outra Empresa S.A.",
    "cnpj": "98765432000188",
    "created_at": "2026-01-10T08:00:00.000Z",
    "updated_at": "2026-01-18T14:20:00.000Z"
  }
]
```

**Resposta quando não há empresas (200 OK):**
```json
[]
```

**Resposta de erro - token inválido (401 Unauthorized):**
```json
{
  "error": "Unauthorized",
  "message": "Token inválido ou expirado"
}
```

**Resposta de erro - erro no servidor (500 Internal Server Error):**
```json
{
  "error": "Erro ao buscar empresas"
}
```

---

## 2. Obter uma empresa específica

**Endpoint:** `GET /api/companies/:id`

Retorna os detalhes de uma empresa específica do usuário autenticado.

**Exemplo de requisição:**
```bash
curl -X GET "http://localhost:3001/api/companies/550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Resposta de sucesso (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Minha Empresa LTDA",
  "cnpj": "12345678000199",
  "created_at": "2026-01-15T10:30:00.000Z",
  "updated_at": "2026-01-15T10:30:00.000Z"
}
```

**Resposta de erro - empresa não encontrada (404 Not Found):**
```json
{
  "error": "Empresa não encontrada"
}
```

**Resposta de erro - ID ausente (400 Bad Request):**
```json
{
  "error": "ID da empresa é obrigatório"
}
```

**Resposta de erro - token inválido (401 Unauthorized):**
```json
{
  "error": "Unauthorized",
  "message": "Token inválido ou expirado"
}
```

**Resposta de erro - erro no servidor (500 Internal Server Error):**
```json
{
  "error": "Erro ao buscar empresa"
}
```

---

## 3. Criar uma nova empresa

**Endpoint:** `POST /api/companies`

Cria uma nova empresa para o usuário autenticado.

**Exemplo de requisição:**
```bash
curl -X POST "http://localhost:3001/api/companies" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Nova Empresa LTDA",
    "cnpj": "12345678000199"
  }'
```

**Body da requisição:**
```json
{
  "name": "Nova Empresa LTDA",
  "cnpj": "12345678000199"
}
```

**Campos:**
- `name` (obrigatório) - Nome da empresa (mínimo 3 caracteres)
- `cnpj` (opcional) - CNPJ da empresa (14 dígitos) ou CPF (11 dígitos)

**Nota:** O sistema detecta automaticamente se é Pessoa Física (CPF com 11 dígitos) ou Pessoa Jurídica (CNPJ com 14 dígitos) e cria categorias apropriadas para cada tipo.

**Validações:**
- Nome é obrigatório e deve ter pelo menos 3 caracteres
- CNPJ, se fornecido, deve ter exatamente 14 dígitos (apenas números)
- Aceita CNPJ formatado (com pontos, barras e hífen) - será limpo automaticamente
- **Categorias default:** Ao criar uma empresa, categorias padrão são criadas automaticamente:
  - **Pessoa Física (CPF - 11 dígitos)**: Salário, Freelance, Investimentos, Outros Rendimentos, Moradia, Alimentação, Transporte, Saúde, Educação, Lazer, Contas e Serviços, Outros
  - **Pessoa Jurídica (CNPJ - 14 dígitos ou sem documento)**: Vendas, Serviços, Investimentos, Folha de Pagamento, Aluguel, Impostos, Marketing, Fornecedores, Utilidades, Outros

**Resposta de sucesso (201 Created):**
```json
{
  "id": "750e8400-e29b-41d4-a716-446655440002",
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Nova Empresa LTDA",
  "cnpj": "12345678000199",
  "created_at": "2026-01-20T15:45:00.000Z",
  "updated_at": "2026-01-20T15:45:00.000Z"
}
```

**Resposta de erro - nome ausente (400 Bad Request):**
```json
{
  "error": "Nome da empresa é obrigatório"
}
```

**Resposta de erro - nome muito curto (400 Bad Request):**
```json
{
  "error": "Nome da empresa deve ter pelo menos 3 caracteres"
}
```

**Resposta de erro - CNPJ inválido (400 Bad Request):**
```json
{
  "error": "CNPJ deve ter 14 dígitos"
}
```

**Resposta de erro - usuário não autenticado (401 Unauthorized):**
```json
{
  "error": "Usuário não autenticado"
}
```

**Resposta de erro - erro no servidor (500 Internal Server Error):**
```json
{
  "error": "Erro ao criar empresa"
}
```

---

## 4. Atualizar uma empresa

**Endpoint:** `PUT /api/companies/:id`

Atualiza os dados de uma empresa existente do usuário autenticado.

**Exemplo de requisição:**
```bash
curl -X PUT "http://localhost:3001/api/companies/550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Empresa Atualizada LTDA",
    "cnpj": "98765432000188"
  }'
```

**Body da requisição:**
```json
{
  "name": "Empresa Atualizada LTDA",
  "cnpj": "98765432000188"
}
```

**Campos (todos opcionais):**
- `name` - Novo nome da empresa (se fornecido, deve ter pelo menos 3 caracteres)
- `cnpj` - Novo CNPJ da empresa (deve ter 14 dígitos, ou null para remover)

**Validações:**
- Se nome for fornecido, não pode ser vazio e deve ter pelo menos 3 caracteres
- Se CNPJ for fornecido, deve ter exatamente 14 dígitos
- Pode enviar apenas um campo para atualização parcial

**Resposta de sucesso (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Empresa Atualizada LTDA",
  "cnpj": "98765432000188",
  "created_at": "2026-01-15T10:30:00.000Z",
  "updated_at": "2026-01-20T16:00:00.000Z"
}
```

**Resposta de erro - empresa não encontrada (404 Not Found):**
```json
{
  "error": "Empresa não encontrada ou você não tem permissão para editá-la"
}
```

**Resposta de erro - ID ausente (400 Bad Request):**
```json
{
  "error": "ID da empresa é obrigatório"
}
```

**Resposta de erro - nome vazio (400 Bad Request):**
```json
{
  "error": "Nome da empresa não pode ser vazio"
}
```

**Resposta de erro - nome muito curto (400 Bad Request):**
```json
{
  "error": "Nome da empresa deve ter pelo menos 3 caracteres"
}
```

**Resposta de erro - CNPJ inválido (400 Bad Request):**
```json
{
  "error": "CNPJ deve ter 14 dígitos"
}
```

**Resposta de erro - erro no servidor (500 Internal Server Error):**
```json
{
  "error": "Erro ao atualizar empresa"
}
```

---

## 5. Deletar uma empresa

**Endpoint:** `DELETE /api/companies/:id`

Deleta uma empresa do usuário autenticado.

**⚠️ Atenção:** Esta ação é irreversível e deletará todos os dados relacionados à empresa (categorias, transações, etc.) devido ao CASCADE configurado no banco de dados.

**Exemplo de requisição:**
```bash
curl -X DELETE "http://localhost:3001/api/companies/550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Resposta de sucesso (200 OK):**
```json
{
  "message": "Empresa deletada com sucesso"
}
```

**Resposta de erro - ID ausente (400 Bad Request):**
```json
{
  "error": "ID da empresa é obrigatório"
}
```

**Resposta de erro - erro no servidor (500 Internal Server Error):**
```json
{
  "error": "Erro ao deletar empresa"
}
```

---

## Códigos de Status HTTP

| Código | Significado | Quando ocorre |
|--------|-------------|---------------|
| 200 | OK | Operação bem-sucedida (GET, PUT, DELETE) |
| 201 | Created | Empresa criada com sucesso |
| 400 | Bad Request | Dados inválidos ou campos obrigatórios ausentes |
| 401 | Unauthorized | Token JWT inválido ou expirado |
| 404 | Not Found | Empresa não encontrada |
| 500 | Internal Server Error | Erro no servidor ou banco de dados |

---

## Implementação no Frontend

### Hook customizado para companies

```typescript
// hooks/useCompanies.ts
import { useState, useEffect } from 'react';
import api from '../lib/api';

interface Company {
  id: string;
  user_id: string;
  name: string;
  cnpj: string | null;
  created_at: string;
  updated_at: string;
}

export function useCompanies() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/companies');
      setCompanies(response.data);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching companies:', err);
      setError(err.response?.data?.error || 'Erro ao buscar empresas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const createCompany = async (data: { name: string; cnpj?: string }) => {
    try {
      const response = await api.post('/api/companies', data);
      setCompanies([response.data, ...companies]);
      return response.data;
    } catch (err: any) {
      throw new Error(err.response?.data?.error || 'Erro ao criar empresa');
    }
  };

  const updateCompany = async (id: string, data: { name?: string; cnpj?: string }) => {
    try {
      const response = await api.put(`/api/companies/${id}`, data);
      setCompanies(companies.map(c => c.id === id ? response.data : c));
      return response.data;
    } catch (err: any) {
      throw new Error(err.response?.data?.error || 'Erro ao atualizar empresa');
    }
  };

  const deleteCompany = async (id: string) => {
    try {
      await api.delete(`/api/companies/${id}`);
      setCompanies(companies.filter(c => c.id !== id));
    } catch (err: any) {
      throw new Error(err.response?.data?.error || 'Erro ao deletar empresa');
    }
  };

  return {
    companies,
    loading,
    error,
    refetch: fetchCompanies,
    createCompany,
    updateCompany,
    deleteCompany,
  };
}
```

### Componente de listagem

```typescript
// components/CompaniesList.tsx
import { useCompanies } from '../hooks/useCompanies';

export function CompaniesList() {
  const { companies, loading, error, deleteCompany } = useCompanies();

  if (loading) return <div>Carregando...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="space-y-4">
      {companies.length === 0 ? (
        <p className="text-gray-500">Nenhuma empresa cadastrada</p>
      ) : (
        companies.map((company) => (
          <div key={company.id} className="border rounded-lg p-4">
            <h3 className="font-semibold text-lg">{company.name}</h3>
            {company.cnpj && (
              <p className="text-gray-600">CNPJ: {company.cnpj}</p>
            )}
            <div className="mt-2 space-x-2">
              <button
                onClick={() => {/* navegar para edição */}}
                className="text-blue-600 hover:underline"
              >
                Editar
              </button>
              <button
                onClick={async () => {
                  if (confirm('Tem certeza que deseja deletar esta empresa?')) {
                    await deleteCompany(company.id);
                  }
                }}
                className="text-red-600 hover:underline"
              >
                Deletar
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
```

### Formulário de criação

```typescript
// components/CompanyForm.tsx
import { useState } from 'react';
import { useCompanies } from '../hooks/useCompanies';

export function CompanyForm({ onSuccess }: { onSuccess?: () => void }) {
  const [name, setName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const { createCompany } = useCompanies();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await createCompany({ name, cnpj: cnpj || undefined });
      setName('');
      setCnpj('');
      onSuccess?.();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">
          Nome da Empresa *
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border rounded px-3 py-2"
          required
          minLength={3}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          CNPJ (opcional)
        </label>
        <input
          type="text"
          value={cnpj}
          onChange={(e) => setCnpj(e.target.value)}
          className="w-full border rounded px-3 py-2"
          placeholder="00.000.000/0000-00"
        />
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Criando...' : 'Criar Empresa'}
      </button>
    </form>
  );
}
```

---

## Testes com curl

### Criar empresa
```bash
curl -X POST http://localhost:3001/api/companies \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Minha Empresa","cnpj":"12345678000199"}'
```

### Listar empresas
```bash
curl -X GET http://localhost:3001/api/companies \
  -H "Authorization: Bearer SEU_TOKEN"
```

### Obter empresa específica
```bash
curl -X GET http://localhost:3001/api/companies/COMPANY_ID \
  -H "Authorization: Bearer SEU_TOKEN"
```

### Atualizar empresa
```bash
curl -X PUT http://localhost:3001/api/companies/COMPANY_ID \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Nome Atualizado"}'
```

### Deletar empresa
```bash
curl -X DELETE http://localhost:3001/api/companies/COMPANY_ID \
  -H "Authorization: Bearer SEU_TOKEN"
```

---

## Segurança

- ✅ Row Level Security (RLS) ativado no Supabase
- ✅ Usuário só pode acessar suas próprias empresas
- ✅ Validações de entrada em todos os endpoints
- ✅ Token JWT obrigatório em todas as rotas
- ✅ Sanitização de dados (trim, validação de formato)

---

## Notas Importantes

1. **Cascade Delete**: Ao deletar uma empresa, todas as categorias, transações e outros dados relacionados serão deletados automaticamente
2. **CNPJ/CPF**: O formato aceito é flexível - pode enviar com ou sem máscara. O sistema identifica automaticamente:
   - **11 dígitos = CPF (Pessoa Física)**: Cria categorias pessoais
   - **14 dígitos = CNPJ (Pessoa Jurídica)**: Cria categorias empresariais
3. **Categorias Automáticas**: Ao criar uma empresa, categorias padrão são criadas automaticamente para facilitar o início do uso
4. **RLS**: As policies do Supabase garantem que cada usuário só veja suas próprias empresas
5. **Updated_at**: É atualizado automaticamente em todas as operações de UPDATE
