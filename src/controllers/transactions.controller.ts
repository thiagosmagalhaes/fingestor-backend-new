import { Request, Response } from "express";
import { getSupabaseClient } from "../config/database";
import { AuthRequest } from "../middleware/auth";
import recurringTransactionsService from "../services/recurring-transactions.service";
import { RecurringFrequency } from "../types/recurring-transactions.types";

type TransactionType = "income" | "expense";
type TransactionStatus = "paid" | "pending" | "scheduled";

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
  totalInstallments?: number; // Quantidade total de parcelas (backend gera todas)
  isCreditCard?: boolean;
  creditCardId?: string;
  notes?: string;
  dueDate?: string; // ISO date

  // Recurring fields
  isRecurring?: boolean;
  recurringFrequency?: RecurringFrequency;
  recurringEndDate?: string; // ISO date, optional
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
  isCreditCard?: boolean;
  dueDate?: string;

  // Recurring fields
  isRecurring?: boolean;
  recurringFrequency?: RecurringFrequency;
  recurringEndDate?: string;
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
        from = "0",
        to = "49",
      } = req.query;

      if (!companyId || typeof companyId !== "string") {
        return res.status(400).json({ error: "companyId é obrigatório" });
      }

      const supabaseClient = getSupabaseClient(authReq.accessToken!);

      let query = supabaseClient
        .from("transactions")
        .select(
          "*, credit_cards(*), recurring_transaction:recurring_transactions(id, description, frequency, is_active)",
          { count: "exact" },
        )
        .eq("company_id", companyId);

      // Aplicar filtros de tipo
      if (filter === "income") {
        query = query.eq("type", "income");
      } else if (filter === "expense") {
        query = query.eq("type", "expense");
      } else if (filter === "scheduled") {
        query = query.eq("status", "scheduled");
      } else if (filter === "pending") {
        query = query.eq("status", "pending");
      }

      // Filtro de busca por descrição
      if (searchQuery && typeof searchQuery === "string") {
        query = query.ilike("description", `%${searchQuery}%`);
      }

      // Filtro de data
      if (dateFrom && typeof dateFrom === "string") {
        query = query.gte("date", dateFrom);
      }
      if (dateTo && typeof dateTo === "string") {
        query = query.lte("date", dateTo);
      }

      // Filtro de categoria
      if (
        categoryFilter &&
        typeof categoryFilter === "string" &&
        categoryFilter !== "all"
      ) {
        query = query.eq("category_id", categoryFilter);
      }

      // Filtro de status
      if (statusFilter === "overdue") {
        // Transações vencidas: status pendente ou agendado com data anterior a hoje
        const today = new Date().toISOString().split("T")[0];
        query = query.in("status", ["pending", "scheduled"]).lt("date", today);
      } else if (
        statusFilter &&
        typeof statusFilter === "string" &&
        statusFilter !== "all"
      ) {
        query = query.eq("status", statusFilter);
      }

      // Aplicar paginação
      const fromNum = parseInt(from as string, 10);
      const toNum = parseInt(to as string, 10);

      const { data, error, count } = await query.range(fromNum, toNum);

      if (error) {
        console.error("Error fetching transactions:", error);
        throw error;
      }

      const mappedTransactions = (data || []).map((t: any) => ({
        id: t.id,
        description: t.description,
        amount: Number(t.amount),
        type: t.type as "income" | "expense",
        categoryId: t.category_id || "",
        companyId: t.company_id,
        date: new Date(t.date + "T00:00:00-03:00"),
        dueDate: t.due_date
          ? new Date(t.due_date + "T00:00:00-03:00")
          : undefined,
        paidAt: t.paid_at ? new Date(t.paid_at) : undefined,
        paymentDate: t.payment_date ? new Date(t.payment_date) : undefined,
        status: t.status as "pending" | "paid" | "scheduled",
        isInstallment: t.is_installment,
        installmentNumber: t.installment_number || undefined,
        totalInstallments: t.total_installments || undefined,
        isCreditCard: t.is_credit_card,
        creditCardId: t.credit_card_id || undefined,
        creditCardName: t.credit_cards?.name || t.credit_card_name || undefined,
        notes: t.notes || undefined,
        invoicePaidAt: t.invoice_paid_at
          ? new Date(t.invoice_paid_at)
          : undefined,
        createdAt: new Date(t.created_at),
        recurringTransactionId: t.recurring_transaction_id || undefined,
        recurringInfo: t.recurring_transaction
          ? {
              id: t.recurring_transaction.id,
              description: t.recurring_transaction.description,
              frequency: t.recurring_transaction.frequency,
              isActive: t.recurring_transaction.is_active,
            }
          : undefined,
      }));

      res.json({
        data: mappedTransactions,
        count: count || 0,
      });
    } catch (error) {
      console.error("Error in getAll transactions:", error);
      res.status(500).json({ error: "Erro ao buscar transações" });
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
        return res.status(400).json({ error: "ID da transação é obrigatório" });
      }

      if (!companyId || typeof companyId !== "string") {
        return res.status(400).json({ error: "companyId é obrigatório" });
      }

      const supabaseClient = getSupabaseClient(authReq.accessToken!);

      const { data: transaction, error } = await supabaseClient
        .from("transactions")
        .select(
          `
          *,
          category:categories(id, name, type, color),
          credit_card:credit_cards(id, name, brand),
          recurring_transaction:recurring_transactions(id, description, frequency, start_date, end_date, is_active)
        `,
        )
        .eq("id", id)
        .eq("company_id", companyId)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return res.status(404).json({ error: "Transação não encontrada" });
        }
        console.error("Error fetching transaction:", error);
        throw error;
      }

      res.json(transaction);
    } catch (error) {
      console.error("Error in getById transaction:", error);
      res.status(500).json({ error: "Erro ao buscar transação" });
    }
  }

  /**
   * POST /api/transactions
   * Cria uma nova transação, transação recorrente ou parcelamento completo
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
        totalInstallments,
        isCreditCard,
        creditCardId,
        notes,
        dueDate,
        isRecurring,
        recurringFrequency,
        recurringEndDate,
      } = req.body as CreateTransactionRequest;

      // Validações obrigatórias
      if (!companyId) {
        return res.status(400).json({ error: "companyId é obrigatório" });
      }

      if (!categoryId) {
        return res.status(400).json({ error: "categoryId é obrigatório" });
      }

      if (!type || (type !== "income" && type !== "expense")) {
        return res
          .status(400)
          .json({ error: 'Tipo deve ser "income" ou "expense"' });
      }

      if (!description || description.trim().length === 0) {
        return res.status(400).json({ error: "Descrição é obrigatória" });
      }

      if (description.trim().length < 2) {
        return res
          .status(400)
          .json({ error: "Descrição deve ter pelo menos 2 caracteres" });
      }

      if (!amount || amount <= 0) {
        return res.status(400).json({ error: "Valor deve ser maior que zero" });
      }

      if (!date) {
        return res.status(400).json({ error: "Data é obrigatória" });
      }

      if (!status || !["paid", "pending", "scheduled"].includes(status)) {
        return res
          .status(400)
          .json({ error: 'Status deve ser "paid", "pending" ou "scheduled"' });
      }

      // Validações de recorrência
      if (isRecurring) {
        if (
          !recurringFrequency ||
          !["7", "15", "30"].includes(recurringFrequency)
        ) {
          return res.status(400).json({
            error:
              'Frequência de recorrência deve ser "7" (semanal), "15" (quinzenal) ou "30" (mensal)',
          });
        }

        // Não permitir recorrência com parcelamento
        if (isInstallment) {
          return res.status(400).json({
            error:
              "Não é possível criar uma transação recorrente e parcelada ao mesmo tempo",
          });
        }
      }

      // Validações de parcelamento
      if (isInstallment) {
        if (!totalInstallments || totalInstallments < 2) {
          return res
            .status(400)
            .json({ error: "Total de parcelas deve ser pelo menos 2" });
        }

        if (totalInstallments > 120) {
          return res
            .status(400)
            .json({ error: "Total de parcelas não pode ser maior que 120" });
        }

        // Validar frequência se fornecida
        if (
          recurringFrequency &&
          !["7", "15", "30"].includes(recurringFrequency)
        ) {
          return res.status(400).json({
            error:
              'Frequência das parcelas deve ser "7" (semanal), "15" (quinzenal) ou "30" (mensal)',
          });
        }
      }

      const supabaseClient = getSupabaseClient(authReq.accessToken!);

      // Verificar se a empresa existe
      const { data: company, error: companyError } = await supabaseClient
        .from("companies")
        .select("id")
        .eq("id", companyId)
        .single();

      if (companyError || !company) {
        return res
          .status(404)
          .json({ error: "Empresa não encontrada ou você não tem permissão" });
      }

      // Verificar se a categoria existe e pertence à empresa
      const { data: category, error: categoryError } = await supabaseClient
        .from("categories")
        .select("id")
        .eq("id", categoryId)
        .eq("company_id", companyId)
        .single();

      if (categoryError || !category) {
        return res.status(404).json({
          error: "Categoria não encontrada ou não pertence a esta empresa",
        });
      }

      // Verificar cartão de crédito se fornecido
      if (creditCardId) {
        const { data: creditCard, error: cardError } = await supabaseClient
          .from("credit_cards")
          .select("id")
          .eq("id", creditCardId)
          .eq("company_id", companyId)
          .single();

        if (cardError || !creditCard) {
          return res.status(404).json({
            error:
              "Cartão de crédito não encontrado ou não pertence a esta empresa",
          });
        }
      }

      // Se é recorrente, criar a regra de recorrência
      if (isRecurring && recurringFrequency) {
        const recurringRule =
          await recurringTransactionsService.createRecurringTransaction(
            supabaseClient,
            {
              company_id: companyId,
              category_id: categoryId,
              type,
              description: description.trim(),
              amount,
              frequency: recurringFrequency,
              start_date: date,
              end_date: recurringEndDate,
              notes: notes?.trim(),
            },
          );

        return res.status(201).json({
          message: "Transação recorrente criada com sucesso",
          recurring_rule: recurringRule,
          info: `Transações geradas até ${recurringRule.end_date}`,
        });
      }

      // Se é parcelamento, criar todas as parcelas
      if (isInstallment && totalInstallments) {
        const installments = [];
        const startDate = new Date(date);

        // Usar frequência informada ou 30 dias (mensal) como padrão
        const frequencyDays = recurringFrequency
          ? parseInt(recurringFrequency)
          : 30;
        const installmentAmount = amount / totalInstallments;

        for (let i = 1; i <= totalInstallments; i++) {
          // Calcular data da parcela
          const installmentDate = new Date(startDate);
          if (frequencyDays === 30) {
            installmentDate.setMonth(startDate.getMonth() + (i - 1));
          } else {
            installmentDate.setDate(startDate.getDate() + frequencyDays * (i - 1));
          }

          // Primeira parcela mantém o status informado, demais são 'scheduled'
          const installmentStatus = i === 1 ? status : "scheduled";

          installments.push({
            company_id: companyId,
            category_id: categoryId,
            type,
            description: description.trim(),
            amount: installmentAmount,
            date: installmentDate.toISOString().split("T")[0],
            status: installmentStatus,
            is_installment: true,
            installment_number: i,
            total_installments: totalInstallments,
            credit_card_id: isCreditCard ? creditCardId || null : null,
            is_credit_card: !!isCreditCard,
            due_date: dueDate || null,
            notes: notes?.trim() || null,
            payment_date: i === 1 && paymentDate ? paymentDate : null,
          });
        }

        // Inserir todas as parcelas de uma vez
        const { data: createdInstallments, error: installmentsError } =
          await supabaseClient.from("transactions").insert(installments)
            .select(`
            *,
            category:categories(id, name, type, color),
            credit_card:credit_cards(id, name, brand)
          `);

        if (installmentsError) {
          console.error("Error creating installments:", installmentsError);
          throw installmentsError;
        }

        const frequencyLabel =
          frequencyDays === 7
            ? "semanal"
            : frequencyDays === 15
              ? "quinzenal"
              : "mensal";

        return res.status(201).json({
          message: `Parcelamento ${frequencyLabel} criado com sucesso: ${totalInstallments}x de ${installmentAmount.toFixed(2)}`,
          installments: createdInstallments,
          total_installments: totalInstallments,
          total_amount: amount,
          installment_amount: installmentAmount,
          frequency: frequencyLabel,
          frequency_days: frequencyDays,
        });
      }

      // Criar transação normal (não recorrente e não parcelada)
      const insertData: any = {
        company_id: companyId,
        category_id: categoryId,
        type,
        description: description.trim(),
        amount,
        date,
        status,
        is_installment: false,
        installment_number: null,
        total_installments: null,
        credit_card_id: isCreditCard ? creditCardId || null : null,
        is_credit_card: !!isCreditCard,
        due_date: dueDate || null,
        notes: notes?.trim() || null,
      };

      // Adicionar payment_date apenas se fornecido
      if (paymentDate) {
        insertData.payment_date = paymentDate;
      }

      const { data: transaction, error } = await supabaseClient
        .from("transactions")
        .insert(insertData)
        .select(
          `
          *,
          category:categories(id, name, type, color),
          credit_card:credit_cards(id, name, brand)
        `,
        )
        .single();

      if (error) {
        console.error("Error creating transaction:", error);
        throw error;
      }

      res.status(201).json(transaction);
    } catch (error) {
      console.error("Error in create transaction:", error);
      res.status(500).json({ error: "Erro ao criar transação" });
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
        isCreditCard,
        dueDate,
        isRecurring,
        recurringFrequency,
        recurringEndDate,
      } = req.body as UpdateTransactionRequest;
      const { companyId } = req.query;

      if (!id) {
        return res.status(400).json({ error: "ID da transação é obrigatório" });
      }

      if (!companyId || typeof companyId !== "string") {
        return res.status(400).json({ error: "companyId é obrigatório" });
      }

      // Validações
      if (type !== undefined && type !== "income" && type !== "expense") {
        return res
          .status(400)
          .json({ error: 'Tipo deve ser "income" ou "expense"' });
      }

      if (description !== undefined) {
        if (description.trim().length === 0) {
          return res
            .status(400)
            .json({ error: "Descrição não pode ser vazia" });
        }
        if (description.trim().length < 2) {
          return res
            .status(400)
            .json({ error: "Descrição deve ter pelo menos 2 caracteres" });
        }
      }

      if (amount !== undefined && amount <= 0) {
        return res.status(400).json({ error: "Valor deve ser maior que zero" });
      }

      if (
        status !== undefined &&
        !["paid", "pending", "scheduled"].includes(status)
      ) {
        return res
          .status(400)
          .json({ error: 'Status deve ser "paid", "pending" ou "scheduled"' });
      }

      // Validações de recorrência
      if (isRecurring) {
        if (
          !recurringFrequency ||
          !["7", "15", "30"].includes(recurringFrequency)
        ) {
          return res.status(400).json({
            error:
              'Frequência de recorrência deve ser "7" (semanal), "15" (quinzenal) ou "30" (mensal)',
          });
        }
      }

      const supabaseClient = getSupabaseClient(authReq.accessToken!);

      // Buscar a transação existente para validações
      const { data: existingTransaction, error: fetchError } =
        await supabaseClient
          .from("transactions")
          .select(
            "id, is_installment, total_installments, is_credit_card, credit_card_id, recurring_transaction_id",
          )
          .eq("id", id)
          .eq("company_id", companyId)
          .single();

      if (fetchError || !existingTransaction) {
        return res.status(404).json({
          error: "Transação não encontrada ou você não tem permissão",
        });
      }

      // Validar regras de conversão para recorrente
      if (isRecurring) {
        // Não permite converter se já for recorrente
        if (existingTransaction.recurring_transaction_id) {
          return res.status(400).json({
            error:
              "Esta transação já é recorrente e não pode ser convertida novamente",
          });
        }

        // Não permite converter se for parcela de parcelamento
        if (
          existingTransaction.is_installment &&
          existingTransaction.total_installments &&
          existingTransaction.total_installments > 1
        ) {
          return res.status(400).json({
            error:
              "Não é possível converter uma parcela de parcelamento em transação recorrente",
          });
        }

        // Não permite converter se tiver cartão de crédito vinculado
        if (
          existingTransaction.is_credit_card ||
          existingTransaction.credit_card_id
        ) {
          return res.status(400).json({
            error:
              "Não é possível converter uma transação com cartão de crédito em recorrente",
          });
        }
      }

      // Validar regras de cartão de crédito para transações recorrentes
      if (
        (isCreditCard || creditCardId) &&
        existingTransaction.recurring_transaction_id
      ) {
        return res.status(400).json({
          error:
            "Não é possível vincular cartão de crédito a uma transação recorrente",
        });
      }

      // Validar regras de parcelamento para transações recorrentes
      if (isInstallment && existingTransaction.recurring_transaction_id) {
        return res.status(400).json({
          error: "Não é possível parcelar uma transação recorrente",
        });
      }

      // Verificar se categoria existe (se fornecida)
      if (categoryId) {
        const { data: category, error: categoryError } = await supabaseClient
          .from("categories")
          .select("id")
          .eq("id", categoryId)
          .eq("company_id", companyId)
          .single();

        if (categoryError || !category) {
          return res.status(404).json({
            error: "Categoria não encontrada ou não pertence a esta empresa",
          });
        }
      }

      // Verificar cartão de crédito (se fornecido)
      if (creditCardId) {
        const { data: creditCard, error: cardError } = await supabaseClient
          .from("credit_cards")
          .select("id")
          .eq("id", creditCardId)
          .eq("company_id", companyId)
          .single();

        if (cardError || !creditCard) {
          return res.status(404).json({
            error:
              "Cartão de crédito não encontrado ou não pertence a esta empresa",
          });
        }
      }

      // Preparar dados para atualização
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (categoryId !== undefined) updateData.category_id = categoryId;
      if (type !== undefined) updateData.type = type;
      if (description !== undefined)
        updateData.description = description.trim();
      if (amount !== undefined) updateData.amount = amount;
      if (date !== undefined) updateData.date = date;
      if (status !== undefined) updateData.status = status;
      if (paymentDate !== undefined) updateData.payment_date = paymentDate;
      if (isInstallment !== undefined)
        updateData.is_installment = isInstallment;
      if (installmentNumber !== undefined)
        updateData.installment_number = installmentNumber;
      if (totalInstallments !== undefined)
        updateData.total_installments = totalInstallments;
      updateData.credit_card_id = isCreditCard ? creditCardId || null : null;
      if (notes !== undefined) updateData.notes = notes?.trim() || null;
      updateData.is_credit_card = isCreditCard;
      if (dueDate !== undefined) updateData.due_date = dueDate;

      // Se não há nada para atualizar além do updated_at
      if (Object.keys(updateData).length === 1) {
        return res.status(400).json({ error: "Nenhum campo para atualizar" });
      }

      const { data: transaction, error } = await supabaseClient
        .from("transactions")
        .update(updateData)
        .eq("id", id)
        .eq("company_id", companyId)
        .select(
          `
          *,
          category:categories(id, name, type, color),
          credit_card:credit_cards(id, name, brand)
        `,
        )
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return res.status(404).json({
            error: "Transação não encontrada ou você não tem permissão",
          });
        }
        console.error("Error updating transaction:", error);
        throw error;
      }

      // Se estiver convertendo para recorrente, criar a regra de recorrência
      if (isRecurring && recurringFrequency && transaction) {
        try {
          const recurringRule =
            await recurringTransactionsService.createRecurringTransaction(
              supabaseClient,
              {
                company_id: companyId,
                category_id: transaction.category_id,
                type: transaction.type,
                description: transaction.description,
                amount: transaction.amount,
                frequency: recurringFrequency,
                start_date: transaction.date,
                end_date: recurringEndDate,
                notes: transaction.notes,
              },
            );

          // Atualizar a transação atual para vincular à regra recorrente
          const { error: linkError } = await supabaseClient
            .from("transactions")
            .update({ recurring_transaction_id: recurringRule.id })
            .eq("id", id);

          if (linkError) {
            console.error(
              "Error linking transaction to recurring rule:",
              linkError,
            );
          }

          // Buscar a transação atualizada com a informação de recorrência
          const { data: updatedTransaction } = await supabaseClient
            .from("transactions")
            .select(
              `
              *,
              category:categories(id, name, type, color),
              credit_card:credit_cards(id, name, brand),
              recurring_transaction:recurring_transactions(id, description, frequency, start_date, end_date, is_active)
            `,
            )
            .eq("id", id)
            .single();

          // apaga o registro atual
          await supabaseClient.from("transactions").delete().eq("id", id);

          return res.json(updatedTransaction || transaction);
        } catch (recurringError) {
          console.error("Error creating recurring rule:", recurringError);
          return res.status(500).json({
            error:
              "Transação atualizada, mas falha ao criar regra de recorrência",
          });
        }
      }

      res.json(transaction);
    } catch (error) {
      console.error("Error in update transaction:", error);
      res.status(500).json({ error: "Erro ao atualizar transação" });
    }
  }

  /**
   * DELETE /api/transactions/:id?companyId=xxx&deleteMode=single|future|all
   * Deleta uma transação com opções para parceladas/recorrentes
   * - single (default): Deleta apenas a transação especificada
   * - future: Deleta a atual + futuras não pagas (para parceladas/recorrentes)
   * - all: Deleta todas as transações relacionadas (independente do status)
   */
  async delete(req: Request, res: Response): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const { id } = req.params;
      const { companyId, deleteMode = "single" } = req.query;

      if (!id) {
        return res.status(400).json({ error: "ID da transação é obrigatório" });
      }

      if (!companyId || typeof companyId !== "string") {
        return res.status(400).json({ error: "companyId é obrigatório" });
      }

      if (!["single", "future", "all"].includes(deleteMode as string)) {
        return res.status(400).json({
          error: 'deleteMode deve ser "single", "future" ou "all"',
        });
      }

      const supabaseClient = getSupabaseClient(authReq.accessToken!);

      // Buscar a transação para verificar se é parcelada ou recorrente
      const { data: transaction, error: fetchError } = await supabaseClient
        .from("transactions")
        .select("*")
        .eq("id", id)
        .eq("company_id", companyId)
        .single();

      if (fetchError || !transaction) {
        return res.status(404).json({ error: "Transação não encontrada" });
      }

      let deletedCount = 0;

      // Modo single: deleta apenas a transação especificada
      if (deleteMode === "single") {
        const { error } = await supabaseClient
          .from("transactions")
          .delete()
          .eq("id", id)
          .eq("company_id", companyId);

        if (error) {
          console.error("Error deleting transaction:", error);
          throw error;
        }

        deletedCount = 1;
        return res.json({
          message: "Transação deletada com sucesso",
          deleted_count: deletedCount,
        });
      }

      // Para transações parceladas
      if (transaction.is_installment && transaction.total_installments) {
        if (deleteMode === "future") {
          // Deleta a atual + futuras não pagas
          const { data: relatedTransactions, error: relatedError } =
            await supabaseClient
              .from("transactions")
              .select("id, status, installment_number")
              .eq("company_id", companyId)
              .eq("description", transaction.description)
              .eq("amount", transaction.amount)
              .eq("total_installments", transaction.total_installments)
              .gte("installment_number", transaction.installment_number)
              .neq("status", "paid");

          if (relatedError) {
            console.error("Error fetching related transactions:", relatedError);
            throw relatedError;
          }

          const idsToDelete = relatedTransactions?.map((t) => t.id) || [];

          if (idsToDelete.length > 0) {
            const { error: deleteError } = await supabaseClient
              .from("transactions")
              .delete()
              .in("id", idsToDelete);

            if (deleteError) {
              console.error("Error deleting transactions:", deleteError);
              throw deleteError;
            }

            deletedCount = idsToDelete.length;
          }

          return res.json({
            message: `${deletedCount} transação(ões) deletada(s) com sucesso`,
            deleted_count: deletedCount,
          });
        }

        if (deleteMode === "all") {
          // Deleta todas as parcelas
          const { data: allTransactions, error: allError } =
            await supabaseClient
              .from("transactions")
              .select("id")
              .eq("company_id", companyId)
              .eq("description", transaction.description)
              .eq("amount", transaction.amount)
              .eq("total_installments", transaction.total_installments);

          if (allError) {
            console.error("Error fetching all transactions:", allError);
            throw allError;
          }

          const idsToDelete = allTransactions?.map((t) => t.id) || [];

          if (idsToDelete.length > 0) {
            const { error: deleteError } = await supabaseClient
              .from("transactions")
              .delete()
              .in("id", idsToDelete);

            if (deleteError) {
              console.error("Error deleting transactions:", deleteError);
              throw deleteError;
            }

            deletedCount = idsToDelete.length;
          }

          return res.json({
            message: `${deletedCount} transação(ões) deletada(s) com sucesso`,
            deleted_count: deletedCount,
          });
        }
      }

      // Para transações recorrentes
      if (transaction.recurring_transaction_id) {
        if (deleteMode === "future") {
          // Deleta a atual + futuras não pagas da mesma recorrência
          const { data: relatedTransactions, error: relatedError } =
            await supabaseClient
              .from("transactions")
              .select("id, status, date")
              .eq("company_id", companyId)
              .eq(
                "recurring_transaction_id",
                transaction.recurring_transaction_id,
              )
              .gte("date", transaction.date)
              .neq("status", "paid");

          if (relatedError) {
            console.error(
              "Error fetching related recurring transactions:",
              relatedError,
            );
            throw relatedError;
          }

          const idsToDelete = relatedTransactions?.map((t) => t.id) || [];

          if (idsToDelete.length > 0) {
            const { error: deleteError } = await supabaseClient
              .from("transactions")
              .delete()
              .in("id", idsToDelete);

            if (deleteError) {
              console.error("Error deleting transactions:", deleteError);
              throw deleteError;
            }

            deletedCount = idsToDelete.length;
          }

          return res.json({
            message: `${deletedCount} transação(ões) recorrente(s) deletada(s) com sucesso`,
            deleted_count: deletedCount,
          });
        }

        if (deleteMode === "all") {
          // Deleta todas as transações da mesma recorrência
          const { data: allTransactions, error: allError } =
            await supabaseClient
              .from("transactions")
              .select("id")
              .eq("company_id", companyId)
              .eq(
                "recurring_transaction_id",
                transaction.recurring_transaction_id,
              );

          if (allError) {
            console.error(
              "Error fetching all recurring transactions:",
              allError,
            );
            throw allError;
          }

          const idsToDelete = allTransactions?.map((t) => t.id) || [];

          if (idsToDelete.length > 0) {
            const { error: deleteError } = await supabaseClient
              .from("transactions")
              .delete()
              .in("id", idsToDelete);

            if (deleteError) {
              console.error("Error deleting transactions:", deleteError);
              throw deleteError;
            }

            deletedCount = idsToDelete.length;
          }

          return res.json({
            message: `${deletedCount} transação(ões) recorrente(s) deletada(s) com sucesso`,
            deleted_count: deletedCount,
          });
        }
      }

      // Se não for parcelada nem recorrente, deleteMode future/all age como single
      const { error } = await supabaseClient
        .from("transactions")
        .delete()
        .eq("id", id)
        .eq("company_id", companyId);

      if (error) {
        console.error("Error deleting transaction:", error);
        throw error;
      }

      res.json({
        message: "Transação deletada com sucesso",
        deleted_count: 1,
      });
    } catch (error) {
      console.error("Error in delete transaction:", error);
      res.status(500).json({ error: "Erro ao deletar transação" });
    }
  }

  /**
   * GET /api/transactions/recurring?companyId=xxx
   * Lista todas as regras de recorrência ativas
   */
  async getRecurringRules(
    req: Request,
    res: Response,
  ): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const { companyId } = req.query;

      if (!companyId || typeof companyId !== "string") {
        return res.status(400).json({ error: "companyId é obrigatório" });
      }

      const supabaseClient = getSupabaseClient(authReq.accessToken!);

      const { data: recurringRules, error } = await supabaseClient
        .from("recurring_transactions")
        .select("*")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching recurring rules:", error);
        throw error;
      }

      res.json(recurringRules || []);
    } catch (error) {
      console.error("Error in getRecurringRules:", error);
      res.status(500).json({ error: "Erro ao buscar regras de recorrência" });
    }
  }

  /**
   * PATCH /api/transactions/recurring/:id/pause?companyId=xxx
   * Pausa uma regra de recorrência
   */
  async pauseRecurringRule(
    req: Request,
    res: Response,
  ): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const { id } = req.params;
      const { companyId } = req.query;

      if (!id) {
        return res
          .status(400)
          .json({ error: "ID da regra de recorrência é obrigatório" });
      }

      if (!companyId || typeof companyId !== "string") {
        return res.status(400).json({ error: "companyId é obrigatório" });
      }

      const supabaseClient = getSupabaseClient(authReq.accessToken!);

      await recurringTransactionsService.pauseRecurringTransaction(
        supabaseClient,
        id,
      );

      res.json({ message: "Recorrência pausada com sucesso" });
    } catch (error) {
      console.error("Error in pauseRecurringRule:", error);
      res.status(500).json({ error: "Erro ao pausar recorrência" });
    }
  }

  /**
   * PATCH /api/transactions/recurring/:id/resume?companyId=xxx
   * Retoma uma regra de recorrência
   */
  async resumeRecurringRule(
    req: Request,
    res: Response,
  ): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const { id } = req.params;
      const { companyId } = req.query;

      if (!id) {
        return res
          .status(400)
          .json({ error: "ID da regra de recorrência é obrigatório" });
      }

      if (!companyId || typeof companyId !== "string") {
        return res.status(400).json({ error: "companyId é obrigatório" });
      }

      const supabaseClient = getSupabaseClient(authReq.accessToken!);

      await recurringTransactionsService.resumeRecurringTransaction(
        supabaseClient,
        id,
      );

      res.json({ message: "Recorrência retomada com sucesso" });
    } catch (error) {
      console.error("Error in resumeRecurringRule:", error);
      res.status(500).json({ error: "Erro ao retomar recorrência" });
    }
  }

  /**
   * DELETE /api/transactions/recurring/:id?companyId=xxx
   * Cancela uma regra de recorrência (não deleta transações já criadas)
   */
  async cancelRecurringRule(
    req: AuthRequest,
    res: Response,
  ): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const { id } = req.params;
      const { companyId } = req.query;

      if (!id) {
        return res
          .status(400)
          .json({ error: "ID da regra de recorrência é obrigatório" });
      }

      if (!companyId || typeof companyId !== "string") {
        return res.status(400).json({ error: "companyId é obrigatório" });
      }

      const supabaseClient = getSupabaseClient(authReq.accessToken!);

      await recurringTransactionsService.cancelRecurringTransaction(
        supabaseClient,
        id,
      );

      res.json({
        message:
          "Recorrência cancelada com sucesso. As transações já criadas não foram afetadas.",
      });
    } catch (error) {
      console.error("Error in cancelRecurringRule:", error);
      res.status(500).json({ error: "Erro ao cancelar recorrência" });
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
        return res.status(400).json({ error: "companyId é obrigatório" });
      }

      if (!Array.isArray(transactions) || transactions.length === 0) {
        return res
          .status(400)
          .json({ error: "transactions deve ser um array não vazio" });
      }

      if (transactions.length > 100) {
        return res
          .status(400)
          .json({ error: "Máximo de 100 transações por vez" });
      }

      const supabaseClient = getSupabaseClient(authReq.accessToken!);

      // Verificar se a empresa existe
      const { data: company, error: companyError } = await supabaseClient
        .from("companies")
        .select("id")
        .eq("id", companyId)
        .single();

      if (companyError || !company) {
        return res
          .status(404)
          .json({ error: "Empresa não encontrada ou você não tem permissão" });
      }

      // Preparar dados para inserção
      const insertData = transactions.map((t: any) => ({
        company_id: companyId,
        category_id: t.categoryId,
        type: t.type,
        description: t.description?.trim(),
        amount: t.amount,
        date: t.date,
        status: t.status || "pending",
        payment_date: t.paymentDate || null,
        is_installment: t.isInstallment || false,
        installment_number: t.installmentNumber || null,
        total_installments: t.totalInstallments || null,
        credit_card_id: t.creditCardId || null,
        notes: t.notes?.trim() || null,
      }));

      const { data: createdTransactions, error } = await supabaseClient
        .from("transactions")
        .insert(insertData).select(`
          *,
          category:categories(id, name, type, color),
          credit_card:credit_cards(id, name, brand)
        `);

      if (error) {
        console.error("Error creating bulk transactions:", error);
        throw error;
      }

      res.status(201).json(createdTransactions);
    } catch (error) {
      console.error("Error in createBulk transactions:", error);
      res.status(500).json({ error: "Erro ao criar transações em lote" });
    }
  }

  /**
   * POST /api/transactions/import
   * Importa transações em lote a partir de planilha Excel
   */
  async import(req: Request, res: Response): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const { transactions } = req.body;

      // Validação básica
      if (
        !transactions ||
        !Array.isArray(transactions) ||
        transactions.length === 0
      ) {
        return res.status(400).json({
          error: "Dados inválidos",
          message: "Array de transações está vazio ou não foi fornecido",
        });
      }

      // Limite de 1000 transações por requisição
      if (transactions.length > 1000) {
        return res.status(400).json({
          error: "Limite excedido",
          message: "Máximo de 1000 transações por requisição",
        });
      }

      const supabaseClient = getSupabaseClient(authReq.accessToken!);
      const userId = authReq.user!.id;

      const importedTransactions: any[] = [];
      const errors: any[] = [];
      const createdCategories: any[] = [];
      const categoriesCache = new Map<string, any>(); // key: "companyId:categoryName:type"
      const companiesCache = new Map<string, any>(); // key: "cnpj"
      const creditCardsCache = new Map<string, any>(); // key: "companyId:cardName"

      // Cores padrão para categorias
      const defaultColors = [
        "#3b82f6",
        "#ef4444",
        "#10b981",
        "#f59e0b",
        "#8b5cf6",
        "#ec4899",
      ];

      for (let i = 0; i < transactions.length; i++) {
        const tx = transactions[i];
        const lineNumber = i + 1;

        try {
          // Validação de campos obrigatórios
          const requiredFields = [
            "description",
            "amount",
            "type",
            "category_name",
            "company_cnpj",
            "date",
            "status",
          ];
          const missingFields = requiredFields.filter((field) => !tx[field]);

          if (missingFields.length > 0) {
            errors.push({
              line: lineNumber,
              description: tx.description || "N/A",
              error: `Campos obrigatórios faltando: ${missingFields.join(", ")}`,
            });
            continue;
          }

          // Normalizar CNPJ (remover pontuação)

          // Buscar empresa no cache ou banco
          let company = companiesCache.get(tx.company_cnpj);
          if (!company) {
            const { data: companyData, error: companyError } =
              await supabaseClient
                .from("companies")
                .select("id, name, cnpj")
                .eq("user_id", userId)
                .eq("cnpj", tx.company_cnpj)
                .single();

            if (companyError || !companyData) {
              errors.push({
                line: lineNumber,
                description: tx.description,
                error: `Empresa com CNPJ ${tx.company_cnpj} não encontrada.`,
              });
              continue;
            } else {
              company = companyData;
            }

            companiesCache.set(tx.company_cnpj, company);
          }

          // Validar tipo
          if (!["income", "expense"].includes(tx.type)) {
            errors.push({
              line: lineNumber,
              description: tx.description,
              error: `Tipo inválido: ${tx.type}. Use "income" ou "expense"`,
            });
            continue;
          }

          // Validar status
          if (!["paid", "pending", "scheduled"].includes(tx.status)) {
            errors.push({
              line: lineNumber,
              description: tx.description,
              error: `Status inválido: ${tx.status}. Use "paid", "pending" ou "scheduled"`,
            });
            continue;
          }

          // Validar data
          const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
          if (!dateRegex.test(tx.date)) {
            errors.push({
              line: lineNumber,
              description: tx.description,
              error: `Data inválida: ${tx.date}. Use formato YYYY-MM-DD`,
            });
            continue;
          }

          // Validar parcelamento
          if (tx.is_installment) {
            if (!tx.installment_number || !tx.total_installments) {
              errors.push({
                line: lineNumber,
                description: tx.description,
                error:
                  "Transações parceladas requerem installment_number e total_installments",
              });
              continue;
            }

            if (tx.installment_number > tx.total_installments) {
              errors.push({
                line: lineNumber,
                description: tx.description,
                error: `installment_number (${tx.installment_number}) não pode ser maior que total_installments (${tx.total_installments})`,
              });
              continue;
            }
          }

          // Buscar ou criar categoria
          const categoryKey = `${company.id}:${tx.category_name.toLowerCase().trim()}:${tx.type}`;
          let category = categoriesCache.get(categoryKey);

          if (!category) {
            // Tentar buscar categoria existente
            const { data: existingCategory } = await supabaseClient
              .from("categories")
              .select("*")
              .eq("company_id", company.id)
              .eq("type", tx.type)
              .ilike("name", tx.category_name.trim())
              .single();

            if (existingCategory) {
              category = existingCategory;
            } else {
              // Criar nova categoria
              const nature = tx.type === "expense" ? "EXPENSE" : null;
              const color =
                defaultColors[createdCategories.length % defaultColors.length];

              const { data: newCategory, error: categoryError } =
                await supabaseClient
                  .from("categories")
                  .insert({
                    company_id: company.id,
                    name: tx.category_name.trim(),
                    type: tx.type,
                    color: color,
                    nature: nature,
                  })
                  .select()
                  .single();

              if (categoryError || !newCategory) {
                errors.push({
                  line: lineNumber,
                  description: tx.description,
                  error: `Não foi possível criar categoria "${tx.category_name}"`,
                });
                continue;
              }

              category = newCategory;
              createdCategories.push({
                name: category.name,
                type: category.type,
                company_id: category.company_id,
              });
            }

            categoriesCache.set(categoryKey, category);
          }

          // Validar cartão de crédito se necessário
          let creditCardId = null;
          if (tx.is_credit_card && tx.credit_card_name) {
            const cardKey = `${company.id}:${tx.credit_card_name.toLowerCase().trim()}`;
            let creditCard = creditCardsCache.get(cardKey);

            if (!creditCard) {
              const { data: cardData, error: cardError } = await supabaseClient
                .from("credit_cards")
                .select("id, name")
                .eq("company_id", company.id)
                .ilike("name", tx.credit_card_name.trim())
                .single();

              if (cardError || !cardData) {
                // Criar cartão de crédito se não existir
                const { data: newCard, error: createCardError } =
                  await supabaseClient
                    .from("credit_cards")
                    .insert({
                      company_id: company.id,
                      name: tx.credit_card_name.trim(),
                      closing_day: tx.credit_card_closing_day || 10,
                      due_day: tx.credit_card_due_day || 15,
                      credit_limit: tx.credit_card_limit || null,
                    })
                    .select("id, name")
                    .single();

                if (createCardError || !newCard) {
                  errors.push({
                    line: lineNumber,
                    description: tx.description,
                    error: `Não foi possível criar cartão de crédito "${tx.credit_card_name}" para a empresa ${company.name}`,
                  });
                  continue;
                }

                creditCard = newCard;
              } else {
                creditCard = cardData;
              }

              creditCardsCache.set(cardKey, creditCard);
            }

            creditCardId = creditCard.id;
          }

          // Criar transação
          const transactionData: any = {
            company_id: company.id,
            category_id: category.id,
            type: tx.type,
            description: tx.description,
            amount: tx.amount,
            date: tx.date,
            status: tx.status,
            is_installment: tx.is_installment || false,
            installment_number: tx.installment_number || null,
            total_installments: tx.total_installments || null,
            is_credit_card: tx.is_credit_card || false,
            credit_card_id: creditCardId,
            notes: tx.notes || null,
          };

          const { data: createdTransaction, error: txError } =
            await supabaseClient
              .from("transactions")
              .insert(transactionData)
              .select()
              .single();

          if (txError || !createdTransaction) {
            errors.push({
              line: lineNumber,
              description: tx.description,
              error: "Erro ao inserir transação no banco de dados",
            });
            continue;
          }

          importedTransactions.push(createdTransaction);
        } catch (error: any) {
          errors.push({
            line: lineNumber,
            description: tx.description || "N/A",
            error: error.message || "Erro desconhecido ao processar transação",
          });
        }
      }

      return res.status(200).json({
        success: true,
        imported: importedTransactions.length,
        failed: errors.length,
        errors: errors,
        categories_created: createdCategories,
      });
    } catch (error) {
      console.error("Error in import transactions:", error);
      res.status(500).json({
        error: "Erro no servidor",
        message: "Erro ao processar importação em lote",
      });
    }
  }
}

export default new TransactionsController();
