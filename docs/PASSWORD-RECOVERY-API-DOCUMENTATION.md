# Documentação da API - Recuperação de Senha

## Instruções para Implementação no Frontend

Este documento descreve como implementar o fluxo de recuperação de senha no frontend. O processo consiste em duas etapas:

1. **Solicitar recuperação**: Usuário informa o email e recebe um link por email
2. **Redefinir senha**: Usuário acessa o link e define nova senha

---

## 1. Solicitar Recuperação de Senha

### Endpoint
```
POST /api/auth/forgot-password
```

### Headers
```
Content-Type: application/json
```

### Request Body
```json
{
  "email": "usuario@exemplo.com"
}
```

### Respostas Possíveis

#### ✅ Sucesso (200 OK)
```json
{
  "message": "Se o email existir em nossa base, você receberá instruções para recuperação de senha"
}
```

#### ❌ Erro - Email não fornecido (400 Bad Request)
```json
{
  "error": "Email é obrigatório"
}
```

#### ❌ Erro - Email inválido (400 Bad Request)
```json
{
  "error": "Email inválido"
}
```

#### ❌ Erro - Servidor (500 Internal Server Error)
```json
{
  "error": "Erro interno do servidor"
}
```

### Exemplo de CURL
```bash
curl -X POST http://localhost:3000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usuario@exemplo.com"
  }'
```

### Regras do Frontend

1. **Validação de email**: Validar formato antes de enviar
2. **Feedback ao usuário**: Sempre mostrar mensagem de sucesso, mesmo se o email não existir (segurança)
3. **Instruções claras**: Informar que o usuário deve verificar a caixa de entrada (incluindo spam)
4. **Botão desabilitado**: Desabilitar botão durante o processamento
5. **Timeout**: Implementar cooldown de 60 segundos antes de permitir novo envio

### Fluxo Esperado

```
1. Usuário clica em "Esqueci minha senha" na tela de login
2. Sistema exibe formulário solicitando email
3. Usuário digita email e clica em "Enviar"
4. Frontend valida email localmente
5. Frontend envia requisição para API
6. Frontend exibe mensagem de sucesso
7. Usuário recebe email com link de recuperação
8. Link contém token que expira em 1 hora
```

---

## 2. Redefinir Senha

### Endpoint
```
POST /api/auth/reset-password
```

### Headers
```
Content-Type: application/json
Authorization: Bearer {token_recebido_por_email}
```

### Request Body
```json
{
  "password": "novaSenha123",
  "confirmPassword": "novaSenha123"
}
```

### Respostas Possíveis

#### ✅ Sucesso (200 OK)
```json
{
  "message": "Senha redefinida com sucesso"
}
```

#### ❌ Erro - Campos obrigatórios (400 Bad Request)
```json
{
  "error": "Senha e confirmação são obrigatórias"
}
```

#### ❌ Erro - Senhas não coincidem (400 Bad Request)
```json
{
  "error": "As senhas não coincidem"
}
```

#### ❌ Erro - Senha curta (400 Bad Request)
```json
{
  "error": "A senha deve ter no mínimo 6 caracteres"
}
```

#### ❌ Erro - Token não fornecido (401 Unauthorized)
```json
{
  "error": "Token de recuperação não fornecido"
}
```

#### ❌ Erro - Token inválido/expirado (400 Bad Request)
```json
{
  "error": "Token de recuperação inválido ou expirado. Solicite um novo link."
}
```

#### ❌ Erro - Servidor (500 Internal Server Error)
```json
{
  "error": "Erro interno do servidor"
}
```

### Exemplo de CURL
```bash
curl -X POST http://localhost:3000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "password": "novaSenha123",
    "confirmPassword": "novaSenha123"
  }'
```

### Regras do Frontend

1. **Extrair token da URL**: Quando usuário acessar o link do email, extrair o token da query string ou hash
2. **Validações**:
   - Senha mínimo 6 caracteres
   - Senha e confirmação devem ser idênticas
   - Mostrar força da senha (opcional)
3. **Token no header**: Enviar token no header `Authorization: Bearer {token}`
4. **Feedback visual**: Mostrar indicador de força da senha
5. **Redirecionamento**: Após sucesso, redirecionar para login com mensagem de sucesso
6. **Tratamento de erro**: Se token expirado, oferecer botão para solicitar novo link

### Fluxo Esperado

```
1. Usuário clica no link recebido por email
2. Frontend extrai token da URL (geralmente após #access_token=)
3. Sistema exibe formulário de nova senha
4. Usuário digita nova senha e confirmação
5. Frontend valida localmente
6. Frontend envia requisição com token no header
7. API valida token e atualiza senha
8. Frontend redireciona para login com mensagem de sucesso
```

---

## Implementação da Rota de Recuperação no Frontend

### Exemplo de URL do Link de Recuperação

Quando o usuário recebe o email, o link terá este formato:
```
http://localhost:3000/reset-password#access_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...&type=recovery
```

### Extração do Token

```javascript
// No componente React/Vue da página /reset-password
const hashParams = new URLSearchParams(window.location.hash.substring(1));
const accessToken = hashParams.get('access_token');
const type = hashParams.get('type');

if (!accessToken || type !== 'recovery') {
  // Redirecionar para solicitar novo link
}
```

### Estados do Formulário

O frontend deve gerenciar os seguintes estados:

1. **Loading**: Enquanto processa requisição
2. **Success**: Senha alterada com sucesso
3. **Error**: Exibir mensagem de erro específica
4. **Token Expired**: Oferecer opção de solicitar novo link

---

## Segurança

### Boas Práticas Implementadas

1. **Não revelar existência de email**: A API sempre retorna sucesso em forgot-password
2. **Token com expiração**: Links expiram em 1 hora (configurado no Supabase)
3. **Token de uso único**: Após usar o token, ele é invalidado
4. **HTTPS obrigatório**: Em produção, usar apenas HTTPS
5. **Rate limiting**: Backend pode implementar limite de requisições por IP

### Recomendações para o Frontend

1. **Validar senha forte**: Implementar validação de complexidade
2. **Não armazenar token**: Usar token apenas para a requisição de reset
3. **Limpar formulário**: Após sucesso, limpar campos sensíveis
4. **Timeout de sessão**: Se usuário demorar muito, avisar que pode precisar de novo link

---

## Variáveis de Ambiente Necessárias

No backend, configurar:

```env
FRONTEND_URL=http://localhost:3000
# ou
FRONTEND_URL=https://app.fingestor.com
```

Esta URL é usada para o redirect_to do link de recuperação.

---

## Fluxo Completo (Diagrama)

```
┌─────────────────┐
│   Usuário       │
│   (Login)       │
└────────┬────────┘
         │
         ├─ Clica "Esqueci senha"
         │
         ▼
┌─────────────────────────┐
│  Tela: Solicitar Reset  │
│  Input: Email           │
└────────┬────────────────┘
         │
         ├─ POST /api/auth/forgot-password
         │
         ▼
┌─────────────────────────┐
│  Email com Link         │
│  Token de 1h            │
└────────┬────────────────┘
         │
         ├─ Clica no link
         │
         ▼
┌─────────────────────────┐
│  Tela: Nova Senha       │
│  Inputs: senha, confirm │
└────────┬────────────────┘
         │
         ├─ POST /api/auth/reset-password
         │  Header: Bearer {token}
         │
         ▼
┌─────────────────────────┐
│  Redirect: Login        │
│  Mensagem: Sucesso      │
└─────────────────────────┘
```

---

## Mensagens Recomendadas para UI

### Tela de Solicitar Recuperação

**Título**: "Recuperar senha"

**Descrição**: "Digite seu email e enviaremos instruções para redefinir sua senha."

**Sucesso**: "Email enviado! Verifique sua caixa de entrada e spam."

**Dica**: "O link expira em 1 hora."

### Tela de Redefinir Senha

**Título**: "Criar nova senha"

**Descrição**: "Digite sua nova senha abaixo."

**Requisitos**: 
- Mínimo 6 caracteres
- Senhas devem ser idênticas

**Sucesso**: "Senha alterada com sucesso! Você será redirecionado para o login."

**Erro Token**: "Este link expirou ou já foi usado. Solicite um novo link de recuperação."

---

## Testando a Integração

### 1. Testar Solicitar Recuperação

```bash
curl -X POST http://localhost:3000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "seu-email@teste.com"}'
```

Verifique o email recebido e copie o token.

### 2. Testar Redefinir Senha

```bash
curl -X POST http://localhost:3000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -d '{
    "password": "novaSenha123",
    "confirmPassword": "novaSenha123"
  }'
```

### 3. Testar Login com Nova Senha

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "seu-email@teste.com",
    "password": "novaSenha123"
  }'
```

---

## Troubleshooting

### "Token de recuperação não fornecido"
- **Causa**: Token não está no header Authorization
- **Solução**: Verificar se está enviando `Authorization: Bearer {token}`

### "Token inválido ou expirado"
- **Causa**: Token usado mais de uma vez ou passou 1 hora
- **Solução**: Solicitar novo link de recuperação

### "Email não chega"
- **Causa**: Email em spam ou configuração do Supabase
- **Solução**: Verificar pasta spam e configurações SMTP do Supabase

### "Erro interno do servidor"
- **Causa**: Erro não tratado no backend
- **Solução**: Verificar logs do servidor para detalhes
