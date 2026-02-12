# Fiscal Module — Frontend Integration Documentation

---

## 1. Fiscal Configuration

### Feature Overview

The fiscal configuration feature allows users to set up their company's fiscal data required for issuing electronic tax documents in Brazil (NFC-e, NFS-e, NF-e). Before any fiscal document can be issued, the company must have a valid fiscal configuration including digital certificate, tax regime, document series, and issuer identification data.

This configuration should be accessed and managed through a dedicated settings page within the company management area.

### Implementation Instructions

1. The user must be authenticated with a valid Bearer token.
2. A company must already exist. The `companyId` is required for all fiscal operations.
3. On first access, the frontend should call the GET endpoint. If the response is `null`, display a setup wizard or empty configuration form.
4. When saving, use the POST endpoint. It handles both creation and update (upsert behavior).
5. **The backend automatically syncs with Nuvem Fiscal API** when saving: registers/updates the company, uploads the digital certificate, and configures all enabled document types (NFC-e/NF-e/NFS-e). This is fully automatic and transparent.
6. Sensitive fields (digital certificate data and password) are masked in GET responses with `"***CONFIGURADO***"`. Do not display these values — show only whether they are configured or not.

### API Usage

**Retrieve Fiscal Configuration**

- **Endpoint:** `GET /api/fiscal/config`
- **Query parameters:**
  - `companyId` (required, string): The UUID of the company.
- **Authentication:** Bearer token required.

```
curl -X GET "https://api.example.com/api/fiscal/config?companyId=COMPANY_UUID" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Save Fiscal Configuration**

- **Endpoint:** `POST /api/fiscal/config`
- **Authentication:** Bearer token required.
- **Body (JSON):**

| Parameter             | Type    | Required | Description                                         |
|-----------------------|---------|----------|-----------------------------------------------------|
| companyId             | string  | Yes      | The UUID of the company                             |
| environment           | string  | No       | `"production"` or `"homologation"` (default: homologation) |
| certificateData       | string  | No       | Digital certificate in base64 (A1 type)             |
| certificatePassword   | string  | No       | Certificate password                                |
| cscId                 | string  | No       | CSC ID for NFC-e                                    |
| cscToken              | string  | No       | CSC token for NFC-e                                 |
| nfceEnabled           | boolean | No       | Enable NFC-e issuance                               |
| nfceSerie             | number  | No       | NFC-e document series                               |
| nfseEnabled           | boolean | No       | Enable NFS-e issuance                               |
| nfseSerie             | number  | No       | NFS-e document series                               |
| nfseRpsSerie          | string  | No       | RPS series for NFS-e                                |
| nfseMunicipalCode     | string  | No       | Municipal service code                              |
| nfseCnae              | string  | No       | Main CNAE code for NFS-e                            |
| nfseAliquotaIss       | number  | No       | Default ISS tax rate (percentage)                   |
| nfeEnabled            | boolean | No       | Enable NF-e issuance                                |
| nfeSerie              | number  | No       | NF-e document series                                |
| emitenteRazaoSocial   | string  | No       | Issuer legal name                                   |
| emitenteNomeFantasia  | string  | No       | Issuer trade name                                   |
| emitenteCnpj          | string  | No       | Issuer CNPJ                                         |
| emitenteIe            | string  | No       | Issuer state registration (IE)                      |
| emitenteIm            | string  | No       | Issuer municipal registration (IM)                  |
| autoEmitOnSale        | boolean | No       | Automatically issue fiscal document on sale creation |
| defaultDocumentType   | string  | No       | Default doc type: `"nfce"`, `"nfse"`, or `"nfe"`   |

```
curl -X POST "https://api.example.com/api/fiscal/config" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "COMPANY_UUID",
    "environment": "homologation",
    "nfceEnabled": true,
    "nfceSerie": 1,
    "emitenteCnpj": "12.345.678/0001-90",
    "emitenteRazaoSocial": "Minha Empresa LTDA",
    "defaultDocumentType": "nfce"
  }'
```

### Possible Responses

**GET /api/fiscal/config**

| Status | Meaning                          | Body                                  |
|--------|----------------------------------|---------------------------------------|
| 200    | Configuration found              | Full config object (sensitive fields masked) |
| 200    | No configuration exists yet      | `null`                                |
| 400    | Missing companyId                | `{ "error": "companyId é obrigatório" }` |
| 401    | Invalid or missing token         | `{ "error": "Unauthorized" }`         |
| 500    | Server error                     | `{ "error": "...", "message": "..." }` |

**POST /api/fiscal/config**

| Status | Meaning                          | Body                                  |
|--------|----------------------------------|---------------------------------------|
| 200    | Configuration saved successfully | Updated config object                 |
| 400    | Missing companyId                | `{ "error": "companyId é obrigatório" }` |
| 401    | Invalid or missing token         | `{ "error": "Unauthorized" }`         |
| 500    | Server error                     | `{ "error": "...", "message": "..." }` |

### Frontend Behavior Rules

- On success (GET returns config), populate the form with existing values. Display green indicators next to certificate fields if they show `"***CONFIGURADO***"`.
- On success (GET returns null), show an empty setup form with a clear call-to-action.
- On success (POST), show a success toast notification and optionally reload the config.
- On 400 errors, highlight the missing or invalid field.
- On 401, redirect the user to the login page.
- On 500, show a generic error message and allow retry.
- While loading, show a skeleton loader for the configuration form.

### Edge Cases & Considerations

- The certificate fields are never returned in plain text. The frontend cannot pre-fill these fields — only indicate whether they are set.
- Switching from `"homologation"` to `"production"` environment should trigger a prominent confirmation dialog since production documents have legal validity.
- Document series numbers and next numbers should not be manually edited by most users — consider hiding them behind an advanced settings toggle.
- The `autoEmitOnSale` flag can have significant impact: when enabled, every completed sale will automatically generate a fiscal document.

---

## 2. List Fiscal Documents

### Feature Overview

This feature displays all fiscal documents issued by a company, with support for filtering by document type (NFC-e, NFS-e, NF-e), status, date range, linked sale, and text search. This is the main fiscal dashboard view.

### Implementation Instructions

1. The user must be authenticated.
2. Call the list endpoint with at least the `companyId` query parameter.
3. Apply filters as needed from the UI controls.
4. Results are returned in descending order by creation date.

### API Usage

- **Endpoint:** `GET /api/fiscal/documents`
- **Authentication:** Bearer token required.
- **Query parameters:**

| Parameter    | Type   | Required | Description                                              |
|-------------|--------|----------|----------------------------------------------------------|
| companyId   | string | Yes      | The UUID of the company                                  |
| documentType| string | No       | Filter by type: `"nfce"`, `"nfse"`, `"nfe"`            |
| status      | string | No       | Filter by status: `"draft"`, `"pending"`, `"processing"`, `"authorized"`, `"rejected"`, `"denied"`, `"cancelled"`, `"corrected"` |
| from        | string | No       | Start date filter (YYYY-MM-DD)                           |
| to          | string | No       | End date filter (YYYY-MM-DD)                             |
| saleId      | string | No       | Filter by linked sale UUID                               |
| search      | string | No       | Search by recipient name, document, or access key        |

```
curl -X GET "https://api.example.com/api/fiscal/documents?companyId=COMPANY_UUID&documentType=nfce&status=authorized&from=2026-01-01&to=2026-01-31" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Possible Responses

| Status | Meaning                    | Body                              |
|--------|----------------------------|-----------------------------------|
| 200    | Documents found            | Array of fiscal document objects   |
| 200    | No documents match filters | Empty array `[]`                  |
| 400    | Missing companyId          | `{ "error": "companyId é obrigatório" }` |
| 401    | Invalid or missing token   | `{ "error": "Unauthorized" }`     |
| 500    | Server error               | `{ "error": "...", "message": "..." }` |

Each document object in the array contains: `id`, `document_type`, `status`, `environment`, `serie`, `number`, `access_key`, `recipient_name`, `recipient_document`, `subtotal`, `discount_amount`, `tax_amount`, `total_amount`, `nature_of_operation`, `sale_id`, `created_at`, `updated_at`, and more.

### Frontend Behavior Rules

- Display results in a table with columns: Number (serie/number), Type, Recipient, Total Amount, Status, Date, and Actions.
- Use color-coded status badges: green for `authorized`, yellow for `pending`/`draft`/`processing`, red for `rejected`/`denied`/`cancelled`, blue for `corrected`.
- Show an empty state message when no documents exist (e.g., "No fiscal documents issued yet").
- Provide filter controls for type, status, and date range above the table.
- Implement loading skeletons while fetching data.

### Edge Cases & Considerations

- The `search` parameter matches against recipient name, recipient document (CPF/CNPJ), and access key — useful for quick lookups.
- No server-side pagination is implemented. If the dataset is large, consider client-side pagination or requesting date-range filters.

---

## 3. Get Fiscal Document Details

### Feature Overview

Retrieves a single fiscal document with its complete data, including all line items and the event history log. This is used for the document detail view.

### Implementation Instructions

1. The user must be authenticated.
2. Call the endpoint with the document `id` as a URL parameter and `companyId` as a query parameter.

### API Usage

- **Endpoint:** `GET /api/fiscal/documents/:id`
- **Authentication:** Bearer token required.
- **Query parameters:**
  - `companyId` (required, string): The UUID of the company.

```
curl -X GET "https://api.example.com/api/fiscal/documents/DOCUMENT_UUID?companyId=COMPANY_UUID" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Possible Responses

| Status | Meaning                  | Body                                              |
|--------|--------------------------|----------------------------------------------------|
| 200    | Document found           | Full document object with `fiscal_document_items` and `fiscal_document_events` arrays |
| 400    | Missing required params  | `{ "error": "..." }`                              |
| 404    | Document not found       | `{ "error": "Documento fiscal não encontrado" }`  |
| 401    | Invalid or missing token | `{ "error": "Unauthorized" }`                     |
| 500    | Server error             | `{ "error": "...", "message": "..." }`            |

The response includes:
- **Document root fields:** All document data (type, status, values, taxes, recipient, XML/PDF URLs, etc.)
- **fiscal_document_items:** Array of item objects with name, quantity, price, tax breakdowns (ICMS, PIS, COFINS, ISS, IPI), NCM, CFOP codes, etc.
- **fiscal_document_events:** Array of event objects with event type, old/new status, description, timestamp, error details (if any), and protocol numbers.

### Frontend Behavior Rules

- Display the document header (number, type, status, recipient, total, date).
- Show items in a table with columns: Item #, Name, Quantity, Unit Price, Total, CFOP.
- Show the event timeline in chronological order, highlighting status changes.
- If the document has a `pdf_url`, provide a "Download DANFE/DANFSE" button.
- If `status` is `authorized`, show action buttons for Cancel and Correction Letter.
- If `status` is `draft`, show a "Submit" button to transmit.
- On 404, redirect to the documents list with a notification.

### Edge Cases & Considerations

- The `xml_content` and `xml_signed` fields may contain large XML strings. Do not render them directly — provide a download option instead.
- If `rejection_code` and `rejection_message` are present, display them prominently in an error alert.

---

## 4. Create Fiscal Document

### Feature Overview

Creates a new fiscal document. The document can be created in two ways:
1. **Linked to a sale**: Provide a `saleId` and the system automatically imports all sale data, items, customer info, and values.
2. **Manual entry**: Provide items and values directly in the request body.

The document is created with `"draft"` status and is not yet transmitted to tax authorities.

### Implementation Instructions

1. The user must be authenticated.
2. The company must have a valid fiscal configuration (call GET config first to verify).
3. The document type (nfce, nfse, nfe) must be enabled in the config.
4. When linking to a sale, only `companyId`, `documentType`, and `saleId` are required — all other data is auto-populated from the sale.
5. For manual entry, provide at least `items` or `totalAmount`.

### API Usage

- **Endpoint:** `POST /api/fiscal/documents`
- **Authentication:** Bearer token required.
- **Body (JSON):**

| Parameter             | Type    | Required         | Description                                      |
|-----------------------|---------|------------------|--------------------------------------------------|
| companyId             | string  | Yes              | The UUID of the company                          |
| documentType          | string  | Yes              | `"nfce"`, `"nfse"`, or `"nfe"`                  |
| saleId                | string  | Conditional      | Sale UUID (auto-imports data). Required if no items/totalAmount provided |
| budgetId              | string  | No               | Budget UUID to link                              |
| recipientName         | string  | No               | Recipient/customer name (overrides sale data)    |
| recipientDocument     | string  | No               | CPF or CNPJ of recipient                         |
| recipientDocumentType | string  | No               | `"cpf"` or `"cnpj"`                             |
| recipientEmail        | string  | No               | Recipient email                                  |
| recipientPhone        | string  | No               | Recipient phone                                  |
| recipientAddress      | object  | No               | Address object (logradouro, numero, bairro, etc.)|
| subtotal              | number  | Conditional      | Required if manual entry (no saleId)             |
| discountAmount        | number  | No               | Discount value                                   |
| taxAmount             | number  | No               | Tax amount                                       |
| totalAmount           | number  | Conditional      | Required if manual entry and no items provided   |
| natureOfOperation     | string  | No               | Defaults to "Venda de mercadoria" or "Prestação de serviço" |
| additionalInfo        | string  | No               | Additional information text                      |
| fiscalNotes           | string  | No               | Fiscal notes                                     |
| serviceCode           | string  | No               | Service code (NFS-e, LC 116)                     |
| cnaeCode              | string  | No               | CNAE code                                        |
| cityServiceCode       | string  | No               | Municipal tax code                               |
| serviceDescription    | string  | No               | Service description (NFS-e)                      |
| items                 | array   | Conditional      | Array of item objects (see below)                |

**Item object properties:**

| Parameter       | Type   | Required | Description                    |
|----------------|--------|----------|--------------------------------|
| name           | string | Yes      | Item name                      |
| cfop           | string | Yes      | CFOP code (e.g., "5102")       |
| quantity       | number | Yes      | Quantity                       |
| unitPrice      | number | Yes      | Unit price                     |
| productServiceId | string | No     | Product/service UUID           |
| saleItemId     | string | No       | Sale item UUID                 |
| description    | string | No       | Item description               |
| ncm            | string | No       | NCM code                       |
| cest           | string | No       | CEST code                      |
| unit           | string | No       | Unit of measure (default: "UN")|
| discountAmount | number | No       | Discount per item              |
| icmsOrigin     | number | No       | ICMS origin (0-8)              |
| icmsCst        | string | No       | ICMS CST code                  |
| icmsCsosn      | string | No       | ICMS CSOSN code (Simples Nacional) |
| icmsAliquota   | number | No       | ICMS tax rate                  |
| pisCst         | string | No       | PIS CST code                   |
| pisAliquota    | number | No       | PIS tax rate                   |
| cofinsCst      | string | No       | COFINS CST code                |
| cofinsAliquota | number | No       | COFINS tax rate                |
| issAliquota    | number | No       | ISS tax rate (NFS-e)           |

**Example — Create from sale:**

```
curl -X POST "https://api.example.com/api/fiscal/documents" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "COMPANY_UUID",
    "documentType": "nfce",
    "saleId": "SALE_UUID"
  }'
```

**Example — Manual entry:**

```
curl -X POST "https://api.example.com/api/fiscal/documents" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "COMPANY_UUID",
    "documentType": "nfse",
    "recipientName": "João Silva",
    "recipientDocument": "123.456.789-00",
    "recipientDocumentType": "cpf",
    "items": [
      {
        "name": "Consultoria em TI",
        "cfop": "0000",
        "quantity": 1,
        "unitPrice": 5000.00,
        "issAliquota": 5.00
      }
    ]
  }'
```

### Possible Responses

| Status | Meaning                             | Body                                                   |
|--------|--------------------------------------|--------------------------------------------------------|
| 201    | Document created successfully       | Full document object with items and events              |
| 400    | Missing required fields             | `{ "error": "companyId é obrigatório" }`               |
| 400    | Invalid document type               | `{ "error": "documentType inválido..." }`              |
| 400    | No sale/items/values provided       | `{ "error": "Informe saleId para vincular..." }`       |
| 400    | Config not found or type disabled   | `{ "error": "...", "message": "Configuração fiscal não encontrada..." }` |
| 400    | Sale not found                      | `{ "error": "...", "message": "Venda não encontrada" }` |
| 401    | Invalid or missing token            | `{ "error": "Unauthorized" }`                          |
| 500    | Server error                        | `{ "error": "...", "message": "..." }`                 |

### Frontend Behavior Rules

- When creating from a sale, show a simple dialog: select document type and confirm. All data is auto-filled.
- When creating manually, show a full form with recipient details and an item table with inline editing.
- On 201 success, redirect to the document detail view and show a success notification.
- On 400 errors, display the error message near the relevant field or as a banner.
- Before creating, validate that the fiscal configuration exists. If not, redirect the user to configure it first with a clear message.

### Edge Cases & Considerations

- If a sale already has a linked fiscal document (non-cancelled), warn the user before creating a duplicate.
- Tax fields (ICMS CST, PIS CST, COFINS CST, CSOSN) are auto-assigned based on the company's tax regime. For most users in Simples Nacional or MEI, these defaults are correct. Only advanced users should modify them.
- The document is created as `"draft"` — it is NOT yet submitted to tax authorities. A separate status update call is needed.

---

## 5. Update Document Status

### Feature Overview

Updates the lifecycle status of a fiscal document. This is the core mechanism for transmitting documents to SEFAZ/Prefeitura and recording their authorization, rejection, or other outcomes.

### Implementation Instructions

1. The user must be authenticated.
2. Use this endpoint to advance the document through its lifecycle: `draft` → `pending` → `authorized`.
3. The system validates allowed status transitions and rejects invalid ones.

**Valid status transitions:**

| From         | Allowed Transitions                          |
|-------------|----------------------------------------------|
| draft       | pending, cancelled                           |
| pending     | processing, authorized, rejected, cancelled  |
| processing  | authorized, rejected, denied                 |
| authorized  | cancelled, corrected                         |
| rejected    | pending, draft                               |
| denied      | (no transitions — terminal state)            |
| cancelled   | (no transitions — terminal state)            |
| corrected   | cancelled, corrected                         |

### API Usage

- **Endpoint:** `PATCH /api/fiscal/documents/:id/status`
- **Authentication:** Bearer token required.
- **Query parameters:**
  - `companyId` (required, string): The UUID of the company.
- **Body (JSON):**

| Parameter    | Type   | Required | Description                              |
|-------------|--------|----------|------------------------------------------|
| status      | string | Yes      | New status value                         |
| description | string | No       | Description of what happened             |
| errorCode   | string | No       | Error code from SEFAZ (on rejection)     |
| errorMessage| string | No       | Error message from SEFAZ (on rejection)  |
| protocol    | string | No       | Authorization/cancellation protocol number |
| responseData| object | No       | Full response data from the tax authority |

```
curl -X PATCH "https://api.example.com/api/fiscal/documents/DOCUMENT_UUID/status?companyId=COMPANY_UUID" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "pending",
    "description": "Documento enviado para transmissão"
  }'
```

### Possible Responses

| Status | Meaning                    | Body                                            |
|--------|----------------------------|--------------------------------------------------|
| 200    | Status updated             | Updated document object                          |
| 400    | Missing required fields    | `{ "error": "..." }`                            |
| 400    | Invalid status transition  | `{ "error": "...", "message": "Transição de status inválida: ..." }` |
| 401    | Invalid or missing token   | `{ "error": "Unauthorized" }`                   |
| 500    | Server error               | `{ "error": "...", "message": "..." }`          |

When a document is authorized:
- The `authorization_protocol` and `authorization_date` are automatically set.
- If linked to a sale, the sale's `nfce_number`, `nfce_key`, and `nfce_status` are updated to `"authorized"`.

### Frontend Behavior Rules

- Show a "Transmit" button for documents in `draft` status. This should set status to `pending`.
- When the transmission result arrives (typically via an external provider webhook or polling), update to `authorized` or `rejected`.
- On `authorized`, show a green success indicator and enable Download DANFE.
- On `rejected`, display the `errorCode` and `errorMessage` prominently with a "Retry" option that sets status back to `pending`.
- On invalid transition 400 error, show the allowed transitions to the user.

### Edge Cases & Considerations

- `denied` status is terminal — the document cannot be resubmitted. The user must create a new document.
- `cancelled` is also terminal.
- `corrected` can transition to another `corrected` (multiple correction letters) or to `cancelled`.

---

## 6. Cancel Fiscal Document

### Feature Overview

Cancels an authorized or draft fiscal document. For authorized documents, this initiates a cancellation event that (in production) must be communicated to SEFAZ/Prefeitura. Cancellation requires a justification of at least 15 characters.

### Implementation Instructions

1. The user must be authenticated.
2. Only documents with status `"authorized"` or `"draft"` can be cancelled.
3. A reason with a minimum of 15 characters must be provided.

### API Usage

- **Endpoint:** `POST /api/fiscal/documents/:id/cancel`
- **Authentication:** Bearer token required.
- **Query parameters:**
  - `companyId` (required, string): The UUID of the company.
- **Body (JSON):**

| Parameter | Type   | Required | Description                                  |
|----------|--------|----------|----------------------------------------------|
| reason   | string | Yes      | Cancellation reason (minimum 15 characters)  |

```
curl -X POST "https://api.example.com/api/fiscal/documents/DOCUMENT_UUID/cancel?companyId=COMPANY_UUID" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Venda cancelada a pedido do cliente, dados incorretos no documento"
  }'
```

### Possible Responses

| Status | Meaning                          | Body                                                 |
|--------|-----------------------------------|-------------------------------------------------------|
| 200    | Document cancelled successfully  | Updated document object with cancelled status         |
| 400    | Reason too short or missing      | `{ "error": "Motivo do cancelamento é obrigatório (mínimo 15 caracteres)" }` |
| 400    | Document cannot be cancelled     | `{ "error": "...", "message": "Apenas documentos autorizados ou em rascunho podem ser cancelados" }` |
| 401    | Invalid or missing token         | `{ "error": "Unauthorized" }`                        |
| 500    | Server error                     | `{ "error": "...", "message": "..." }`               |

When cancelled:
- The document `status` becomes `"cancelled"`, and `cancelled_at` and `cancellation_reason` are set.
- If linked to a sale, the sale's `nfce_status` is updated to `"cancelled"` and the `fiscal_document_id` is unlinked.

### Frontend Behavior Rules

- Show a confirmation dialog before cancelling with a text area for the reason.
- Enforce the 15-character minimum on the frontend before sending (disable Submit button below minimum).
- On success, refresh the document details and show a notification.
- On 400 "cannot be cancelled", explain to the user why and suggest alternatives.

### Edge Cases & Considerations

- In production, authorized documents may have a time window for cancellation (typically 24 hours for NFC-e, 7 days for NF-e). The backend does not enforce this window — the external provider (SEFAZ) will reject late cancellations. Handle rejection gracefully.
- Cancellation is irreversible. A new document must be created if needed.

---

## 7. Correction Letter (Carta de Correção)

### Feature Overview

Issues a correction letter (Carta de Correção Eletrônica — CC-e) for an authorized fiscal document. This allows correcting supplementary information without altering core values (amounts, taxes, products). Up to 20 correction letters can be issued per document.

### Implementation Instructions

1. The user must be authenticated.
2. Only documents with status `"authorized"` or `"corrected"` can receive correction letters.
3. The correction text must be between 15 and 1000 characters.

### API Usage

- **Endpoint:** `POST /api/fiscal/documents/:id/correct`
- **Authentication:** Bearer token required.
- **Query parameters:**
  - `companyId` (required, string): The UUID of the company.
- **Body (JSON):**

| Parameter      | Type   | Required | Description                                    |
|---------------|--------|----------|------------------------------------------------|
| correctionText | string | Yes      | Correction description (15 to 1000 characters) |

```
curl -X POST "https://api.example.com/api/fiscal/documents/DOCUMENT_UUID/correct?companyId=COMPANY_UUID" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "correctionText": "Correção do endereço do destinatário: Rua das Flores, 123, Centro, São Paulo/SP"
  }'
```

### Possible Responses

| Status | Meaning                           | Body                                                   |
|--------|------------------------------------|---------------------------------------------------------|
| 200    | Correction letter issued          | Updated document object with corrected status           |
| 400    | Text too short/long               | `{ "error": "Texto da correção é obrigatório (mínimo 15 caracteres)" }` |
| 400    | Document cannot receive correction| `{ "error": "...", "message": "Carta de correção só pode ser emitida para documentos autorizados" }` |
| 400    | Max corrections reached           | `{ "error": "...", "message": "Limite máximo de 20 cartas de correção atingido" }` |
| 401    | Invalid or missing token          | `{ "error": "Unauthorized" }`                          |
| 500    | Server error                      | `{ "error": "...", "message": "..." }`                 |

### Frontend Behavior Rules

- Show a "Correction Letter" button only for documents in `authorized` or `corrected` status.
- Display a form with a text area. Show a character counter (15 min, 1000 max).
- Show the current correction sequence number (e.g., "This will be correction letter #3").
- On success, refresh the document details and show the updated event timeline.
- Disable the button if 20 corrections have already been issued.

### Edge Cases & Considerations

- A correction letter cannot modify: amounts, taxes, CFOP, quantities, or product identification. It is only for supplementary information (addresses, descriptions, etc.). Make this clear to the user in the UI.
- Each new correction replaces the previous one — the latest `correction_text` and `correction_sequence` are stored on the document.

---

## 8. Document Event History

### Feature Overview

Retrieves the complete event timeline of a fiscal document, showing every status change, transmission attempt, authorization, rejection, cancellation, and correction — with timestamps and details.

### Implementation Instructions

1. The user must be authenticated.
2. Call the endpoint with the document `id` and `companyId`.
3. Events are returned in chronological order (oldest first).

### API Usage

- **Endpoint:** `GET /api/fiscal/documents/:id/events`
- **Authentication:** Bearer token required.
- **Query parameters:**
  - `companyId` (required, string): The UUID of the company.

```
curl -X GET "https://api.example.com/api/fiscal/documents/DOCUMENT_UUID/events?companyId=COMPANY_UUID" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Possible Responses

| Status | Meaning                  | Body                         |
|--------|--------------------------|-------------------------------|
| 200    | Events found             | Array of event objects        |
| 200    | No events                | Empty array `[]`              |
| 400    | Missing required params  | `{ "error": "..." }`         |
| 401    | Invalid or missing token | `{ "error": "Unauthorized" }` |
| 500    | Server error             | `{ "error": "...", "message": "..." }` |

Each event object contains:
- `id`: Event UUID
- `event_type`: Type of event (`"created"`, `"pending"`, `"authorized"`, `"rejected"`, `"cancelled"`, `"corrected"`)
- `old_status`: Previous status (null for creation events)
- `new_status`: New status after this event
- `description`: Human-readable description
- `error_code`: Error code (for rejections)
- `error_message`: Error message (for rejections)
- `protocol`: Authorization or cancellation protocol
- `response_data`: Full response payload from the tax authority
- `created_by`: User UUID who triggered the event
- `created_at`: ISO timestamp

### Frontend Behavior Rules

- Display as a vertical timeline with status icons and timestamps.
- Use color coding: green for authorized, red for rejected/cancelled, yellow for pending/processing, blue for corrected, grey for created/draft.
- Show error details (code + message) prominently for rejection events.
- This timeline is already included in the document detail response (`fiscal_document_events` field). A separate call to this endpoint is only needed for refreshing just the events without reloading the full document.

### Edge Cases & Considerations

- Events are immutable — they represent a historical log and cannot be edited or deleted.
- The `response_data` field may contain a large JSON object from the tax authority. Consider showing it behind an expandable "Technical Details" section.

---

## 9. Fiscal Statistics

### Feature Overview

Provides aggregated fiscal statistics for a company, including document counts by status and type, and total authorized value. Useful for a fiscal dashboard summary.

### Implementation Instructions

1. The user must be authenticated.
2. Call the endpoint with `companyId`. Optionally pass `month` for monthly breakdown.

### API Usage

- **Endpoint:** `GET /api/fiscal/stats`
- **Authentication:** Bearer token required.
- **Query parameters:**

| Parameter | Type   | Required | Description                                |
|----------|--------|----------|--------------------------------------------|
| companyId | string | Yes      | The UUID of the company                    |
| month    | string | No       | Filter by month in format `"YYYY-MM"` (e.g., `"2026-02"`) |

```
curl -X GET "https://api.example.com/api/fiscal/stats?companyId=COMPANY_UUID&month=2026-02" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Possible Responses

| Status | Meaning                  | Body                         |
|--------|--------------------------|-------------------------------|
| 200    | Stats returned           | Statistics object (see below) |
| 400    | Missing companyId        | `{ "error": "companyId é obrigatório" }` |
| 401    | Invalid or missing token | `{ "error": "Unauthorized" }` |
| 500    | Server error             | `{ "error": "...", "message": "..." }` |

**Successful response structure:**

```json
{
  "total": 45,
  "authorized": 38,
  "cancelled": 3,
  "rejected": 2,
  "draft": 1,
  "pending": 1,
  "totalValue": 125750.50,
  "byType": {
    "nfce": 30,
    "nfse": 12,
    "nfe": 3
  }
}
```

- `total`: Total number of fiscal documents (all statuses).
- `authorized`: Count of authorized documents.
- `cancelled`: Count of cancelled documents.
- `rejected`: Count of rejected documents.
- `draft`: Count of draft documents.
- `pending`: Count of pending documents.
- `totalValue`: Sum of `total_amount` for authorized documents only.
- `byType`: Document count breakdown by type.

### Frontend Behavior Rules

- Display as KPI cards on the fiscal dashboard: Total Documents, Authorized, Total Value.
- Use a pie or donut chart for the `byType` breakdown.
- Show smaller indicators for rejected, cancelled, and pending counts.
- When no month filter is applied, stats cover all time. Default the filter to the current month for relevance.
- On loading, show skeleton placeholders for each card.

### Edge Cases & Considerations

- The `totalValue` only sums authorized documents. Cancelled or rejected documents do not count toward the total.
- If no documents exist yet, all values will be zero and `byType` counts will be zero. Display a friendly "Get started" message.

---

## 10. Emit Fiscal Document (Transmit to SEFAZ/Prefeitura)

### Feature Overview

Transmits a fiscal document (NFC-e, NF-e, or NFS-e) to the tax authority (SEFAZ for NFC-e/NF-e, or Prefeitura for NFS-e) via the Nuvem Fiscal API. The document must be in `draft` or `rejected` status. After transmission, the status will update to `authorized`, `rejected`, `denied`, or `processing` depending on the tax authority's response.

### Implementation Instructions

1. The user must be authenticated.
2. The document must exist and be in `draft` or `rejected` status.
3. The company must have a valid fiscal configuration saved (which automatically syncs with Nuvem Fiscal).
4. Call the emit endpoint. The backend will:
   - Transition the document to `pending` status.
   - Build the XML payload and send it to the tax authority.
   - Update the document status based on the response.
5. If `auto_emit_on_sale` is enabled in the fiscal config, documents linked to sales are emitted automatically on creation.

### API Usage

- **Endpoint:** `POST /api/fiscal/documents/:id/emit`
- **Authentication:** Bearer token required.
- **Query parameters:**
  - `companyId` (required, string): The UUID of the company.

```
curl -X POST "https://api.example.com/api/fiscal/documents/DOCUMENT_UUID/emit?companyId=COMPANY_UUID" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Possible Responses

| Status | Meaning                         | Body                                                        |
|--------|---------------------------------|-------------------------------------------------------------|
| 200    | Emission processed              | Updated document object (check `status` field)              |
| 400    | Document not in draft/rejected  | `{ "error": "...", "message": "Apenas documentos em rascunho ou rejeitados podem ser emitidos..." }` |
| 400    | API not configured              | `{ "error": "...", "message": "API Nuvem Fiscal não configurada..." }` |
| 400    | Config not found                | `{ "error": "...", "message": "Configuração fiscal não encontrada" }` |
| 401    | Invalid or missing token        | `{ "error": "Unauthorized" }`                               |
| 500    | Transmission error              | `{ "error": "...", "message": "..." }`                      |

After a 200 response, check the `status` field of the returned document:
- `"authorized"` — Document was approved by the tax authority. The `access_key` and `authorization_protocol` fields will be populated.
- `"rejected"` — Document was rejected. Check `rejection_code` and `rejection_message` for details.
- `"denied"` — Document was denied (cannot be resubmitted for this number/series).
- `"processing"` — Document is being processed asynchronously. Use the Consult endpoint (section 12) to check later.

### Frontend Behavior Rules

- Show an "Emit" or "Transmit" button for documents in `draft` or `rejected` status.
- While emitting, show a loading state. The API call may take several seconds.
- On `authorized`: show a success notification, display the access key, and enable PDF/XML download buttons.
- On `rejected`: show the rejection reason prominently. Enable the user to fix issues and re-emit.
- On `processing`: show an info message and offer a "Check Status" button that calls the consult endpoint.
- On `denied`: show a permanent failure message. The user must create a new document.

### Edge Cases & Considerations

- NFC-e has a very strict timeout with SEFAZ — the response usually comes back within seconds.
- NFS-e may return `processing` status since some municipalities process asynchronously.
- If auto-emit fails during document creation, the document is still created as `draft` and can be emitted manually later.
- The `metadata.nuvem_fiscal_id` field stores the external ID used for subsequent operations (consult, cancel, PDF, XML).

---

## 11. Consult Fiscal Document Status

### Feature Overview

Queries the current status of a fiscal document at the tax authority via Nuvem Fiscal. Useful for documents in `processing` status that need a follow-up check, or to get the latest status of any transmitted document.

### Implementation Instructions

1. The user must be authenticated.
2. The document must have been previously emitted (must have a `metadata.nuvem_fiscal_id`).
3. Call the consult endpoint. If the status has changed, the backend will automatically update the local document.

### API Usage

- **Endpoint:** `POST /api/fiscal/documents/:id/consult`
- **Authentication:** Bearer token required.
- **Query parameters:**
  - `companyId` (required, string): The UUID of the company.

```
curl -X POST "https://api.example.com/api/fiscal/documents/DOCUMENT_UUID/consult?companyId=COMPANY_UUID" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Possible Responses

| Status | Meaning                          | Body                                              |
|--------|----------------------------------|---------------------------------------------------|
| 200    | Consult completed                | Updated document object                           |
| 400    | Document not emitted yet         | `{ "error": "...", "message": "Documento não possui ID externo..." }` |
| 400    | API not configured               | `{ "error": "...", "message": "API Nuvem Fiscal não configurada" }` |
| 401    | Invalid or missing token         | `{ "error": "Unauthorized" }`                     |
| 500    | Server/API error                 | `{ "error": "...", "message": "..." }`            |

### Frontend Behavior Rules

- Show a "Check Status" button for documents in `processing` or `pending` status.
- Can also be used as a "Refresh" action for any emitted document.
- On success, update the document display with the latest status.
- If the status transitions to `authorized`, enable PDF/XML download.

### Edge Cases & Considerations

- Do not poll excessively. A reasonable interval is every 10–30 seconds for `processing` documents.
- If the document was never emitted (no external ID), the endpoint returns an error.

---

## 12. Download Document PDF (DANFE/DANFCE/DANFSE)

### Feature Overview

Downloads the PDF representation of a fiscal document. For NFC-e, this is the DANFCE (consumer receipt). For NF-e, this is the DANFE. For NFS-e, this is the DANFSE. The PDF is fetched in real time from the Nuvem Fiscal API.

### Implementation Instructions

1. The user must be authenticated.
2. The document must have been authorized (or corrected/cancelled, for archival purposes).
3. Open the endpoint URL directly in a new browser tab or use it as an iframe source to display/download the PDF.

### API Usage

- **Endpoint:** `GET /api/fiscal/documents/:id/pdf`
- **Authentication:** Bearer token required.
- **Query parameters:**
  - `companyId` (required, string): The UUID of the company.

```
curl -X GET "https://api.example.com/api/fiscal/documents/DOCUMENT_UUID/pdf?companyId=COMPANY_UUID" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  --output document.pdf
```

### Possible Responses

| Status | Content-Type      | Meaning                          |
|--------|-------------------|----------------------------------|
| 200    | application/pdf   | PDF binary content               |
| 400    | application/json  | Document not authorized or no external ID |
| 401    | application/json  | Invalid or missing token         |
| 500    | application/json  | Download error                   |

### Frontend Behavior Rules

- Show a "Download PDF" or "Print" button for authorized, corrected, or cancelled documents.
- Open in a new browser tab using `window.open()` with the full URL including auth token.
- Alternatively, fetch as a blob and create an object URL for inline display.
- For NFC-e, consider showing the PDF inline (it's a small receipt).
- For NF-e/NFS-e, offer a download option.

### Edge Cases & Considerations

- The PDF is generated by Nuvem Fiscal and may take a moment for newly authorized documents.
- The response is binary — handle it as a blob/buffer, not JSON.
- If the document has no external Nuvem Fiscal ID (never emitted), the endpoint returns a 400 error.

---

## 13. Download Document XML

### Feature Overview

Downloads the XML of a fiscal document. The XML is the authoritative fiscal document as stored by the tax authority. Required for legal compliance and auditing.

### Implementation Instructions

1. The user must be authenticated.
2. The document must have been emitted via Nuvem Fiscal (must have an external ID).
3. Use this endpoint for downloading or archiving the XML.

### API Usage

- **Endpoint:** `GET /api/fiscal/documents/:id/xml`
- **Authentication:** Bearer token required.
- **Query parameters:**
  - `companyId` (required, string): The UUID of the company.

```
curl -X GET "https://api.example.com/api/fiscal/documents/DOCUMENT_UUID/xml?companyId=COMPANY_UUID" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  --output document.xml
```

### Possible Responses

| Status | Content-Type      | Meaning                          |
|--------|-------------------|----------------------------------|
| 200    | application/xml   | XML binary content               |
| 400    | application/json  | Document has no external ID      |
| 401    | application/json  | Invalid or missing token         |
| 500    | application/json  | Download error                   |

### Frontend Behavior Rules

- Show a "Download XML" button alongside the PDF button on authorized documents.
- Trigger a file download when clicked.
- This button should only be visible for documents that have been emitted (have an external ID).

### Edge Cases & Considerations

- XML files should be stored by the business for a minimum of 5 years as per Brazilian fiscal legislation.
- The response is an XML file — handle it as a blob/buffer, not JSON.
