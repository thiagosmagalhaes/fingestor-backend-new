import { Request, Response } from 'express';
import { getSupabaseClient } from '../config/database';
import { AuthRequest } from '../middleware/auth';
import {
  CreateBudgetRequest,
  UpdateBudgetRequest,
} from '../types/budgets.types';

export class BudgetsController {
  /**
   * GET /api/budgets?companyId=xxx&status=xxx
   * Lista todos os orçamentos de uma empresa
   */
  async getAll(req: Request, res: Response): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const { companyId, status, pipelineStage, customerId } = req.query;

      if (!companyId || typeof companyId !== 'string') {
        return res.status(400).json({ error: 'companyId é obrigatório' });
      }

      const supabaseClient = getSupabaseClient(authReq.accessToken!);

      let query = supabaseClient
        .from('budgets')
        .select(`
          *,
          customers!left (
            id,
            name,
            email,
            mobile
          )
        `)
        .eq('company_id', companyId)
        .is('deleted_at', null);

      if (status && typeof status === 'string') {
        query = query.eq('status', status);
      }

      if (pipelineStage && typeof pipelineStage === 'string') {
        query = query.eq('pipeline_stage', pipelineStage);
      }

      if (customerId && typeof customerId === 'string') {
        query = query.eq('customer_id', customerId);
      }

      query = query.order('issue_date', { ascending: false });

      const { data: budgets, error } = await query;

      if (error) {
        console.error('Error fetching budgets:', error);
        throw error;
      }

      res.json(budgets || []);
    } catch (error) {
      console.error('Error in getAll budgets:', error);
      res.status(500).json({ error: 'Erro ao buscar orçamentos' });
    }
  }

  /**
   * GET /api/budgets/:id?companyId=xxx
   * Obtém um orçamento específico com itens
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

      const { data: budget, error } = await supabaseClient
        .from('budgets')
        .select(`
          *,
          customers!left (
            id,
            name,
            email,
            mobile,
            document
          ),
          budget_items (
            *,
            products_services!left (
              id,
              name,
              current_stock
            )
          )
        `)
        .eq('id', id)
        .eq('company_id', companyId)
        .is('deleted_at', null)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'Orçamento não encontrado' });
        }
        console.error('Error fetching budget:', error);
        throw error;
      }

      res.json(budget);
    } catch (error) {
      console.error('Error in getById budget:', error);
      res.status(500).json({ error: 'Erro ao buscar orçamento' });
    }
  }

  /**
   * POST /api/budgets
   * Cria um novo orçamento
   */
  async create(req: Request, res: Response): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const budgetData = req.body as CreateBudgetRequest;

      if (!budgetData.companyId || !budgetData.items || budgetData.items.length === 0) {
        return res.status(400).json({
          error: 'companyId e items são obrigatórios',
        });
      }

      const supabaseClient = getSupabaseClient(authReq.accessToken!);

      // Gerar número do orçamento
      const { data: budgetNumber, error: numberError } = await supabaseClient
        .rpc('generate_budget_number', { p_company_id: budgetData.companyId });

      if (numberError) {
        console.error('Error generating budget number:', numberError);
        throw numberError;
      }

      // Criar o orçamento
      const { data: budget, error: budgetError } = await supabaseClient
        .from('budgets')
        .insert({
          company_id: budgetData.companyId,
          customer_id: budgetData.customerId,
          budget_number: budgetNumber,
          customer_name: budgetData.customerName,
          customer_document: budgetData.customerDocument,
          customer_email: budgetData.customerEmail,
          customer_phone: budgetData.customerPhone,
          discount_amount: budgetData.discountAmount || 0,
          discount_percentage: budgetData.discountPercentage || 0,
          tax_amount: budgetData.taxAmount || 0,
          issue_date: budgetData.issueDate || new Date().toISOString().split('T')[0],
          expiry_date: budgetData.expiryDate,
          notes: budgetData.notes,
          terms: budgetData.terms,
          assigned_to: budgetData.assignedTo,
        })
        .select()
        .single();

      if (budgetError) {
        console.error('Error creating budget:', budgetError);
        throw budgetError;
      }

      // Buscar informações dos produtos/serviços
      const productIds = budgetData.items
        .filter(item => item.productServiceId)
        .map(item => item.productServiceId!);

      let productsMap = new Map<string, any>();
      
      if (productIds.length > 0) {
        const { data: products, error: productsError } = await supabaseClient
          .from('products_services')
          .select('id, name, sku, item_type, description, sale_price, tax_percentage')
          .in('id', productIds)
          .eq('company_id', budgetData.companyId);
        
        if (productsError) {
          console.error('Error fetching products for items:', productsError);
          throw new Error('Erro ao buscar informações dos produtos');
        }
        
        if (products && products.length > 0) {
          products.forEach(p => productsMap.set(p.id, p));
        }
      }

      // Criar os itens do orçamento
      const itemsToInsert = budgetData.items.map((item, index) => {
        const quantity = item.quantity;
        const unitPrice = item.unitPrice;
        const discountPercentage = item.discountPercentage || 0;
        const discountAmount = item.discountAmount || 0;
        
        // Buscar informações do produto se tiver productServiceId
        let itemType: 'product' | 'service' = 'product';
        let name = item.name || '';
        let sku = item.sku;
        let description = item.description;
        let taxPercentage = item.taxPercentage || 0;
        
        if (item.productServiceId) {
          const product = productsMap.get(item.productServiceId);
          if (!product) {
            throw new Error(`Produto ${item.productServiceId} não encontrado`);
          }
          
          // Preencher com dados do produto
          itemType = product.item_type;
          name = product.name;
          sku = product.sku || sku;
          description = product.description || description;
          taxPercentage = product.tax_percentage || taxPercentage;
        }
        
        let itemTotal = quantity * unitPrice;
        
        if (discountPercentage > 0) {
          itemTotal = itemTotal - (itemTotal * discountPercentage / 100);
        } else if (discountAmount > 0) {
          itemTotal = itemTotal - discountAmount;
        }
        
        return {
          budget_id: budget.id,
          product_service_id: item.productServiceId,
          item_type: itemType,
          sku: sku,
          name: name,
          description: description,
          quantity,
          unit_price: unitPrice,
          discount_amount: discountAmount,
          discount_percentage: discountPercentage,
          tax_percentage: taxPercentage,
          total_amount: itemTotal,
          sort_order: item.sortOrder || index,
        };
      });

      const { error: itemsError } = await supabaseClient
        .from('budget_items')
        .insert(itemsToInsert);

      if (itemsError) {
        console.error('Error creating budget items:', itemsError);
        throw itemsError;
      }

      // Buscar orçamento completo
      const { data: completeBudget } = await supabaseClient
        .from('budgets')
        .select(`
          *,
          budget_items (*)
        `)
        .eq('id', budget.id)
        .single();

      res.status(201).json(completeBudget);
    } catch (error) {
      console.error('Error in create budget:', error);
      res.status(500).json({ error: 'Erro ao criar orçamento' });
    }
  }

  /**
   * PUT /api/budgets/:id
   * Atualiza um orçamento
   */
  async update(req: Request, res: Response): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const { id } = req.params;
      const { companyId } = req.query;
      const updateData = req.body as UpdateBudgetRequest;

      if (!id) {
        return res.status(400).json({ error: 'ID é obrigatório' });
      }

      if (!companyId || typeof companyId !== 'string') {
        return res.status(400).json({ error: 'companyId é obrigatório' });
      }

      const supabaseClient = getSupabaseClient(authReq.accessToken!);

      const dataToUpdate: any = {};
      if (updateData.customerId !== undefined) dataToUpdate.customer_id = updateData.customerId;
      if (updateData.customerName !== undefined) dataToUpdate.customer_name = updateData.customerName;
      if (updateData.customerDocument !== undefined) dataToUpdate.customer_document = updateData.customerDocument;
      if (updateData.customerEmail !== undefined) dataToUpdate.customer_email = updateData.customerEmail;
      if (updateData.customerPhone !== undefined) dataToUpdate.customer_phone = updateData.customerPhone;
      if (updateData.discountAmount !== undefined) dataToUpdate.discount_amount = updateData.discountAmount;
      if (updateData.discountPercentage !== undefined) dataToUpdate.discount_percentage = updateData.discountPercentage;
      if (updateData.taxAmount !== undefined) dataToUpdate.tax_amount = updateData.taxAmount;
      if (updateData.status !== undefined) dataToUpdate.status = updateData.status;
      if (updateData.pipelineStage !== undefined) dataToUpdate.pipeline_stage = updateData.pipelineStage;
      if (updateData.winProbability !== undefined) dataToUpdate.win_probability = updateData.winProbability;
      if (updateData.rejectionReason !== undefined) dataToUpdate.rejection_reason = updateData.rejectionReason;
      if (updateData.lossReason !== undefined) dataToUpdate.loss_reason = updateData.lossReason;
      if (updateData.issueDate !== undefined) dataToUpdate.issue_date = updateData.issueDate;
      if (updateData.expiryDate !== undefined) dataToUpdate.expiry_date = updateData.expiryDate;
      if (updateData.nextFollowupDate !== undefined) dataToUpdate.next_followup_date = updateData.nextFollowupDate;
      if (updateData.notes !== undefined) dataToUpdate.notes = updateData.notes;
      if (updateData.terms !== undefined) dataToUpdate.terms = updateData.terms;
      if (updateData.assignedTo !== undefined) dataToUpdate.assigned_to = updateData.assignedTo;

      // Atualizar timestamps específicos baseado no status
      if (updateData.status === 'sent' && !dataToUpdate.sent_at) {
        dataToUpdate.sent_at = new Date().toISOString();
      }
      if (updateData.status === 'approved' && !dataToUpdate.approved_at) {
        dataToUpdate.approved_at = new Date().toISOString();
      }
      if (updateData.status === 'rejected' && !dataToUpdate.rejected_at) {
        dataToUpdate.rejected_at = new Date().toISOString();
      }

      // Atualizar o orçamento
      const { data: budget, error } = await supabaseClient
        .from('budgets')
        .update(dataToUpdate)
        .eq('id', id)
        .eq('company_id', companyId)
        .is('deleted_at', null)
        .select()
        .single();

      if (error) {
        console.error('Error updating budget:', error);
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'Orçamento não encontrado' });
        }
        throw error;
      }

      // Se items foram fornecidos, atualizar os itens do orçamento
      if (updateData.items && updateData.items.length > 0) {
        // Excluir itens antigos
        const { error: deleteItemsError } = await supabaseClient
          .from('budget_items')
          .delete()
          .eq('budget_id', id);

        if (deleteItemsError) {
          console.error('Error deleting old budget items:', deleteItemsError);
          throw deleteItemsError;
        }

        // Buscar informações dos produtos/serviços
        const productIds = updateData.items
          .filter(item => item.productServiceId)
          .map(item => item.productServiceId!);

        let productsMap = new Map<string, any>();
        
        if (productIds.length > 0) {
          const { data: products, error: productsError } = await supabaseClient
            .from('products_services')
            .select('id, name, sku, item_type, description, sale_price, tax_percentage')
            .in('id', productIds)
            .eq('company_id', companyId);
          
          if (productsError) {
            console.error('Error fetching products for items:', productsError);
            throw new Error('Erro ao buscar informações dos produtos');
          }
          
          if (products && products.length > 0) {
            products.forEach(p => productsMap.set(p.id, p));
          }
        }

        // Criar os novos itens
        const itemsToInsert = updateData.items.map((item, index) => {
          const quantity = item.quantity;
          const unitPrice = item.unitPrice;
          const discountPercentage = item.discountPercentage || 0;
          const discountAmount = item.discountAmount || 0;
          
          // Buscar informações do produto se tiver productServiceId
          let itemType: 'product' | 'service' = 'product';
          let name = item.name || '';
          let sku = item.sku;
          let description = item.description;
          let taxPercentage = item.taxPercentage || 0;
          
          if (item.productServiceId) {
            const product = productsMap.get(item.productServiceId);
            if (!product) {
              throw new Error(`Produto ${item.productServiceId} não encontrado`);
            }
            
            // Preencher com dados do produto
            itemType = product.item_type;
            name = product.name;
            sku = product.sku || sku;
            description = product.description || description;
            taxPercentage = product.tax_percentage || taxPercentage;
          }
          
          let itemTotal = quantity * unitPrice;
          
          if (discountPercentage > 0) {
            itemTotal = itemTotal - (itemTotal * discountPercentage / 100);
          } else if (discountAmount > 0) {
            itemTotal = itemTotal - discountAmount;
          }
          
          return {
            budget_id: id,
            product_service_id: item.productServiceId,
            item_type: itemType,
            sku: sku,
            name: name,
            description: description,
            quantity,
            unit_price: unitPrice,
            discount_amount: discountAmount,
            discount_percentage: discountPercentage,
            tax_percentage: taxPercentage,
            total_amount: itemTotal,
            sort_order: item.sortOrder || index,
          };
        });

        const { error: itemsError } = await supabaseClient
          .from('budget_items')
          .insert(itemsToInsert);

        if (itemsError) {
          console.error('Error creating new budget items:', itemsError);
          throw itemsError;
        }
      }

      // Buscar orçamento completo com itens
      const { data: completeBudget } = await supabaseClient
        .from('budgets')
        .select(`
          *,
          customers!left (
            id,
            name,
            email,
            mobile
          ),
          budget_items (
            *,
            products_services!left (
              id,
              name,
              current_stock
            )
          )
        `)
        .eq('id', id)
        .single();

      res.json(completeBudget || budget);
    } catch (error) {
      console.error('Error in update budget:', error);
      res.status(500).json({ error: 'Erro ao atualizar orçamento' });
    }
  }

  /**
   * DELETE /api/budgets/:id?companyId=xxx
   * Remove um orçamento (soft delete)
   */
  async delete(req: Request, res: Response): Promise<Response | void> {
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

      const { error } = await supabaseClient
        .from('budgets')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .eq('company_id', companyId);

      if (error) {
        console.error('Error deleting budget:', error);
        throw error;
      }

      res.status(204).send();
    } catch (error) {
      console.error('Error in delete budget:', error);
      res.status(500).json({ error: 'Erro ao deletar orçamento' });
    }
  }

  /**
   * GET /api/budgets/:id/history?companyId=xxx
   * Obtém histórico de mudanças de status do orçamento
   */
  async getStatusHistory(req: Request, res: Response): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const { budgetId } = req.params;
      const { companyId } = req.query;

      if (!budgetId) {
        return res.status(400).json({ error: 'ID do orçamento é obrigatório' });
      }

      if (!companyId || typeof companyId !== 'string') {
        return res.status(400).json({ error: 'companyId é obrigatório' });
      }

      const supabaseClient = getSupabaseClient(authReq.accessToken!);

      const { data: history, error } = await supabaseClient
        .from('budget_status_history')
        .select('*')
        .eq('budget_id', budgetId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching status history:', error);
        throw error;
      }

      res.json(history || []);
    } catch (error) {
      console.error('Error in getStatusHistory:', error);
      res.status(500).json({ error: 'Erro ao buscar histórico' });
    }
  }
}

export default new BudgetsController();
