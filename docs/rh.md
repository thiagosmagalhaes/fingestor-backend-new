# HR Module — Backend Specification

Technical specification for implementing the Human Resources module in the existing system. Database: Supabase (PostgreSQL + Storage + Auth + RLS).

Scope of this delivery (MVP): employee registration and payslip management from a single consolidated PDF sent by the accountant, with a self-service portal for each employee.

---

## 1. Context and core rule

The accountant sends **one single PDF per month** containing the payslips of all employees. Confirmed characteristics of this file:

- **One employee per page**, always.
- PDF is **vector-based** (selectable text — no OCR required).
- The **CPF (Brazilian tax ID) appears in a consistent position/format** on every payslip.

The system must receive this PDF, split it into one page per employee, detect each page's CPF via text extraction, pre-link it to the registered employee, and make it available for **manual review** before publishing. A payslip only becomes visible to the employee after the manager confirms it.

**Golden security rule:** an employee can only see their own payslips, and only the ones already confirmed. This must be enforced by RLS at the database level, not just in the application layer.

---

## 2. Multi-tenant scoping (companyId)

The system is multi-tenant: a single instance serves more than one company. **Every read and write operation in this module must be scoped to the currently logged-in company (`companyId`).**

- No query may return rows from another company.
- `companyId` must never be trusted from the client request body alone. Derive/validate it from the authenticated session and the user's `perfis_acesso` (access profile) record, then apply it as a filter on every operation.
- All core tables carry `empresa_id` (the `companyId`) and all RLS policies pivot on it. The application layer must also always include the `companyId` filter explicitly as defense in depth.

This applies to: listing/creating/editing employees, uploading and processing payroll batches, listing payslips, and generating signed file URLs.

---

## 3. Data model

Tables to create. Almost everything references `empresa_id` (the `companyId`).

### empresas (companies)
Employer company record. Fields: legal name, trade name, CNPJ (unique). An equivalent structure may already exist in the current system — if so, reuse it and skip this table.

### colaboradores (employees)
- Linked to `empresa_id` (`companyId`).
- Optional link to `auth.users` (`auth_user_id`), filled when the employee is granted portal access. Null until then.
- Personal data: full name, **CPF (store digits only, no mask)**, email.
- Contractual data: job title, department, hire date, termination date, base salary, contract type (CLT/PJ/intern), status (active/inactive/on-leave).
- Banking data: bank, branch, account, PIX key.
- Unique constraint: `(empresa_id, cpf)`.
- Indexes on `empresa_id`, `cpf`, and `auth_user_id`.

### perfis_acesso (access profiles)
Defines who is a manager (HR/ADMIN) of each company. Links `auth_user_id` to `empresa_id` with a `papel` (role) field. Unique constraint `(auth_user_id, empresa_id)`. Used by RLS policies to distinguish a manager from a regular employee, and to resolve the user's `companyId`.

### folhas_lote (payroll batches)
Represents each consolidated PDF received. Fields: `empresa_id`, `competencia` (always use the **first day of the month** as the date, e.g. `2026-03-01` for March/2026), original file path in Storage, total pages, status (PROCESSING → AWAITING_REVIEW → COMPLETED), uploaded by. Unique constraint `(empresa_id, competencia)` to prevent duplicate upload of the same payroll.

### holerites (payslips)
One row per split page.
- Links: `lote_id`, `empresa_id`, `colaborador_id` (null until confirmed/matched).
- `competencia` (first day of month).
- `numero_pagina` (source page in the PDF).
- `arquivo_pdf` (split page path in Storage).
- `cpf_detectado` (CPF read via text extraction; may be null if reading fails).
- `status`: PENDING (default) → CONFIRMED.
- Indexes on `colaborador_id`, `lote_id`, `competencia`.

---

## 4. Employee registration (explicit flow)

The manager must be able to register and maintain employees. Endpoints/operations required:

- **Create employee**: accepts personal, contractual, and banking data. The `companyId` is taken from the authenticated session, **not** from the request payload. Validate the CPF (normalize to digits only and check the verification digits). Reject duplicates against the `(empresa_id, cpf)` unique constraint with a clear message.
- **List employees**: returns only employees of the logged-in company, with filtering by status and search by name/CPF.
- **Update employee**: edit any field; do not allow moving an employee to another company.
- **Deactivate employee**: set status to inactive (and optionally fill termination date). Prefer soft deactivation over hard delete to preserve historical payslip links.
- **Invite to portal (optional in MVP)**: link the employee to an `auth.users` record so they can log in and see their own payslips.

The CPF stored here is what the payslip-matching step (section 6) uses to auto-link pages, so registering employees with the correct CPF before uploading payroll is what enables automatic matching.

---

## 5. Row Level Security (mandatory)

Enable RLS on `colaboradores`, `folhas_lote`, `holerites`, and `perfis_acesso`.

Create a helper function `is_gestor(empresa_id)` (security definer, stable) that returns true if the current `auth.uid()` has a record in `perfis_acesso` for that company.

Required policies:

- **colaboradores**: manager does everything within their own company; employee reads only their own record (`auth_user_id = auth.uid()`).
- **holerites**: manager does everything within their own company; employee reads **only** payslips with `status = 'CONFIRMED'` whose `colaborador_id` belongs to them. While PENDING, no employee can access them.
- **folhas_lote**: manager only.
- **perfis_acesso**: each user reads only their own link.

RLS enforces tenant isolation at the database boundary; the application's explicit `companyId` filter (section 2) is the second layer.

---

## 6. Supabase Storage

Create a private bucket (e.g. `holerites`). No file should be public.

Suggested path layout: `{empresa_id}/{competencia}/pagina-{n}.pdf`. The original batch PDF can live at `{empresa_id}/{competencia}/_original.pdf`.

Employee file access must use a **short-lived signed URL** generated by the backend, and only after validating (via the same RLS logic) that the payslip belongs to them and is confirmed. Never expose a direct path or a public URL.

---

## 7. PDF processing (split + CPF detection)

Flow to implement on upload of a new batch:

1. Manager uploads the PDF specifying the **competencia** (month/year). Validate against the `(empresa_id, competencia)` uniqueness.
2. Create a `folhas_lote` record with status `PROCESSING` and store the original PDF in Storage.
3. **Split the PDF**: each page becomes a single-page PDF, cut from the **original page** (preserve the faithful document — do not regenerate content). Suggested library for splitting: `pdf-lib`.
4. **Extract each page's CPF** via text (no OCR, since it is vector-based). Suggested: `pdfjs-dist`. Normalize the CPF to digits only. Regex must accept both `000.000.000-00` and `00000000000`. Use the first valid CPF found on the page.
5. For each page: upload the split PDF to Storage and create a row in `holerites` with `status = PENDING`, `cpf_detectado` filled, and `colaborador_id` **pre-linked** if the CPF matches an employee of the company. If no match, leave it null.
6. Update the batch to `AWAITING_REVIEW` and record the total page count.

Note: pre-linking depends on the employee already being registered with the correct CPF. Pages without a match are expected and handled in the review step.

---

## 8. Review endpoint (manual review)

After processing, the manager reviews the batch before publishing. The backend must expose:

- **List batch pages**: for each PENDING payslip, return page number, detected CPF, pre-linked employee name (if any), and a signed URL to preview the page PDF.
- **Assign/correct employee**: allow changing a page's `colaborador_id` (for no-match cases or wrong matches). Only employees of the same company are selectable.
- **Confirm batch**: validate that **all** pages have a `colaborador_id`; then mark all payslips as `CONFIRMED` and the batch as `COMPLETED`. Do not allow confirming with any page left unassigned.

Also suggested: block the same employee from receiving two pages in the same batch (a sign of a wrong assignment), returning a warning to the manager.

---

## 9. Employee portal

Endpoints/queries for the authenticated employee:

- **List my payslips**: all confirmed ones belonging to them, ordered by competencia descending (current month first). RLS already restricts the rows — the query only handles filtering/ordering.
- **Download/view payslip**: generate a short-lived signed URL after confirming, via RLS, that the payslip is theirs and confirmed.

The employee has no access to any management endpoint.

---

## 10. Validations and error handling

- CPF always normalized (digits only) on employee creation and on detection. Validate the verification digits on registration.
- Duplicate competencia upload: reject with a clear message, or offer explicit replacement of the batch (cascade-deleting the previous one and its payslips).
- Page with undetected CPF: not a fatal error — it stays PENDING without a link for manual assignment.
- A failure processing one page must not abort the whole batch; record what failed and leave the batch in a state that allows reprocessing.
- Every file URL generation must re-validate the permission on the backend, never trusting the front end alone.
- Every operation must be scoped to the logged-in `companyId` (section 2).

---

## 11. Out of scope for this MVP (roadmap)

Record for later phases, do not implement now: time/attendance tracking, vacation and leave, benefits (transport/meal voucher, health plan), hire/termination flow with document checklist, annual income report, and eSocial data export. The current data model already structures employees so these extensions can be added later.