import { Request, Response } from 'express';
import { getSupabaseClient } from '../config/database';
import { AuthRequest } from '../middleware/auth';
import {
  CreateProductServiceRequest,
  UpdateProductServiceRequest,
} from '../types/products.types';

export class ProductsServicesController {
  /**
   * GET /api/products-services?companyId=xxx&type=product|service
   * Lista todos os produtos/serviços de uma empresa
   */
  async getAll(req: Request, res: Response): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const { companyId, type, search } = req.query;

      if (!companyId || typeof companyId !== 'string') {
        return res.status(400).json({ error: 'companyId é obrigatório' });
      }

      const supabaseClient = getSupabaseClient(authReq.accessToken!);

      let query = supabaseClient
        .from('products_services')
        .select(`
          *,
          product_categories (
            id,
            name,
            color
          )
        `)
        .eq('company_id', companyId)
        .eq('is_active', true)
        .is('deleted_at', null);

      if (type && (type === 'product' || type === 'service')) {
        query = query.eq('item_type', type);
      }

      if (search && typeof search === 'string') {
        query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%`);
      }

      query = query.order('name', { ascending: true });

      const { data: items, error } = await query;

      if (error) {
        console.error('Error fetching products/services:', error);
        throw error;
      }

      res.json(items || []);
    } catch (error) {
      console.error('Error in getAll products/services:', error);
      res.status(500).json({ error: 'Erro ao buscar produtos/serviços' });
    }
  }

  /**
   * GET /api/products-services/:id?companyId=xxx
   * Obtém um produto/serviço específico
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

      const { data: item, error } = await supabaseClient
        .from('products_services')
        .select(`
          *,
          product_categories (
            id,
            name,
            color
          )
        `)
        .eq('id', id)
        .eq('company_id', companyId)
        .is('deleted_at', null)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'Produto/serviço não encontrado' });
        }
        console.error('Error fetching product/service:', error);
        throw error;
      }

      res.json(item);
    } catch (error) {
      console.error('Error in getById product/service:', error);
      res.status(500).json({ error: 'Erro ao buscar produto/serviço' });
    }
  }

  /**
   * GET /api/products-services/low-stock?companyId=xxx
   * Lista produtos com estoque baixo
   */
  async getLowStock(req: Request, res: Response): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const { companyId } = req.query;

      if (!companyId || typeof companyId !== 'string') {
        return res.status(400).json({ error: 'companyId é obrigatório' });
      }

      const supabaseClient = getSupabaseClient(authReq.accessToken!);

      const { data: items, error } = await supabaseClient
        .from('vw_low_stock_products')
        .select('*')
        .eq('company_id', companyId);

      if (error) {
        console.error('Error fetching low stock products:', error);
        throw error;
      }

      res.json(items || []);
    } catch (error) {
      console.error('Error in getLowStock:', error);
      res.status(500).json({ error: 'Erro ao buscar produtos com estoque baixo' });
    }
  }

  /**
   * POST /api/products-services
   * Cria um novo produto/serviço
   */
  async create(req: Request, res: Response): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const itemData = req.body as CreateProductServiceRequest;

      if (!itemData.companyId || !itemData.name || !itemData.itemType || itemData.salePrice === undefined) {
        return res.status(400).json({
          error: 'companyId, name, itemType e salePrice são obrigatórios',
        });
      }

      const supabaseClient = getSupabaseClient(authReq.accessToken!);

      const { data: item, error } = await supabaseClient
        .from('products_services')
        .insert({
          company_id: itemData.companyId,
          category_id: itemData.categoryId,
          sku: itemData.sku,
          barcode: itemData.barcode,
          name: itemData.name,
          description: itemData.description,
          item_type: itemData.itemType,
          cost_price: itemData.costPrice,
          sale_price: itemData.salePrice,
          track_inventory: itemData.trackInventory || false,
          current_stock: itemData.currentStock || 0,
          min_stock: itemData.minStock || 0,
          stock_unit: itemData.stockUnit || 'un',
          tax_percentage: itemData.taxPercentage || 0,
          commission_percentage: itemData.commissionPercentage || 0,
          images: itemData.images || [],
          metadata: itemData.metadata || {},
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating product/service:', error);
        if (error.code === '23505') {
          return res.status(409).json({
            error: 'Já existe um produto/serviço com esse SKU',
          });
        }
        throw error;
      }

      res.status(201).json(item);
    } catch (error) {
      console.error('Error in create product/service:', error);
      res.status(500).json({ error: 'Erro ao criar produto/serviço' });
    }
  }

  /**
   * PUT /api/products-services/:id
   * Atualiza um produto/serviço
   */
  async update(req: Request, res: Response): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const { id } = req.params;
      const { companyId } = req.query;
      const updateData = req.body as UpdateProductServiceRequest;

      if (!id) {
        return res.status(400).json({ error: 'ID é obrigatório' });
      }

      if (!companyId || typeof companyId !== 'string') {
        return res.status(400).json({ error: 'companyId é obrigatório' });
      }

      const supabaseClient = getSupabaseClient(authReq.accessToken!);

      const dataToUpdate: any = {};
      if (updateData.categoryId !== undefined) dataToUpdate.category_id = updateData.categoryId;
      if (updateData.sku !== undefined) dataToUpdate.sku = updateData.sku;
      if (updateData.barcode !== undefined) dataToUpdate.barcode = updateData.barcode;
      if (updateData.name !== undefined) dataToUpdate.name = updateData.name;
      if (updateData.description !== undefined) dataToUpdate.description = updateData.description;
      if (updateData.costPrice !== undefined) dataToUpdate.cost_price = updateData.costPrice;
      if (updateData.salePrice !== undefined) dataToUpdate.sale_price = updateData.salePrice;
      if (updateData.trackInventory !== undefined) dataToUpdate.track_inventory = updateData.trackInventory;
      if (updateData.currentStock !== undefined) dataToUpdate.current_stock = updateData.currentStock;
      if (updateData.minStock !== undefined) dataToUpdate.min_stock = updateData.minStock;
      if (updateData.stockUnit !== undefined) dataToUpdate.stock_unit = updateData.stockUnit;
      if (updateData.taxPercentage !== undefined) dataToUpdate.tax_percentage = updateData.taxPercentage;
      if (updateData.commissionPercentage !== undefined) dataToUpdate.commission_percentage = updateData.commissionPercentage;
      if (updateData.images !== undefined) dataToUpdate.images = updateData.images;
      if (updateData.isActive !== undefined) dataToUpdate.is_active = updateData.isActive;
      if (updateData.metadata !== undefined) dataToUpdate.metadata = updateData.metadata;

      const { data: item, error } = await supabaseClient
        .from('products_services')
        .update(dataToUpdate)
        .eq('id', id)
        .eq('company_id', companyId)
        .is('deleted_at', null)
        .select()
        .single();

      if (error) {
        console.error('Error updating product/service:', error);
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'Produto/serviço não encontrado' });
        }
        if (error.code === '23505') {
          return res.status(409).json({
            error: 'Já existe um produto/serviço com esse SKU',
          });
        }
        throw error;
      }

      res.json(item);
    } catch (error) {
      console.error('Error in update product/service:', error);
      res.status(500).json({ error: 'Erro ao atualizar produto/serviço' });
    }
  }

  /**
   * DELETE /api/products-services/:id?companyId=xxx
   * Remove um produto/serviço (soft delete)
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
        .from('products_services')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .eq('company_id', companyId);

      if (error) {
        console.error('Error deleting product/service:', error);
        throw error;
      }

      res.status(204).send();
    } catch (error) {
      console.error('Error in delete product/service:', error);
      res.status(500).json({ error: 'Erro ao deletar produto/serviço' });
    }
  }

  /**
   * GET /api/products-services/search?companyId=xxx&q=nome
   * Busca rápida de produtos/serviços (otimizada para autocomplete/dropdowns)
   */
  async search(req: Request, res: Response): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const { companyId, q, type } = req.query;

      if (!companyId || typeof companyId !== 'string') {
        return res.status(400).json({ error: 'companyId é obrigatório' });
      }

      if (!q || typeof q !== 'string') {
        return res.status(400).json({ error: 'Parâmetro q (query) é obrigatório' });
      }

      const supabaseClient = getSupabaseClient(authReq.accessToken!);

      let query = supabaseClient
        .from('products_services')
        .select(`
          id,
          name,
          sku,
          item_type,
          sale_price,
          current_stock,
          track_inventory,
          stock_unit,
          product_categories (name, color)
        `)
        .eq('company_id', companyId)
        .eq('is_active', true)
        .is('deleted_at', null)
        .or(`name.ilike.%${q}%,sku.ilike.%${q}%,barcode.ilike.%${q}%`)
        .order('name', { ascending: true })
        .limit(20);

      if (type && (type === 'product' || type === 'service')) {
        query = query.eq('item_type', type);
      }

      const { data: items, error } = await query;

      if (error) {
        console.error('Error searching products/services:', error);
        throw error;
      }

      res.json(items || []);
    } catch (error) {
      console.error('Error in search products/services:', error);
      res.status(500).json({ error: 'Erro ao buscar produtos/serviços' });
    }
  }
}

export default new ProductsServicesController();
