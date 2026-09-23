import { Request, Response } from 'express';
import crypto from 'crypto';
import { supabaseAdmin, getSupabaseClient } from '../config/database';
import { AuthRequest } from '../middleware/auth';

const allowed = ['read', 'create', 'update', 'delete'] as const;
export class ApiKeysController {
  async list(req: Request, res: Response) {
    const auth = req as AuthRequest; const companyId = req.params.companyId;
    const { data, error } = await getSupabaseClient(auth.accessToken!).from('api_keys').select('id,name,key_prefix,permissions,created_at,revoked_at').eq('company_id', companyId).order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: 'Erro ao listar chaves' });
    return res.json(data || []);
  }
  async create(req: Request, res: Response) {
    const auth = req as AuthRequest; const { companyId } = req.params; const { name, permissions } = req.body || {};
    if (!name?.trim()) return res.status(400).json({ error: 'Nome da chave é obrigatório' });
    const client = getSupabaseClient(auth.accessToken!);
    const { data: company } = await client.from('companies').select('id').eq('id', companyId).maybeSingle();
    if (!company) return res.status(404).json({ error: 'Empresa não encontrada' });
    const raw = `fg_${crypto.randomBytes(32).toString('base64url')}`;
    const hash = crypto.createHash('sha256').update(raw).digest('hex');
    const normalized = Object.fromEntries(allowed.map(p => [p, permissions?.[p] === true]));
    const { data, error } = await supabaseAdmin.from('api_keys').insert({ company_id: companyId, name: name.trim(), key_prefix: raw.slice(0, 11), key_hash: hash, permissions: normalized, created_by: auth.user!.id }).select('id,name,key_prefix,permissions,created_at').single();
    if (error) return res.status(500).json({ error: 'Erro ao criar chave' });
    return res.status(201).json({ ...data, key: raw });
  }
  async revoke(req: Request, res: Response) {
    const auth = req as AuthRequest; const client = getSupabaseClient(auth.accessToken!);
    const { data, error } = await client.from('api_keys').update({ revoked_at: new Date().toISOString() }).eq('id', req.params.id).eq('company_id', req.params.companyId).is('revoked_at', null).select('id').maybeSingle();
    if (error) return res.status(500).json({ error: 'Erro ao revogar chave' });
    if (!data) return res.status(404).json({ error: 'Chave não encontrada' });
    return res.json({ success: true });
  }
}
export default new ApiKeysController();
