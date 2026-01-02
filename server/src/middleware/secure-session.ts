import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import { VaultSecretProvider } from '../lib/secrets/providers/VaultSecretProvider.js';
import { cfg } from '../config.js';
import { logger } from '../config/logger.js';

const SESSION_COOKIE_NAME = 'ig.sid';
let cachedSecret: string | null = null;
let secretPromise: Promise<string> | null = null;

function getVaultProvider(): VaultSecretProvider | null {
  if (!cfg.VAULT_ADDR || !cfg.VAULT_TOKEN) {
    return null;
  }
  return new VaultSecretProvider(cfg.VAULT_ADDR, cfg.VAULT_TOKEN);
}

async function loadSessionSecret(): Promise<string> {
  if (cachedSecret) return cachedSecret;
  if (!secretPromise) {
    secretPromise = (async () => {
      const vaultProvider = getVaultProvider();
      try {
        if (vaultProvider) {
          const secretFromVault = await vaultProvider.getSecret('SESSION_SECRET');
          if (secretFromVault) {
            cachedSecret = secretFromVault;
            return secretFromVault;
          }
        }
      } catch (error: any) {
        logger.warn({ error }, 'Vault unavailable for session secret; falling back to env');
      }

      const fallback = process.env.SESSION_SECRET || (cfg.SESSION_SECRET as string);
      if (!fallback || fallback.length < 32) {
        const generated = crypto.randomBytes(48).toString('hex');
        cachedSecret = generated;
        logger.warn('Generated ephemeral session secret; set SESSION_SECRET or configure Vault for persistence.');
        return generated;
      }

      cachedSecret = fallback;
      return fallback;
    })();
  }
  return secretPromise!;
}

function signSession(sessionId: string, secret: string): string {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(sessionId);
  const signature = hmac.digest('hex');
  return `${sessionId}.${signature}`;
}

function validateSessionCookie(cookieValue: string, secret: string): string | null {
  const [sessionId, signature] = cookieValue.split('.');
  if (!sessionId || !signature) return null;
  const expected = signSession(sessionId, secret);
  const [, expectedSignature] = expected.split('.');
  const provided = Buffer.from(signature);
  const target = Buffer.from(expectedSignature);
  if (provided.length !== target.length) return null;
  const valid = crypto.timingSafeEqual(provided, target);
  return valid ? sessionId : null;
}

export async function secureSession(req: Request, res: Response, next: NextFunction) {
  try {
    const secret = await loadSessionSecret();
    const cookies = (req as any).cookies || {};
    const existing = cookies[SESSION_COOKIE_NAME];
    let sessionId = existing ? validateSessionCookie(existing, secret) : null;

    if (!sessionId) {
      sessionId = crypto.randomUUID();
      const signed = signSession(sessionId!, secret);
      res.cookie(SESSION_COOKIE_NAME, signed, {
        httpOnly: true,
        sameSite: 'strict',
        secure: cfg.NODE_ENV === 'production',
        maxAge: 60 * 60 * 1000,
        path: '/',
      });
    }

    (req as any).sessionId = sessionId;
    res.locals.sessionId = sessionId;
    next();
  } catch (error: any) {
    logger.error({ error }, 'Unable to establish secure session');
    res.status(500).json({ error: 'Secure session initialization failed' });
  }
}
