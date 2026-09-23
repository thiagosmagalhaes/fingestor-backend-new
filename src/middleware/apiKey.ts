import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { supabaseAdmin } from '../config/database';

export type ApiKeyPermission = 'read' | 'create' | 'update' | 'delete';
export interface ApiKeyRequest extends Request {
  apiKey?: { id: string; companyId: string; permissions: Record<ApiKeyPermission, boolean> };
}

export const apiKeyMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void | Response> => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'API key não fornecida' });
  const raw = auth.slice(7);
  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  const { data, error } = await supabaseAdmin.from('api_keys').select('id, company_id, permissions, revoked_at').eq('key_hash', hash).is('revoked_at', null).maybeSingle();
  if (error || !data) return res.status(401).json({ error: 'API key inválida ou revogada' });
  (req as ApiKeyRequest).apiKey = { id: data.id, companyId: data.company_id, permissions: data.permissions || {} };
  return next();
};

export const requireApiKeyPermission = (permission: ApiKeyPermission) => (req: Request, res: Response, next: NextFunction): void | Response => {
  const key = (req as ApiKeyRequest).apiKey;
  if (!key?.permissions?.[permission]) return res.status(403).json({ error: `A chave não possui a permissão ${permission}` });
  return next();
};
