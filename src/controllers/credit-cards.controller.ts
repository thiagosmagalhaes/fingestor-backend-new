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

      // Usar função RPC para calcular o extrato
      const { data, error } = await supabaseClient.rpc('get_credit_card_statement', {
        p_company_id: companyId,
        p_credit_card_id: id,
        p_reference_date: referenceDate,
      });

      if (error) {
        console.error('Error calling get_credit_card_statement:', error);
        if (error.message?.includes('não encontrado') || error.message?.includes('não tem permissão')) {
          return res.status(404).json({ error: 'Cartão de crédito não encontrado' });
        }
        throw error;
      }

      // A função retorna array de cartões, pegar o primeiro (único quando passa id)
      const cardData = data && data.length > 0 ? data[0] : null;
      
      if (!cardData) {
        return res.status(404).json({ error: 'Cartão de crédito não encontrado' });
      }

      const transactions = cardData.transactions || [];

      // Mapear transações para o formato correto com Date objects
      const mappedTransactions = transactions.map((t: any) => ({
        id: t.id,
        description: t.description,
        amount: Number(t.amount),
        type: t.type as 'income' | 'expense',
        categoryId: t.categoryId || '',
        companyId: t.companyId,
        date: new Date(t.date + 'T00:00:00-03:00'),
        dueDate: t.dueDate ? new Date(t.dueDate + 'T00:00:00-03:00') : undefined,
        paidAt: t.paidAt ? new Date(t.paidAt) : undefined,
        paymentDate: t.paymentDate ? new Date(t.paymentDate) : undefined,
        status: t.status as 'pending' | 'paid' | 'scheduled',
        isInstallment: t.isInstallment,
        installmentNumber: t.installmentNumber || undefined,
        totalInstallments: t.totalInstallments || undefined,
        isCreditCard: t.isCreditCard,
        creditCardId: t.creditCardId || undefined,
        creditCardName: undefined,
        notes: t.notes || undefined,
        invoicePaidAt: t.invoicePaidAt ? new Date(t.invoicePaidAt) : undefined,
        createdAt: new Date(t.createdAt),
      }));

      // Calcular informações da fatura
      const totalAmount = mappedTransactions.reduce((sum: number, t: any) => {
        if (t.type === 'expense') {
          return sum + t.amount;
        } else {
          return sum - t.amount;
        } 
      }, 0);

      const isPaid = mappedTransactions.some((t: any) => t.invoicePaidAt !== undefined);
      const paidAt = mappedTransactions.find((t: any) => t.invoicePaidAt)?.invoicePaidAt;
      const dueDate = cardData.invoiceDueDate ? new Date(cardData.invoiceDueDate + 'T00:00:00-03:00') : undefined;

      res.json({
        transactions: mappedTransactions,
        invoice: {
          totalAmount,
          isPaid,
          paidAt,
          dueDate
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

      // Verificar se o cartão existe e pertence à empresa
      const { data: creditCard, error: cardError } = await supabaseClient
        .from('credit_cards')
        .select('id')
        .eq('id', id)
        .eq('company_id', companyId)
        .single();

      if (cardError || !creditCard) {
        return res.status(404).json({ error: 'Cartão de crédito não encontrado' });
      }

      // Usar funções RPC do Supabase
      const rpcFunction = isPaid ? 'pay_credit_card_invoice' : 'reopen_credit_card_invoice';
      
      const { data: affectedRows, error: rpcError } = await supabaseClient.rpc(rpcFunction, {
        p_credit_card_id: id,
        p_invoice_month: referenceDate,
      });

      if (rpcError) {
        console.error(`Error calling ${rpcFunction}:`, rpcError);
        throw rpcError;
      }

      if (affectedRows === 0) {
        return res.status(404).json({ 
          error: isPaid 
            ? 'Nenhuma transação pendente encontrada neste período' 
            : 'Nenhuma transação paga encontrada neste período' 
        });
      }

      res.json({
        message: isPaid ? 'Fatura paga com sucesso' : 'Fatura marcada como em aberto',
        updatedCount: affectedRows,
        paidAt: isPaid ? new Date().toISOString() : null,
      });
    } catch (error) {
      console.error('Error in payInvoice:', error);
      res.status(500).json({ error: 'Erro ao atualizar fatura' });
    }
  }
}

export default new CreditCardsController();
