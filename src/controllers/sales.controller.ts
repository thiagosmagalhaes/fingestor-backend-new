import { Request, Response } from 'express';
import { getSupabaseClient } from '../config/database';
import { AuthRequest } from '../middleware/auth';
import {
  CreateSaleRequest,
  UpdateSaleRequest,
  ConvertBudgetToSaleRequest,
  PayInstallmentRequest,
} from '../types/sales.types';

export class SalesController {
  /**
   * GET /api/sales?companyId=xxx&status=xxx
   * Lista todas as vendas de uma empresa
   */
  async getAll(req: Request, res: Response): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const { companyId, status, paymentStatus, from, to } = req.query;

      if (!companyId || typeof companyId !== 'string') {
        return res.status(400).json({ error: 'companyId é obrigatório' });
      }

      const supabaseClient = getSupabaseClient(authReq.accessToken!);

      let query = supabaseClient
        .from('sales')
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

      if (paymentStatus && typeof paymentStatus === 'string') {
        query = query.eq('payment_status', paymentStatus);
      }

      if (from && typeof from === 'string') {
        query = query.gte('sale_date', `${from}T00:00:00`);
      }

      if (to && typeof to === 'string') {
        query = query.lte('sale_date', `${to}T23:59:59`);
      }

      query = query.order('sale_date', { ascending: false });

      const { data: sales, error } = await query;

      if (error) {
        console.error('Error fetching sales:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        return res.status(500).json({ 
          error: 'Erro ao buscar vendas',
          details: error.message,
          code: error.code
        });
      }

      console.log(`Found ${sales?.length || 0} sales for company ${companyId}`);
      res.json(sales || []);
    } catch (error: any) {
      console.error('Error in getAll sales:', error);
      res.status(500).json({ 
        error: 'Erro ao buscar vendas',
        message: error.message
      });
    }
  }

  /**
   * GET /api/sales/:id?companyId=xxx
   * Obtém uma venda específica com itens e parcelas
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

      const { data: sale, error } = await supabaseClient
        .from('sales')
        .select(`
          *,
          customers!left (
            id,
            name,
            email,
            mobile,
            document
          ),
          sale_items (
            *,
            products_services!left (
              id,
              name,
              current_stock
            )
          ),
          payment_installments (*)
        `)
        .eq('id', id)
        .eq('company_id', companyId)
        .is('deleted_at', null)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'Venda não encontrada' });
        }
        console.error('Error fetching sale:', error);
        throw error;
      }

      res.json(sale);
    } catch (error) {
      console.error('Error in getById sale:', error);
      res.status(500).json({ error: 'Erro ao buscar venda' });
    }
  }

  /**
   * POST /api/sales
   * Cria uma nova venda
   */
  async create(req: Request, res: Response): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const saleData = req.body as CreateSaleRequest;

      if (!saleData.companyId || !saleData.items || saleData.items.length === 0) {
        return res.status(400).json({
          error: 'companyId e items são obrigatórios',
        });
      }

      const supabaseClient = getSupabaseClient(authReq.accessToken!);

      // Verificar se existe uma sessão de caixa aberta
      const { data: openSession } = await supabaseClient
        .rpc('get_open_cash_session', { p_company_id: saleData.companyId });

      if (!openSession || openSession.length === 0) {
        return res.status(400).json({
          error: 'Não é possível criar venda sem uma sessão de caixa aberta. Abra o caixa primeiro.',
        });
      }

      const cashSessionId = openSession[0].id;

      // Buscar informações do cliente se customerId for fornecido
      let customerName = saleData.customerName;
      let customerDocument = saleData.customerDocument;
      
      if (saleData.customerId) {
        const { data: customer, error: customerError } = await supabaseClient
          .from('customers')
          .select('name, document')
          .eq('id', saleData.customerId)
          .eq('company_id', saleData.companyId)
          .single();
        
        if (customerError) {
          console.error('Error fetching customer:', customerError);
          return res.status(400).json({ error: 'Cliente não encontrado' });
        }
        
        customerName = customer.name;
        customerDocument = customer.document;
      }

      // Gerar número da venda
      const { data: saleNumber, error: numberError } = await supabaseClient
        .rpc('generate_sale_number', { p_company_id: saleData.companyId });

      if (numberError) {
        console.error('Error generating sale number:', numberError);
        throw numberError;
      }

      // Criar a venda
      const saleInsertData: any = {
        company_id: saleData.companyId,
        customer_id: saleData.customerId,
        budget_id: saleData.budgetId,
        sale_number: saleNumber,
        customer_name: customerName,
        customer_document: customerDocument,
        discount_amount: saleData.discountAmount || 0,
        discount_percentage: saleData.discountPercentage || 0,
        tax_amount: saleData.taxAmount || 0,
        payment_method: saleData.paymentMethod,
        payment_method_id: saleData.paymentMethodId,
        payment_status: saleData.paymentStatus || 'paid',
        paid_amount: saleData.paidAmount || 0,
        change_amount: saleData.changeAmount || 0,
        notes: saleData.notes,
        cash_session_id: cashSessionId,
      };
      
      // Adicionar sale_date se fornecido
      if (saleData.saleDate) {
        saleInsertData.sale_date = saleData.saleDate;
      }

      const { data: sale, error: saleError } = await supabaseClient
        .from('sales')
        .insert(saleInsertData)
        .select()
        .single();

      if (saleError) {
        console.error('Error creating sale:', saleError);
        throw saleError;
      }

      // Buscar informações dos produtos/serviços
      const productIds = saleData.items
        .filter(item => item.productServiceId)
        .map(item => item.productServiceId!);

      let productsMap = new Map<string, any>();
      
      if (productIds.length > 0) {
        const { data: products, error: productsError } = await supabaseClient
          .from('products_services')
          .select('id, name, sku, item_type, description, sale_price, cost_price, tax_percentage')
          .in('id', productIds)
          .eq('company_id', saleData.companyId);
        
        if (productsError) {
          console.error('Error fetching products for items:', productsError);
          throw new Error('Erro ao buscar informações dos produtos');
        }
        
        if (products && products.length > 0) {
          products.forEach(p => productsMap.set(p.id, p));
        }
      }

      // Criar os itens da venda
      const itemsToInsert = saleData.items.map((item, index) => {
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
        let costPrice = item.costPrice;
        
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
          costPrice = product.cost_price || costPrice;
        }
        
        let itemTotal = quantity * unitPrice;
        
        if (discountPercentage > 0) {
          itemTotal = itemTotal - (itemTotal * discountPercentage / 100);
        } else if (discountAmount > 0) {
          itemTotal = itemTotal - discountAmount;
        }
        
        return {
          sale_id: sale.id,
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
          cost_price: costPrice,
          sort_order: item.sortOrder || index,
        };
      });

      const { error: itemsError } = await supabaseClient
        .from('sale_items')
        .insert(itemsToInsert);

      if (itemsError) {
        console.error('Error creating sale items:', itemsError);
        throw itemsError;
      }

      // Criar parcelas se necessário
      if (saleData.installmentsCount && saleData.installmentsCount > 1) {
        // Buscar o total da venda atualizado
        const { data: updatedSale } = await supabaseClient
          .from('sales')
          .select('total_amount')
          .eq('id', sale.id)
          .single();

        if (updatedSale) {
          const installmentAmount = updatedSale.total_amount / saleData.installmentsCount;
          const installments = [];
          
          for (let i = 1; i <= saleData.installmentsCount; i++) {
            installments.push({
              sale_id: sale.id,
              installment_number: i,
              amount: installmentAmount,
              due_date: new Date(Date.now() + ((i - 1) * 30 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
              payment_method: saleData.paymentMethod,
              payment_method_id: saleData.paymentMethodId,
            });
          }

          await supabaseClient
            .from('payment_installments')
            .insert(installments);
        }
      }

      // Buscar venda completa
      const { data: completeSale } = await supabaseClient
        .from('sales')
        .select(`
          *,
          sale_items (*),
          payment_installments (*)
        `)
        .eq('id', sale.id)
        .single();

      res.status(201).json(completeSale);
    } catch (error) {
      console.error('Error in create sale:', error);
      res.status(500).json({ error: 'Erro ao criar venda' });
    }
  }

  /**
   * PUT /api/sales/:id
   * Atualiza uma venda
   */
  async update(req: Request, res: Response): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const { id } = req.params;
      const { companyId } = req.query;
      const updateData = req.body as UpdateSaleRequest;

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
      if (updateData.discountAmount !== undefined) dataToUpdate.discount_amount = updateData.discountAmount;
      if (updateData.discountPercentage !== undefined) dataToUpdate.discount_percentage = updateData.discountPercentage;
      if (updateData.taxAmount !== undefined) dataToUpdate.tax_amount = updateData.taxAmount;
      if (updateData.paymentMethod !== undefined) dataToUpdate.payment_method = updateData.paymentMethod;
      if (updateData.paymentMethodId !== undefined) dataToUpdate.payment_method_id = updateData.paymentMethodId;
      if (updateData.paymentStatus !== undefined) dataToUpdate.payment_status = updateData.paymentStatus;
      if (updateData.paidAmount !== undefined) dataToUpdate.paid_amount = updateData.paidAmount;
      if (updateData.changeAmount !== undefined) dataToUpdate.change_amount = updateData.changeAmount;
      if (updateData.status !== undefined) dataToUpdate.status = updateData.status;
      if (updateData.notes !== undefined) dataToUpdate.notes = updateData.notes;

      const { data: sale, error } = await supabaseClient
        .from('sales')
        .update(dataToUpdate)
        .eq('id', id)
        .eq('company_id', companyId)
        .is('deleted_at', null)
        .select()
        .single();

      if (error) {
        console.error('Error updating sale:', error);
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'Venda não encontrada' });
        }
        throw error;
      }

      res.json(sale);
    } catch (error) {
      console.error('Error in update sale:', error);
      res.status(500).json({ error: 'Erro ao atualizar venda' });
    }
  }

  /**
   * POST /api/sales/:id/cancel
   * Cancela uma venda
   */
  async cancel(req: Request, res: Response): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const { id } = req.params;
      const { reason } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'ID da venda é obrigatório' });
      }

      if (!reason) {
        return res.status(400).json({ error: 'Motivo do cancelamento é obrigatório' });
      }

      const supabaseClient = getSupabaseClient(authReq.accessToken!);

      const { error } = await supabaseClient.rpc('cancel_sale', {
        p_sale_id: id,
        p_reason: reason,
      });

      if (error) {
        console.error('Error cancelling sale:', error);
        return res.status(400).json({ error: error.message });
      }

      res.json({ message: 'Venda cancelada com sucesso' });
    } catch (error) {
      console.error('Error in cancel sale:', error);
      res.status(500).json({ error: 'Erro ao cancelar venda' });
    }
  }

  /**
   * POST /api/sales/convert-budget
   * Converte um orçamento em venda
   */
  async convertFromBudget(req: Request, res: Response): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const { budgetId, paymentMethod, paymentMethodId, installments } = req.body as ConvertBudgetToSaleRequest;

      if (!budgetId) {
        return res.status(400).json({ error: 'budgetId é obrigatório' });
      }

      const supabaseClient = getSupabaseClient(authReq.accessToken!);

      const { data: saleId, error } = await supabaseClient.rpc('convert_budget_to_sale', {
        p_budget_id: budgetId,
        p_payment_method: paymentMethod || 'cash',
        p_installments: installments || 1,
      });

      if (error) {
        console.error('Error converting budget to sale:', error);
        return res.status(400).json({ error: error.message });
      }

      // Se payment_method_id foi fornecido, atualizar a venda
      if (paymentMethodId) {
        await supabaseClient
          .from('sales')
          .update({ payment_method_id: paymentMethodId })
          .eq('id', saleId);
      }

      // Buscar venda criada
      const { data: sale } = await supabaseClient
        .from('sales')
        .select(`
          *,
          sale_items (*),
          payment_installments (*)
        `)
        .eq('id', saleId)
        .single();

      res.status(201).json(sale);
    } catch (error) {
      console.error('Error in convertFromBudget:', error);
      res.status(500).json({ error: 'Erro ao converter orçamento' });
    }
  }

  /**
   * POST /api/sales/installments/:id/pay
   * Registra pagamento de uma parcela
   */
  async payInstallment(req: Request, res: Response): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const { id } = req.params;
      const { paidAmount, paymentMethod, paymentMethodId, notes } = req.body as PayInstallmentRequest;

      if (!id) {
        return res.status(400).json({ error: 'ID da parcela é obrigatório' });
      }

      if (!paidAmount) {
        return res.status(400).json({ error: 'Valor pago é obrigatório' });
      }

      const supabaseClient = getSupabaseClient(authReq.accessToken!);

      const { data: installment, error } = await supabaseClient
        .from('payment_installments')
        .update({
          status: 'paid',
          paid_amount: paidAmount,
          paid_at: new Date().toISOString(),
          payment_method: paymentMethod,
          payment_method_id: paymentMethodId,
          notes,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error paying installment:', error);
        throw error;
      }

      // Verificar se todas parcelas foram pagas para atualizar status da venda
      const { data: allInstallments } = await supabaseClient
        .from('payment_installments')
        .select('status')
        .eq('sale_id', installment.sale_id);

      if (allInstallments && allInstallments.every(i => i.status === 'paid')) {
        await supabaseClient
          .from('sales')
          .update({ payment_status: 'paid' })
          .eq('id', installment.sale_id);
      }

      res.json(installment);
    } catch (error) {
      console.error('Error in payInstallment:', error);
      res.status(500).json({ error: 'Erro ao registrar pagamento' });
    }
  }
}

export default new SalesController();
