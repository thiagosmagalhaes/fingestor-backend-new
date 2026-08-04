import { Request, Response } from "express";
import { getSupabaseClient } from "../config/database";
import { AuthRequest } from "../middleware/auth";
import {
  BusinessHealthResponse,
  BusinessHealthRPCResult,
  HealthScoreComponent,
  HealthStatus,
} from "../types/business-health.types";
import { CashFlowRPCResult } from "../types/dashboard.types";

// Pesos e limiares do health score — ajustáveis num único lugar
const SCORE_WEIGHTS = {
  profitability: 0.5,
  growth: 0.25,
  risk: 0.25,
};
const RISK_OVERDUE_WEIGHT = 0.6;
const RISK_CONCENTRATION_WEIGHT = 0.4;
const CONCENTRATION_SAFE_THRESHOLD = 40; // % da maior categoria de despesa a partir do qual passa a penalizar
const SCORE_STATUS_SAUDAVEL = 70;
const SCORE_STATUS_ATENCAO = 40;

// Legendas por faixa de score, usadas para explicar cada componente do health score.
// Ordenadas do maior para o menor "min" — a primeira faixa cujo "min" o score atinge é usada.
const PROFITABILITY_LABELS = [
  { min: 100, label: "Margem excelente" },
  { min: 70, label: "Margem saudável" },
  { min: 50, label: "Margem positiva, mas apertada" },
  { min: 1, label: "Operando no prejuízo" },
  { min: 0, label: "Prejuízo acentuado" },
];
const GROWTH_LABELS = [
  { min: 100, label: "Crescimento forte" },
  { min: 70, label: "Crescendo" },
  { min: 50, label: "Estável, leve alta" },
  { min: 1, label: "Receita em queda" },
  { min: 0, label: "Queda acentuada de faturamento" },
];
const RISK_LABELS = [
  { min: 90, label: "Baixo risco" },
  { min: 70, label: "Risco moderado" },
  { min: 40, label: "Atenção: atrasos ou concentração de despesas" },
  { min: 0, label: "Risco alto: revise atrasos e diversifique despesas" },
];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function labelFor(
  score: number,
  buckets: { min: number; label: string }[],
): string {
  const bucket = buckets.find((b) => score >= b.min);
  return (bucket || buckets[buckets.length - 1]).label;
}

function toComponent(
  score: number,
  buckets: { min: number; label: string }[],
): HealthScoreComponent {
  const rounded = Math.round(score);
  return { value: rounded, label: labelFor(rounded, buckets) };
}

export class BusinessHealthController {
  /**
   * GET /api/business-health?companyId=xxx&from=YYYY-MM-DD&to=YYYY-MM-DD
   * Retorna uma visão 360 da saúde financeira do negócio: faturamento
   * (incluindo acumulado dos últimos 12 meses), lucratividade, composição
   * de custos (COGS/despesa e fixo/variável) e um health score 0-100.
   */
  async getBusinessHealth(req: Request, res: Response): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const { companyId, from, to } = req.query;

      if (!companyId || typeof companyId !== "string") {
        return res.status(400).json({ error: "companyId é obrigatório" });
      }

      const { startDate, endDate } = this.resolvePeriod(
        typeof from === "string" ? from : undefined,
        typeof to === "string" ? to : undefined,
      );

      const supabaseClient = getSupabaseClient(authReq.accessToken!);

      const [healthResult, cashFlowResult] = await Promise.all([
        supabaseClient.rpc("get_business_health_data", {
          p_company_id: companyId,
          p_start_date: startDate.toISOString(),
          p_end_date: endDate.toISOString(),
        }),
        supabaseClient.rpc("get_cash_flow_chart_data", {
          p_company_id: companyId,
          p_months: 12,
        }),
      ]);

      if (healthResult.error) {
        console.error("Error calling get_business_health_data:", healthResult.error);
        throw healthResult.error;
      }
      if (cashFlowResult.error) {
        console.error("Error calling get_cash_flow_chart_data:", cashFlowResult.error);
        throw cashFlowResult.error;
      }

      const data: BusinessHealthRPCResult = healthResult.data;
      const monthly: CashFlowRPCResult[] = cashFlowResult.data || [];

      const response = this.buildResponse(startDate, endDate, data, monthly);

      res.json(response);
    } catch (error) {
      console.error("Error in getBusinessHealth:", error);
      res.status(500).json({ error: "Erro ao buscar saúde do negócio" });
    }
  }

  private resolvePeriod(
    from?: string,
    to?: string,
  ): { startDate: Date; endDate: Date } {
    const endDate = to ? new Date(`${to}T23:59:59.999`) : new Date();
    endDate.setHours(23, 59, 59, 999);

    let startDate: Date;
    if (from) {
      startDate = new Date(`${from}T00:00:00.000`);
    } else {
      startDate = new Date(endDate);
      startDate.setFullYear(startDate.getFullYear() - 1);
      startDate.setDate(startDate.getDate() + 1);
      startDate.setHours(0, 0, 0, 0);
    }

    return { startDate, endDate };
  }

  private buildResponse(
    startDate: Date,
    endDate: Date,
    data: BusinessHealthRPCResult,
    monthly: CashFlowRPCResult[],
  ): BusinessHealthResponse {
    const receitas = Number(data?.receitas || 0);
    const custos = Number(data?.custos || 0);
    const despesas = Number(data?.despesas || 0);
    const custoFixo = Number(data?.custo_fixo || 0);
    const custoVariavel = Number(data?.custo_variavel || 0);
    const totalVencido = Number(data?.total_vencido || 0);
    const topCategories = data?.despesas_categorias || [];

    const grossProfit = receitas - custos;
    const netProfit = receitas - custos - despesas;
    const grossMargin = receitas > 0 ? (grossProfit / receitas) * 100 : 0;
    const netMargin = receitas > 0 ? (netProfit / receitas) * 100 : 0;

    // RBT12 e tendência a partir da série mensal (últimos 12 meses, sempre fixo)
    const last12MonthsRevenue = monthly.reduce(
      (sum, m) => sum + Number(m.receitas || 0),
      0,
    );
    const last3 = monthly.slice(-3);
    const previous3 = monthly.slice(-6, -3);
    const currentAvg =
      last3.length > 0
        ? last3.reduce((sum, m) => sum + Number(m.receitas || 0), 0) / last3.length
        : 0;
    const previousAvg =
      previous3.length > 0
        ? previous3.reduce((sum, m) => sum + Number(m.receitas || 0), 0) /
          previous3.length
        : 0;
    const changePercent =
      previousAvg > 0 ? ((currentAvg - previousAvg) / previousAvg) * 100 : 0;

    const totalExpensesAndCosts = custos + despesas;
    const overdueRatio =
      totalExpensesAndCosts > 0 ? totalVencido / totalExpensesAndCosts : 0;
    const expenseConcentration =
      topCategories.length > 0 && totalExpensesAndCosts > 0
        ? (Number(topCategories[0].total) / totalExpensesAndCosts) * 100
        : 0;

    const healthScore = this.calculateHealthScore(
      netMargin,
      changePercent,
      overdueRatio,
      expenseConcentration,
    );

    return {
      period: {
        from: startDate.toISOString().substring(0, 10),
        to: endDate.toISOString().substring(0, 10),
      },
      revenue: {
        total: receitas,
        last12Months: last12MonthsRevenue,
        trend: {
          currentAvg,
          previousAvg,
          changePercent,
        },
      },
      costs: {
        totalCosts: custos,
        totalExpenses: despesas,
        fixed: custoFixo,
        variable: custoVariavel,
        topCategories: topCategories.slice(0, 5),
      },
      profitability: {
        grossProfit,
        netProfit,
        grossMargin,
        netMargin,
      },
      risk: {
        overdueAmount: totalVencido,
        overdueRatio,
        expenseConcentration,
      },
      healthScore,
    };
  }

  private calculateHealthScore(
    netMarginPct: number,
    revenueTrendPct: number,
    overdueRatio: number,
    expenseConcentrationPct: number,
  ): BusinessHealthResponse["healthScore"] {
    const profitabilityScore = clamp(50 + netMarginPct * 2, 0, 100);
    const growthScore = clamp(50 + revenueTrendPct * 2, 0, 100);

    const concentrationExcess = Math.max(
      0,
      expenseConcentrationPct - CONCENTRATION_SAFE_THRESHOLD,
    );
    const riskScore = clamp(
      100 -
        overdueRatio * 100 * RISK_OVERDUE_WEIGHT -
        concentrationExcess * RISK_CONCENTRATION_WEIGHT,
      0,
      100,
    );

    const score = Math.round(
      profitabilityScore * SCORE_WEIGHTS.profitability +
        growthScore * SCORE_WEIGHTS.growth +
        riskScore * SCORE_WEIGHTS.risk,
    );

    let status: HealthStatus;
    if (score >= SCORE_STATUS_SAUDAVEL) {
      status = "saudavel";
    } else if (score >= SCORE_STATUS_ATENCAO) {
      status = "atencao";
    } else {
      status = "critico";
    }

    return {
      score,
      status,
      components: {
        profitability: toComponent(profitabilityScore, PROFITABILITY_LABELS),
        growth: toComponent(growthScore, GROWTH_LABELS),
        risk: toComponent(riskScore, RISK_LABELS),
      },
    };
  }
}

export default new BusinessHealthController();
