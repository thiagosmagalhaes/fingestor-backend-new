import { DRECategoryItem } from "./dashboard.types";

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
}
