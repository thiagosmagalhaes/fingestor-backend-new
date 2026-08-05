# Business Health Endpoint — Frontend Integration Guide

## Feature Overview

A new endpoint, `GET /api/business-health`, returns a consolidated "360 view" of a company's financial health — the kind of summary tools like QuickBooks or Xero show, adapted for small businesses (Simples Nacional / MEI / pessoa física). It combines revenue (including a trailing-12-month total), profitability, cost composition (COGS vs. operating expense, and fixed vs. variable), overdue risk, and a single composite **health score (0–100)**.

It does not replace the existing dashboard endpoints (`/api/dashboard/summary`, `/api/dashboard/dre`, `/api/dashboard/cash-flow`) — it's a higher-level view meant for a dedicated "business health" screen or a summary card, built on the same underlying data (DRE numbers for the same period should match `/api/dashboard/dre`).

---

## API Usage

**Endpoint:** `GET /api/business-health`
**Authentication:** Required (Bearer token)

### Query Parameters

| Param | Required | Format | Description |
|---|---|---|---|
| `companyId` | Yes | UUID | The company to compute health for. |
| `from` | No | `YYYY-MM-DD` | Start of the period. Defaults to 12 months before `to`. |
| `to` | No | `YYYY-MM-DD` | End of the period. Defaults to today. |

If `from`/`to` are omitted entirely, the endpoint defaults to the **trailing 12 months**. All figures in the response — including `revenue.last12Months` and `revenue.trend` — are computed over the resolved `from`/`to` period; there is no longer a fixed "always trailing 12 months from today" figure. When you pass a custom `from`/`to`, `revenue.last12Months` reflects that custom period (same value as `revenue.total`), not a separate trailing-12-months number.

```bash
# Default period (last 12 months)
curl -X GET "https://your-api/api/business-health?companyId=<company-id>" \
  -H "Authorization: Bearer <token>"

# Custom period
curl -X GET "https://your-api/api/business-health?companyId=<company-id>&from=2026-01-01&to=2026-06-30" \
  -H "Authorization: Bearer <token>"
```

### Response Shape

```jsonc
{
  "period": { "from": "2025-08-05", "to": "2026-08-04" },
  "revenue": {
    "total": 120000.00,        // revenue within the requested period
    "last12Months": 120000.00, // revenue within the requested period (same as `total`; defaults to trailing 12 months when no `from`/`to` is passed)
    "trend": {
      "currentAvg": 11000.00,   // avg monthly revenue, last 3 months of the requested period
      "previousAvg": 9500.00,   // avg monthly revenue, the 3 months before that (within the requested period)
      "changePercent": 15.8
    }
  },
  "costs": {
    "totalCosts": 40000.00,    // COGS — expense categories with nature = COST
    "totalExpenses": 30000.00, // operating expenses — nature = EXPENSE or uncategorized
    "fixed": 25000.00,         // expenses linked to an active recurring rule (rent, payroll, subscriptions)
    "variable": 45000.00,      // one-off expenses
    "topCategories": [
      { "category_name": "Fornecedores", "category_color": "#ef4444", "total": 18000.00 }
    ]
  },
  "profitability": {
    "grossProfit": 80000.00,   // revenue - totalCosts
    "netProfit": 50000.00,     // revenue - totalCosts - totalExpenses
    "grossMargin": 66.7,       // %
    "netMargin": 41.7          // %
  },
  "risk": {
    "overdueAmount": 3200.00,        // pending/scheduled expenses past their date
    "overdueRatio": 0.045,           // overdueAmount / (totalCosts + totalExpenses)
    "expenseConcentration": 25.7     // % of total costs+expenses in the single largest category
  },
  "healthScore": {
    "score": 78,
    "status": "saudavel",            // "saudavel" | "atencao" | "critico"
    "components": {
      "profitability": { "value": 83, "label": "Margem saudável" },
      "growth": { "value": 66, "label": "Estável, leve alta" },
      "risk": { "value": 90, "label": "Baixo risco" }
    }
  }
}
```

Note: `costs.topCategories` mixes COGS and operating-expense categories together (unlike the DRE endpoint, which splits them) — it's used purely to compute and display expense concentration.

---

## Possible Responses

### Success

- `200 OK` — Returns the `BusinessHealthResponse` object above. All numeric fields are plain numbers (already computed server-side, no snake_case-to-camelCase mapping needed on the frontend).

### Validation Errors (400)

- `"companyId é obrigatório"` — Missing or non-string `companyId`.

### Server Error (500)

- `{"error": "Erro ao buscar saúde do negócio"}` — Generic failure (RPC error, network, etc). Retry or show a friendly error state.

---

## Frontend Behavior Rules

### Health Score Display

- Treat `healthScore.status` as the primary visual signal (e.g., a colored badge/gauge): `saudavel` → green, `atencao` → yellow/amber, `critico` → red.
- Show `healthScore.score` as the headline number (0–100), with the three `components` (`profitability`, `growth`, `risk`) as a breakdown — e.g., three small sub-bars — so the user understands *why* the score is what it is, not just the final number.
- Each component is now an object — `{ value: number, label: string }` — instead of a bare number. **`label` is computed server-side and is already in Portuguese**, ready to render directly next to (or inside) each sub-bar/tooltip. Don't reimplement the bucket logic on the frontend; just display `label` as-is.
- Do not hide the raw metrics behind the score — power users (accountants, more sophisticated owners) will want the underlying numbers (`profitability`, `costs`, `revenue`) visible too, not just the score.

### Health Score — Where Each `label` Comes From

For context (not something the frontend needs to compute), here's how the backend derives each `components.*.label` from `components.*.value`:

**`profitability`** — based on net margin (`profitability.netMargin`). Formula: `value = 50 + netMargin% × 2`, clamped 0–100.

| `value` | Net margin | `label` |
|---|---|---|
| 100 | ≥ 25% | "Margem excelente" |
| 70–99 | 10% a 25% | "Margem saudável" |
| 50–69 | 0% a 10% | "Margem positiva, mas apertada" |
| 1–49 | -25% a 0% | "Operando no prejuízo" |
| 0 | ≤ -25% | "Prejuízo acentuado" |

**`growth`** — based on the revenue trend (`revenue.trend.changePercent`): average monthly revenue of the last 3 months vs. the 3 months before that. Formula: `value = 50 + changePercent% × 2`, clamped 0–100.

| `value` | Revenue trend | `label` |
|---|---|---|
| 100 | ≥ +25% | "Crescimento forte" |
| 70–99 | +10% a +25% | "Crescendo" |
| 50–69 | 0% a +10% | "Estável, leve alta" |
| 1–49 | -25% a 0% | "Receita em queda" |
| 0 | ≤ -25% | "Queda acentuada de faturamento" |

Note: the formula floors at `value = 0`, so a 25% drop and a 60% drop both get the same `label` ("Queda acentuada de faturamento"). If you need finer-grained copy for very steep drops, read `revenue.trend.changePercent` directly instead of relying on `value`/`label`.

**`risk`** — based on two things together: how much is overdue (`risk.overdueRatio`) and whether expenses are concentrated in one category (`risk.expenseConcentration`). Formula: `value = 100 − (overdueRatio × 100 × 0.6) − (max(0, concentration% − 40) × 0.4)`, clamped 0–100.

| `value` | Typical cause | `label` |
|---|---|---|
| 90–100 | Little/no overdue, no category above ~40% of expenses | "Baixo risco" |
| 70–89 | Some overdue and/or one category somewhat concentrated | "Risco moderado" |
| 40–69 | Overdue ratio climbing and/or one category dominates expenses | "Atenção: atrasos ou concentração de despesas" |
| 0–39 | High overdue ratio and/or one category is most of total expenses | "Risco alto: revise atrasos e diversifique despesas" |

If you want to show *which* of the two risk factors is driving a low score, check `risk.overdueAmount` and `risk.expenseConcentration` directly — `label` doesn't distinguish between them.

Bucket definitions live in `src/controllers/business-health.controller.ts` (`PROFITABILITY_LABELS`, `GROWTH_LABELS`, `RISK_LABELS`) if wording ever needs to change — update there, not in the frontend.

### Revenue Card

- Headline `revenue.last12Months` as the period revenue figure — with the default (no `from`/`to`) it's the trailing-12-months number relevant to Simples Nacional bracket/teto monitoring; with a custom period selected, it reflects that period instead (same value as `revenue.total`).
- Use `revenue.trend.changePercent` for a small up/down indicator (arrow + %) next to the period revenue. Positive = green/up, negative = red/down.

### Cost Composition

- Show `costs.fixed` vs `costs.variable` as a simple two-segment bar or pie — this is the "fixed vs. variable cost" breakdown, derived from whether an expense is linked to a recurring rule (rent, subscriptions, payroll) or not.
- Show `costs.totalCosts` (COGS) vs `costs.totalExpenses` (operating) as a **separate** breakdown from fixed/variable — they answer different questions and should not be merged into a single chart. `totalCosts + totalExpenses` should reconcile with the same numbers shown on the DRE screen for the same period.
- `costs.topCategories` can drive a "biggest expense categories" list; if `risk.expenseConcentration` is high (e.g., > 40%), consider surfacing a warning near this section ("grande parte das suas despesas está concentrada em uma categoria").

### Risk / Overdue

- Show `risk.overdueAmount` as a warning callout when > 0, similar to the existing `/api/dashboard/overdue` widget.
- `risk.overdueRatio` is a fraction (e.g., `0.045` = 4.5%) — multiply by 100 for display.

### Period Selector

- Default the screen to no `from`/`to` (trailing 12 months). If you add a period picker (e.g., "últimos 3 meses", "este ano", custom range), pass the resolved dates as `from`/`to` — everything in the response, including `revenue.last12Months`, respects that custom range.
- When a custom period is very short (e.g., a single week), `profitability` and `costs` will reflect just that window — consider a minimum-period hint in the UI (e.g., "recomendamos pelo menos 1 mês para uma leitura confiável") since the health score's growth component compares monthly averages and is less meaningful over very short windows.

---

## Edge Cases & Considerations

- **New companies with little/no data:** all totals will be `0`, `netMargin`/`grossMargin` will be `0` (division by zero is guarded server-side), and `healthScore.score` will land around 50 (neutral) rather than 0 — don't interpret a fresh company as "critico".
- **Investment transactions:** exactly like the rest of the dashboard, `type = 'investment'` transactions are excluded from every metric on this endpoint (revenue, costs, expenses, risk). Only `income`/`expense` transactions with `status = 'paid'` feed the totals (except `risk.overdueAmount`, which looks at `pending`/`scheduled` expenses).
- **`fixed`/`variable` heuristic:** an expense counts as "fixed" only if it's tied to an *active* recurring rule at the time it was generated (`recurring_transaction_id` is set). A rent payment entered manually one month (not generated by the recurrence engine) will count as "variable" for that month — this is a heuristic, not a user-editable classification, so avoid wording in the UI that implies the user tagged it themselves.
- **Company type (`empresa`/`pessoal`):** this endpoint intentionally does not branch on `companies.type` — the same response shape and logic apply to both, since tax payments and other pessoa-física-specific entries already flow through `transactions` like anything else.
