import { Request, Response } from 'express';
import { getSupabaseClient } from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { AddStockRequest, AdjustStockRequest } from '../types/products.types';

export class InventoryController {
  /**
   * GET /api/inventory/movements?companyId=xxx&productId=xxx
   * Lista movimentações de estoque
   */
  async getMovements(req: Request, res: Response): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const { companyId, productId, from, to, limit = '50' } = req.query;

      if (!companyId || typeof companyId !== 'string') {
        return res.status(400).json({ error: 'companyId é obrigatório' });
      }

      const supabaseClient = getSupabaseClient(authReq.accessToken!);

      let query = supabaseClient
        .from('inventory_movements')
        .select(`
          *,
          products_services (
            id,
            name,
            sku
          )
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(parseInt(limit as string));

      if (productId && typeof productId === 'string') {
        query = query.eq('product_service_id', productId);
      }

      if (from && typeof from === 'string') {
        query = query.gte('created_at', from);
      }

      if (to && typeof to === 'string') {
        query = query.lte('created_at', to);
      }

      const { data: movements, error } = await query;

      if (error) {
        console.error('Error fetching inventory movements:', error);
        throw error;
      }

      res.json(movements || []);
    } catch (error) {
      console.error('Error in getMovements:', error);
      res.status(500).json({ error: 'Erro ao buscar movimentações' });
    }
  }

  /**
   * POST /api/inventory/add-stock
   * Adiciona estoque a um produto
   */
  async addStock(req: Request, res: Response): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const { productId, quantity, referenceNumber, notes } = req.body as AddStockRequest;

      if (!productId || !quantity) {
        return res.status(400).json({
          error: 'productId e quantity são obrigatórios',
        });
      }

      if (quantity <= 0) {
        return res.status(400).json({
          error: 'Quantidade deve ser maior que zero',
        });
      }

      const supabaseClient = getSupabaseClient(authReq.accessToken!);

      const { error } = await supabaseClient.rpc('add_product_stock', {
        p_product_id: productId,
        p_quantity: quantity,
        p_reference_number: referenceNumber,
        p_notes: notes,
      });

      if (error) {
        console.error('Error adding stock:', error);
        return res.status(400).json({ error: error.message });
      }

      res.json({ message: 'Estoque adicionado com sucesso' });
    } catch (error) {
      console.error('Error in addStock:', error);
      res.status(500).json({ error: 'Erro ao adicionar estoque' });
    }
  }

  /**
   * POST /api/inventory/adjust-stock
   * Ajusta manualmente o estoque de um produto
   */
  async adjustStock(req: Request, res: Response): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const { productId, newStock, notes } = req.body as AdjustStockRequest;

      if (!productId || newStock === undefined) {
        return res.status(400).json({
          error: 'productId e newStock são obrigatórios',
        });
      }

      if (newStock < 0) {
        return res.status(400).json({
          error: 'Estoque não pode ser negativo',
        });
      }

      const supabaseClient = getSupabaseClient(authReq.accessToken!);

      // Buscar produto atual
      const { data: product, error: productError } = await supabaseClient
        .from('products_services')
        .select('current_stock, company_id')
        .eq('id', productId)
        .is('deleted_at', null)
        .single();

      if (productError || !product) {
        return res.status(404).json({ error: 'Produto não encontrado' });
      }

      const quantityDiff = newStock - product.current_stock;

      // Atualizar estoque
      const { error: updateError } = await supabaseClient
        .from('products_services')
        .update({ current_stock: newStock })
        .eq('id', productId);

      if (updateError) {
        console.error('Error updating stock:', updateError);
        throw updateError;
      }

      // Registrar movimentação
      const { error: movementError } = await supabaseClient
        .from('inventory_movements')
        .insert({
          company_id: product.company_id,
          product_service_id: productId,
          movement_type: 'adjustment',
          quantity: quantityDiff,
          previous_stock: product.current_stock,
          new_stock: newStock,
          notes,
        });

      if (movementError) {
        console.error('Error creating movement:', movementError);
        throw movementError;
      }

      res.json({ message: 'Estoque ajustado com sucesso' });
    } catch (error) {
      console.error('Error in adjustStock:', error);
      res.status(500).json({ error: 'Erro ao ajustar estoque' });
    }
  }
}

export default new InventoryController();
