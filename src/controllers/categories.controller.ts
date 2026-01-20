import { Request, Response } from 'express';
import { getSupabaseClient } from '../config/database';
import { AuthRequest } from '../middleware/auth';

interface CreateCategoryRequest {
  companyId: string;
  name: string;
  type: 'income' | 'expense';
  color: string;
}

interface UpdateCategoryRequest {
  name?: string;
  type?: 'income' | 'expense';
  color?: string;
}

export class CategoriesController {
  /**
   * GET /api/categories?companyId=xxx
   * Lista todas as categorias de uma empresa
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
        .from('categories')
        .select('*')
        .eq('company_id', companyId)
        .order('type', { ascending: true })
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching categories:', error);
        throw error;
      }

      res.json(categories || []);
    } catch (error) {
      console.error('Error in getAll categories:', error);
      res.status(500).json({ error: 'Erro ao buscar categorias' });
    }
  }

  /**
   * GET /api/categories/:id?companyId=xxx
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
        .from('categories')
        .select('*')
        .eq('id', id)
        .eq('company_id', companyId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'Categoria não encontrada' });
        }
        console.error('Error fetching category:', error);
        throw error;
      }

      res.json(category);
    } catch (error) {
      console.error('Error in getById category:', error);
      res.status(500).json({ error: 'Erro ao buscar categoria' });
    }
  }

  /**
   * POST /api/categories
   * Cria uma nova categoria
   */
  async create(req: Request, res: Response): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const { companyId, name, type, color } = req.body as CreateCategoryRequest;

      // Validações
      if (!companyId) {
        return res.status(400).json({ error: 'companyId é obrigatório' });
      }

      if (!name || name.trim().length === 0) {
        return res.status(400).json({ error: 'Nome da categoria é obrigatório' });
      }

      if (name.trim().length < 2) {
        return res.status(400).json({ error: 'Nome da categoria deve ter pelo menos 2 caracteres' });
      }

      if (!type || (type !== 'income' && type !== 'expense')) {
        return res.status(400).json({ error: 'Tipo deve ser "income" ou "expense"' });
      }

      if (!color || !color.match(/^#[0-9A-Fa-f]{6}$/)) {
        return res.status(400).json({ error: 'Cor deve estar no formato hexadecimal (#RRGGBB)' });
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

      // Verificar se já existe categoria com o mesmo nome e tipo
      const { data: existingCategory } = await supabaseClient
        .from('categories')
        .select('id')
        .eq('company_id', companyId)
        .eq('name', name.trim())
        .eq('type', type)
        .single();

      if (existingCategory) {
        return res.status(409).json({ error: 'Já existe uma categoria com este nome e tipo' });
      }

      const { data: category, error } = await supabaseClient
        .from('categories')
        .insert({
          company_id: companyId,
          name: name.trim(),
          type,
          color: color.toUpperCase(),
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating category:', error);
        throw error;
      }

      res.status(201).json(category);
    } catch (error) {
      console.error('Error in create category:', error);
      res.status(500).json({ error: 'Erro ao criar categoria' });
    }
  }

  /**
   * PUT /api/categories/:id
   * Atualiza uma categoria existente
   */
  async update(req: Request, res: Response): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const { id } = req.params;
      const { name, type, color } = req.body as UpdateCategoryRequest;
      const { companyId } = req.query;

      if (!id) {
        return res.status(400).json({ error: 'ID da categoria é obrigatório' });
      }

      if (!companyId || typeof companyId !== 'string') {
        return res.status(400).json({ error: 'companyId é obrigatório' });
      }

      // Validações
      if (name !== undefined) {
        if (name.trim().length === 0) {
          return res.status(400).json({ error: 'Nome da categoria não pode ser vazio' });
        }
        if (name.trim().length < 2) {
          return res.status(400).json({ error: 'Nome da categoria deve ter pelo menos 2 caracteres' });
        }
      }

      if (type !== undefined && type !== 'income' && type !== 'expense') {
        return res.status(400).json({ error: 'Tipo deve ser "income" ou "expense"' });
      }

      if (color !== undefined && !color.match(/^#[0-9A-Fa-f]{6}$/)) {
        return res.status(400).json({ error: 'Cor deve estar no formato hexadecimal (#RRGGBB)' });
      }

      const supabaseClient = getSupabaseClient(authReq.accessToken!);

      // Preparar dados para atualização
      const updateData: any = {};

      if (name !== undefined) {
        updateData.name = name.trim();
      }

      if (type !== undefined) {
        updateData.type = type;
      }

      if (color !== undefined) {
        updateData.color = color.toUpperCase();
      }

      // Se não há nada para atualizar
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: 'Nenhum campo para atualizar' });
      }

      // Verificar se existe duplicata (se estiver alterando nome ou tipo)
      if (name !== undefined || type !== undefined) {
        const { data: existingCategory } = await supabaseClient
          .from('categories')
          .select('id, name, type')
          .eq('company_id', companyId)
          .eq('id', id)
          .single();

        if (existingCategory) {
          const checkName = name !== undefined ? name.trim() : existingCategory.name;
          const checkType = type !== undefined ? type : existingCategory.type;

          const { data: duplicate } = await supabaseClient
            .from('categories')
            .select('id')
            .eq('company_id', companyId)
            .eq('name', checkName)
            .eq('type', checkType)
            .neq('id', id)
            .single();

          if (duplicate) {
            return res.status(409).json({ error: 'Já existe uma categoria com este nome e tipo' });
          }
        }
      }

      const { data: category, error } = await supabaseClient
        .from('categories')
        .update(updateData)
        .eq('id', id)
        .eq('company_id', companyId)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'Categoria não encontrada ou você não tem permissão' });
        }
        console.error('Error updating category:', error);
        throw error;
      }

      res.json(category);
    } catch (error) {
      console.error('Error in update category:', error);
      res.status(500).json({ error: 'Erro ao atualizar categoria' });
    }
  }

  /**
   * DELETE /api/categories/:id?companyId=xxx
   * Deleta uma categoria
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
        .from('categories')
        .delete()
        .eq('id', id)
        .eq('company_id', companyId);

      if (error) {
        console.error('Error deleting category:', error);
        throw error;
      }

      res.json({ message: 'Categoria deletada com sucesso' });
    } catch (error) {
      console.error('Error in delete category:', error);
      res.status(500).json({ error: 'Erro ao deletar categoria' });
    }
  }
}

export default new CategoriesController();
