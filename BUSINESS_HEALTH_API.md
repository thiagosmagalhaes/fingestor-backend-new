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
    "overdueAmount": 3200.00,        // pending/scheduled expenses whose date is before the end of the requested period (or today, whichever comes first)
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
  },
  "previousPeriod": {
    "from": "2024-08-05",
    "to": "2025-08-04",
    "revenue": 98000.00,
    "costs": 35000.00,
    "expenses": 28000.00,
    "grossProfit": 63000.00,
    "netProfit": 35000.00,
    "grossMargin": 64.3,
    "netMargin": 35.7,
    "overdueAmount": 2100.00    // overdue as of the end of the PREVIOUS period, not "as of today"
  },
  "comparison": {
    "revenue": { "current": 120000.00, "previous": 98000.00, "changeAbsolute": 22000.00, "changePercent": 22.4 },
    "costs": { "current": 40000.00, "previous": 35000.00, "changeAbsolute": 5000.00, "changePercent": 14.3 },
    "expenses": { "current": 30000.00, "previous": 28000.00, "changeAbsolute": 2000.00, "changePercent": 7.1 },
    "grossProfit": { "current": 80000.00, "previous": 63000.00, "changeAbsolute": 17000.00, "changePercent": 27.0 },
    "netProfit": { "current": 50000.00, "previous": 35000.00, "changeAbsolute": 15000.00, "changePercent": 42.9 },
    "netMargin": { "current": 41.7, "previous": 35.7, "changeAbsolute": 6.0, "changePercent": 16.8 },
    "overdueAmount": { "current": 3200.00, "previous": 2100.00, "changeAbsolute": 1100.00, "changePercent": 52.4 }
  }
}
```

### Previous-Period Comparison

`previousPeriod` and `comparison` compare the requested period against the **immediately preceding period of the same length** — e.g., a 1-month window (`2026-07-01`–`2026-07-31`) compares against June; a full-year window compares against the prior year; a custom 45-day window compares against the 45 days right before it. This is computed automatically on every request (no extra query param needed) using the same `get_business_health_data` RPC, just with shifted `from`/`to` dates.

- `previousPeriod` mirrors the core financial figures (`revenue`, `costs`, `expenses`, `grossProfit`, `netProfit`, `grossMargin`, `netMargin`) for that prior window, plus its own resolved `from`/`to`.
- `comparison` gives one `{ current, previous, changeAbsolute, changePercent }` object per metric (`revenue`, `costs`, `expenses`, `grossProfit`, `netProfit`, `netMargin`) — `changePercent` is `0` when `previous` is `0` (avoids division by zero for brand-new companies). For `netMargin`, `changeAbsolute` is in percentage points (e.g., `6.0` = margin grew from 35.7% to 41.7%), while `changePercent` is the relative change of the margin value itself — prefer `changeAbsolute` for margin, since "percentage change of a percentage" reads oddly in UI copy.
- This is separate from `revenue.trend`, which stays a narrower, always-monthly comparison (last 3 months vs. prior 3 months) used specifically to feed the health score's `growth` component — it does not shift when a custom period is passed the way `previousPeriod`/`comparison` do.

Note: `costs.topCategories` mixes COGS and operating-expense categories together (unlike the DRE endpoint, which splits them) — it's used purely to compute and display expense concentration.

---

## Status & Date Semantics

All filtering by `transactions.status`/`type`/`categories.nature` happens inside the Postgres RPCs (`get_business_health_data`, `get_business_health_monthly_breakdown` — see `supabase/migrations/`), not in the controller. This is the authoritative mapping:

| Field(s) | `status` | `type` | Date column | Notes |
|---|---|---|---|---|
| `revenue.*`, `costs.totalCosts`, `costs.totalExpenses`, `costs.fixed`, `costs.variable`, `costs.topCategories`, `profitability.*`, `previousPeriod.revenue/costs/expenses/grossProfit/netProfit/*Margin` | `paid` only | `income` / `expense` | `date` (transaction/purchase date) | Realized (accrual) figures. `costs.totalCosts` further requires `categories.nature = 'COST'`; `costs.totalExpenses` requires `nature = 'EXPENSE'` or no category. `investment` is never included. |
| `risk.overdueAmount`, `previousPeriod.overdueAmount`, `comparison.overdueAmount` | `pending` or `scheduled` | `expense` only | `date < LEAST(period end, today)` | Not paid yet, and its date has already passed the end of the requested period (or today, whichever is earlier) — i.e., "vencido dentro do período". No lower bound: it includes anything overdue as of that point in time, not just debts dated inside the period. |

**Important — this endpoint intentionally uses `date`, not `payment_date`, for `status = 'paid'` figures.** This matches `/api/dashboard/dre` (same `date`-based filtering), so revenue/cost/expense/profitability numbers here reconcile with the DRE screen. It **does not** match `/api/dashboard/summary` or `/api/dashboard/cash-flow`, which filter by `COALESCE(payment_date, date)` — the date money actually moved. For a normal expense these are usually the same day, but for a **credit-card purchase**, `date` is the original purchase date while `payment_date` is set only when the invoice is paid (often the following month). So a company that pays with credit cards can see different revenue/cost totals for the same month between this endpoint (and DRE) vs. Dashboard Summary/Cash Flow — this is expected, not a bug. If you're building a screen that shows both side by side, consider a short note explaining the difference, or pick one convention to surface consistently.

`risk.overdueAmount` also has a narrower scope than `/api/dashboard/overdue`: it only counts **expenses** (not income) and does not exclude credit-card transactions. Don't assume the two numbers match.

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
- For a "vs. período anterior" comparison (any metric, not just revenue), use `comparison.*` instead — e.g., `comparison.revenue.changePercent` compares the whole selected period against the equivalent prior period (same length, immediately before), unlike `revenue.trend` which is always a fixed 3-month-vs-3-month comparison regardless of the selected range.

### Cost Composition

- Show `costs.fixed` vs `costs.variable` as a simple two-segment bar or pie — this is the "fixed vs. variable cost" breakdown, derived from whether an expense is linked to a recurring rule (rent, subscriptions, payroll) or not.
- Show `costs.totalCosts` (COGS) vs `costs.totalExpenses` (operating) as a **separate** breakdown from fixed/variable — they answer different questions and should not be merged into a single chart. `totalCosts + totalExpenses` should reconcile with the same numbers shown on the DRE screen for the same period.
- `costs.topCategories` can drive a "biggest expense categories" list; if `risk.expenseConcentration` is high (e.g., > 40%), consider surfacing a warning near this section ("grande parte das suas despesas está concentrada em uma categoria").

### Risk / Overdue

- Show `risk.overdueAmount` as a warning callout when > 0. Note it's scoped to expenses only and isn't the exact same number as `/api/dashboard/overdue` (see "Status & Date Semantics" above) — don't assume they'll match if shown on the same screen.
- `risk.overdueRatio` is a fraction (e.g., `0.045` = 4.5%) — multiply by 100 for display.
- `risk.overdueAmount` is now bound to the requested period (overdue as of the period's end date, or today if the period includes today) — filtering to a past period no longer shows today's overdue amount. Use `comparison.overdueAmount` for a "vs. período anterior" indicator.

### Period Selector

- Default the screen to no `from`/`to` (trailing 12 months). If you add a period picker (e.g., "últimos 3 meses", "este ano", custom range), pass the resolved dates as `from`/`to` — everything in the response, including `revenue.last12Months`, respects that custom range.
- When a custom period is very short (e.g., a single week), `profitability` and `costs` will reflect just that window — consider a minimum-period hint in the UI (e.g., "recomendamos pelo menos 1 mês para uma leitura confiável") since the health score's growth component compares monthly averages and is less meaningful over very short windows.

---

## Edge Cases & Considerations

- **New companies with little/no data:** all totals will be `0`, `netMargin`/`grossMargin` will be `0` (division by zero is guarded server-side), and `healthScore.score` will land around 50 (neutral) rather than 0 — don't interpret a fresh company as "critico".
- **No data in the previous period** (new company, or period predates the company's first transaction): `previousPeriod` fields will be `0`, and every `comparison.*.changePercent` will be `0` (guarded against division by zero) even though `changeAbsolute` may be large — prefer showing "sem dados no período anterior" instead of a misleading "0%" when `comparison.revenue.previous === 0`.
- **Filtering to a period entirely in the past:** `risk.overdueAmount` reflects what was overdue as of the end of that period, not what's overdue today. Two different `from`/`to` ranges ending on different dates will (correctly) show different `overdueAmount` values even if nothing about the company's current unpaid bills has changed since.
- **Investment transactions:** exactly like the rest of the dashboard, `type = 'investment'` transactions are excluded from every metric on this endpoint (revenue, costs, expenses, risk). Only `income`/`expense` transactions with `status = 'paid'` feed the totals (except `risk.overdueAmount`, which looks at `pending`/`scheduled` expenses).
- **`fixed`/`variable` heuristic:** an expense counts as "fixed" only if it's tied to an *active* recurring rule at the time it was generated (`recurring_transaction_id` is set). A rent payment entered manually one month (not generated by the recurrence engine) will count as "variable" for that month — this is a heuristic, not a user-editable classification, so avoid wording in the UI that implies the user tagged it themselves.
- **Company type (`empresa`/`pessoal`):** this endpoint intentionally does not branch on `companies.type` — the same response shape and logic apply to both, since tax payments and other pessoa-física-specific entries already flow through `transactions` like anything else.
