import { Request, Response } from 'express';
import { getSupabaseClient } from '../config/database';
import { AuthRequest } from '../middleware/auth';
import {
  CreatePaymentMethodRequest,
  UpdatePaymentMethodRequest,
  CalculateFeeRequest,
} from '../types/payment-methods.types';

export class PaymentMethodsController {
  /**
   * GET /api/payment-methods?companyId=xxx
   * Lista todas as formas de pagamento ativas de uma empresa
   */
  async getAll(req: Request, res: Response): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const { companyId, includeInactive } = req.query;

      if (!companyId || typeof companyId !== 'string') {
        return res.status(400).json({ error: 'companyId é obrigatório' });
      }

      const supabaseClient = getSupabaseClient(authReq.accessToken!);

      let query = supabaseClient
        .from('payment_methods')
        .select('*')
        .eq('company_id', companyId)
        .is('deleted_at', null);

      // Por padrão, retorna apenas os ativos
      if (includeInactive !== 'true') {
        query = query.eq('is_active', true);
      }

      query = query.order('display_order', { ascending: true });

      const { data: paymentMethods, error } = await query;

      if (error) {
        console.error('Error fetching payment methods:', error);
        throw error;
      }

      res.json(paymentMethods || []);
    } catch (error) {
      console.error('Error in getAll payment methods:', error);
      res.status(500).json({ error: 'Erro ao buscar formas de pagamento' });
    }
  }

  /**
   * GET /api/payment-methods/:id?companyId=xxx
   * Obtém uma forma de pagamento específica
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

      const { data: paymentMethod, error } = await supabaseClient
        .from('payment_methods')
        .select('*')
        .eq('id', id)
        .eq('company_id', companyId)
        .is('deleted_at', null)
        .single();

      if (error) {
        console.error('Error fetching payment method:', error);
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'Forma de pagamento não encontrada' });
        }
        throw error;
      }

      res.json(paymentMethod);
    } catch (error) {
      console.error('Error in getById payment method:', error);
      res.status(500).json({ error: 'Erro ao buscar forma de pagamento' });
    }
  }

  /**
   * POST /api/payment-methods
   * Cria uma nova forma de pagamento
   */
  async create(req: Request, res: Response): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const body: CreatePaymentMethodRequest = req.body;

      // Validações
      if (!body.companyId) {
        return res.status(400).json({ error: 'companyId é obrigatório' });
      }

      if (!body.name || body.name.trim() === '') {
        return res.status(400).json({ error: 'name é obrigatório' });
      }

      if (!body.type || !['cash', 'pix', 'card', 'other'].includes(body.type)) {
        return res.status(400).json({ 
          error: 'type é obrigatório e deve ser: cash, pix, card ou other' 
        });
      }

      // Se for cartão, validar card_type e card_brand
      if (body.type === 'card') {
        if (!body.cardType || !['debit', 'credit', 'both'].includes(body.cardType)) {
          return res.status(400).json({ 
            error: 'Para tipo card, cardType é obrigatório e deve ser: debit, credit ou both' 
          });
        }
      }

      const supabaseClient = getSupabaseClient(authReq.accessToken!);

      // Preparar dados para inserção
      const paymentMethodData = {
        company_id: body.companyId,
        name: body.name.trim(),
        type: body.type,
        card_type: body.cardType || null,
        card_brand: body.cardBrand ? body.cardBrand.trim() : null,
        fee_percentage: body.feePercentage || 0,
        fee_fixed_amount: body.feeFixedAmount || 0,
        installment_fees: body.installmentFees || {},
        is_active: body.isActive !== undefined ? body.isActive : true,
        is_default: body.isDefault || false,
        allow_installments: body.allowInstallments || false,
        max_installments: body.maxInstallments || 1,
        min_installment_amount: body.minInstallmentAmount || 0,
        days_to_receive: body.daysToReceive !== undefined ? body.daysToReceive : 0,
        display_order: body.displayOrder !== undefined ? body.displayOrder : 999,
        metadata: body.metadata || {},
      };

      const { data: paymentMethod, error } = await supabaseClient
        .from('payment_methods')
        .insert(paymentMethodData)
        .select()
        .single();

      if (error) {
        console.error('Error creating payment method:', error);
        throw error;
      }

      res.status(201).json(paymentMethod);
    } catch (error) {
      console.error('Error in create payment method:', error);
      res.status(500).json({ error: 'Erro ao criar forma de pagamento' });
    }
  }

  /**
   * PUT /api/payment-methods/:id
   * Atualiza uma forma de pagamento
   */
  async update(req: Request, res: Response): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const { id } = req.params;
      const body: UpdatePaymentMethodRequest & { companyId: string } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'ID é obrigatório' });
      }

      if (!body.companyId) {
        return res.status(400).json({ error: 'companyId é obrigatório' });
      }

      const supabaseClient = getSupabaseClient(authReq.accessToken!);

      // Verificar se existe
      const { data: existing, error: fetchError } = await supabaseClient
        .from('payment_methods')
        .select('id')
        .eq('id', id)
        .eq('company_id', body.companyId)
        .is('deleted_at', null)
        .single();

      if (fetchError || !existing) {
        return res.status(404).json({ error: 'Forma de pagamento não encontrada' });
      }

      // Preparar dados para atualização
      const updateData: any = {};

      if (body.name !== undefined) updateData.name = body.name.trim();
      if (body.type !== undefined) updateData.type = body.type;
      if (body.cardType !== undefined) updateData.card_type = body.cardType;
      if (body.cardBrand !== undefined) updateData.card_brand = body.cardBrand?.trim() || null;
      if (body.feePercentage !== undefined) updateData.fee_percentage = body.feePercentage;
      if (body.feeFixedAmount !== undefined) updateData.fee_fixed_amount = body.feeFixedAmount;
      if (body.installmentFees !== undefined) updateData.installment_fees = body.installmentFees;
      if (body.isActive !== undefined) updateData.is_active = body.isActive;
      if (body.isDefault !== undefined) updateData.is_default = body.isDefault;
      if (body.allowInstallments !== undefined) updateData.allow_installments = body.allowInstallments;
      if (body.maxInstallments !== undefined) updateData.max_installments = body.maxInstallments;
      if (body.minInstallmentAmount !== undefined) updateData.min_installment_amount = body.minInstallmentAmount;
      if (body.daysToReceive !== undefined) updateData.days_to_receive = body.daysToReceive;
      if (body.displayOrder !== undefined) updateData.display_order = body.displayOrder;
      if (body.metadata !== undefined) updateData.metadata = body.metadata;

      const { data: paymentMethod, error } = await supabaseClient
        .from('payment_methods')
        .update(updateData)
        .eq('id', id)
        .eq('company_id', body.companyId)
        .select()
        .single();

      if (error) {
        console.error('Error updating payment method:', error);
        throw error;
      }

      res.json(paymentMethod);
    } catch (error) {
      console.error('Error in update payment method:', error);
      res.status(500).json({ error: 'Erro ao atualizar forma de pagamento' });
    }
  }

  /**
   * DELETE /api/payment-methods/:id?companyId=xxx
   * Soft delete de uma forma de pagamento
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

      // Verificar se é o método padrão
      const { data: paymentMethod, error: fetchError } = await supabaseClient
        .from('payment_methods')
        .select('is_default')
        .eq('id', id)
        .eq('company_id', companyId)
        .is('deleted_at', null)
        .single();

      if (fetchError || !paymentMethod) {
        return res.status(404).json({ error: 'Forma de pagamento não encontrada' });
      }

      if (paymentMethod.is_default) {
        return res.status(400).json({ 
          error: 'Não é possível excluir a forma de pagamento padrão. Defina outra como padrão antes.' 
        });
      }

      // Soft delete
      const { error } = await supabaseClient
        .from('payment_methods')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .eq('company_id', companyId);

      if (error) {
        console.error('Error deleting payment method:', error);
        throw error;
      }

      res.json({ message: 'Forma de pagamento excluída com sucesso' });
    } catch (error) {
      console.error('Error in delete payment method:', error);
      res.status(500).json({ error: 'Erro ao excluir forma de pagamento' });
    }
  }

  /**
   * POST /api/payment-methods/calculate-fee
   * Calcula a taxa de uma forma de pagamento
   */
  async calculateFee(req: Request, res: Response): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const body: CalculateFeeRequest & { companyId: string } = req.body;

      if (!body.companyId) {
        return res.status(400).json({ error: 'companyId é obrigatório' });
      }

      if (!body.paymentMethodId) {
        return res.status(400).json({ error: 'paymentMethodId é obrigatório' });
      }

      if (!body.amount || body.amount <= 0) {
        return res.status(400).json({ error: 'amount é obrigatório e deve ser maior que 0' });
      }

      const supabaseClient = getSupabaseClient(authReq.accessToken!);

      // Buscar a forma de pagamento
      const { data: paymentMethod, error } = await supabaseClient
        .from('payment_methods')
        .select('*')
        .eq('id', body.paymentMethodId)
        .eq('company_id', body.companyId)
        .is('deleted_at', null)
        .single();

      if (error || !paymentMethod) {
        return res.status(404).json({ error: 'Forma de pagamento não encontrada' });
      }

      // Calcular taxa
      let feePercentage = paymentMethod.fee_percentage || 0;
      const feeFixedAmount = paymentMethod.fee_fixed_amount || 0;

      // Se tiver installments e a forma de pagamento tiver taxas específicas por parcela
      if (
        body.installments && 
        body.installments > 1 && 
        paymentMethod.installment_fees &&
        Object.keys(paymentMethod.installment_fees).length > 0
      ) {
        const installmentKey = body.installments.toString();
        if (paymentMethod.installment_fees[installmentKey] !== undefined) {
          feePercentage = paymentMethod.installment_fees[installmentKey];
        }
      }

      // Calcular valor da taxa
      const percentageFee = (body.amount * feePercentage) / 100;
      const feeAmount = percentageFee + feeFixedAmount;
      const totalAmount = body.amount + feeAmount;

      res.json({
        amount: body.amount,
        feeAmount: Number(feeAmount.toFixed(2)),
        totalAmount: Number(totalAmount.toFixed(2)),
        feePercentage,
        feeFixedAmount,
      });
    } catch (error) {
      console.error('Error in calculateFee:', error);
      res.status(500).json({ error: 'Erro ao calcular taxa' });
    }
  }
}
