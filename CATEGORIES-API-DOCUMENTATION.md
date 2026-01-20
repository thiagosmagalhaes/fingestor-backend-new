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
    "created_at": "2026-01-20T10:00:00Z"
  },
  {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "company_id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Alimentação",
    "type": "expense",
    "color": "#EF4444",
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

#### Exemplo React (com Axios):
```typescript
const fetchCategories = async (companyId: string) => {
  const token = localStorage.getItem('access_token');
  
  try {
    const response = await axios.get(`/api/categories?companyId=${companyId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('Categorias:', response.data);
    return response.data;
  } catch (error) {
    console.error('Erro ao buscar categorias:', error);
  }
};
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
  "color": "#8B5CF6"
}
```

#### Campos:
- `companyId` (string, obrigatório) - ID da empresa
- `name` (string, obrigatório) - Nome da categoria (mínimo 2 caracteres)
- `type` (string, obrigatório) - Tipo: "income" ou "expense"
- `color` (string, obrigatório) - Cor em hexadecimal (#RRGGBB)

#### Validações:
- ✅ Nome deve ter pelo menos 2 caracteres
- ✅ Tipo deve ser "income" ou "expense"
- ✅ Cor deve estar no formato #RRGGBB
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
  "created_at": "2026-01-20T12:30:00Z"
}
```

**400 Bad Request**
```json
{
  "error": "Nome da categoria deve ter pelo menos 2 caracteres"
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
    "color": "#8B5CF6"
  }'
```

#### Exemplo React (com Axios):
```typescript
interface CreateCategoryData {
  companyId: string;
  name: string;
  type: 'income' | 'expense';
  color: string;
}

const createCategory = async (data: CreateCategoryData) => {
  const token = localStorage.getItem('access_token');
  
  try {
    const response = await axios.post('/api/categories', data, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Categoria criada:', response.data);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Erro:', error.response?.data.error);
    }
  }
};
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

#### Validações:
- ✅ Nome deve ter pelo menos 2 caracteres (se fornecido)
- ✅ Tipo deve ser "income" ou "expense" (se fornecido)
- ✅ Cor deve estar no formato #RRGGBB (se fornecido)
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
  "created_at": "2026-01-20T10:00:00Z"
}
```

**400 Bad Request**
```json
{
  "error": "Nenhum campo para atualizar"
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

#### Exemplo React (com Axios):
```typescript
const updateCategory = async (
  id: string,
  companyId: string,
  updates: Partial<CreateCategoryData>
) => {
  const token = localStorage.getItem('access_token');
  
  try {
    const response = await axios.put(
      `/api/categories/${id}?companyId=${companyId}`,
      updates,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('Categoria atualizada:', response.data);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Erro:', error.response?.data.error);
    }
  }
};
```

---

### 5. Deletar Categoria
**DELETE** `/api/categories/:id?companyId={companyId}`

Deleta uma categoria. ⚠️ **ATENÇÃO**: Por causa do CASCADE, todas as transações associadas também serão deletadas!

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

#### Exemplo cURL:
```bash
curl -X DELETE "http://localhost:3000/api/categories/550e8400-e29b-41d4-a716-446655440000?companyId=123e4567-e89b-12d3-a456-426614174000" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### Exemplo React (com Axios):
```typescript
const deleteCategory = async (id: string, companyId: string) => {
  const token = localStorage.getItem('access_token');
  
  // Confirmar antes de deletar
  if (!window.confirm('Tem certeza? Todas as transações desta categoria serão deletadas!')) {
    return;
  }
  
  try {
    const response = await axios.delete(
      `/api/categories/${id}?companyId=${companyId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    console.log(response.data.message);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Erro:', error.response?.data.error);
    }
  }
};
```

---

## Tipos TypeScript

```typescript
interface Category {
  id: string;
  company_id: string;
  name: string;
  type: 'income' | 'expense';
  color: string; // Formato: #RRGGBB
  created_at: string;
}

interface CreateCategoryData {
  companyId: string;
  name: string;
  type: 'income' | 'expense';
  color: string;
}

interface UpdateCategoryData {
  name?: string;
  type?: 'income' | 'expense';
  color?: string;
}
```

---

## Exemplos de Cores por Tipo

### Receitas (Income):
- 🟢 Verde: `#10B981` (Salário, Rendimentos)
- 🔵 Azul: `#3B82F6` (Investimentos, Dividendos)
- 🟡 Amarelo: `#F59E0B` (Freelance, Bônus)

### Despesas (Expense):
- 🔴 Vermelho: `#EF4444` (Alimentação, Moradia)
- 🟣 Roxo: `#8B5CF6` (Lazer, Entretenimento)
- 🟠 Laranja: `#F97316` (Transporte, Viagens)

---

## Exemplo de Hook React Completo

```typescript
import { useState, useEffect } from 'react';
import axios from 'axios';

interface Category {
  id: string;
  company_id: string;
  name: string;
  type: 'income' | 'expense';
  color: string;
  created_at: string;
}

export const useCategories = (companyId: string) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = async () => {
    const token = localStorage.getItem('access_token');
    setLoading(true);
    
    try {
      const response = await axios.get(`/api/categories?companyId=${companyId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      setCategories(response.data);
      setError(null);
    } catch (err) {
      setError('Erro ao carregar categorias');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const createCategory = async (data: Omit<Category, 'id' | 'created_at' | 'company_id'>) => {
    const token = localStorage.getItem('access_token');
    
    try {
      const response = await axios.post('/api/categories', 
        { ...data, companyId },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      setCategories([...categories, response.data]);
      return response.data;
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const updateCategory = async (id: string, updates: Partial<Category>) => {
    const token = localStorage.getItem('access_token');
    
    try {
      const response = await axios.put(
        `/api/categories/${id}?companyId=${companyId}`,
        updates,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      setCategories(categories.map(cat => 
        cat.id === id ? response.data : cat
      ));
      return response.data;
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const deleteCategory = async (id: string) => {
    const token = localStorage.getItem('access_token');
    
    try {
      await axios.delete(
        `/api/categories/${id}?companyId=${companyId}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      setCategories(categories.filter(cat => cat.id !== id));
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  useEffect(() => {
    if (companyId) {
      fetchCategories();
    }
  }, [companyId]);

  return {
    categories,
    loading,
    error,
    refetch: fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory
  };
};
```

---

## Fluxo de Uso Recomendado

1. **Ao criar empresa**: Categorias padrão são criadas automaticamente
2. **Listar categorias**: Use para popular dropdowns em formulários de transações
3. **Filtrar por tipo**: Separe income/expense no frontend para melhor UX
4. **Criar custom**: Permita usuário criar categorias personalizadas
5. **Editar raramente**: Categorias geralmente são configuradas uma vez
6. **Deletar com cuidado**: Avisar sobre CASCADE de transações

---

## Segurança

- ✅ Todas as rotas requerem autenticação JWT
- ✅ Row Level Security (RLS) no Supabase garante isolamento de dados
- ✅ Validação de propriedade da empresa antes de criar categoria
- ✅ Validação de duplicatas (nome + tipo)
- ✅ Sanitização de inputs (trim, uppercase para cores)
