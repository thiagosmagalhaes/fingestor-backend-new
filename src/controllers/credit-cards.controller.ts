import { Request, Response } from 'express';
import { getSupabaseClient } from '../config/database';
import { AuthRequest } from '../middleware/auth';

type CreditCardBrand = 'visa' | 'mastercard' | 'elo' | 'amex' | 'hipercard' | 'diners' | 'discover' | 'other';

interface CreateCreditCardRequest {
  companyId: string;
  name: string;
  brand: CreditCardBrand;
  closingDay: number;
  dueDay: number;
  creditLimit?: number;
}

interface UpdateCreditCardRequest {
  name?: string;
  brand?: CreditCardBrand;
  closingDay?: number;
  dueDay?: number;
  creditLimit?: number;
}

export class CreditCardsController {
  /**
   * GET /api/credit-cards?companyId=xxx
   * Lista todos os cartões de crédito de uma empresa
   */
  async getAll(req: Request, res: Response): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const { companyId } = req.query;

      if (!companyId || typeof companyId !== 'string') {
        return res.status(400).json({ error: 'companyId é obrigatório' });
      }

      const supabaseClient = getSupabaseClient(authReq.accessToken!);

      const { data: creditCards, error } = await supabaseClient
        .from('credit_cards')
        .select('*')
        .eq('company_id', companyId)
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching credit cards:', error);
        throw error;
      }

      res.json(creditCards || []);
    } catch (error) {
      console.error('Error in getAll credit cards:', error);
      res.status(500).json({ error: 'Erro ao buscar cartões de crédito' });
    }
  }

  /**
   * GET /api/credit-cards/:id?companyId=xxx
   * Obtém um cartão de crédito específico
   */
  async getById(req: Request, res: Response): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const { id } = req.params;
      const { companyId } = req.query;

      if (!id) {
        return res.status(400).json({ error: 'ID do cartão é obrigatório' });
      }

      if (!companyId || typeof companyId !== 'string') {
        return res.status(400).json({ error: 'companyId é obrigatório' });
      }

      const supabaseClient = getSupabaseClient(authReq.accessToken!);

      const { data: creditCard, error } = await supabaseClient
        .from('credit_cards')
        .select('*')
        .eq('id', id)
        .eq('company_id', companyId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'Cartão de crédito não encontrado' });
        }
        console.error('Error fetching credit card:', error);
        throw error;
      }

      res.json(creditCard);
    } catch (error) {
      console.error('Error in getById credit card:', error);
      res.status(500).json({ error: 'Erro ao buscar cartão de crédito' });
    }
  }

  /**
   * POST /api/credit-cards
   * Cria um novo cartão de crédito
   */
  async create(req: Request, res: Response): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const { companyId, name, brand, closingDay, dueDay, creditLimit } = req.body as CreateCreditCardRequest;

      // Validações
      if (!companyId) {
        return res.status(400).json({ error: 'companyId é obrigatório' });
      }

      if (!name || name.trim().length === 0) {
        return res.status(400).json({ error: 'Nome do cartão é obrigatório' });
      }

      if (name.trim().length < 2) {
        return res.status(400).json({ error: 'Nome do cartão deve ter pelo menos 2 caracteres' });
      }

      const validBrands: CreditCardBrand[] = ['visa', 'mastercard', 'elo', 'amex', 'hipercard', 'diners', 'discover', 'other'];
      if (!brand || !validBrands.includes(brand)) {
        return res.status(400).json({ 
          error: 'Bandeira inválida. Use: visa, mastercard, elo, amex, hipercard, diners, discover, other' 
        });
      }

      if (!closingDay || closingDay < 1 || closingDay > 31) {
        return res.status(400).json({ error: 'Dia de fechamento deve estar entre 1 e 31' });
      }

      if (!dueDay || dueDay < 1 || dueDay > 31) {
        return res.status(400).json({ error: 'Dia de vencimento deve estar entre 1 e 31' });
      }

      if (creditLimit !== undefined && creditLimit < 0) {
        return res.status(400).json({ error: 'Limite de crédito não pode ser negativo' });
      }

      const supabaseClient = getSupabaseClient(authReq.accessToken!);

      // Verificar se a empresa existe e pertence ao usuário
      const { data: company, error: companyError } = await supabaseClient
        .from('companies')
        .select('id')
        .eq('id', companyId)
        .single();

      if (companyError || !company) {
        return res.status(404).json({ error: 'Empresa não encontrada ou você não tem permissão' });
      }

      // Verificar se já existe cartão com o mesmo nome
      const { data: existingCard } = await supabaseClient
        .from('credit_cards')
        .select('id')
        .eq('company_id', companyId)
        .eq('name', name.trim())
        .single();

      if (existingCard) {
        return res.status(409).json({ error: 'Já existe um cartão com este nome' });
      }

      const { data: creditCard, error } = await supabaseClient
        .from('credit_cards')
        .insert({
          company_id: companyId,
          name: name.trim(),
          brand,
          closing_day: closingDay,
          due_day: dueDay,
          credit_limit: creditLimit || null,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating credit card:', error);
        throw error;
      }

      res.status(201).json(creditCard);
    } catch (error) {
      console.error('Error in create credit card:', error);
      res.status(500).json({ error: 'Erro ao criar cartão de crédito' });
    }
  }

  /**
   * PUT /api/credit-cards/:id
   * Atualiza um cartão de crédito existente
   */
  async update(req: Request, res: Response): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const { id } = req.params;
      const { name, brand, closingDay, dueDay, creditLimit } = req.body as UpdateCreditCardRequest;
      const { companyId } = req.query;

      if (!id) {
        return res.status(400).json({ error: 'ID do cartão é obrigatório' });
      }

      if (!companyId || typeof companyId !== 'string') {
        return res.status(400).json({ error: 'companyId é obrigatório' });
      }

      // Validações
      if (name !== undefined) {
        if (name.trim().length === 0) {
          return res.status(400).json({ error: 'Nome do cartão não pode ser vazio' });
        }
        if (name.trim().length < 2) {
          return res.status(400).json({ error: 'Nome do cartão deve ter pelo menos 2 caracteres' });
        }
      }

      const validBrands: CreditCardBrand[] = ['visa', 'mastercard', 'elo', 'amex', 'hipercard', 'diners', 'discover', 'other'];
      if (brand !== undefined && !validBrands.includes(brand)) {
        return res.status(400).json({ 
          error: 'Bandeira inválida. Use: visa, mastercard, elo, amex, hipercard, diners, discover, other' 
        });
      }

      if (closingDay !== undefined && (closingDay < 1 || closingDay > 31)) {
        return res.status(400).json({ error: 'Dia de fechamento deve estar entre 1 e 31' });
      }

      if (dueDay !== undefined && (dueDay < 1 || dueDay > 31)) {
        return res.status(400).json({ error: 'Dia de vencimento deve estar entre 1 e 31' });
      }

      if (creditLimit !== undefined && creditLimit < 0) {
        return res.status(400).json({ error: 'Limite de crédito não pode ser negativo' });
      }

      const supabaseClient = getSupabaseClient(authReq.accessToken!);

      // Preparar dados para atualização
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (name !== undefined) {
        updateData.name = name.trim();
      }

      if (brand !== undefined) {
        updateData.brand = brand;
      }

      if (closingDay !== undefined) {
        updateData.closing_day = closingDay;
      }

      if (dueDay !== undefined) {
        updateData.due_day = dueDay;
      }

      if (creditLimit !== undefined) {
        updateData.credit_limit = creditLimit;
      }

      // Se não há nada para atualizar além do updated_at
      if (Object.keys(updateData).length === 1) {
        return res.status(400).json({ error: 'Nenhum campo para atualizar' });
      }

      // Verificar se existe duplicata de nome
      if (name !== undefined) {
        const { data: duplicate } = await supabaseClient
          .from('credit_cards')
          .select('id')
          .eq('company_id', companyId)
          .eq('name', name.trim())
          .neq('id', id)
          .single();

        if (duplicate) {
          return res.status(409).json({ error: 'Já existe um cartão com este nome' });
        }
      }

      const { data: creditCard, error } = await supabaseClient
        .from('credit_cards')
        .update(updateData)
        .eq('id', id)
        .eq('company_id', companyId)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'Cartão de crédito não encontrado ou você não tem permissão' });
        }
        console.error('Error updating credit card:', error);
        throw error;
      }

      res.json(creditCard);
    } catch (error) {
      console.error('Error in update credit card:', error);
      res.status(500).json({ error: 'Erro ao atualizar cartão de crédito' });
    }
  }

  /**
   * DELETE /api/credit-cards/:id?companyId=xxx
   * Deleta um cartão de crédito
   */
  async delete(req: Request, res: Response): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const { id } = req.params;
      const { companyId } = req.query;

      if (!id) {
        return res.status(400).json({ error: 'ID do cartão é obrigatório' });
      }

      if (!companyId || typeof companyId !== 'string') {
        return res.status(400).json({ error: 'companyId é obrigatório' });
      }

      const supabaseClient = getSupabaseClient(authReq.accessToken!);

      const { error } = await supabaseClient
        .from('credit_cards')
        .delete()
        .eq('id', id)
        .eq('company_id', companyId);

      if (error) {
        console.error('Error deleting credit card:', error);
        throw error;
      }

      res.json({ message: 'Cartão de crédito deletado com sucesso' });
    } catch (error) {
      console.error('Error in delete credit card:', error);
      res.status(500).json({ error: 'Erro ao deletar cartão de crédito' });
    }
  }

  /**
   * GET /api/credit-cards/:id/statement?companyId=xxx&referenceDate=yyyy-mm-dd
   * Obtém o extrato do cartão de crédito para um mês específico
   */
  async getStatement(req: Request, res: Response): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const { id } = req.params;
      const { companyId, referenceDate } = req.query;

      if (!id) {
        return res.status(400).json({ error: 'ID do cartão é obrigatório' });
      }

      if (!companyId || typeof companyId !== 'string') {
        return res.status(400).json({ error: 'companyId é obrigatório' });
      }

      if (!referenceDate || typeof referenceDate !== 'string') {
        return res.status(400).json({ error: 'referenceDate é obrigatório (formato: YYYY-MM-DD)' });
      }

      const supabaseClient = getSupabaseClient(authReq.accessToken!);

      // Buscar o cartão de crédito
      const { data: creditCard, error: cardError } = await supabaseClient
        .from('credit_cards')
        .select('*')
        .eq('id', id)
        .eq('company_id', companyId)
        .single();

      if (cardError || !creditCard) {
        return res.status(404).json({ error: 'Cartão de crédito não encontrado' });
      }

      // Calcular o período da fatura
      // Parsear a data manualmente para evitar problemas de timezone
      const [yearStr, monthStr] = referenceDate.split('-');
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10) - 1; // JavaScript usa 0-11 para meses

      // Data de fechamento do mês de referência
      const closingDate = new Date(year, month, creditCard.closing_day);
      
      // Data de fechamento do mês anterior
      const previousMonth = month === 0 ? 11 : month - 1;
      const previousYear = month === 0 ? year - 1 : year;
      const previousClosingDate = new Date(previousYear, previousMonth, creditCard.closing_day);

      // Período de compras: dia seguinte ao fechamento anterior até fechamento atual
      const periodStart = new Date(previousClosingDate);
      periodStart.setDate(periodStart.getDate() + 1);
      
      // Data de vencimento
      let dueDate = new Date(year, month, creditCard.due_day);
      
      // Se vencimento é antes do fechamento, vencimento é no mês seguinte
      if (creditCard.due_day <= creditCard.closing_day) {
        dueDate.setMonth(dueDate.getMonth() + 1);
      }

      // Formatar datas para query (YYYY-MM-DD) - ajustar para timezone local
      const formatDate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      const startDateStr = formatDate(periodStart);
      const endDateStr = formatDate(closingDate);

      // Buscar transações do cartão no período
      const { data: transactions, error: txError } = await supabaseClient
        .from('transactions')
        .select('*')
        .eq('credit_card_id', id)
        .gte('date', startDateStr)
        .lte('date', endDateStr)
        .order('date', { ascending: false });

      if (txError) {
        console.error('Error fetching transactions:', txError);
        throw txError;
      }

      // Calcular total
      const totalAmount = (transactions || []).reduce((sum, tx) => {
        return sum + Number(tx.amount);
      }, 0);

      // Verificar se a fatura foi paga (invoice_paid_at preenchido em qualquer transação)
      const paidTransaction = (transactions || []).find(tx => tx.status === 'paid');
      const isPaid = !!paidTransaction;
      const paidAt = paidTransaction?.invoice_paid_at || null;

      // Mapear transações para o formato correto
      const mappedTransactions = (transactions || []).map((t: any) => ({
        id: t.id,
        description: t.description,
        amount: Number(t.amount),
        type: t.type as 'income' | 'expense',
        categoryId: t.category_id || '',
        companyId: t.company_id,
        date: new Date(t.date + 'T00:00:00-03:00'),
        dueDate: t.due_date ? new Date(t.due_date + 'T00:00:00-03:00') : undefined,
        paidAt: t.paid_at ? new Date(t.paid_at) : undefined,
        paymentDate: t.payment_date ? new Date(t.payment_date) : undefined,
        status: t.status as 'pending' | 'paid' | 'scheduled',
        isInstallment: t.is_installment,
        installmentNumber: t.installment_number || undefined,
        totalInstallments: t.total_installments || undefined,
        isCreditCard: t.is_credit_card,
        creditCardId: t.credit_card_id || undefined,
        creditCardName: undefined,
        notes: t.notes || undefined,
        invoicePaidAt: t.invoice_paid_at ? new Date(t.invoice_paid_at) : undefined,
        createdAt: new Date(t.created_at),
      }));

      res.json({
        transactions: mappedTransactions,
        invoice: {
          totalAmount: Number(totalAmount.toFixed(2)),
          closingDate: closingDate.toISOString().split('T')[0],
          dueDate: dueDate.toISOString().split('T')[0],
          isPaid,
          paidAt,
        },
      });
    } catch (error) {
      console.error('Error in getStatement:', error);
      res.status(500).json({ error: 'Erro ao buscar extrato do cartão' });
    }
  }

  /**
   * PUT /api/credit-cards/:id/statement/pay
   * Paga ou despaga a fatura de um cartão de crédito
   */
  async payInvoice(req: Request, res: Response): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const { id } = req.params;
      const { companyId, referenceDate, isPaid } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'ID do cartão é obrigatório' });
      }

      if (!companyId) {
        return res.status(400).json({ error: 'companyId é obrigatório' });
      }

      if (!referenceDate) {
        return res.status(400).json({ error: 'referenceDate é obrigatório (formato: YYYY-MM-DD)' });
      }

      if (typeof isPaid !== 'boolean') {
        return res.status(400).json({ error: 'isPaid deve ser true ou false' });
      }

      const supabaseClient = getSupabaseClient(authReq.accessToken!);

      // Buscar o cartão de crédito
      const { data: creditCard, error: cardError } = await supabaseClient
        .from('credit_cards')
        .select('*')
        .eq('id', id)
        .eq('company_id', companyId)
        .single();

      if (cardError || !creditCard) {
        return res.status(404).json({ error: 'Cartão de crédito não encontrado' });
      }

      // Calcular o período da fatura (mesma lógica do getStatement)
      const [yearStr, monthStr] = referenceDate.split('-');
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10) - 1;

      const closingDate = new Date(year, month, creditCard.closing_day);
      const previousMonth = month === 0 ? 11 : month - 1;
      const previousYear = month === 0 ? year - 1 : year;
      const previousClosingDate = new Date(previousYear, previousMonth, creditCard.closing_day);

      const periodStart = new Date(previousClosingDate);
      periodStart.setDate(periodStart.getDate() + 1);

      const formatDate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      const startDateStr = formatDate(periodStart);
      const endDateStr = formatDate(closingDate);

      // Buscar IDs das transações do período
      const { data: transactions, error: txError } = await supabaseClient
        .from('transactions')
        .select('id')
        .eq('credit_card_id', id)
        .gte('date', startDateStr)
        .lte('date', endDateStr);

      if (txError) {
        console.error('Error fetching transactions:', txError);
        throw txError;
      }

      if (!transactions || transactions.length === 0) {
        return res.status(404).json({ error: 'Nenhuma transação encontrada neste período' });
      }

      const transactionIds = transactions.map(t => t.id);

      // Atualizar transações
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (isPaid) {
        // Pagar fatura: setar invoice_paid_at com timestamp atual
        updateData.invoice_paid_at = new Date().toISOString();
        updateData.status = 'paid';
      } else {
        // Despagar fatura: remover invoice_paid_at e voltar para pending
        updateData.invoice_paid_at = null;
        updateData.status = 'pending';
      }

      const { error: updateError } = await supabaseClient
        .from('transactions')
        .update(updateData)
        .in('id', transactionIds);

      if (updateError) {
        console.error('Error updating transactions:', updateError);
        throw updateError;
      }

      res.json({
        message: isPaid ? 'Fatura paga com sucesso' : 'Fatura marcada como em aberto',
        updatedCount: transactionIds.length,
        paidAt: isPaid ? updateData.invoice_paid_at : null,
      });
    } catch (error) {
      console.error('Error in payInvoice:', error);
      res.status(500).json({ error: 'Erro ao atualizar fatura' });
    }
  }
}

export default new CreditCardsController();
