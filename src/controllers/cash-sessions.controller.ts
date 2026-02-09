import { Request, Response } from 'express';
import { getSupabaseClient } from '../config/database';
import { AuthRequest } from '../middleware/auth';
import {
  OpenCashSessionRequest,
  CloseCashSessionRequest,
} from '../types/cash-session.types';

export class CashSessionsController {
  /**
   * GET /api/cash-sessions/current?companyId=xxx
   * Obtém a sessão de caixa aberta atual da empresa
   */
  async getCurrent(req: Request, res: Response): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const { companyId } = req.query;

      if (!companyId || typeof companyId !== 'string') {
        return res.status(400).json({ error: 'companyId é obrigatório' });
      }

      const supabaseClient = getSupabaseClient(authReq.accessToken!);

      // Verificar se a empresa existe e pertence ao usuário
      const { data: company, error: companyError } = await supabaseClient
        .from('companies')
        .select('id')
        .eq('id', companyId)
        .single();

      if (companyError || !company) {
        return res.status(404).json({
          error: 'Empresa não encontrada ou você não tem permissão',
        });
      }

      // Buscar sessão de caixa aberta
      const { data: session, error: sessionError } = await supabaseClient
        .rpc('get_open_cash_session', { p_company_id: companyId });

      if (sessionError) {
        console.error('Error fetching current cash session:', sessionError);
        throw sessionError;
      }

      // Se não houver sessão aberta, retornar null
      if (!session || session.length === 0) {
        return res.json(null);
      }

      res.json(session[0]);
    } catch (error: any) {
      console.error('Error in getCurrent cash session:', error);
      res.status(500).json({
        error: 'Erro ao buscar sessão de caixa',
        message: error.message,
      });
    }
  }

  /**
   * GET /api/cash-sessions?companyId=xxx&from=yyyy-mm-dd&to=yyyy-mm-dd
   * Lista todas as sessões de caixa da empresa (histórico)
   */
  async getAll(req: Request, res: Response): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const { companyId, limit = '50', offset = '0', from, to } = req.query;

      if (!companyId || typeof companyId !== 'string') {
        return res.status(400).json({ error: 'companyId é obrigatório' });
      }

      const supabaseClient = getSupabaseClient(authReq.accessToken!);

      // Verificar se a empresa existe e pertence ao usuário
      const { data: company, error: companyError } = await supabaseClient
        .from('companies')
        .select('id')
        .eq('id', companyId)
        .single();

      if (companyError || !company) {
        return res.status(404).json({
          error: 'Empresa não encontrada ou você não tem permissão',
        });
      }

      // Buscar histórico de sessões
      let query = supabaseClient
        .from('cash_sessions')
        .select('*')
        .eq('company_id', companyId);

      // Aplicar filtros de data
      if (from && typeof from === 'string') {
        query = query.gte('opening_date', `${from}T00:00:00`);
      }

      if (to && typeof to === 'string') {
        query = query.lte('opening_date', `${to}T23:59:59`);
      }

      query = query.order('opening_date', { ascending: false })
        .range(
          parseInt(offset as string),
          parseInt(offset as string) + parseInt(limit as string) - 1
        );

      const { data: sessions, error: sessionsError } = await query;

      if (sessionsError) {
        console.error('Error fetching cash sessions:', sessionsError);
        throw sessionsError;
      }

      // Buscar vendas de todas as sessões para calcular diferenças
      if (sessions && sessions.length > 0) {
        const sessionIds = sessions.map(s => s.id);
        
        const { data: allSales } = await supabaseClient
          .from('sales')
          .select('cash_session_id, paid_amount, total_amount, payment_method, payment_method_id')
          .in('cash_session_id', sessionIds);

        // Buscar nomes dos métodos de pagamento únicos
        const paymentMethodIds = allSales
          ?.filter(s => s.payment_method_id)
          .map(s => s.payment_method_id)
          .filter((v, i, a) => a.indexOf(v) === i) || [];

        let paymentMethodsMap = new Map<string, string>();
        if (paymentMethodIds.length > 0) {
          const { data: paymentMethods } = await supabaseClient
            .from('payment_methods')
            .select('id, name')
            .in('id', paymentMethodIds);

          if (paymentMethods) {
            paymentMethods.forEach(pm => paymentMethodsMap.set(pm.id, pm.name));
          }
        }

        // Calcular total de dinheiro por sessão
        const cashTotalsBySession = new Map<string, number>();
        
        allSales?.forEach(sale => {
          const amount = sale.paid_amount || sale.total_amount;
          
          // Determinar método de pagamento
          let paymentMethodName = '';
          if (sale.payment_method_id) {
            paymentMethodName = paymentMethodsMap.get(sale.payment_method_id) || sale.payment_method || '';
          } else if (sale.payment_method) {
            paymentMethodName = sale.payment_method;
          }

          // Se for dinheiro, acumular
          if (paymentMethodName.toLowerCase().includes('dinheiro') || 
              paymentMethodName.toLowerCase().includes('cash')) {
            const currentTotal = cashTotalsBySession.get(sale.cash_session_id) || 0;
            cashTotalsBySession.set(sale.cash_session_id, currentTotal + amount);
          }
        });

        // Adicionar diferença a cada sessão
        const sessionsWithDifference = sessions.map(session => {
          const cashTotal = cashTotalsBySession.get(session.id) || 0;
          const expectedCashAmount = session.opening_amount + cashTotal;
          let difference = null;

          if (session.status === 'closed' && session.closing_amount !== null) {
            difference = session.closing_amount - expectedCashAmount;
          }

          return {
            ...session,
            cash_difference: difference,
          };
        });

        return res.json(sessionsWithDifference);
      }

      res.json(sessions || []);
    } catch (error: any) {
      console.error('Error in getAll cash sessions:', error);
      res.status(500).json({
        error: 'Erro ao buscar sessões de caixa',
        message: error.message,
      });
    }
  }

  /**
   * GET /api/cash-sessions/:id?companyId=xxx
   * Obtém relatório completo de uma sessão de caixa específica
   */
  async getById(req: Request, res: Response): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const { id } = req.params;
      const { companyId } = req.query;

      if (!id) {
        return res.status(400).json({ error: 'ID é obrigatório' });
      }

      if (!companyId || typeof companyId !== 'string') {
        return res.status(400).json({ error: 'companyId é obrigatório' });
      }

      const supabaseClient = getSupabaseClient(authReq.accessToken!);

      // Verificar se a empresa existe e pertence ao usuário
      const { data: company, error: companyError } = await supabaseClient
        .from('companies')
        .select('id')
        .eq('id', companyId)
        .single();

      if (companyError || !company) {
        return res.status(404).json({
          error: 'Empresa não encontrada ou você não tem permissão',
        });
      }

      // Buscar dados da sessão
      const { data: session, error: sessionError } = await supabaseClient
        .from('cash_sessions')
        .select('*')
        .eq('id', id)
        .eq('company_id', companyId)
        .single();

      if (sessionError || !session) {
        return res.status(404).json({
          error: 'Sessão de caixa não encontrada',
        });
      }

      // Buscar todas as vendas vinculadas a essa sessão
      const { data: sales, error: salesError } = await supabaseClient
        .from('sales')
        .select(`
          id,
          sale_number,
          customer_name,
          total_amount,
          paid_amount,
          payment_status,
          payment_method,
          payment_method_id,
          sale_date,
          created_at
        `)
        .eq('cash_session_id', id)
        .order('sale_date', { ascending: true });

      if (salesError) {
        console.error('Error fetching sales:', salesError);
        throw salesError;
      }

      // Buscar nomes dos métodos de pagamento
      const paymentMethodIds = sales
        ?.filter(s => s.payment_method_id)
        .map(s => s.payment_method_id)
        .filter((v, i, a) => a.indexOf(v) === i) || []; // unique

      let paymentMethodsMap = new Map<string, string>();
      if (paymentMethodIds.length > 0) {
        const { data: paymentMethods } = await supabaseClient
          .from('payment_methods')
          .select('id, name')
          .in('id', paymentMethodIds);

        if (paymentMethods) {
          paymentMethods.forEach(pm => paymentMethodsMap.set(pm.id, pm.name));
        }
      }

      // Calcular totais por método de pagamento
      const paymentMethodTotals: Record<string, { count: number; total: number }> = {};
      let totalCash = 0;
      let totalSales = 0;
      let salesCount = 0;

      sales?.forEach(sale => {
        const amount = sale.paid_amount || sale.total_amount;
        totalSales += amount;
        salesCount++;

        // Determinar método de pagamento
        let paymentMethodName = 'Não informado';
        if (sale.payment_method_id) {
          paymentMethodName = paymentMethodsMap.get(sale.payment_method_id) || sale.payment_method || 'Não informado';
        } else if (sale.payment_method) {
          paymentMethodName = sale.payment_method;
        }

        // Se for dinheiro, somar no total de dinheiro
        if (paymentMethodName.toLowerCase().includes('dinheiro') || 
            paymentMethodName.toLowerCase().includes('cash') ||
            paymentMethodName.toLowerCase() === 'dinheiro') {
          totalCash += amount;
        }

        // Acumular por método
        if (!paymentMethodTotals[paymentMethodName]) {
          paymentMethodTotals[paymentMethodName] = { count: 0, total: 0 };
        }
        paymentMethodTotals[paymentMethodName].count++;
        paymentMethodTotals[paymentMethodName].total += amount;
      });

      // Calcular diferença (se o caixa estiver fechado)
      let expectedCashAmount = session.opening_amount + totalCash;
      let difference = null;
      let balanceStatus = null;

      if (session.status === 'closed' && session.closing_amount !== null) {
        difference = session.closing_amount - expectedCashAmount;
        if (difference === 0) {
          balanceStatus = 'balanced'; // Bateu certinho
        } else if (difference > 0) {
          balanceStatus = 'surplus'; // Sobra de dinheiro
        } else {
          balanceStatus = 'shortage'; // Falta de dinheiro
        }
      }

      // Montar resposta completa
      const report = {
        session: {
          id: session.id,
          company_id: session.company_id,
          opened_by: session.opened_by,
          closed_by: session.closed_by,
          opening_amount: session.opening_amount,
          opening_date: session.opening_date,
          closing_amount: session.closing_amount,
          closing_date: session.closing_date,
          status: session.status,
          opening_notes: session.opening_notes,
          closing_notes: session.closing_notes,
          created_at: session.created_at,
          updated_at: session.updated_at,
        },
        summary: {
          total_sales: salesCount,
          total_sales_amount: totalSales,
          total_cash_sales: totalCash,
          expected_cash_amount: expectedCashAmount,
          informed_closing_amount: session.closing_amount,
          difference: difference,
          balance_status: balanceStatus,
        },
        payment_methods: Object.entries(paymentMethodTotals).map(([method, data]) => ({
          payment_method: method,
          sales_count: data.count,
          total_amount: data.total,
        })),
        sales: sales?.map(sale => ({
          id: sale.id,
          sale_number: sale.sale_number,
          customer_name: sale.customer_name,
          total_amount: sale.total_amount,
          paid_amount: sale.paid_amount,
          payment_status: sale.payment_status,
          payment_method: sale.payment_method_id 
            ? paymentMethodsMap.get(sale.payment_method_id) || sale.payment_method 
            : sale.payment_method,
          sale_date: sale.sale_date,
          created_at: sale.created_at,
        })) || [],
      };

      res.json(report);
    } catch (error: any) {
      console.error('Error in getById cash session:', error);
      res.status(500).json({
        error: 'Erro ao buscar detalhes da sessão de caixa',
        message: error.message,
      });
    }
  }

  /**
   * POST /api/cash-sessions/open
   * Abre uma nova sessão de caixa
   */
  async open(req: Request, res: Response): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const requestData = req.body as OpenCashSessionRequest;

      if (!requestData.companyId) {
        return res.status(400).json({ error: 'companyId é obrigatório' });
      }

      if (requestData.openingAmount === undefined || requestData.openingAmount === null) {
        return res.status(400).json({ error: 'openingAmount é obrigatório' });
      }

      if (requestData.openingAmount < 0) {
        return res.status(400).json({ error: 'openingAmount não pode ser negativo' });
      }

      const supabaseClient = getSupabaseClient(authReq.accessToken!);

      // Obter user_id do token
      const { data: { user } } = await supabaseClient.auth.getUser();
      
      if (!user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      // Verificar se a empresa existe e pertence ao usuário
      const { data: company, error: companyError } = await supabaseClient
        .from('companies')
        .select('id')
        .eq('id', requestData.companyId)
        .single();

      if (companyError || !company) {
        return res.status(404).json({
          error: 'Empresa não encontrada ou você não tem permissão',
        });
      }

      // Verificar se já existe uma sessão aberta
      const { data: openSession } = await supabaseClient
        .rpc('get_open_cash_session', { p_company_id: requestData.companyId });

      if (openSession && openSession.length > 0) {
        return res.status(400).json({
          error: 'Já existe uma sessão de caixa aberta. Feche a sessão atual antes de abrir uma nova.',
        });
      }

      // Criar nova sessão
      const { data: session, error: sessionError } = await supabaseClient
        .from('cash_sessions')
        .insert({
          company_id: requestData.companyId,
          opened_by: user.id,
          opening_amount: requestData.openingAmount,
          opening_notes: requestData.openingNotes,
          status: 'open',
        })
        .select()
        .single();

      if (sessionError) {
        console.error('Error opening cash session:', sessionError);
        throw sessionError;
      }

      res.status(201).json(session);
    } catch (error: any) {
      console.error('Error in open cash session:', error);
      res.status(500).json({
        error: 'Erro ao abrir sessão de caixa',
        message: error.message,
      });
    }
  }

  /**
   * POST /api/cash-sessions/close
   * Fecha a sessão de caixa aberta atual
   */
  async close(req: Request, res: Response): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const requestData = req.body as CloseCashSessionRequest;

      if (!requestData.companyId) {
        return res.status(400).json({ error: 'companyId é obrigatório' });
      }

      if (requestData.closingAmount === undefined || requestData.closingAmount === null) {
        return res.status(400).json({ error: 'closingAmount é obrigatório' });
      }

      if (requestData.closingAmount < 0) {
        return res.status(400).json({ error: 'closingAmount não pode ser negativo' });
      }

      const supabaseClient = getSupabaseClient(authReq.accessToken!);

      // Obter user_id do token
      const { data: { user } } = await supabaseClient.auth.getUser();
      
      if (!user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      // Verificar se a empresa existe e pertence ao usuário
      const { data: company, error: companyError } = await supabaseClient
        .from('companies')
        .select('id')
        .eq('id', requestData.companyId)
        .single();

      if (companyError || !company) {
        return res.status(404).json({
          error: 'Empresa não encontrada ou você não tem permissão',
        });
      }

      // Buscar sessão aberta
      const { data: openSession } = await supabaseClient
        .rpc('get_open_cash_session', { p_company_id: requestData.companyId });

      if (!openSession || openSession.length === 0) {
        return res.status(400).json({
          error: 'Não há sessão de caixa aberta para fechar',
        });
      }

      const currentSession = openSession[0];

      // Fechar sessão
      const { data: closedSession, error: closeError } = await supabaseClient
        .from('cash_sessions')
        .update({
          closed_by: user.id,
          closing_amount: requestData.closingAmount,
          closing_date: new Date().toISOString(),
          closing_notes: requestData.closingNotes,
          status: 'closed',
        })
        .eq('id', currentSession.id)
        .select()
        .single();

      if (closeError) {
        console.error('Error closing cash session:', closeError);
        throw closeError;
      }

      res.json(closedSession);
    } catch (error: any) {
      console.error('Error in close cash session:', error);
      res.status(500).json({
        error: 'Erro ao fechar sessão de caixa',
        message: error.message,
      });
    }
  }
}

export default new CashSessionsController();
