import { DRECategoryItem } from "./dashboard.types";

// Espelha o retorno JSON da RPC get_business_health_data (supabase/migrations/
// 20260805000001_business_health_period_bound_overdue.sql). Todos os campos já
// vêm agregados/filtrados por status no Postgres:
// - receitas/custos/despesas/custo_fixo/custo_variavel/despesas_categorias somam
//   apenas transações com status = 'paid' (já realizadas), pela coluna `date`.
// - total_vencido soma transações com status IN ('pending', 'scheduled') cuja
//   data já passou (até o fim do período consultado, ou hoje — o que vier primeiro).
export interface BusinessHealthRPCResult {
  receitas: number;
  custos: number;
  despesas: number;
  custo_fixo: number;
  custo_variavel: number;
  despesas_categorias: DRECategoryItem[];
  total_vencido: number;
}

export type HealthStatus = "saudavel" | "atencao" | "critico";

export interface HealthScoreComponent {
  value: number;
  label: string;
}

export interface PeriodFinancials {
  from: string;
  to: string;
  revenue: number;
  costs: number;
  expenses: number;
  grossProfit: number;
  netProfit: number;
  grossMargin: number;
  netMargin: number;
  // Vencido até o fim deste período (ou hoje, o que vier primeiro) — ver
  // BusinessHealthRPCResult.total_vencido.
  overdueAmount: number;
}

export interface ComparisonMetric {
  current: number;
  previous: number;
  changeAbsolute: number;
  changePercent: number;
}

export interface BusinessHealthResponse {
  period: {
    from: string;
    to: string;
  };
  revenue: {
    total: number;
    last12Months: number;
    trend: {
      currentAvg: number;
      previousAvg: number;
      changePercent: number;
    };
  };
  costs: {
    totalCosts: number;
    totalExpenses: number;
    fixed: number;
    variable: number;
    topCategories: DRECategoryItem[];
  };
  profitability: {
    grossProfit: number;
    netProfit: number;
    grossMargin: number;
    netMargin: number;
  };
  risk: {
    overdueAmount: number;
    overdueRatio: number;
    expenseConcentration: number;
  };
  healthScore: {
    score: number;
    status: HealthStatus;
    components: {
      profitability: HealthScoreComponent;
      growth: HealthScoreComponent;
      risk: HealthScoreComponent;
    };
  };
  previousPeriod: PeriodFinancials;
  comparison: {
    revenue: ComparisonMetric;
    costs: ComparisonMetric;
    expenses: ComparisonMetric;
    grossProfit: ComparisonMetric;
    netProfit: ComparisonMetric;
    netMargin: ComparisonMetric;
    overdueAmount: ComparisonMetric;
  };
}
