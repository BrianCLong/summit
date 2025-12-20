import type { Request, Response, NextFunction } from 'express';

export interface User {
  id: string;
  email: string;
  roles: string[];
  providerId?: string;
  tenantId: string;
}

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export async function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid authorization header' });
    return;
  }

  const token = authHeader.substring(7);

  try {
    // In production, verify JWT and extract user info
    // For now, decode mock token or integrate with existing auth service
    const user = await verifyToken(token);
    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

async function verifyToken(token: string): Promise<User> {
  // Integration point with existing auth service
  // In development, accept a simple JSON payload for testing

  if (process.env.NODE_ENV === 'development' && token.startsWith('dev:')) {
    try {
      const payload = JSON.parse(
        Buffer.from(token.substring(4), 'base64').toString()
      );
      return {
        id: payload.id || 'dev-user',
        email: payload.email || 'dev@example.com',
        roles: payload.roles || ['user'],
        providerId: payload.providerId,
        tenantId: payload.tenantId || 'default',
      };
    } catch {
      throw new Error('Invalid dev token');
    }
  }

  // Production: Integrate with OIDC/JWT verification
  // const decoded = jwt.verify(token, process.env.JWT_SECRET);
  // return await userService.findById(decoded.sub);

  throw new Error('Token verification not configured');
}

// Role-based access control middleware
export function requireRole(...roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const hasRole = roles.some((role) => req.user!.roles.includes(role));
    if (!hasRole) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
}

// Provider-only access
export function requireProvider(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.user?.providerId) {
    return res.status(403).json({ error: 'Must be a registered provider' });
  }
  next();
}
