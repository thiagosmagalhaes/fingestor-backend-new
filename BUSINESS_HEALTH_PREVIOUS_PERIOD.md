# Business Health — Previous-Period Comparison

## What changed

`GET /api/business-health` now also returns `previousPeriod` and `comparison`, comparing the requested period against the **immediately preceding period of the same length** — e.g., a 1-month window (`2026-07-01`–`2026-07-31`) compares against June; a full-year window compares against the prior year; a custom 45-day window compares against the 45 days right before it.

This is computed automatically on every request — no extra query param needed. It reuses the existing `get_business_health_data` RPC with shifted `from`/`to` dates. (A follow-up migration, `20260805000001_business_health_period_bound_overdue.sql`, was later needed to make the RPC's `total_vencido` respect the requested period at all — see "`overdueAmount` correctness fix" below.)

## Response additions

```jsonc
{
  // ...existing fields (period, revenue, costs, profitability, risk, healthScore)...

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
    "overdueAmount": 2100.00
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

- `previousPeriod` mirrors the core financial figures (`revenue`, `costs`, `expenses`, `grossProfit`, `netProfit`, `grossMargin`, `netMargin`, `overdueAmount`) for that prior window, plus its own resolved `from`/`to`.
- `comparison` gives one `{ current, previous, changeAbsolute, changePercent }` object per metric (`revenue`, `costs`, `expenses`, `grossProfit`, `netProfit`, `netMargin`, `overdueAmount`) — `changePercent` is `0` when `previous` is `0` (avoids division by zero for brand-new companies).
- For `netMargin`, `changeAbsolute` is in percentage points (e.g., `6.0` = margin grew from 35.7% to 41.7%), while `changePercent` is the relative change of the margin value itself — prefer `changeAbsolute` for margin, since "percentage change of a percentage" reads oddly in UI copy.

### `overdueAmount` correctness fix

`previousPeriod.overdueAmount`/`comparison.overdueAmount` only became meaningful after a follow-up fix: the underlying `get_business_health_data` RPC originally computed `total_vencido` (overdue) as "overdue as of **today**", completely ignoring `p_start_date`/`p_end_date`. That meant the RPC call for the previous period returned the exact same `total_vencido` as the current period's call — a wasted call, and not something worth exposing in the response. Migration `20260805000001_business_health_period_bound_overdue.sql` changed it to "overdue as of the end of the requested period, or today, whichever is earlier" (`t.date < LEAST(p_end_date::date, CURRENT_DATE)`), so the previous period's overdue figure is now genuinely different from and comparable to the current period's — which is what makes `previousPeriod.overdueAmount`/`comparison.overdueAmount` worth having.

## How it relates to `revenue.trend`

This is separate from the existing `revenue.trend` field, which stays a narrower, always-monthly comparison (last 3 months vs. prior 3 months within the requested period) used specifically to feed the health score's `growth` component. `revenue.trend` does not shift when a custom period is passed the way `previousPeriod`/`comparison` do — use `comparison.*` for a general "vs. período anterior" UI, and keep `revenue.trend` only for the health score breakdown.

## Frontend usage

- For a "vs. período anterior" indicator on any metric card, read `comparison.<metric>.changePercent` (and/or `changeAbsolute`) instead of recomputing it — positive = green/up, negative = red/down.
- **Edge case:** if `comparison.revenue.previous === 0` (new company, or the period predates the company's first transaction), `changePercent` will be `0` even though `changeAbsolute` may be large. Show "sem dados no período anterior" instead of a misleading "0%" in that case.

## Where it's implemented

- `supabase/migrations/20260805000001_business_health_period_bound_overdue.sql` — `total_vencido` bound to the requested period (see above); also documents the `status`/`type`/`nature` filtering used throughout the RPC.
- `src/types/business-health.types.ts` — `PeriodFinancials` and `ComparisonMetric` types, and `previousPeriod`/`comparison` (including `overdueAmount`) on `BusinessHealthResponse`.
- `src/controllers/business-health.controller.ts`:
  - `resolvePreviousPeriod()` — computes the prior period's `from`/`to` from the resolved current period.
  - `calculateFinancials()` — extracted so the same revenue/cost/margin math runs for both the current and previous period.
  - `calculateRisk()` — extracted so `overdueAmount`/`overdueRatio`/`expenseConcentration` come from one documented place.
  - `buildComparisonMetric()` — builds each `{ current, previous, changeAbsolute, changePercent }` entry.
  - `getBusinessHealth()` fires a third RPC call (`get_business_health_data` for the previous period) in parallel with the existing two calls.
