# Authentication API - Documentação

## Endpoints de Autenticação

### 1. Registro de Usuário

**Endpoint:** `POST /api/auth/register`

Registra um novo usuário no sistema usando Supabase Auth.

**Exemplo de requisição:**
```bash
curl -X POST "http://localhost:3001/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usuario@exemplo.com",
    "password": "senha123",
    "confirmPassword": "senha123",
    "fullName": "João da Silva"
  }'
```

**Body da requisição:**
```json
{
  "email": "usuario@exemplo.com",
  "password": "senha123",
  "confirmPassword": "senha123",
  "fullName": "João da Silva"
}
```

**Validações:**
- Todos os campos são obrigatórios
- Email deve ser válido
- Senha deve ter no mínimo 6 caracteres
- `password` e `confirmPassword` devem ser iguais
- `fullName` deve ter no mínimo 3 caracteres

**Resposta de sucesso - com confirmação de email (201 Created):**
```json
{
  "message": "Cadastro realizado com sucesso! Verifique seu email para confirmar sua conta.",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "usuario@exemplo.com",
    "fullName": "João da Silva"
  },
  "emailConfirmationRequired": true
}
```

**Resposta de sucesso - sem confirmação de email (201 Created):**
```json
{
  "message": "Cadastro realizado com sucesso!",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "usuario@exemplo.com",
    "fullName": "João da Silva"
  },
  "session": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "v1.MRjcn4FHLs...",
    "expiresIn": 3600,
    "expiresAt": 1737504000
  },
  "emailConfirmationRequired": false
}
```

**Resposta de erro - campos faltando (400 Bad Request):**
```json
{
  "error": "Todos os campos são obrigatórios"
}
```

**Resposta de erro - email inválido (400 Bad Request):**
```json
{
  "error": "Email inválido"
}
```

**Resposta de erro - senhas não coincidem (400 Bad Request):**
```json
{
  "error": "As senhas não coincidem"
}
```

**Resposta de erro - senha muito curta (400 Bad Request):**
```json
{
  "error": "A senha deve ter pelo menos 6 caracteres"
}
```

**Resposta de erro - nome muito curto (400 Bad Request):**
```json
{
  "error": "Nome completo deve ter pelo menos 3 caracteres"
}
```

**Resposta de erro - email já cadastrado (409 Conflict):**
```json
{
  "error": "Email já cadastrado"
}
```

---

### 2. Login de Usuário

**Endpoint:** `POST /api/auth/login`

Realiza login do usuário no sistema.

**Exemplo de requisição:**
```bash
curl -X POST "http://localhost:3001/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usuario@exemplo.com",
    "password": "senha123"
  }'
```

**Body da requisição:**
```json
{
  "email": "usuario@exemplo.com",
  "password": "senha123"
}
```

**Validações:**
- Email e senha são obrigatórios
- Email deve ser válido

**Resposta de sucesso (200 OK):**
```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "usuario@exemplo.com",
    "fullName": "João da Silva"
  },
  "session": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "v1.MRjcn4FHLs...",
    "expiresIn": 3600,
    "expiresAt": 1737504000
  }
}
```

**Resposta de erro - campos faltando (400 Bad Request):**
```json
{
  "error": "Email e senha são obrigatórios"
}
```

**Resposta de erro - email inválido (400 Bad Request):**
```json
{
  "error": "Email inválido"
}
```

**Resposta de erro - credenciais inválidas (401 Unauthorized):**
```json
{
  "error": "Email ou senha inválidos"
}
```

**Resposta de erro - email não confirmado (401 Unauthorized):**
```json
{
  "error": "Email não confirmado. Verifique sua caixa de entrada."
}
```

---

### 3. Logout

**Endpoint:** `POST /api/auth/logout`

Realiza logout do usuário, invalidando o token de acesso.

**Exemplo de requisição:**
```bash
curl -X POST "http://localhost:3001/api/auth/logout" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Headers:**
- `Authorization: Bearer {accessToken}` (obrigatório)

**Resposta de sucesso (200 OK):**
```json
{
  "message": "Logout realizado com sucesso"
}
```

**Resposta de erro - token não fornecido (401 Unauthorized):**
```json
{
  "error": "Token não fornecido"
}
```

**Resposta de erro - erro ao fazer logout (400 Bad Request):**
```json
{
  "error": "Erro ao realizar logout"
}
```

---

### 4. Renovar Token

**Endpoint:** `POST /api/auth/refresh`

Renova o token de acesso usando o refresh token.

**Exemplo de requisição:**
```bash
curl -X POST "http://localhost:3001/api/auth/refresh" \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "v1.MRjcn4FHLs..."
  }'
```

**Body da requisição:**
```json
{
  "refreshToken": "v1.MRjcn4FHLs..."
}
```

**Resposta de sucesso (200 OK):**
```json
{
  "session": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "v1.NewRefreshToken...",
    "expiresIn": 3600,
    "expiresAt": 1737507600
  }
}
```

**Resposta de erro - refresh token não fornecido (400 Bad Request):**
```json
{
  "error": "Refresh token é obrigatório"
}
```

**Resposta de erro - refresh token inválido (401 Unauthorized):**
```json
{
  "error": "Refresh token inválido ou expirado"
}
```

---

### 5. Obter Dados do Usuário

**Endpoint:** `GET /api/auth/me`

Retorna os dados do usuário autenticado.

**Exemplo de requisição:**
```bash
curl -X GET "http://localhost:3001/api/auth/me" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Headers:**
- `Authorization: Bearer {accessToken}` (obrigatório)

**Resposta de sucesso (200 OK):**
```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "usuario@exemplo.com",
    "fullName": "João da Silva",
    "createdAt": "2026-01-15T10:30:00.000Z"
  }
}
```

**Resposta de erro - token não fornecido (401 Unauthorized):**
```json
{
  "error": "Token não fornecido"
}
```

**Resposta de erro - token inválido (401 Unauthorized):**
```json
{
  "error": "Token inválido ou expirado"
}
```

**Resposta de erro - usuário não encontrado (401 Unauthorized):**
```json
{
  "error": "Usuário não encontrado"
}
```

---

## Fluxo de Autenticação

### 1. Registro
```
Cliente → POST /api/auth/register → Supabase Auth
         ↓
    Verifica email → Envia email de confirmação (se configurado)
         ↓
    Retorna user e session (ou só user se precisar confirmar)
```

### 2. Login
```
Cliente → POST /api/auth/login → Supabase Auth
         ↓
    Valida credenciais
         ↓
    Retorna user e session (accessToken + refreshToken)
```

### 3. Requisições Autenticadas
```
Cliente → Adiciona "Authorization: Bearer {accessToken}"
         ↓
    Middleware valida token
         ↓
    Processa requisição
```

### 4. Renovação de Token
```
Cliente → Quando accessToken expira
         ↓
    POST /api/auth/refresh com refreshToken
         ↓
    Recebe novo accessToken
```

---

## Implementação no Frontend

### Setup Inicial

```typescript
// lib/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
});

// Interceptor para adicionar token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para renovar token expirado
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const { data } = await axios.post(
            `${import.meta.env.VITE_API_URL}/api/auth/refresh`,
            { refreshToken }
          );

          localStorage.setItem('accessToken', data.session.accessToken);
          localStorage.setItem('refreshToken', data.session.refreshToken);

          originalRequest.headers.Authorization = `Bearer ${data.session.accessToken}`;
          return api(originalRequest);
        } catch (refreshError) {
          // Token inválido, redirecionar para login
          localStorage.clear();
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;
```

### Hook de Autenticação

```typescript
// hooks/useAuth.ts
import { useState } from 'react';
import api from '../lib/api';

interface User {
  id: string;
  email: string;
  fullName: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const register = async (data: {
    email: string;
    password: string;
    confirmPassword: string;
    fullName: string;
  }) => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.post('/api/auth/register', data);

      if (response.data.session) {
        // Login automático
        localStorage.setItem('accessToken', response.data.session.accessToken);
        localStorage.setItem('refreshToken', response.data.session.refreshToken);
        setUser(response.data.user);
      }

      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao registrar');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.post('/api/auth/login', { email, password });

      localStorage.setItem('accessToken', response.data.session.accessToken);
      localStorage.setItem('refreshToken', response.data.session.refreshToken);
      setUser(response.data.user);

      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao fazer login');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.post('/api/auth/logout');
    } catch (err) {
      console.error('Erro ao fazer logout', err);
    } finally {
      localStorage.clear();
      setUser(null);
    }
  };

  const getMe = async () => {
    try {
      const response = await api.get('/api/auth/me');
      setUser(response.data.user);
      return response.data.user;
    } catch (err) {
      localStorage.clear();
      throw err;
    }
  };

  return {
    user,
    loading,
    error,
    register,
    login,
    logout,
    getMe,
  };
}
```

### Componente de Login

```typescript
// components/LoginForm.tsx
import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, loading, error } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await login(email, password);
      // Redirecionar para dashboard
      window.location.href = '/dashboard';
    } catch (err) {
      // Erro já está no state
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Senha"
        required
      />
      {error && <p className="error">{error}</p>}
      <button type="submit" disabled={loading}>
        {loading ? 'Entrando...' : 'Entrar'}
      </button>
    </form>
  );
}
```

### Componente de Registro

```typescript
// components/RegisterForm.tsx
import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

export function RegisterForm() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
  });
  const { register, loading, error } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const result = await register(formData);
      
      if (result.emailConfirmationRequired) {
        alert('Verifique seu email para confirmar sua conta!');
      } else {
        window.location.href = '/dashboard';
      }
    } catch (err) {
      // Erro já está no state
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={formData.fullName}
        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
        placeholder="Nome completo"
        required
      />
      <input
        type="email"
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        placeholder="Email"
        required
      />
      <input
        type="password"
        value={formData.password}
        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
        placeholder="Senha"
        required
      />
      <input
        type="password"
        value={formData.confirmPassword}
        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
        placeholder="Confirmar senha"
        required
      />
      {error && <p className="error">{error}</p>}
      <button type="submit" disabled={loading}>
        {loading ? 'Cadastrando...' : 'Cadastrar'}
      </button>
    </form>
  );
}
```

---

## Configuração do Supabase

Para que a confirmação de email funcione corretamente, configure no Supabase Dashboard:

1. Acesse: **Authentication** → **Settings** → **Auth Providers**
2. Configure **Email**:
   - Enable email confirmations: ✅ (se quiser confirmação obrigatória)
   - Confirm email URL: `http://localhost:8081/confirm-email` (seu frontend)

3. Configure os templates de email em **Email Templates**

---

## Códigos de Status HTTP

| Código | Significado | Quando ocorre |
|--------|-------------|---------------|
| 200 | OK | Login, logout, refresh e get user bem-sucedidos |
| 201 | Created | Registro bem-sucedido |
| 400 | Bad Request | Dados inválidos ou faltando |
| 401 | Unauthorized | Credenciais inválidas ou token expirado |
| 409 | Conflict | Email já cadastrado |
| 500 | Internal Server Error | Erro no servidor |

---

## Segurança

- ✅ Senhas são criptografadas pelo Supabase
- ✅ Tokens JWT com expiração configurável
- ✅ Refresh tokens para renovação de sessão
- ✅ Validação de email no registro
- ✅ Proteção contra força bruta (Rate limiting do Supabase)
- ✅ CORS configurado

---

## Testes com curl

### Registrar usuário
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"teste@exemplo.com","password":"senha123","confirmPassword":"senha123","fullName":"Teste Usuario"}'
```

### Fazer login
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"teste@exemplo.com","password":"senha123"}'
```

### Obter dados do usuário
```bash
curl -X GET http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

### Fazer logout
```bash
curl -X POST http://localhost:3001/api/auth/logout \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

### Renovar token
```bash
curl -X POST http://localhost:3001/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"SEU_REFRESH_TOKEN"}'
```
