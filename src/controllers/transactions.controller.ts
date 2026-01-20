import { Request, Response } from 'express';
import { getSupabaseClient } from '../config/database';
import { AuthRequest } from '../middleware/auth';

type TransactionType = 'income' | 'expense';
type TransactionStatus = 'paid' | 'pending' | 'scheduled';

interface CreateTransactionRequest {
  companyId: string;
  categoryId: string;
  type: TransactionType;
  description: string;
  amount: number;
  date: string; // ISO date
  status: TransactionStatus;
  paymentDate?: string; // ISO date
  isInstallment?: boolean;
  installmentNumber?: number;
  totalInstallments?: number;
  creditCardId?: string;
  notes?: string;
}

interface UpdateTransactionRequest {
  categoryId?: string;
  type?: TransactionType;
  description?: string;
  amount?: number;
  date?: string;
  status?: TransactionStatus;
  paymentDate?: string;
  isInstallment?: boolean;
  installmentNumber?: number;
  totalInstallments?: number;
  creditCardId?: string;
  notes?: string;
}

export class TransactionsController {
  /**
   * GET /api/transactions?companyId=xxx&filter=xxx&searchQuery=xxx&dateFrom=xxx&dateTo=xxx&categoryFilter=xxx&statusFilter=xxx&from=xxx&to=xxx
   * Lista transações com filtros opcionais e paginação
   */
  async getAll(req: Request, res: Response): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const { 
        companyId, 
        filter, 
        searchQuery, 
        dateFrom, 
        dateTo, 
        categoryFilter, 
        statusFilter,
        from = '0',
        to = '49'
      } = req.query;

      if (!companyId || typeof companyId !== 'string') {
        return res.status(400).json({ error: 'companyId é obrigatório' });
      }

      const supabaseClient = getSupabaseClient(authReq.accessToken!);

      let query = supabaseClient
        .from('transactions')
        .select('*, credit_cards(*)', { count: 'exact' })
        .eq('company_id', companyId);

      // Aplicar filtros de tipo
      if (filter === 'income') {
        query = query.eq('type', 'income');
      } else if (filter === 'expense') {
        query = query.eq('type', 'expense');
      } else if (filter === 'scheduled') {
        query = query.eq('status', 'scheduled');
      } else if (filter === 'pending') {
        query = query.eq('status', 'pending');
      }

      // Filtro de busca por descrição
      if (searchQuery && typeof searchQuery === 'string') {
        query = query.ilike('description', `%${searchQuery}%`);
      }

      // Filtro de data
      if (dateFrom && typeof dateFrom === 'string') {
        query = query.gte('date', dateFrom);
      }
      if (dateTo && typeof dateTo === 'string') {
        query = query.lte('date', dateTo);
      }

      // Filtro de categoria
      if (categoryFilter && typeof categoryFilter === 'string' && categoryFilter !== 'all') {
        query = query.eq('category_id', categoryFilter);
      }

      // Filtro de status
      if (statusFilter === 'overdue') {
        // Transações vencidas: status pendente ou agendado com data anterior a hoje
        const today = new Date().toISOString().split('T')[0];
        query = query
          .in('status', ['pending', 'scheduled'])
          .lt('date', today);
      } else if (statusFilter && typeof statusFilter === 'string' && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      // Aplicar paginação
      const fromNum = parseInt(from as string, 10);
      const toNum = parseInt(to as string, 10);

      const { data, error, count } = await query.range(fromNum, toNum);

      if (error) {
        console.error('Error fetching transactions:', error);
        throw error;
      }

      const mappedTransactions = (data || []).map((t: any) => ({
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
        creditCardName: t.credit_cards?.name || t.credit_card_name || undefined,
        notes: t.notes || undefined,
        invoicePaidAt: t.invoice_paid_at ? new Date(t.invoice_paid_at) : undefined,
        createdAt: new Date(t.created_at),
      }));

      res.json({
        data: mappedTransactions,
        count: count || 0,
      });
    } catch (error) {
      console.error('Error in getAll transactions:', error);
      res.status(500).json({ error: 'Erro ao buscar transações' });
    }
  }

  /**
   * GET /api/transactions/:id?companyId=xxx
   * Obtém uma transação específica
   */
  async getById(req: Request, res: Response): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const { id } = req.params;
      const { companyId } = req.query;

      if (!id) {
        return res.status(400).json({ error: 'ID da transação é obrigatório' });
      }

      if (!companyId || typeof companyId !== 'string') {
        return res.status(400).json({ error: 'companyId é obrigatório' });
      }

      const supabaseClient = getSupabaseClient(authReq.accessToken!);

      const { data: transaction, error } = await supabaseClient
        .from('transactions')
        .select(`
          *,
          category:categories(id, name, type, color),
          credit_card:credit_cards(id, name, brand)
        `)
        .eq('id', id)
        .eq('company_id', companyId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'Transação não encontrada' });
        }
        console.error('Error fetching transaction:', error);
        throw error;
      }

      res.json(transaction);
    } catch (error) {
      console.error('Error in getById transaction:', error);
      res.status(500).json({ error: 'Erro ao buscar transação' });
    }
  }

  /**
   * POST /api/transactions
   * Cria uma nova transação
   */
  async create(req: Request, res: Response): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const {
        companyId,
        categoryId,
        type,
        description,
        amount,
        date,
        status,
        paymentDate,
        isInstallment,
        installmentNumber,
        totalInstallments,
        creditCardId,
        notes,
      } = req.body as CreateTransactionRequest;

      // Validações obrigatórias
      if (!companyId) {
        return res.status(400).json({ error: 'companyId é obrigatório' });
      }

      if (!categoryId) {
        return res.status(400).json({ error: 'categoryId é obrigatório' });
      }

      if (!type || (type !== 'income' && type !== 'expense')) {
        return res.status(400).json({ error: 'Tipo deve ser "income" ou "expense"' });
      }

      if (!description || description.trim().length === 0) {
        return res.status(400).json({ error: 'Descrição é obrigatória' });
      }

      if (description.trim().length < 2) {
        return res.status(400).json({ error: 'Descrição deve ter pelo menos 2 caracteres' });
      }

      if (!amount || amount <= 0) {
        return res.status(400).json({ error: 'Valor deve ser maior que zero' });
      }

      if (!date) {
        return res.status(400).json({ error: 'Data é obrigatória' });
      }

      if (!status || !['paid', 'pending', 'scheduled'].includes(status)) {
        return res.status(400).json({ error: 'Status deve ser "paid", "pending" ou "scheduled"' });
      }

      // Validações de parcelamento
      if (isInstallment) {
        if (!installmentNumber || installmentNumber < 1) {
          return res.status(400).json({ error: 'Número da parcela deve ser maior que zero' });
        }

        if (!totalInstallments || totalInstallments < 2) {
          return res.status(400).json({ error: 'Total de parcelas deve ser pelo menos 2' });
        }

        if (installmentNumber > totalInstallments) {
          return res.status(400).json({ error: 'Número da parcela não pode ser maior que o total' });
        }
      }

      const supabaseClient = getSupabaseClient(authReq.accessToken!);

      // Verificar se a empresa existe
      const { data: company, error: companyError } = await supabaseClient
        .from('companies')
        .select('id')
        .eq('id', companyId)
        .single();

      if (companyError || !company) {
        return res.status(404).json({ error: 'Empresa não encontrada ou você não tem permissão' });
      }

      // Verificar se a categoria existe e pertence à empresa
      const { data: category, error: categoryError } = await supabaseClient
        .from('categories')
        .select('id')
        .eq('id', categoryId)
        .eq('company_id', companyId)
        .single();

      if (categoryError || !category) {
        return res.status(404).json({ error: 'Categoria não encontrada ou não pertence a esta empresa' });
      }

      // Verificar cartão de crédito se fornecido
      if (creditCardId) {
        const { data: creditCard, error: cardError } = await supabaseClient
          .from('credit_cards')
          .select('id')
          .eq('id', creditCardId)
          .eq('company_id', companyId)
          .single();

        if (cardError || !creditCard) {
          return res.status(404).json({ error: 'Cartão de crédito não encontrado ou não pertence a esta empresa' });
        }
      }

      const insertData: any = {
        company_id: companyId,
        category_id: categoryId,
        type,
        description: description.trim(),
        amount,
        date,
        status,
        is_installment: isInstallment || false,
        installment_number: installmentNumber || null,
        total_installments: totalInstallments || null,
        credit_card_id: creditCardId || null,
        notes: notes?.trim() || null,
      };

      // Adicionar payment_date apenas se fornecido
      if (paymentDate) {
        insertData.payment_date = paymentDate;
      }

      const { data: transaction, error } = await supabaseClient
        .from('transactions')
        .insert(insertData)
        .select(`
          *,
          category:categories(id, name, type, color),
          credit_card:credit_cards(id, name, brand)
        `)
        .single();

      if (error) {
        console.error('Error creating transaction:', error);
        throw error;
      }

      res.status(201).json(transaction);
    } catch (error) {
      console.error('Error in create transaction:', error);
      res.status(500).json({ error: 'Erro ao criar transação' });
    }
  }

  /**
   * PUT /api/transactions/:id
   * Atualiza uma transação existente
   */
  async update(req: Request, res: Response): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const { id } = req.params;
      const {
        categoryId,
        type,
        description,
        amount,
        date,
        status,
        paymentDate,
        isInstallment,
        installmentNumber,
        totalInstallments,
        creditCardId,
        notes,
      } = req.body as UpdateTransactionRequest;
      const { companyId } = req.query;

      if (!id) {
        return res.status(400).json({ error: 'ID da transação é obrigatório' });
      }

      if (!companyId || typeof companyId !== 'string') {
        return res.status(400).json({ error: 'companyId é obrigatório' });
      }

      // Validações
      if (type !== undefined && type !== 'income' && type !== 'expense') {
        return res.status(400).json({ error: 'Tipo deve ser "income" ou "expense"' });
      }

      if (description !== undefined) {
        if (description.trim().length === 0) {
          return res.status(400).json({ error: 'Descrição não pode ser vazia' });
        }
        if (description.trim().length < 2) {
          return res.status(400).json({ error: 'Descrição deve ter pelo menos 2 caracteres' });
        }
      }

      if (amount !== undefined && amount <= 0) {
        return res.status(400).json({ error: 'Valor deve ser maior que zero' });
      }

      if (status !== undefined && !['paid', 'pending', 'scheduled'].includes(status)) {
        return res.status(400).json({ error: 'Status deve ser "paid", "pending" ou "scheduled"' });
      }

      if (isInstallment !== undefined && isInstallment) {
        if (installmentNumber !== undefined && installmentNumber < 1) {
          return res.status(400).json({ error: 'Número da parcela deve ser maior que zero' });
        }

        if (totalInstallments !== undefined && totalInstallments < 2) {
          return res.status(400).json({ error: 'Total de parcelas deve ser pelo menos 2' });
        }
      }

      const supabaseClient = getSupabaseClient(authReq.accessToken!);

      // Verificar se categoria existe (se fornecida)
      if (categoryId) {
        const { data: category, error: categoryError } = await supabaseClient
          .from('categories')
          .select('id')
          .eq('id', categoryId)
          .eq('company_id', companyId)
          .single();

        if (categoryError || !category) {
          return res.status(404).json({ error: 'Categoria não encontrada ou não pertence a esta empresa' });
        }
      }

      // Verificar cartão de crédito (se fornecido)
      if (creditCardId) {
        const { data: creditCard, error: cardError } = await supabaseClient
          .from('credit_cards')
          .select('id')
          .eq('id', creditCardId)
          .eq('company_id', companyId)
          .single();

        if (cardError || !creditCard) {
          return res.status(404).json({ error: 'Cartão de crédito não encontrado ou não pertence a esta empresa' });
        }
      }

      // Preparar dados para atualização
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (categoryId !== undefined) updateData.category_id = categoryId;
      if (type !== undefined) updateData.type = type;
      if (description !== undefined) updateData.description = description.trim();
      if (amount !== undefined) updateData.amount = amount;
      if (date !== undefined) updateData.date = date;
      if (status !== undefined) updateData.status = status;
      if (paymentDate !== undefined) updateData.payment_date = paymentDate;
      if (isInstallment !== undefined) updateData.is_installment = isInstallment;
      if (installmentNumber !== undefined) updateData.installment_number = installmentNumber;
      if (totalInstallments !== undefined) updateData.total_installments = totalInstallments;
      if (creditCardId !== undefined) updateData.credit_card_id = creditCardId;
      if (notes !== undefined) updateData.notes = notes?.trim() || null;

      // Se não há nada para atualizar além do updated_at
      if (Object.keys(updateData).length === 1) {
        return res.status(400).json({ error: 'Nenhum campo para atualizar' });
      }

      const { data: transaction, error } = await supabaseClient
        .from('transactions')
        .update(updateData)
        .eq('id', id)
        .eq('company_id', companyId)
        .select(`
          *,
          category:categories(id, name, type, color),
          credit_card:credit_cards(id, name, brand)
        `)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'Transação não encontrada ou você não tem permissão' });
        }
        console.error('Error updating transaction:', error);
        throw error;
      }

      res.json(transaction);
    } catch (error) {
      console.error('Error in update transaction:', error);
      res.status(500).json({ error: 'Erro ao atualizar transação' });
    }
  }

  /**
   * DELETE /api/transactions/:id?companyId=xxx
   * Deleta uma transação
   */
  async delete(req: Request, res: Response): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const { id } = req.params;
      const { companyId } = req.query;

      if (!id) {
        return res.status(400).json({ error: 'ID da transação é obrigatório' });
      }

      if (!companyId || typeof companyId !== 'string') {
        return res.status(400).json({ error: 'companyId é obrigatório' });
      }

      const supabaseClient = getSupabaseClient(authReq.accessToken!);

      const { error } = await supabaseClient
        .from('transactions')
        .delete()
        .eq('id', id)
        .eq('company_id', companyId);

      if (error) {
        console.error('Error deleting transaction:', error);
        throw error;
      }

      res.json({ message: 'Transação deletada com sucesso' });
    } catch (error) {
      console.error('Error in delete transaction:', error);
      res.status(500).json({ error: 'Erro ao deletar transação' });
    }
  }

  /**
   * POST /api/transactions/bulk
   * Cria múltiplas transações (útil para parcelamentos)
   */
  async createBulk(req: Request, res: Response): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const { companyId, transactions } = req.body;

      if (!companyId) {
        return res.status(400).json({ error: 'companyId é obrigatório' });
      }

      if (!Array.isArray(transactions) || transactions.length === 0) {
        return res.status(400).json({ error: 'transactions deve ser um array não vazio' });
      }

      if (transactions.length > 100) {
        return res.status(400).json({ error: 'Máximo de 100 transações por vez' });
      }

      const supabaseClient = getSupabaseClient(authReq.accessToken!);

      // Verificar se a empresa existe
      const { data: company, error: companyError } = await supabaseClient
        .from('companies')
        .select('id')
        .eq('id', companyId)
        .single();

      if (companyError || !company) {
        return res.status(404).json({ error: 'Empresa não encontrada ou você não tem permissão' });
      }

      // Preparar dados para inserção
      const insertData = transactions.map((t: any) => ({
        company_id: companyId,
        category_id: t.categoryId,
        type: t.type,
        description: t.description?.trim(),
        amount: t.amount,
        date: t.date,
        status: t.status || 'pending',
        payment_date: t.paymentDate || null,
        is_installment: t.isInstallment || false,
        installment_number: t.installmentNumber || null,
        total_installments: t.totalInstallments || null,
        credit_card_id: t.creditCardId || null,
        notes: t.notes?.trim() || null,
      }));

      const { data: createdTransactions, error } = await supabaseClient
        .from('transactions')
        .insert(insertData)
        .select(`
          *,
          category:categories(id, name, type, color),
          credit_card:credit_cards(id, name, brand)
        `);

      if (error) {
        console.error('Error creating bulk transactions:', error);
        throw error;
      }

      res.status(201).json(createdTransactions);
    } catch (error) {
      console.error('Error in createBulk transactions:', error);
      res.status(500).json({ error: 'Erro ao criar transações em lote' });
    }
  }
}

export default new TransactionsController();
