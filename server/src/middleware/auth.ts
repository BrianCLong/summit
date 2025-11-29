import { Request, Response, NextFunction } from 'express';
import AuthService from '../services/AuthService.js';

interface AuthenticatedRequest extends Request {
  user?: any;
}

const authService = new AuthService();

export async function ensureAuthenticated(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void | Response> {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ')
      ? auth.slice('Bearer '.length)
      : (req.headers['x-access-token'] as string) || null;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const user = await authService.verifyToken(token);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    req.user = user;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

export function requirePermission(permission: string) {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Response | void => {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    if (authService.hasPermission(user, permission)) {
      return next();
    } else {
      return res.status(403).json({ error: 'Forbidden' });
    }
  };
}

export function ensureRole(requiredRole: string | string[]) {
  const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Response | void => {
    const user = req.user;
    if (!user || !user.role) return res.status(401).json({ error: 'Unauthorized' });

    if (roles.includes(user.role)) {
      return next();
    } else {
      return res.status(403).json({ error: 'Forbidden: Insufficient role' });
    }
  };
}

// Export aliases for compatibility
export const authMiddleware = ensureAuthenticated;
export const auth = ensureAuthenticated;
