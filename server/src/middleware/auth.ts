import { Request, Response, NextFunction } from 'express';
import AuthService from '../services/AuthService.js';
import logger from '../utils/logger.js';
import { federatedUserFromSaml } from '../security/federated-identity.js';

interface AuthenticatedRequest extends Request {
  user?: any;
}

type ApiKey = { key: string; scope: "admin"|"read"|"write"; expiresAt: number };
const parseApiKeys = (): ApiKey[] => {
  const raw = process.env.API_KEYS || process.env.API_KEY || "";
  // Format: key:scope:ttlHours[,key:scope:ttlHours...]
  return raw.split(",").filter(Boolean).map(s => {
    const [key, scope="read", ttl="24"] = s.split(":");
    return { key, scope: scope as any, expiresAt: Date.now() + parseInt(ttl,10)*3600*1000 };
  });
};
const API_KEYS_CACHE = parseApiKeys();

let authService: AuthService | null = null;

function getAuthService(): AuthService {
  if (!authService) {
    authService = new AuthService();
  }
  return authService;
}

export async function ensureAuthenticated(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void | Response> {
  try {
    // Optional API key stop-gap (guarded by ENABLE_API_KEYS)
    const apiKeyHeader = (req.headers["x-api-key"] as string) || "";
    if (process.env.ENABLE_API_KEYS === "1" && apiKeyHeader) {
      const k = apiKeyHeader;
      const hit = API_KEYS_CACHE.find(x => x.key === k && Date.now() < x.expiresAt);
      if (hit) {
        const scopeRole = hit.scope === "admin" ? 'ADMIN' : hit.scope.toUpperCase();
        req.user = {
          id: 'api-key',
          role: scopeRole,
          roles: [scopeRole],
          identityProvider: 'api-key',
          federated: false,
        };
        res.setHeader("X-Auth-Method", "api-key"); // auditable
        return next();
      }
    }

    const samlAssertionHeader =
      (req.headers['x-saml-assertion'] as string) ||
      (req.headers.authorization?.startsWith('SAML ')
        ? req.headers.authorization.slice('SAML '.length)
        : '');

    const samlEnabled = (process.env.SAML_ENABLED || '').toLowerCase() === 'true';

    if (samlAssertionHeader && samlEnabled) {
      try {
        const federatedUser = federatedUserFromSaml(samlAssertionHeader);
        req.user = {
          ...federatedUser,
          role: federatedUser.role,
          roles: federatedUser.roles,
        };
        res.setHeader('X-Auth-Method', 'saml');
        return next();
      } catch (err) {
        logger.warn(
          {
            message: (err as Error).message,
            component: 'auth-middleware',
            reason: 'saml-assertion-invalid',
          },
          'Rejected federated identity assertion',
        );
        return res.status(401).json({ error: 'Unauthorized' });
      }
    } else if (samlAssertionHeader && !samlEnabled) {
      logger.warn(
        { component: 'auth-middleware', reason: 'saml-disabled' },
        'Received SAML assertion while federation disabled',
      );
    }

    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ')
      ? auth.slice('Bearer '.length)
      : (req.headers['x-access-token'] as string) || null;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const user = await getAuthService().verifyToken(token);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    req.user = {
      ...user,
      roles: user.roles || (user.role ? [user.role] : []),
      identityProvider: user.identityProvider || 'oidc',
    };
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

export function requirePermission(permission: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): Response | void => {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    if (getAuthService().hasPermission(user, permission)) {
      return next();
    } else {
      return res.status(403).json({ error: 'Forbidden' });
    }
  };
}
