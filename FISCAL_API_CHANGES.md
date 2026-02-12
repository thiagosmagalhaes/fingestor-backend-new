# Fiscal System API Changes - Frontend Implementation Guide

## ⚠️ IMPORTANT: Database Migration Required

**Before using the fiscal system, you MUST apply the database migration:**

```bash
supabase db push
```

This will add the required `email` and `fone` fields to the `companies` table.

---

## Overview

This document outlines the required changes to the frontend application following updates to the fiscal document emission system. These changes ensure proper integration with the Nuvem Fiscal API and correct handling of fiscal configurations (NFC-e, NF-e, NFS-e).

**Impact Level**: Medium  
**Affected Areas**: Company configuration, fiscal settings, NFS-e cancellation

---

## 1. Company Fiscal Configuration

### What Changed

The fiscal configuration now requires additional company information to properly sync with Nuvem Fiscal. Previously optional fields are now mandatory for successful API integration.

### Required Frontend Changes

#### Step 1: Update Company Profile Form

The company profile now supports additional fiscal fields. All fields below can be sent via:
- **POST /api/companies** (create company)
- **PUT /api/companies/:id** (update company)

**Required fields for fiscal integration:**

1. **Email** (required)
   - Field: `email`
   - Must be a valid email address
   - Will be registered with Nuvem Fiscal

2. **Tax Regime** (`regimeTributario`) (required)
   - Field: `regimeTributario`
   - One of: `simples_nacional`, `simples_nacional_excesso`, `regime_normal`, `mei`
   - Used to determine tax calculations (ICMS, ISS, etc.)

3. **Fiscal Address** (`enderecoFiscal`) (required)
   - Field: `enderecoFiscal` (JSON object)
   - Must include:
     - `logradouro` (street name)
     - `numero` (street number, or "S/N" if none)
     - `bairro` (neighborhood)
     - `codigo_municipio` (IBGE city code)
     - `cidade` (city name)
     - `uf` (state code, 2 letters)
     - `cep` (postal code, digits only)
   - Optional fields:
     - `complemento` (address complement)

4. **State Registration** (`inscricaoEstadual`) (optional but recommended for NF-e/NFC-e)
   - Field: `inscricaoEstadual`

5. **Municipal Registration** (`inscricaoMunicipal`) (optional but recommended for NFS-e)
   - Field: `inscricaoMunicipal`

6. **Phone** (`fone`) (optional)
   - Field: `fone`

7. **Municipality Code** (`codigoMunicipio`) (recommended)
   - Field: `codigoMunicipio`
   - IBGE city code

8. **State** (`uf`) (recommended)
   - Field: `uf`
   - 2-letter state code

**Example Request Body (POST /api/companies or PUT /api/companies/:id):**

```json
{
  "name": "My Company Ltd",
  "cnpj": "12345678000190",
  "accountType": "empresa",
  "email": "fiscal@mycompany.com",
  "fone": "1140001000",
  "inscricaoEstadual": "123456789",
  "inscricaoMunicipal": "987654",
  "regimeTributario": "simples_nacional",
  "codigoMunicipio": "3550308",
  "uf": "SP",
  "enderecoFiscal": {
    "logradouro": "Rua das Flores",
    "numero": "123",
    "complemento": "Sala 4",
    "bairro": "Centro",
    "cidade": "São Paulo",
    "uf": "SP",
    "cep": "01310100",
    "codigo_municipio": "3550308",
    "codigo_pais": "1058",
    "pais": "Brasil"
  }
}
```

#### Step 2: Update Fiscal Configuration Form

When configuring fiscal settings (`POST /api/fiscal/config`), you can now send ALL company and fiscal data in a single request. The backend will automatically:

1. Update the `companies` table with company/emitente data
2. Save fiscal settings to `fiscal_config` table
3. Sync with Nuvem Fiscal automatically

**Complete Request Body Structure:**

```json
{
  "companyId": "uuid",
  "environment": "homologation",
  
  "nfceEnabled": true,
  "nfceSerie": 1,
  "cscId": "1",
  "cscToken": "ABC123...",
  
  "nfeEnabled": true,
  "nfeSerie": 1,
  
  "nfseEnabled": true,
  "nfseSerie": 1,
  "nfseRpsSerie": "1",
  "nfseMunicipalCode": "1234",
  "nfseCnae": "6201500",
  "nfseAliquotaIss": 5.0,
  
  "emitenteRazaoSocial": "Company Legal Name",
  "emitenteNomeFantasia": "Company Trade Name",
  "emitenteCnpj": "12345678000190",
  "emitenteIe": "123456789",
  "emitenteIm": "987654",
  
  "enderecoFiscal": {
    "logradouro": "Rua Coronel Calhau",
    "numero": "553",
    "bairro": "Centro",
    "cidade": "Ipanema",
    "uf": "MG",
    "cep": "36950000",
    "codigoMunicipio": "3131208"
  },
  
  "regimeTributario": "simples_nacional",
  "codigoMunicipio": "3131208",
  "uf": "MG",
  
  "certificatePassword": "292497",
  "certificateData": "base64_encoded_certificate",
  
  "autoEmitOnSale": false,
  "defaultDocumentType": "nfce"
}
```

**What Happens:**
- `enderecoFiscal`, `regimeTributario`, `emitenteIe`, `emitenteIm`, `codigoMunicipio`, `uf` → saved to `companies` table
- All other fiscal settings → saved to `fiscal_config` table
- Company is automatically synced with Nuvem Fiscal after save

### API Behavior

**Endpoint:** `POST /api/fiscal/config`

**Response (200 OK):**
```json
{
  "id": "config-uuid",
  "company_id": "company-uuid",
  "environment": "homologation",
  "nfce_enabled": true,
  "nfse_enabled": true,
  "nfe_enabled": true,
  ...
}
```

**Response (400 Bad Request):**
```json
{
  "error": "Erro ao sincronizar com Nuvem Fiscal",
  "message": "CNPJ/CPF do emitente é obrigatório"
}
```

### Frontend Implementation Rules

1. **Pre-validation:**
   - Before allowing fiscal configuration, validate that the company has:
     - Valid CNPJ/CPF
     - Email address
     - Complete fiscal address
     - Tax regime selected

2. **User Feedback:**
   - Show a warning if company profile is incomplete
   - Display validation error messages clearly
   - Success message: "Fiscal configuration saved and synced successfully"

3. **Loading States:**
   - Show loading indicator during sync (can take 3-5 seconds)
   - Display "Syncing with Nuvem Fiscal..." message

4. **Error Handling:**
   - If sync fails, the configuration is still saved locally
   - Show warning: "Configuration saved, but sync with Nuvem Fiscal failed. Please verify your data and try again."
   - Allow user to retry sync manually

### Edge Cases

- **Missing email:** API will return 400 error. Show message: "Email is required for fiscal integration."
- **Invalid address:** API will return 400 error. Highlight missing address fields.
- **Certificate expiration:** Future consideration - show warning if certificate expires in < 30 days.

---

## 2. NFS-e Cancellation

### What Changed

The NFS-e cancellation API now uses different field names to comply with Nuvem Fiscal standards.

- **Old field:** `justificativa` (generic)
- **New fields:** `motivo` (reason, required) and `codigo` (code, optional)

### Required Frontend Changes

**No changes required to the frontend interface** - the endpoint still accepts `reason` in the request body, which is automatically mapped to `motivo` internally.

However, for future versions, consider:

1. Adding a cancellation code field (optional) for municipalities that require it
2. Document minimum length requirement: **15 characters** for cancellation reason

### API Usage

**Endpoint:** `POST /api/fiscal/documents/:id/cancel?companyId=xxx`

**Request Body:**
```json
{
  "reason": "Client requested cancellation due to duplicate order"
}
```

**Validation:**
- Reason must be at least 15 characters
- Only authorized documents can be cancelled
- Draft documents are cancelled locally without API call

**Response (200 OK):**
```json
{
  "id": "document-uuid",
  "status": "cancelled",
  "cancelled_at": "2026-02-11T10:30:00Z",
  "cancellation_reason": "Client requested cancellation...",
  "cancellation_protocol": "135200000123456"
}
```

**Response (400 Bad Request):**
```json
{
  "error": "Erro ao cancelar documento fiscal",
  "message": "Apenas documentos autorizados ou em rascunho podem ser cancelados"
}
```

---

## 3. Automatic Nuvem Fiscal Sync

### What Changed

When fiscal configuration is saved (`POST /api/fiscal/config`), the system now automatically:

1. Registers/updates the company at Nuvem Fiscal
2. Uploads the digital certificate (if provided)
3. Configures enabled fiscal document types (NFC-e, NF-e, NFS-e)

This happens **asynchronously** after the configuration is saved.

### Frontend Implementation Rules

1. **Success Handling:**
   - Configuration save succeeds → show success message immediately
   - Sync failure does NOT fail the request
   - Log sync errors in console but don't block user

2. **Loading Indicator:**
   - Show "Saving configuration..." during POST request
   - Optional: Show "Configuration saved. Syncing with Nuvem Fiscal..." briefly

3. **No Additional Action Required:**
   - Sync is automatic and transparent to the user
   - No manual "Sync Now" button needed (though could be added for retry scenarios)

---

## 4. New Company Consultation Feature

### What It Does

The system can now query company data directly from Nuvem Fiscal to verify registration status and configuration.

### Future Frontend Integration

**Potential use case:** Add a "Verify Nuvem Fiscal Status" button in the fiscal configuration page to check:
- If company is registered
- Certificate status and expiration
- Current fiscal configuration

This feature is currently backend-only but can be exposed via a new endpoint in future updates.

---

## Testing Checklist

### Company Configuration
- [ ] Create new company without email → should show validation error
- [ ] Create company with complete profile → fiscal config should work
- [ ] Save fiscal config with all document types enabled → check sync success
- [ ] Save fiscal config with incomplete address → should show error

### NFS-e Operations
- [ ] Cancel authorized NFS-e with short reason (< 15 chars) → should show error
- [ ] Cancel authorized NFS-e with valid reason → should succeed
- [ ] Try to cancel rejected document → should show error

### Error Scenarios
- [ ] Invalid CNPJ format → should show validation error
- [ ] Missing required fiscal address field → should show which field is missing
- [ ] Network timeout during sync → config should still be saved

---

## Migration Notes

### Existing Installations

Companies with existing fiscal configurations **do not need immediate updates**, but they should:

1. Complete their company profile (email, address, tax regime)
2. Re-save fiscal configuration to trigger sync with Nuvem Fiscal

Consider adding a banner or notification for companies with incomplete profiles.

### Data Requirements

Before enabling fiscal features, guide users through:
1. Company profile completion
2. Digital certificate upload (for NF-e/NFC-e)
3. CSC token configuration (for NFC-e)
4. Municipal code and CNAE (for NFS-e)

---

## Support & Troubleshooting

### Common Issues

**Issue:** "Email is required for fiscal integration"  
**Solution:** Navigate to company profile and add a valid email address

**Issue:** "Address is incomplete"  
**Solution:** Ensure all required address fields are filled (street, number, neighborhood, city, state, postal code, IBGE code)

**Issue:** "Sync failed but config was saved"  
**Solution:** Verify company data and re-save configuration. Contact support if issue persists.

**Issue:** "Cannot cancel NFS-e"  
**Solution:** Check document status (must be authorized). Verify reason has at least 15 characters.

---

## Version History

**v1.2 (2026-02-11 - Current)**
- ✅ `POST /api/fiscal/config` now accepts and saves `enderecoFiscal`, `regimeTributario`, `codigoMunicipio`, `uf`
- ✅ Company data (address, tax regime, state registration, municipal registration) automatically updated when saving fiscal config
- ✅ Simplified workflow: send all data in one request to `/api/fiscal/config`
- ✅ Backend intelligently splits data between `companies` and `fiscal_config` tables

**v1.1 (2026-02-11)**
- ✅ Added `email` and `fone` fields to `companies` table (migration required)
- ✅ Updated `POST /api/companies` to accept and save all fiscal fields
- ✅ Updated `PUT /api/companies/:id` to accept and save all fiscal fields
- ✅ Backend now properly syncs company data with Nuvem Fiscal
- ⚠️ **Action required:** Run `supabase db push` to apply the migration

**v1.0 (2026-02-11)**
- Initial documentation
- Updated company sync requirements
- NFS-e cancellation field updates
- Automatic Nuvem Fiscal sync implementation

---

## Implementation Summary

### What Was Changed in the Backend

1. **Database Migration Created:**
   - File: `supabase/migrations/20260211120000_add_company_contact_fields.sql`
   - Adds `email` and `fone` columns to `companies` table
   - You MUST run `supabase db push` to apply this migration

2. **Companies Controller Updated:**
   - File: `src/controllers/companies.controller.ts`
   - `POST /api/companies` now accepts: `email`, `fone`, `inscricaoEstadual`, `inscricaoMunicipal`, `regimeTributario`, `enderecoFiscal`, `codigoMunicipio`, `uf`
   - `PUT /api/companies/:id` now accepts the same fields
   - All fields are properly saved to the database

3. **Fiscal Controller Enhanced:**
   - File: `src/controllers/fiscal.controller.ts`
   - `POST /api/fiscal/config` now accepts `enderecoFiscal`, `regimeTributario`, `codigoMunicipio`, `uf`
   - Automatically updates `companies` table with emitente/address data
   - Saves fiscal settings to `fiscal_config` table
   - Triggers automatic sync with Nuvem Fiscal

4. **Fiscal Types Updated:**
   - File: `src/types/fiscal.types.ts`
   - `CreateFiscalConfigRequest` interface now includes all company fields
   - TypeScript validation for all new fields

5. **Nuvem Fiscal Service:**
   - File: `src/services/nuvem-fiscal.service.ts`
   - Updated to properly read company fiscal data
   - Syncs email, phone, address, and tax regime with Nuvem Fiscal

### What the Frontend Needs to Do

**Option 1: Use fiscal config endpoint (Recommended)**
- Send all data to `POST /api/fiscal/config` in a single request
- Backend will automatically update both `companies` and `fiscal_config` tables
- Simpler integration, fewer API calls

**Option 2: Separate company and fiscal config**
- First: `PUT /api/companies/:id` with company data
- Then: `POST /api/fiscal/config` with fiscal settings
- More granular control, separate forms

### Testing Steps

1. Apply migration: `supabase db push`
2. Test Option 1 (recommended):
   - Send complete fiscal config with all fields
   - Verify company table is updated
   - Verify fiscal_config table is updated
3. Verify company is synced with Nuvem Fiscal (check logs)
4. Test document emission

---

## Quick Integration Guide for Frontend

### Scenario: User Wants to Configure Fiscal Settings

**Single API Call Approach:**

```javascript
// User fills out the fiscal configuration form
const fiscalData = {
  companyId: "8208acc4-a207-43f9-aa08-d7a622ff5a4f",
  environment: "homologation",
  
  // NFC-e settings
  nfceEnabled: true,
  nfceSerie: 1,
  cscId: "1",
  cscToken: "ABC123...",
  
  // Company/Emitente data (will update companies table)
  emitenteRazaoSocial: "THIAGO SOUZA MAGALHAES",
  emitenteNomeFantasia: "KITOS PIZZARIA",
  emitenteCnpj: "49023810000152",
  emitenteIe: "004512864.00-60",
  
  enderecoFiscal: {
    logradouro: "Rua Coronel Calhau",
    numero: "553",
    bairro: "Centro",
    cidade: "Ipanema",
    uf: "MG",
    cep: "36950000",
    codigoMunicipio: "3131208",
  },
  
  regimeTributario: "simples_nacional",
  codigoMunicipio: "3131208",
  uf: "MG",
  
  // Other settings
  certificatePassword: "292497",
  certificateData: "base64_certificate_here",
  autoEmitOnSale: false,
  defaultDocumentType: "nfce",
};

// Single API call
const response = await fetch('/api/fiscal/config', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(fiscalData)
});

if (response.ok) {
  // Success! Company and fiscal config are both updated
  // Nuvem Fiscal sync happens automatically in background
  console.log('Configuration saved successfully');
} else {
  const error = await response.json();
  console.error('Error:', error.message);
}
```

**That's it!** No need to call separate endpoints for company and fiscal config.
