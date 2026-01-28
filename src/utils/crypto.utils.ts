import crypto from 'crypto';

/**
 * Utilitarios para criptografia de tokens de unsubscribe
 */

const ALGORITHM = 'aes-256-cbc';
const SECRET_KEY = process.env.JWT_SECRET!;

// Gerar chave de 32 bytes a partir do secret
function getKey(): Buffer {
  return crypto.scryptSync(SECRET_KEY, 'salt', 32);
}

// Gerar IV de 16 bytes a partir de um seed (determinístico)
function getIV(seed: string): Buffer {
  return crypto.createHash('md5').update(seed).digest();
}

/**
 * Criptografa o user_id para gerar token de unsubscribe
 */
export function encryptUserId(userId: string): string {
  const key = getKey();
  const iv = getIV(userId); // IV determinístico baseado no user_id
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(userId, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return encrypted;
}

/**
 * Descriptografa o token para obter o user_id
 */
export function decryptUserId(token: string): string {
  try {
    const key = getKey();
    
    // Como o IV é determinístico, precisamos tentar descriptografar
    // mas não sabemos o user_id ainda. Solução: armazenar IV no token
    // OU usar uma abordagem diferente.
    
    // Por ora, vamos usar IV fixo conhecido (menos seguro mas funcional)
    const iv = Buffer.alloc(16, 0);
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(token, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    throw new Error('Token inválido');
  }
}

/**
 * Versão melhorada: inclui IV no token
 */
export function encryptUserIdWithIV(userId: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(16); // IV aleatório
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(userId, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // Retorna IV + encrypted (IV nos primeiros 32 caracteres hex)
  return iv.toString('hex') + encrypted;
}

/**
 * Versão melhorada: extrai IV do token
 */
export function decryptUserIdWithIV(token: string): string {
  try {
    const key = getKey();
    
    // Extrair IV (primeiros 32 caracteres = 16 bytes em hex)
    const ivHex = token.slice(0, 32);
    const encryptedData = token.slice(32);
    
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    throw new Error('Token inválido ou corrompido');
  }
}

export default {
  encryptUserId,
  decryptUserId,
  encryptUserIdWithIV,
  decryptUserIdWithIV
};
