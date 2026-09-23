import { Request, Response } from 'express';
import { supabaseAdmin } from '../config/database';
import { ApiKeyRequest } from '../middleware/apiKey';

const company = (req: Request) => (req as ApiKeyRequest).apiKey!.companyId;
const bodyToRow = (b: any, companyId: string) => ({ company_id: companyId, category_id: b.categoryId, type: b.type, description: String(b.description || '').trim(), amount: b.amount, date: b.date, status: b.status || 'pending', notes: b.notes || null });
export class IntegrationController {
  async categories(req: Request, res: Response) {
    const { data, error } = await supabaseAdmin.from('categories').select('id,name,type,color').eq('company_id', company(req)).order('name');
    if (error) return res.status(500).json({ error: 'Erro ao buscar categorias' }); return res.json(data || []);
  }
  async list(req: Request, res: Response) {
    let query = supabaseAdmin.from('transactions').select('*').eq('company_id', company(req)).order('date', { ascending: false });
    if (req.query.type) query = query.eq('type', req.query.type as string); if (req.query.from) query = query.gte('date', req.query.from as string); if (req.query.to) query = query.lte('date', req.query.to as string);
    const { data, error } = await query; if (error) return res.status(500).json({ error: 'Erro ao buscar lançamentos' }); return res.json(data || []);
  }
  async create(req: Request, res: Response) {
    const b = req.body || {}; const valid = ['income', 'expense', 'investment'];
    if (!b.categoryId || !b.type || !valid.includes(b.type) || !b.description || !(Number(b.amount) > 0) || !b.date || !['paid','pending','scheduled'].includes(b.status)) return res.status(400).json({ error: 'categoryId, type, description, amount, date e status válido são obrigatórios' });
    const { data: category } = await supabaseAdmin.from('categories').select('id').eq('id', b.categoryId).eq('company_id', company(req)).maybeSingle(); if (!category) return res.status(400).json({ error: 'Categoria não pertence à empresa da chave' });
    const { data, error } = await supabaseAdmin.from('transactions').insert(bodyToRow(b, company(req))).select('*').single(); if (error) return res.status(400).json({ error: error.message }); return res.status(201).json(data);
  }
  async update(req: Request, res: Response) {
    const b = req.body || {}; const updates: any = {}; for (const [k, v] of Object.entries({ category_id: b.categoryId, type: b.type, description: b.description, amount: b.amount, date: b.date, status: b.status, notes: b.notes })) if (v !== undefined) updates[k] = v;
    if (updates.category_id) { const { data } = await supabaseAdmin.from('categories').select('id').eq('id', updates.category_id).eq('company_id', company(req)).maybeSingle(); if (!data) return res.status(400).json({ error: 'Categoria inválida' }); }
    if (updates.type && !['income','expense','investment'].includes(updates.type)) return res.status(400).json({ error: 'Tipo inválido' });
    if (updates.status && !['paid','pending','scheduled'].includes(updates.status)) return res.status(400).json({ error: 'Status inválido' });
    if (updates.amount !== undefined && !(Number(updates.amount) > 0)) return res.status(400).json({ error: 'Valor inválido' });
    const { data, error } = await supabaseAdmin.from('transactions').update(updates).eq('id', req.params.id).eq('company_id', company(req)).select('*').maybeSingle(); if (error) return res.status(400).json({ error: error.message }); if (!data) return res.status(404).json({ error: 'Lançamento não encontrado' }); return res.json(data);
  }
  async remove(req: Request, res: Response) { const { data, error } = await supabaseAdmin.from('transactions').delete().eq('id', req.params.id).eq('company_id', company(req)).select('id').maybeSingle(); if (error) return res.status(500).json({ error: error.message }); if (!data) return res.status(404).json({ error: 'Lançamento não encontrado' }); return res.status(204).send(); }
}
export default new IntegrationController();
