# Investment Transaction Type — Frontend Integration Guide

## Feature Overview

A new transaction type called **investment** has been added to the system. This type allows users to register financial investments (such as fixed income, stocks, funds, or any capital allocation) without those entries being counted as income or expense.

Investment transactions are **fully isolated** from the financial dashboard: they do not affect balance, cash flow charts, DRE (income statement), category breakdowns, or any pending/overdue calculations. They exist as a separate class of transaction for tracking and recording purposes only.

---

## Implementation Instructions

### Preconditions

- The user must be authenticated and have a valid access token.
- A company (`companyId`) must exist.
- A **category of type `investment`** must exist before creating an investment transaction. Categories and transactions share the same `type` field.

### Sequence of Actions

1. Create a category of type `investment` (if one does not exist yet) using the categories endpoint.
2. Use that category when creating a transaction of type `investment`.
3. Display investment transactions in a dedicated section or with a distinct visual indicator, separate from income and expense lists.
4. When filtering transactions, add a new filter option for `investment`.
5. Do **not** include investment transactions in any financial totals, balance calculations, or chart visualizations on the frontend side.

---

## API Usage

### Create a Category of Type `investment`

**Endpoint:** `POST /api/categories`
**Authentication:** Required (Bearer token)

Required fields:
- `companyId` — UUID of the company
- `name` — Category name (minimum 2 characters)
- `type` — Must be `"investment"`
- `color` — Hex color code in `#RRGGBB` format

Note: The `nature` field (`COST` or `EXPENSE`) is **not applicable** to investment categories and must not be sent.

```bash
curl -X POST https://your-api/api/categories \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "<company-id>",
    "name": "Investimentos",
    "type": "investment",
    "color": "#6366F1"
  }'
```

---

### Create an Investment Transaction

**Endpoint:** `POST /api/transactions`
**Authentication:** Required (Bearer token)

Required fields:
- `companyId` — UUID of the company
- `categoryId` — UUID of an investment-type category
- `type` — Must be `"investment"`
- `description` — Text (minimum 2 characters)
- `amount` — Positive number
- `date` — ISO date string (e.g., `2026-05-29`)
- `status` — One of `"paid"`, `"pending"`, or `"scheduled"`

All optional fields available for income/expense transactions (notes, installments, recurring, credit card) are also supported for investment transactions.

```bash
curl -X POST https://your-api/api/transactions \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "<company-id>",
    "categoryId": "<investment-category-id>",
    "type": "investment",
    "description": "Tesouro Direto - Maio 2026",
    "amount": 500.00,
    "date": "2026-05-29",
    "status": "paid"
  }'
```

---

### List Transactions Filtered by Investment Type

**Endpoint:** `GET /api/transactions`
**Authentication:** Required (Bearer token)

Use the `filter=investment` query parameter to retrieve only investment transactions.

```bash
curl -X GET "https://your-api/api/transactions?companyId=<company-id>&filter=investment" \
  -H "Authorization: Bearer <token>"
```

---

### Update an Investment Transaction

**Endpoint:** `PUT /api/transactions/:id`
**Authentication:** Required (Bearer token)

The `type` field can be updated to or from `"investment"`. All other update rules remain the same as for income/expense transactions.

---

## Possible Responses

### Success

- `201 Created` — Transaction or category created successfully. Returns the created object.
- `200 OK` — List or update request succeeded.

### Validation Errors (400)

- `"Tipo deve ser \"income\", \"expense\" ou \"investment\""` — The `type` field contains an invalid value.
- `"Nature só pode ser definida para categorias de despesa"` — Attempted to set `nature` on an investment (or income) category.
- `"categoryId é obrigatório"` — Missing category ID.
- `"Valor deve ser maior que zero"` — Amount must be positive.
- Standard validation errors for missing or malformed required fields.

### Not Found (404)

- `"Categoria não encontrada ou não pertence a esta empresa"` — The provided `categoryId` does not exist or belongs to a different company.
- `"Empresa não encontrada ou você não tem permissão"` — Invalid or inaccessible `companyId`.

### Server Error (500)

- Generic error messages. Retry with valid data or display a user-friendly error message.

---

## Frontend Behavior Rules

### Transaction Forms

- Add `"investment"` as a selectable transaction type in any form that creates or edits transactions.
- When `investment` is selected as the type, display only investment categories in the category dropdown.
- The `nature` field must not be shown or sent for investment categories.
- Labels and icons for investment transactions should be visually distinct from income (green) and expense (red). Consider using a neutral or accent color (e.g., purple or indigo).

### Category Management

- Add `"investment"` as a valid type option when creating or editing categories.
- When the type is `investment`, hide the `nature` selector entirely.
- In category lists, group or badge investment categories distinctly.

### Transaction Lists

- Add a filter option (tab, chip, or dropdown item) labeled "Investimentos" that applies `filter=investment` to the request.
- When rendering a transaction row of type `investment`, do not apply the income (positive/green) or expense (negative/red) visual treatment. Use a neutral indicator.
- Do not count investment transactions in any running totals shown on list screens.

### Dashboard

- Investment transactions must **not** appear in or affect:
  - Balance (`balance`)
  - Total income (`totalIncome`) or total expense (`totalExpense`)
  - Pending income or pending expense
  - Cash flow chart
  - Category breakdown chart
  - DRE (income statement)
  - Overdue transaction counts

- If the frontend calculates any secondary totals locally (e.g., from a cached transaction list), ensure investment-type entries are excluded from those calculations.

### Empty States

- If filtering by `investment` and no results are returned, show an empty state encouraging the user to register their first investment.

---

## Edge Cases & Considerations

- **Existing data:** All previously created transactions remain `income` or `expense`. No data migration is needed on the frontend.
- **Category filtering in forms:** When creating a transaction, the category picker must filter categories by the selected transaction type. Selecting `investment` must show only `investment` categories and never `income` or `expense` categories.
- **Recurring and installment investments:** Investment transactions fully support recurring rules and installment splitting. The UI should not disable these options for the investment type.
- **Type immutability recommendation:** Changing a transaction from `investment` to `income`/`expense` (or vice versa) is allowed by the API, but may cause confusion in user history. Consider warning the user before allowing type changes on existing transactions.
- **No impact on credit card invoices:** Investment transactions linked to a credit card follow the same credit card logic as expense transactions, but they will still be excluded from dashboard totals.
