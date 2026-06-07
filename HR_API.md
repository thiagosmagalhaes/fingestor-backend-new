# HR Module — API Integration Guide

Frontend integration reference for the Human Resources module.  
Base URL for all requests: `https://your-api.example.com`

> **Authentication**: All endpoints require a valid Supabase JWT in the `Authorization: Bearer <token>` header.

---

## Table of Contents

1. [Employees (Manager)](#1-employees-manager)
2. [Payroll Batches (Manager)](#2-payroll-batches-manager)
3. [Batch Review (Manager)](#3-batch-review-manager)
4. [Employee Portal (Self-service)](#4-employee-portal-self-service)

---

## 1. Employees (Manager)

### 1.1 List Employees

Returns all employees for a given company. Supports filtering by status and free-text search (name or CPF).

**GET** `/api/hr/employees`

| Parameter   | Type   | Required | Description                                    |
|-------------|--------|----------|------------------------------------------------|
| companyId   | string | Yes      | UUID of the company                            |
| status      | string | No       | Filter: `active`, `inactive`, or `on_leave`    |
| search      | string | No       | Partial match on employee name or CPF          |

```bash
curl -X GET \
  "https://your-api.example.com/api/hr/employees?companyId=11111111-1111-1111-1111-111111111111&status=active&search=João" \
  -H "Authorization: Bearer <token>"
```

**Success response (200):**
```json
[
  {
    "id": "aaaa0000-0000-0000-0000-000000000001",
    "empresa_id": "11111111-1111-1111-1111-111111111111",
    "nome_completo": "João da Silva",
    "cpf": "12345678901",
    "email": "joao@empresa.com",
    "cargo": "Desenvolvedor",
    "departamento": "TI",
    "data_admissao": "2023-01-15",
    "data_demissao": null,
    "salario_base": 8000.00,
    "tipo_contrato": "CLT",
    "status": "active",
    "banco": "341",
    "agencia": "1234",
    "conta": "56789-0",
    "chave_pix": "joao@empresa.com",
    "auth_user_id": null,
    "created_at": "2026-01-10T10:00:00Z",
    "updated_at": "2026-01-10T10:00:00Z"
  }
]
```

---

### 1.2 Get Employee by ID

**GET** `/api/hr/employees/:id`

| Parameter | Type   | Required | Description             |
|-----------|--------|----------|-------------------------|
| id        | string | Yes      | Employee UUID (path)    |
| companyId | string | Yes      | UUID of the company     |

```bash
curl -X GET \
  "https://your-api.example.com/api/hr/employees/aaaa0000-0000-0000-0000-000000000001?companyId=11111111-1111-1111-1111-111111111111" \
  -H "Authorization: Bearer <token>"
```

**Success response (200):** Same shape as list item above.

**Not found (404):**
```json
{ "error": "Employee not found" }
```

---

### 1.3 Create Employee

Registers a new employee. The CPF is validated (check digits) and normalized to digits only. Rejects duplicates per company.

**POST** `/api/hr/employees`

```bash
curl -X POST \
  "https://your-api.example.com/api/hr/employees" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "11111111-1111-1111-1111-111111111111",
    "nomeCompleto": "Maria Oliveira",
    "cpf": "529.982.247-25",
    "email": "maria@empresa.com",
    "cargo": "Analista",
    "departamento": "RH",
    "dataAdmissao": "2026-01-01",
    "salarioBase": 5500.00,
    "tipoContrato": "CLT",
    "banco": "237",
    "agencia": "4567",
    "conta": "12345-6",
    "chavePix": "529.982.247-25"
  }'
```

**Body fields:**

| Field         | Type   | Required | Description                                      |
|---------------|--------|----------|--------------------------------------------------|
| companyId     | string | Yes      | Company UUID                                     |
| nomeCompleto  | string | Yes      | Full name                                        |
| cpf           | string | Yes      | CPF — accepts `000.000.000-00` or `00000000000`  |
| email         | string | No       | Work email                                       |
| cargo         | string | No       | Job title                                        |
| departamento  | string | No       | Department                                       |
| dataAdmissao  | string | No       | Hire date `YYYY-MM-DD`                           |
| salarioBase   | number | No       | Base salary                                      |
| tipoContrato  | string | No       | `CLT`, `PJ`, or `intern` (default: `CLT`)        |
| banco         | string | No       | Bank code                                        |
| agencia       | string | No       | Bank branch                                      |
| conta         | string | No       | Bank account                                     |
| chavePix      | string | No       | PIX key                                          |

**Success response (201):** Full employee object.

**Validation errors:**
```json
{ "error": "CPF inválido" }
{ "error": "Já existe um colaborador com este CPF nesta empresa" }
```

---

### 1.4 Update Employee

**PUT** `/api/hr/employees/:id`

All body fields are optional (partial update). Include `companyId` in the body.

```bash
curl -X PUT \
  "https://your-api.example.com/api/hr/employees/aaaa0000-0000-0000-0000-000000000001" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "11111111-1111-1111-1111-111111111111",
    "cargo": "Analista Sênior",
    "salarioBase": 7000.00
  }'
```

**Success response (200):** Updated employee object.

---

### 1.5 Deactivate Employee

Soft-deactivates an employee (sets status to `inactive`). Preserves all historical payslip links.

**POST** `/api/hr/employees/:id/deactivate`

```bash
curl -X POST \
  "https://your-api.example.com/api/hr/employees/aaaa0000-0000-0000-0000-000000000001/deactivate" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "11111111-1111-1111-1111-111111111111",
    "dataDemissao": "2026-05-31"
  }'
```

| Field        | Type   | Required | Description                |
|--------------|--------|----------|----------------------------|
| companyId    | string | Yes      | Company UUID               |
| dataDemissao | string | No       | Termination date `YYYY-MM-DD` |

**Success response (200):** Updated employee object with `status: "inactive"`.

---

### 1.6 Invite Employee to Portal

Links an existing `auth.users` record to an employee so they can log in and view their own payslips.

**POST** `/api/hr/employees/:id/invite`

```bash
curl -X POST \
  "https://your-api.example.com/api/hr/employees/aaaa0000-0000-0000-0000-000000000001/invite" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "11111111-1111-1111-1111-111111111111",
    "authUserId": "bbbb0000-0000-0000-0000-000000000002"
  }'
```

**Success response (200):** Updated employee object with `auth_user_id` populated.

---

### 1.7 Create Portal Access (Auto-Create Auth User)

Creates a new authentication user with email/password and automatically links it to an employee for portal access. Use this endpoint when you want to generate login credentials directly without needing a pre-existing auth user.

**POST** `/api/hr/employees/:id/portal-access`

```bash
curl -X POST \
  "https://your-api.example.com/api/hr/employees/aaaa0000-0000-0000-0000-000000000001/portal-access" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "11111111-1111-1111-1111-111111111111",
    "email": "colaborador@empresa.com",
    "password": "SenhaForte#2026"
  }'
```

**Success response (200):** Updated employee object with `auth_user_id` populated.
```json
{
  "id": "aaaa0000-0000-0000-0000-000000000001",
  "empresa_id": "11111111-1111-1111-1111-111111111111",
  "nome_completo": "Maria Oliveira",
  "cpf": "52998224725",
  "email": "colaborador@empresa.com",
  "auth_user_id": "bbbb0000-0000-0000-0000-000000000002",
  "status": "active",
  "updated_at": "2026-06-05T12:00:00Z"
}
```

**Error — invalid password (400):**
```json
{
  "error": "Senha deve ter no mínimo 8 caracteres"
}
```

**Error — email already registered (409):**
```json
{
  "error": "Este email já está cadastrado no sistema"
}
```

**Error — employee already has portal access (409):**
```json
{
  "error": "Este colaborador já possui acesso ao portal"
}
```

**Rules:**
- Password must be at least 8 characters long.
- Email must be unique across all auth users (cannot duplicate existing accounts).
- Colaborador can only have one portal access (cannot create a second one).
- Manager permission required to perform this action.

---

## 2. Payroll Batches (Manager)

### 2.1 List Batches

Returns all payroll batches for the company, ordered by competência descending.

**GET** `/api/hr/payroll/batches`

```bash
curl -X GET \
  "https://your-api.example.com/api/hr/payroll/batches?companyId=11111111-1111-1111-1111-111111111111" \
  -H "Authorization: Bearer <token>"
```

**Success response (200):**
```json
[
  {
    "id": "cccc0000-0000-0000-0000-000000000001",
    "empresa_id": "11111111-1111-1111-1111-111111111111",
    "competencia": "2026-05-01",
    "arquivo_original": "11111111-1111.../2026-05-01/_original.pdf",
    "total_paginas": 12,
    "status": "AWAITING_REVIEW",
    "uploaded_by": "dddd0000-0000-0000-0000-000000000001",
    "created_at": "2026-05-10T09:00:00Z",
    "updated_at": "2026-05-10T09:01:30Z"
  }
]
```

Possible `status` values: `PROCESSING`, `AWAITING_REVIEW`, `COMPLETED`.

---

### 2.2 Get Batch by ID

**GET** `/api/hr/payroll/batches/:id`

```bash
curl -X GET \
  "https://your-api.example.com/api/hr/payroll/batches/cccc0000-0000-0000-0000-000000000001?companyId=11111111-1111-1111-1111-111111111111" \
  -H "Authorization: Bearer <token>"
```

**Success response (200):** Single batch object (same shape as list item).

---

### 2.3 Upload Payroll Batch PDF

Uploads the consolidated payroll PDF for a given month. The API will:
1. Store the original PDF.
2. Split into one page per employee.
3. Create one `PENDING` payslip per page, without employee assignment.
4. Expose those pages in the review endpoint so the frontend can assign each page manually.
5. Transition the batch to `AWAITING_REVIEW`.

Returns immediately with status `202 Accepted` — processing runs in the background. Poll `GET /api/hr/payroll/batches/:id` until `status` becomes `AWAITING_REVIEW`.

**POST** `/api/hr/payroll/batches/upload`

> Content-Type: `multipart/form-data`

| Field       | Type   | Required | Description                               |
|-------------|--------|----------|-------------------------------------------|
| pdf         | file   | Yes      | PDF file (max 50 MB)                      |
| companyId   | string | Yes      | Company UUID                              |
| competencia | string | Yes      | Month in `YYYY-MM` format, e.g. `2026-05` |

```bash
curl -X POST \
  "https://your-api.example.com/api/hr/payroll/batches/upload" \
  -H "Authorization: Bearer <token>" \
  -F "pdf=@/path/to/folha-maio-2026.pdf" \
  -F "companyId=11111111-1111-1111-1111-111111111111" \
  -F "competencia=2026-05"
```

**Success response (202):**
```json
{
  "message": "Payroll batch accepted for processing. Poll the batch status endpoint.",
  "batchId": "cccc0000-0000-0000-0000-000000000001",
  "competencia": "2026-05",
  "status": "PROCESSING"
}
```

**Error — duplicate competência (409):**
```json
{ "error": "Já existe uma folha de pagamento para a competência 2026-05 nesta empresa" }
```

**Error — invalid file (400):**
```json
{ "error": "Uploaded file must be a PDF" }
```

---

## 3. Batch Review (Manager)

After a batch reaches `AWAITING_REVIEW`, the manager must review each page before publishing.

### 3.1 List Batch Payslips (Review)

Returns all payslip pages of a batch, each with:
- Source page number
- Current employee link (if already assigned manually)
- A short-lived signed URL to preview the page PDF (5 min expiry)

**GET** `/api/hr/payroll/batches/:id/payslips`

```bash
curl -X GET \
  "https://your-api.example.com/api/hr/payroll/batches/cccc0000-0000-0000-0000-000000000001/payslips?companyId=11111111-1111-1111-1111-111111111111" \
  -H "Authorization: Bearer <token>"
```

**Success response (200):**
```json
[
  {
    "id": "eeee0000-0000-0000-0000-000000000001",
    "lote_id": "cccc0000-0000-0000-0000-000000000001",
    "numero_pagina": 1,
    "cpf_detectado": null,
    "status": "PENDING",
    "colaborador_id": "aaaa0000-0000-0000-0000-000000000001",
    "colaboradores": {
      "id": "aaaa0000-0000-0000-0000-000000000001",
      "nome_completo": "João da Silva",
      "cpf": "12345678901"
    },
    "signed_url": "https://storage.supabase.co/...?token=xxx&expires=1234567890"
  },
  {
    "id": "eeee0000-0000-0000-0000-000000000002",
    "numero_pagina": 2,
    "cpf_detectado": null,
    "status": "PENDING",
    "colaborador_id": null,
    "colaboradores": null,
    "signed_url": "https://storage.supabase.co/..."
  }
]
```

---

### 3.2 Assign Payslip to Employee

Assigns (or re-assigns) a page to an employee. Use this for pages where CPF was not detected or was wrongly matched.
Assigns (or re-assigns) a page to an employee. This step is always manual in the frontend review flow.

**PATCH** `/api/hr/payroll/payslips/:id/assign`

```bash
curl -X PATCH \
  "https://your-api.example.com/api/hr/payroll/payslips/eeee0000-0000-0000-0000-000000000002/assign" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "11111111-1111-1111-1111-111111111111",
    "colaboradorId": "aaaa0000-0000-0000-0000-000000000003"
  }'
```

**Success response (200):** Updated payslip object with new `colaborador_id`.

**Error — employee not in this company (404):**
```json
{ "error": "Colaborador não encontrado nesta empresa" }
```

---

### 3.3 Confirm Batch

Marks assigned payslips as `CONFIRMED` and the batch as `COMPLETED`. Pages that remain unassigned stay in `PENDING` status and can be assigned later. Once confirmed, assigned payslips become visible to the respective employees in the portal.

**POST** `/api/hr/payroll/batches/:id/confirm`

```bash
curl -X POST \
  "https://your-api.example.com/api/hr/payroll/batches/cccc0000-0000-0000-0000-000000000001/confirm" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "11111111-1111-1111-1111-111111111111"
  }'
```

**Success response (200):**
```json
{
  "message": "Batch confirmed successfully",
  "confirmed": 10,
  "pending": 2,
  "warnings": [
    "Colaborador aaaa0000-0000-0000-0000-000000000005 aparece em múltiplas páginas: 3, 7",
    "2 página(s) não associada(s) permanece(m) em aberto: 2, 5"
  ]
}
```

- `confirmed`: Number of payslips that were marked as CONFIRMED (had an assigned employee).
- `pending`: Number of payslips that remain PENDING (unassigned and can be assigned later).
- `warnings` includes any duplicate assignments and unassigned pages. The batch is confirmed regardless of warnings.

---

### 3.4 Get Payslip Signed URL (Manager)

Generates a short-lived signed URL (5 min) to preview or download a specific payslip PDF.

**GET** `/api/hr/payroll/payslips/:id/url`

```bash
curl -X GET \
  "https://your-api.example.com/api/hr/payroll/payslips/eeee0000-0000-0000-0000-000000000001/url?companyId=11111111-1111-1111-1111-111111111111" \
  -H "Authorization: Bearer <token>"
```

**Success response (200):**
```json
{
  "signedUrl": "https://storage.supabase.co/object/sign/holerites/...?token=xxx"
}
```

---

## 4. Employee Portal (Self-service)

These endpoints are for the **employee** user — the person whose `auth_user_id` is linked to a `colaboradores` record. They can only see their own confirmed payslips.

### 4.1 List My Payslips

Returns all confirmed payslips for the authenticated employee, ordered by competência descending (most recent first).

**GET** `/api/hr/payroll/portal/payslips`

```bash
curl -X GET \
  "https://your-api.example.com/api/hr/payroll/portal/payslips" \
  -H "Authorization: Bearer <employee-token>"
```

**Success response (200):**
```json
[
  {
    "id": "eeee0000-0000-0000-0000-000000000001",
    "competencia": "2026-05-01",
    "status": "CONFIRMED",
    "numero_pagina": 3,
    "created_at": "2026-05-10T09:01:30Z"
  },
  {
    "id": "eeee0000-0000-0000-0000-000000000010",
    "competencia": "2026-04-01",
    "status": "CONFIRMED",
    "numero_pagina": 3,
    "created_at": "2026-04-08T08:00:00Z"
  }
]
```

**Error — employee not linked (404):**
```json
{ "error": "Colaborador não encontrado para este usuário" }
```

---

### 4.2 Get My Payslip Signed URL

Generates a short-lived signed URL (5 min) so the employee can view or download their own payslip. The backend validates ownership and confirms the payslip is in `CONFIRMED` status before generating the URL.

**GET** `/api/hr/payroll/portal/payslips/:id/url`

```bash
curl -X GET \
  "https://your-api.example.com/api/hr/payroll/portal/payslips/eeee0000-0000-0000-0000-000000000001/url" \
  -H "Authorization: Bearer <employee-token>"
```

**Success response (200):**
```json
{
  "signedUrl": "https://storage.supabase.co/object/sign/holerites/...?token=xxx"
}
```

**Error — payslip not found or not confirmed (404):**
```json
{ "error": "Holerite não encontrado ou não disponível" }
```

---

## Error Reference

| HTTP Status | Meaning                                                    |
|-------------|------------------------------------------------------------|
| 400         | Missing or invalid request parameter                       |
| 401         | Missing or invalid `Authorization` token                   |
| 404         | Resource not found                                         |
| 409         | Conflict — duplicate record (same CPF or same competência) |
| 422         | Unprocessable — business rule violation                    |
| 500         | Unexpected server error                                    |

All error responses follow this shape:
```json
{ "error": "Human-readable message" }
```

---

## Workflow Summary

```
Manager flow:
  1. Register employees → POST /api/hr/employees
  2. Upload payroll PDF → POST /api/hr/payroll/batches/upload
  3. Poll batch status  → GET  /api/hr/payroll/batches/:id
  4. Review pages       → GET  /api/hr/payroll/batches/:id/payslips
  5. Fix assignments    → PATCH /api/hr/payroll/payslips/:id/assign
  6. Confirm batch      → POST /api/hr/payroll/batches/:id/confirm

Employee flow:
  1. List my payslips   → GET /api/hr/payroll/portal/payslips
  2. Download payslip   → GET /api/hr/payroll/portal/payslips/:id/url
```
