import { Request, Response } from 'express';
import { getSupabaseClient } from '../config/database';
import { AuthRequest } from '../middleware/auth';
import {
  DashboardSummary,
  OverdueData,
  CashFlowData,
  CategoryBreakdownItem,
  RecentTransactionItem,
  CreditCardInvoice,
  CashFlowRPCResult,
  TransactionFromDB,
  SetupStatus,
  DREData,
  DREMonthlyData,
  DREResponse,
  TransactionDateRange,
} from '../types/dashboard.types';
 
export class DashboardController {
  /**
   * GET /api/dashboard/summary
   * Retorna resumo financeiro do mês atual usando RPC get_dashboard_summary
   */
  async getSummary(req: Request, res: Response): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const { companyId } = req.query;

      if (!companyId || typeof companyId !== 'string') {
        return res.status(400).json({ error: 'companyId é obrigatório' });
      }

      // Usar cliente autenticado para respeitar RLS
      const supabaseClient = getSupabaseClient(authReq.accessToken!);

      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      const startOfMonth = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0).getDate();
      const endOfMonth = new Date(year, month, lastDay, 23, 59, 59, 999);

      const { data, error } = await supabaseClient.rpc('get_dashboard_summary', {
        p_company_id: companyId,
        p_start_date: startOfMonth.toISOString(),
        p_end_date: endOfMonth.toISOString(),
      });

      if (error) {
        console.error('Error calling get_dashboard_summary:', error);
        throw error;
      }

      // A função RPC retorna campos em snake_case: { balance, total_income, total_expense, pending_income, pending_expense }
      // Convertendo para camelCase para o frontend
      const summary: DashboardSummary = {
        balance: Number(data?.balance || 0),
        totalIncome: Number(data?.total_income || 0),
        totalExpense: Number(data?.total_expense || 0),
        pendingIncome: Number(data?.pending_income || 0),
        pendingExpense: Number(data?.pending_expense || 0),
      };

      res.json(summary);
    } catch (error) {
      console.error('Error in getSummary:', error);
      res.status(500).json({ error: 'Erro ao buscar resumo do dashboard' });
    }
  }

  /**
   * GET /api/dashboard/overdue
   * Retorna transações vencidas (is_paid = false e data anterior a hoje)
   */
  async getOverdue(req: Request, res: Response): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const { companyId } = req.query;

      if (!companyId || typeof companyId !== 'string') {
        return res.status(400).json({ error: 'companyId é obrigatório' });
      }

      // Usar cliente autenticado para respeitar RLS
      const supabaseClient = getSupabaseClient(authReq.accessToken!);

      const now = new Date().toISOString();

      const { data: overdueTransactions, error } = await supabaseClient
        .from('transactions')
        .select('amount')
        .eq('company_id', companyId)
        .in('status', ['pending', 'scheduled'])
        .eq('is_credit_card', false)
        .lt('date', now);

      if (error) {
        console.error('Error fetching overdue transactions:', error);
        throw error;
      }

      const count = (overdueTransactions || []).length;
      const total = (overdueTransactions || []).reduce((sum, t) => sum + Number(t.amount), 0);

      const overdueData: OverdueData = {
        count,
        total,
      };

      res.json(overdueData);
    } catch (error) {
      console.error('Error in getOverdue:', error);
      res.status(500).json({ error: 'Erro ao buscar transações vencidas' });
    }
  }

  /**
   * GET /api/dashboard/cash-flow
   * Retorna fluxo de caixa usando RPC get_cash_flow_chart_data
   */
  async getCashFlow(req: Request, res: Response): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const { companyId, months = '6' } = req.query;

      if (!companyId || typeof companyId !== 'string') {
        return res.status(400).json({ error: 'companyId é obrigatório' });
      }

      // Usar cliente autenticado para respeitar RLS
      const supabaseClient = getSupabaseClient(authReq.accessToken!);

      const monthsCount = parseInt(months as string, 10) || 6;

      const { data, error } = await supabaseClient.rpc('get_cash_flow_chart_data', {
        p_company_id: companyId,
        p_months: monthsCount,
      });

      if (error) {
        console.error('Error calling get_cash_flow_chart_data:', error);
        throw error;
      }

      // A função retorna: { month, month_full, receitas, despesas, saldo }
      const cashFlowData: CashFlowData[] = (data || []).map((item: CashFlowRPCResult) => ({
        date: item.month,
        income: Number(item.receitas || 0),
        expense: Number(item.despesas || 0),
        balance: Number(item.saldo || 0),
      }));

      res.json(cashFlowData);
    } catch (error) {
      console.error('Error in getCashFlow:', error);
      res.status(500).json({ error: 'Erro ao buscar fluxo de caixa' });
    }
  }

  /**
   * GET /api/dashboard/category-breakdown
   * Retorna breakdown por categoria com agregação de transações
   */
  async getCategoryBreakdown(req: Request, res: Response): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const { companyId } = req.query;

      if (!companyId || typeof companyId !== 'string') {
        return res.status(400).json({ error: 'companyId é obrigatório' });
      }

      // Usar cliente autenticado para respeitar RLS
      const supabaseClient = getSupabaseClient(authReq.accessToken!);

      // Calcular data do mês atual
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      const startOfMonth = new Date(year, month, 1).toISOString();
      const lastDay = new Date(year, month + 1, 0).getDate();
      const endOfMonth = new Date(year, month, lastDay, 23, 59, 59, 999).toISOString();

      // 1. Buscar todas as categorias de despesa da empresa
      const { data: categories, error: categoriesError } = await supabaseClient
        .from('categories')
        .select('id, name, color')
        .eq('company_id', companyId)
        .eq('type', 'expense');

      if (categoriesError) {
        console.error('Error fetching categories:', categoriesError);
        throw categoriesError;
      }

      // 2. Buscar transações pagas do tipo expense do mês atual
      const { data: transactions, error: transactionsError } = await supabaseClient
        .from('transactions')
        .select('amount, category_id')
        .eq('company_id', companyId)
        .eq('type', 'expense')
        .eq('status', 'paid')
        .gte('date', startOfMonth)
        .lte('date', endOfMonth);

      if (transactionsError) {
        console.error('Error fetching transactions:', transactionsError);
        throw transactionsError;
      }

      // 3. Criar map de categorias com seus dados
      const categoryMap = new Map<string, {
        name: string;
        color: string;
        total: number;
        count: number;
      }>();

      // Inicializar todas as categorias com zero
      (categories || []).forEach((cat: any) => {
        categoryMap.set(cat.id, {
          name: cat.name,
          color: cat.color,
          total: 0,
          count: 0,
        });
      });

      // 4. Somar valores das transações por categoria
      let grandTotal = 0;

      (transactions || []).forEach((t: any) => {
        const categoryId = t.category_id;
        if (!categoryId || !categoryMap.has(categoryId)) return;

        const amount = Number(t.amount);
        grandTotal += amount;

        const existing = categoryMap.get(categoryId)!;
        existing.total += amount;
        existing.count += 1;
      });

      // 5. Converter para array e calcular percentuais (filtrar categorias sem transações)
      const allCategories = Array.from(categoryMap.values())
        .filter(cat => cat.total > 0) // Apenas categorias com transações
        .sort((a, b) => b.total - a.total); // Ordenar por valor decrescente

      // Pegar as 5 maiores categorias
      const top5 = allCategories.slice(0, 5);
      const others = allCategories.slice(5);

      // Agrupar o restante em "Outros"
      const categoryBreakdown: CategoryBreakdownItem[] = top5.map(cat => ({
        name: cat.name,
        value: cat.total,
        color: cat.color,
        percentage: grandTotal > 0 ? (cat.total / grandTotal) * 100 : 0,
        transactionCount: cat.count,
      }));

      // Se houver mais de 5 categorias, adicionar "Outros"
      if (others.length > 0) {
        const othersTotal = others.reduce((sum, cat) => sum + cat.total, 0);
        const othersCount = others.reduce((sum, cat) => sum + cat.count, 0);

        categoryBreakdown.push({
          name: 'Outros',
          value: othersTotal,
          color: '#CCCCCC',
          percentage: grandTotal > 0 ? (othersTotal / grandTotal) * 100 : 0,
          transactionCount: othersCount,
        });
      }

      res.json(categoryBreakdown);
    } catch (error) {
      console.error('Error in getCategoryBreakdown:', error);
      res.status(500).json({ error: 'Erro ao buscar breakdown de categorias' });
    }
  }

  /**
   * GET /api/dashboard/recent-transactions
   * Retorna transações recentes com informações de cartões de crédito
   */
  async getRecentTransactions(req: Request, res: Response): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const { companyId, limit = '10' } = req.query;

      if (!companyId || typeof companyId !== 'string') {
        return res.status(400).json({ error: 'companyId é obrigatório' });
      }

      // Usar cliente autenticado para respeitar RLS
      const supabaseClient = getSupabaseClient(authReq.accessToken!);

      const limitCount = parseInt(limit as string, 10) || 10;

      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      const startOfMonth = new Date(year, month, 1).toISOString();
      const lastDay = new Date(year, month + 1, 0).getDate();
      const endOfMonth = new Date(year, month, lastDay, 23, 59, 59, 999).toISOString();

      const { data: transactions, error } = await supabaseClient
        .from('transactions')
        .select(`
          id,
          description,
          amount,
          type,
          status,
          date,
          paid_at,
          category_id,
          categories (name, color),
          credit_cards (name)
        `)
        .eq('company_id', companyId)
        .order('date', { ascending: false })
        .gte('date', startOfMonth)
        .lte('date', endOfMonth)
        .limit(limitCount);

      if (error) {
        console.error('Error fetching recent transactions:', error);
        throw error;
      } 

      const recentTransactions: RecentTransactionItem[] = (transactions || []).map((t: TransactionFromDB) => {
        // Determinar status baseado em status e date
        const status  = t.status;

        // Extrair nome da categoria (pode vir como array ou objeto)
        const categoryName = t.categories
          ? Array.isArray(t.categories)
            ? t.categories[0]?.name
            : t.categories.name
          : undefined;

          const categoryColor = t.categories
          ? Array.isArray(t.categories)
            ? t.categories[0]?.color
            : t.categories.color
          : undefined;

        return {
          id: t.id,
          description: t.description,
          amount: Number(t.amount),
          type: t.type as 'income' | 'expense',
          status,
          dueDate: t.date,
          paidDate: t.paid_at || undefined,
          categoryName,
          categoryColor,
        };
      });

      res.json(recentTransactions);
    } catch (error) {
      console.error('Error in getRecentTransactions:', error);
      res.status(500).json({ error: 'Erro ao buscar transações recentes' });
    }
  }

  /**
   * GET /api/dashboard/credit-card-invoices
   * Retorna faturas de cartão de crédito (pendente de implementação)
   */
  async getCreditCardInvoices(req: Request, res: Response): Promise<Response | void> {
    try {
      const { companyId } = req.query;

      if (!companyId || typeof companyId !== 'string') {
        return res.status(400).json({ error: 'companyId é obrigatório' });
      }

      // TODO: Implementar faturas de cartão
      const invoices: CreditCardInvoice[] = [];

      res.json(invoices);
    } catch (error) {
      console.error('Error in getCreditCardInvoices:', error);
      res.status(500).json({ error: 'Erro ao buscar faturas de cartão' });
    }
  }

  /**
   * GET /api/dashboard/all
   * Retorna todos os dados do dashboard em uma única requisição
   */
  async getAllDashboardData(req: Request, res: Response): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const { companyId } = req.query;

      if (!companyId || typeof companyId !== 'string') {
        return res.status(400).json({ error: 'companyId é obrigatório' });
      }

      // Executar todas as consultas em paralelo
      const [
        summaryResult,
        overdueResult,
        cashFlowResult,
        categoryBreakdownResult,
        recentTransactionsResult,
        creditCardInvoicesResult,
      ] = await Promise.all([
        this.getSummaryData(companyId, authReq.accessToken!),
        this.getOverdueData(companyId, authReq.accessToken!),
        this.getCashFlowData(companyId, authReq.accessToken!),
        this.getCategoryBreakdownData(companyId, authReq.accessToken!),
        this.getRecentTransactionsData(companyId, authReq.accessToken!),
        this.getCreditCardInvoicesData(companyId, authReq.accessToken!),
      ]);

      res.json({
        summary: summaryResult,
        overdue: overdueResult,
        cashFlow: cashFlowResult,
        categoryBreakdown: categoryBreakdownResult,
        recentTransactions: recentTransactionsResult,
        creditCardInvoices: creditCardInvoicesResult,
      });
    } catch (error) {
      console.error('Error in getAllDashboardData:', error);
      res.status(500).json({ error: 'Erro ao buscar dados do dashboard' });
    }
  }

  // Métodos auxiliares privados para reutilização
  private async getSummaryData(companyId: string, accessToken: string): Promise<DashboardSummary> {
    const supabaseClient = getSupabaseClient(accessToken);
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const startOfMonth = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0).getDate();
    const endOfMonth = new Date(year, month, lastDay, 23, 59, 59, 999);

    const { data } = await supabaseClient.rpc('get_dashboard_summary', {
      p_company_id: companyId,
      p_start_date: startOfMonth.toISOString(),
      p_end_date: endOfMonth.toISOString(),
    });

    return {
      balance: Number(data?.balance || 0),
      totalIncome: Number(data?.total_income || 0),
      totalExpense: Number(data?.total_expense || 0),
      pendingIncome: Number(data?.pending_income || 0),
      pendingExpense: Number(data?.pending_expense || 0),
    };
  }

  private async getOverdueData(companyId: string, accessToken: string): Promise<OverdueData> {
    const supabaseClient = getSupabaseClient(accessToken);
    const now = new Date().toISOString();

    const { data: overdueTransactions } = await supabaseClient
      .from('transactions')
      .select('amount')
      .eq('company_id', companyId)
      .in('status', ['pending', 'scheduled'])
      .lt('date', now);

    return {
      count: (overdueTransactions || []).length,
      total: (overdueTransactions || []).reduce((sum, t) => sum + Number(t.amount), 0),
    };
  }

  private async getCashFlowData(companyId: string, accessToken: string): Promise<CashFlowData[]> {
    const supabaseClient = getSupabaseClient(accessToken);
    const { data } = await supabaseClient.rpc('get_cash_flow_chart_data', {
      p_company_id: companyId,
      p_months: 6,
    });

    return (data || []).map((item: CashFlowRPCResult) => ({
      date: item.month,
      income: Number(item.receitas || 0),
      expense: Number(item.despesas || 0),
      balance: Number(item.saldo || 0),
    }));
  }

  private async getCategoryBreakdownData(companyId: string, accessToken: string): Promise<CategoryBreakdownItem[]> {
    const supabaseClient = getSupabaseClient(accessToken);

    // Calcular data do mês atual
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const startOfMonth = new Date(year, month, 1).toISOString();
    const lastDay = new Date(year, month + 1, 0).getDate();
    const endOfMonth = new Date(year, month, lastDay, 23, 59, 59, 999).toISOString();

    // 1. Buscar todas as categorias de despesa da empresa
    const { data: categories } = await supabaseClient
      .from('categories')
      .select('id, name, color')
      .eq('company_id', companyId)
      .eq('type', 'expense');

    // 2. Buscar transações pagas do tipo expense do mês atual
    const { data: transactions } = await supabaseClient
      .from('transactions')
      .select('amount, category_id')
      .eq('company_id', companyId)
      .eq('type', 'expense')
      .eq('status', 'paid')
      .gte('date', startOfMonth)
      .lte('date', endOfMonth);

    // 3. Criar map de categorias com seus dados
    const categoryMap = new Map<string, {
      name: string;
      color: string;
      total: number;
      count: number;
    }>();

    // Inicializar todas as categorias com zero
    (categories || []).forEach((cat: any) => {
      categoryMap.set(cat.id, {
        name: cat.name,
        color: cat.color,
        total: 0,
        count: 0,
      });
    });

    // 4. Somar valores das transações por categoria
    let grandTotal = 0;

    (transactions || []).forEach((t: any) => {
      const categoryId = t.category_id;
      if (!categoryId || !categoryMap.has(categoryId)) return;

      const amount = Number(t.amount);
      grandTotal += amount;

      const existing = categoryMap.get(categoryId)!;
      existing.total += amount;
      existing.count += 1;
    });

    // 5. Converter para array e calcular percentuais (filtrar categorias sem transações)
    const allCategories = Array.from(categoryMap.values())
      .filter(cat => cat.total > 0) // Apenas categorias com transações
      .sort((a, b) => b.total - a.total); // Ordenar por valor decrescente

    // Pegar as 5 maiores categorias
    const top5 = allCategories.slice(0, 5);
    const others = allCategories.slice(5);

    // Agrupar o restante em "Outros"
    const result: CategoryBreakdownItem[] = top5.map(cat => ({
      name: cat.name,
      value: cat.total,
      color: cat.color,
      percentage: grandTotal > 0 ? (cat.total / grandTotal) * 100 : 0,
      transactionCount: cat.count,
    }));

    // Se houver mais de 5 categorias, adicionar "Outros"
    if (others.length > 0) {
      const othersTotal = others.reduce((sum, cat) => sum + cat.total, 0);
      const othersCount = others.reduce((sum, cat) => sum + cat.count, 0);

      result.push({
        name: 'Outros',
        value: othersTotal,
        color: '#CCCCCC',
        percentage: grandTotal > 0 ? (othersTotal / grandTotal) * 100 : 0,
        transactionCount: othersCount,
      });
    }

    return result;
  }

  private async getRecentTransactionsData(companyId: string, accessToken: string): Promise<RecentTransactionItem[]> {
    const supabaseClient = getSupabaseClient(accessToken);
    const { data: transactions } = await supabaseClient
      .from('transactions')
      .select(`
        id,
        description,
        amount,
        type,
        status,
        date,
        paid_at,
        category_id,
        categories (name, color),
        credit_cards (name)
      `)
      .eq('company_id', companyId)
      .order('date', { ascending: false })
      .limit(10);

    return (transactions || []).map((t: any) => {
      let status: 'paid' | 'pending' | 'overdue' | 'scheduled' = t.status;
      if (t.status === 'paid') {
        status = 'paid';
      } else if (t.status === 'scheduled') {
        status = 'scheduled';
      } else if (new Date(t.date) < new Date()) {
        status = 'overdue';
      } else {
        status = 'pending';
      }

      // Extrair nome da categoria (pode vir como array ou objeto)
      const categoryName = t.categories
        ? Array.isArray(t.categories)
          ? t.categories[0]?.name
          : t.categories.name
        : undefined;

      const categoryColor = t.categories
        ? Array.isArray(t.categories)
          ? t.categories[0]?.color
          : t.categories.color
        : undefined;

      return {
        id: t.id,
        description: t.description,
        amount: Number(t.amount),
        type: t.type as 'income' | 'expense',
        status,
        dueDate: t.date,
        paidDate: t.paid_at || undefined,
        categoryName,
        categoryColor,
      };
    });
  }

  private async getCreditCardInvoicesData(_companyId: string, _accessToken: string): Promise<CreditCardInvoice[]> {
    // TODO: Implementar
    return [];
  }

  /**
   * GET /api/dashboard/dre?companyId=xxx&period=current|12months&month=1-12&year=YYYY
   * Retorna dados do DRE (Demonstrativo de Resultados do Exercício)
   * Com period=current: retorna DRE do mês especificado (ou mês atual se não informado)
   * Com period=12months: retorna DRE dos últimos 12 meses, mês a mês
   */
  async getDRE(req: Request, res: Response): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const { companyId, period = 'current', month, year } = req.query;

      if (!companyId || typeof companyId !== 'string') {
        return res.status(400).json({ error: 'companyId é obrigatório' });
      }

      if (period !== 'current' && period !== '12months') {
        return res.status(400).json({ error: 'period deve ser "current" ou "12months"' });
      }

      const supabaseClient = getSupabaseClient(authReq.accessToken!);

      if (period === 'current') {
        // DRE do mês especificado ou mês atual
        const now = new Date();
        let targetYear = now.getFullYear();
        let targetMonth = now.getMonth(); // 0-11

        // Se year foi fornecido, validar e usar
        if (year && typeof year === 'string') {
          const yearNum = parseInt(year, 10);
          if (isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) {
            return res.status(400).json({ error: 'year deve ser um ano válido (2000-2100)' });
          }
          targetYear = yearNum;
        }

        // Se month foi fornecido, validar e usar
        if (month && typeof month === 'string') {
          const monthNum = parseInt(month, 10);
          if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
            return res.status(400).json({ error: 'month deve ser um número entre 1 e 12' });
          }
          targetMonth = monthNum - 1; // Converter para 0-11
        }

        const dreData = await this.calculateDRE(supabaseClient, companyId, targetMonth + 1, targetYear); // targetMonth + 1 porque JS usa 0-11
        
        const response: DREResponse = {
          current: dreData,
        };

        return res.json(response);
      } else {
        // DRE dos últimos 12 meses
        const monthlyData: DREMonthlyData[] = [];
        const now = new Date();

        for (let i = 11; i >= 0; i--) {
          const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const year = date.getFullYear();
          const month = date.getMonth() + 1; // Converter para 1-12

          const dreData = await this.calculateDRE(supabaseClient, companyId, month, year);
          
          const monthStr = date.toISOString().substring(0, 7); // YYYY-MM
          const monthName = date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
            .replace('.', '')
            .replace(/^\w/, (c) => c.toUpperCase()); // Capitalizar primeira letra

          monthlyData.push({
            ...dreData,
            month: monthStr,
            month_name: monthName,
          });
        }

        const response: DREResponse = {
          monthly: monthlyData,
        };

        return res.json(response);
      }
    } catch (error) {
      console.error('Error in getDRE:', error);
      res.status(500).json({ error: 'Erro ao buscar dados do DRE' });
    }
  }

  /**
   * Calcula o DRE para um mês/ano específico usando RPC do Supabase
   */
  private async calculateDRE(
    supabaseClient: any,
    companyId: string,
    month: number,
    year: number
  ): Promise<DREData> {
    const { data, error } = await supabaseClient.rpc('get_dre_data', {
      p_company_id: companyId,
      p_month: month,
      p_year: year,
    });

    if (error) {
      console.error('Error calling get_dre_data:', error);
      throw error;
    }

    return {
      receitas: Number(data.receitas || 0),
      receitas_categorias: data.receitas_categorias || [],
      custos: Number(data.custos || 0),
      custos_categorias: data.custos_categorias || [],
      despesas: Number(data.despesas || 0),
      despesas_categorias: data.despesas_categorias || [],
      lucro_bruto: Number(data.lucro_bruto || 0),
      lucro_liquido: Number(data.lucro_liquido || 0),
    };
  }

  /**
   * GET /api/dashboard/transaction-date-range?companyId=xxx
   * Retorna o mês/ano da primeira e última transação da empresa
   */
  async getTransactionDateRange(req: Request, res: Response): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const { companyId } = req.query;

      if (!companyId || typeof companyId !== 'string') {
        return res.status(400).json({ error: 'companyId é obrigatório' });
      }

      const supabaseClient = getSupabaseClient(authReq.accessToken!);

      // Buscar primeira e última transação em paralelo
      const [firstResult, lastResult] = await Promise.all([
        // Primeira transação (mais antiga)
        supabaseClient
          .from('transactions')
          .select('date')
          .eq('company_id', companyId)
          .order('date', { ascending: true })
          .limit(1),
        
        // Última transação (mais recente)
        supabaseClient
          .from('transactions')
          .select('date')
          .eq('company_id', companyId)
          .order('date', { ascending: false })
          .limit(1),
      ]);

      if (firstResult.error) {
        console.error('Error fetching first transaction:', firstResult.error);
        throw firstResult.error;
      }

      if (lastResult.error) {
        console.error('Error fetching last transaction:', lastResult.error);
        throw lastResult.error;
      }

      // Se não há transações
      if (!firstResult.data || firstResult.data.length === 0) {
        const response: TransactionDateRange = {
          first_transaction: null,
          last_transaction: null,
        };
        return res.json(response);
      }

      const firstDate = new Date(firstResult.data[0].date);
      const lastDate = new Date(lastResult.data![0].date);

      const response: TransactionDateRange = {
        first_transaction: {
          month: firstDate.getMonth() + 1, // 1-12
          year: firstDate.getFullYear(),
          date: firstResult.data[0].date,
        },
        last_transaction: {
          month: lastDate.getMonth() + 1, // 1-12
          year: lastDate.getFullYear(),
          date: lastResult.data![0].date,
        },
      };

      res.json(response);
    } catch (error) {
      console.error('Error in getTransactionDateRange:', error);
      res.status(500).json({ error: 'Erro ao buscar período de transações' });
    }
  }

  /**
   * GET /api/dashboard/
   * GET /api/dashboard/setup-status
   * Retorna status de configuração inicial do sistema (onboarding)
   * Verifica se existe pelo menos 1 registro em cada feature
   * Não requer companyId - verifica primeiro se usuário tem company
   */
  async getSetupStatus(req: Request, res: Response): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;

      // Usar cliente autenticado para respeitar RLS
      const supabaseClient = getSupabaseClient(authReq.accessToken!);

      // Primeiro: verificar se usuário tem pelo menos 1 company
      const { data: companies, error: companyError } = await supabaseClient
        .from('companies')
        .select('id')
        .limit(1);

      if (companyError) {
        console.error('Error checking companies:', companyError);
        throw companyError;
      }

      const hasCompany = (companies?.length ?? 0) > 0;

      // Se não tem company, retornar tudo false
      if (!hasCompany) {
        const setupStatus: SetupStatus = {
          hasCompany: false,
          hasCategories: false,
          hasCreditCards: false,
          hasTransactions: false,
        };
        return res.json(setupStatus);
      }

      // Usar a primeira company para verificar as outras features
      const companyId = companies![0].id;

      // Executar todas as verificações em paralelo para otimizar performance
      const [categoriesCheck, creditCardsCheck, transactionsCheck] = await Promise.all([
        // Verifica se existe pelo menos 1 categoria
        supabaseClient
          .from('categories')
          .select('id', { count: 'exact', head: false })
          .eq('company_id', companyId)
          .limit(1),
        
        // Verifica se existe pelo menos 1 cartão de crédito
        supabaseClient
          .from('credit_cards')
          .select('id', { count: 'exact', head: false })
          .eq('company_id', companyId)
          .limit(1),
        
        // Verifica se existe pelo menos 1 transação
        supabaseClient
          .from('transactions')
          .select('id', { count: 'exact', head: false })
          .eq('company_id', companyId)
          .limit(1),
      ]);

      // Verificar erros individuais
      if (categoriesCheck.error) {
        console.error('Error checking categories:', categoriesCheck.error);
      }
      if (creditCardsCheck.error) {
        console.error('Error checking credit cards:', creditCardsCheck.error);
      }
      if (transactionsCheck.error) {
        console.error('Error checking transactions:', transactionsCheck.error);
      }

      // Montar resposta com status de cada feature
      const setupStatus: SetupStatus = {
        hasCompany: true,
        hasCategories: !categoriesCheck.error && (categoriesCheck.data?.length ?? 0) > 0,
        hasCreditCards: !creditCardsCheck.error && (creditCardsCheck.data?.length ?? 0) > 0,
        hasTransactions: !transactionsCheck.error && (transactionsCheck.data?.length ?? 0) > 0,
      };

      res.json(setupStatus);
    } catch (error) {
      console.error('Error in getSetupStatus:', error);
      res.status(500).json({ error: 'Erro ao buscar status de configuração' });
    }
  }
}

export default new DashboardController();
