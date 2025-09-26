import { Request, Response, NextFunction } from 'express';
import AuthService from '../services/AuthService.js';
import ApiKeyService from '../services/ApiKeyService.js';

interface AuthenticatedRequest extends Request {
  user?: any;
}

let authService: AuthService | null = null;
let apiKeyService: ApiKeyService | null = null;

function getAuthService(): AuthService {
  if (!authService) {
    authService = new AuthService();
  }
  return authService;
}

function getApiKeyService(): ApiKeyService {
  if (!apiKeyService) {
    apiKeyService = new ApiKeyService();
  }
  return apiKeyService;
}

export async function ensureAuthenticated(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void | Response> {
  try {
    const apiKeyHeader = (req.headers['x-api-key'] as string) || '';
    if (apiKeyHeader) {
      const apiKeyRecord = await getApiKeyService().validateKey(apiKeyHeader);
      if (!apiKeyRecord) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      req.user = {
        id: `api-key:${apiKeyRecord.id}`,
        role: apiKeyRecord.scope,
        tenantId: apiKeyRecord.tenantId ?? undefined,
        type: 'API_KEY',
        name: apiKeyRecord.name,
      };
      res.setHeader('X-Auth-Method', 'api-key');
      return next();
    }

    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ')
      ? auth.slice('Bearer '.length)
      : (req.headers['x-access-token'] as string) || null;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const user = await getAuthService().verifyToken(token);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    req.user = user;
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
