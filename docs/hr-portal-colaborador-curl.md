# HR Portal (Colaborador) - Guia de cURL para Frontend

Este guia mostra o fluxo completo para implementar uma interface exclusiva do colaborador.

## 1. Login do Colaborador

Endpoint:
- POST /api/hr/payroll/portal/login

Body:
- email
- password

Exemplo cURL:

```bash
curl -X POST "http://localhost:3001/api/hr/payroll/portal/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "colaborador@empresa.com",
    "password": "SenhaForte#2026"
  }'
```

Resposta de sucesso (200) esperada:

```json
{
  "user": {
    "id": "auth-user-id",
    "email": "colaborador@empresa.com"
  },
  "employee": {
    "id": "colaborador-id",
    "empresa_id": "empresa-id",
    "nome_completo": "Nome do Colaborador",
    "email": "colaborador@empresa.com",
    "status": "active"
  },
  "session": {
    "accessToken": "jwt-access-token",
    "refreshToken": "jwt-refresh-token",
    "expiresIn": 3600,
    "expiresAt": 9999999999
  }
}
```

## 2. Salvar tokens no Frontend

Após o login, salve:
- session.accessToken
- session.refreshToken
- user
- employee

O accessToken deve ser enviado no header Authorization em todas as chamadas protegidas:
- Authorization: Bearer <accessToken>

## 3. Listar holerites do colaborador

Endpoint:
- GET /api/hr/payroll/portal/payslips

Exemplo cURL:

```bash
curl -X GET "http://localhost:3001/api/hr/payroll/portal/payslips" \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

Resposta de sucesso (200) esperada (exemplo):

```json
[
  {
    "id": "holerite-id-1",
    "lote_id": "lote-id",
    "empresa_id": "empresa-id",
    "colaborador_id": "colaborador-id",
    "competencia": "2026-06-01",
    "numero_pagina": 3,
    "arquivo_pdf": "empresa-id/2026-06-01/pagina-3.pdf",
    "status": "CONFIRMED",
    "created_at": "2026-06-05T12:00:00.000Z",
    "updated_at": "2026-06-05T12:00:00.000Z"
  }
]
```

## 4. Obter URL assinada de um holerite

Endpoint:
- GET /api/hr/payroll/portal/payslips/:id/url

Exemplo cURL:

```bash
curl -X GET "http://localhost:3001/api/hr/payroll/portal/payslips/<HOLERITE_ID>/url" \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

Resposta de sucesso (200) esperada:

```json
{
  "signedUrl": "https://..."
}
```

Observacao:
- Essa URL e temporaria (curta duracao). Gere novamente quando expirar.

## 4.1 Listar holerites agrupados por mes (opcional)

Endpoint:
- GET /api/hr/payroll/portal/payslips/monthly

Exemplo cURL:

```bash
curl -X GET "http://localhost:3001/api/hr/payroll/portal/payslips/monthly" \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

Resposta de sucesso (200) esperada:

```json
[
  {
    "competencia": "2026-06-01",
    "label": "Junho/2026",
    "items": [
      {
        "id": "holerite-id-1",
        "numero_pagina": 3,
        "status": "CONFIRMED",
        "created_at": "2026-06-05T12:00:00.000Z"
      }
    ]
  },
  {
    "competencia": "2026-05-01",
    "label": "Maio/2026",
    "items": [
      {
        "id": "holerite-id-2",
        "numero_pagina": 2,
        "status": "CONFIRMED",
        "created_at": "2026-05-05T12:00:00.000Z"
      }
    ]
  }
]
```

Regras atendidas pelo endpoint:
- retorna apenas holerites do colaborador autenticado
- retorna apenas status CONFIRMED
- ordena competencia em ordem decrescente

## 5. Fluxo recomendado para a tela exclusiva do colaborador

1. Enviar email/senha para POST /api/hr/payroll/portal/login.
2. Guardar accessToken e dados basicos do colaborador.
3. Carregar lista em GET /api/hr/payroll/portal/payslips.
4. Opcionalmente, carregar agrupado em GET /api/hr/payroll/portal/payslips/monthly.
5. Ao clicar em um item, chamar GET /api/hr/payroll/portal/payslips/:id/url.
6. Abrir o signedUrl em nova aba ou download.

## 6. Erros comuns para tratar no frontend

Login:
- 400: email/password ausentes
- 401: credenciais invalidas ou email nao confirmado
- 403: usuario sem permissao EMPLOYEE ou sem vinculo de colaborador

Consulta de dados:
- 401: token ausente, invalido ou expirado
- 404: holerite nao encontrado ou nao confirmado
- 500: erro interno

## 7. Exemplo com variaveis de ambiente (terminal)

```bash
BASE_URL="http://localhost:3001"
EMAIL="colaborador@empresa.com"
PASSWORD="SenhaForte#2026"

curl -X POST "$BASE_URL/api/hr/payroll/portal/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}"
```

Se quiser automatizar o fluxo completo no frontend:
- Use session.accessToken para montar um cliente HTTP autenticado.
- Intercepte 401 para redirecionar para login.
