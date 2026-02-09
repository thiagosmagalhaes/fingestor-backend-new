import { Request, Response } from 'express';
import { getSupabaseClient } from '../config/database';
import { AuthRequest } from '../middleware/auth';
import {
  CreateProductCategoryRequest,
  UpdateProductCategoryRequest,
} from '../types/products.types';

export class ProductCategoriesController {
  /**
   * GET /api/product-categories?companyId=xxx
   * Lista todas as categorias de produtos de uma empresa
   */
  async getAll(req: Request, res: Response): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const { companyId } = req.query;

      if (!companyId || typeof companyId !== 'string') {
        return res.status(400).json({ error: 'companyId é obrigatório' });
      }

      const supabaseClient = getSupabaseClient(authReq.accessToken!);

      const { data: categories, error } = await supabaseClient
        .from('product_categories')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching product categories:', error);
        throw error;
      }

      res.json(categories || []);
    } catch (error) {
      console.error('Error in getAll product categories:', error);
      res.status(500).json({ error: 'Erro ao buscar categorias de produtos' });
    }
  }

  /**
   * GET /api/product-categories/:id?companyId=xxx
   * Obtém uma categoria específica
   */
  async getById(req: Request, res: Response): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const { id } = req.params;
      const { companyId } = req.query;

      if (!id) {
        return res.status(400).json({ error: 'ID da categoria é obrigatório' });
      }

      if (!companyId || typeof companyId !== 'string') {
        return res.status(400).json({ error: 'companyId é obrigatório' });
      }

      const supabaseClient = getSupabaseClient(authReq.accessToken!);

      const { data: category, error } = await supabaseClient
        .from('product_categories')
        .select('*')
        .eq('id', id)
        .eq('company_id', companyId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'Categoria não encontrada' });
        }
        console.error('Error fetching product category:', error);
        throw error;
      }

      res.json(category);
    } catch (error) {
      console.error('Error in getById product category:', error);
      res.status(500).json({ error: 'Erro ao buscar categoria' });
    }
  }

  /**
   * POST /api/product-categories
   * Cria uma nova categoria de produto
   */
  async create(req: Request, res: Response): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const {
        companyId,
        name,
        description,
        color,
        parentId,
        categoryType,
      } = req.body as CreateProductCategoryRequest;

      if (!companyId || !name) {
        return res.status(400).json({
          error: 'companyId e name são obrigatórios',
        });
      }

      const supabaseClient = getSupabaseClient(authReq.accessToken!);

      const { data: category, error } = await supabaseClient
        .from('product_categories')
        .insert({
          company_id: companyId,
          name,
          description,
          color,
          parent_id: parentId,
          category_type: categoryType,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating product category:', error);
        if (error.code === '23505') {
          return res.status(409).json({
            error: 'Já existe uma categoria com esse nome',
          });
        }
        throw error;
      }

      res.status(201).json(category);
    } catch (error) {
      console.error('Error in create product category:', error);
      res.status(500).json({ error: 'Erro ao criar categoria' });
    }
  }

  /**
   * PUT /api/product-categories/:id
   * Atualiza uma categoria
   */
  async update(req: Request, res: Response): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const { id } = req.params;
      const { companyId } = req.query;
      const updateData = req.body as UpdateProductCategoryRequest;

      if (!id) {
        return res.status(400).json({ error: 'ID da categoria é obrigatório' });
      }

      if (!companyId || typeof companyId !== 'string') {
        return res.status(400).json({ error: 'companyId é obrigatório' });
      }

      const supabaseClient = getSupabaseClient(authReq.accessToken!);

      const dataToUpdate: any = {};
      if (updateData.name !== undefined) dataToUpdate.name = updateData.name;
      if (updateData.description !== undefined) dataToUpdate.description = updateData.description;
      if (updateData.color !== undefined) dataToUpdate.color = updateData.color;
      if (updateData.parentId !== undefined) dataToUpdate.parent_id = updateData.parentId;
      if (updateData.categoryType !== undefined) dataToUpdate.category_type = updateData.categoryType;
      if (updateData.isActive !== undefined) dataToUpdate.is_active = updateData.isActive;

      const { data: category, error } = await supabaseClient
        .from('product_categories')
        .update(dataToUpdate)
        .eq('id', id)
        .eq('company_id', companyId)
        .select()
        .single();

      if (error) {
        console.error('Error updating product category:', error);
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'Categoria não encontrada' });
        }
        if (error.code === '23505') {
          return res.status(409).json({
            error: 'Já existe uma categoria com esse nome',
          });
        }
        throw error;
      }

      res.json(category);
    } catch (error) {
      console.error('Error in update product category:', error);
      res.status(500).json({ error: 'Erro ao atualizar categoria' });
    }
  }

  /**
   * DELETE /api/product-categories/:id?companyId=xxx
   * Remove uma categoria (soft delete)
   */
  async delete(req: Request, res: Response): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const { id } = req.params;
      const { companyId } = req.query;

      if (!id) {
        return res.status(400).json({ error: 'ID da categoria é obrigatório' });
      }

      if (!companyId || typeof companyId !== 'string') {
        return res.status(400).json({ error: 'companyId é obrigatório' });
      }

      const supabaseClient = getSupabaseClient(authReq.accessToken!);

      const { error } = await supabaseClient
        .from('product_categories')
        .update({ is_active: false })
        .eq('id', id)
        .eq('company_id', companyId);

      if (error) {
        console.error('Error deleting product category:', error);
        throw error;
      }

      res.status(204).send();
    } catch (error) {
      console.error('Error in delete product category:', error);
      res.status(500).json({ error: 'Erro ao deletar categoria' });
    }
  }
}

export default new ProductCategoriesController();
