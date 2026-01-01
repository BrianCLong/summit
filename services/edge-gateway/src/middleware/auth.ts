import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// SECURITY: Fail-closed JWT secret validation
const JWT_SECRET = (() => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    console.error('FATAL: JWT_SECRET environment variable is required but not set');
    console.error('Generate a secure secret: openssl rand -base64 32');
    process.exit(1);
  }

  if (secret.length < 32) {
    console.error(`FATAL: JWT_SECRET must be at least 32 characters (current: ${secret.length})`);
    process.exit(1);
  }

  const insecureValues = ['your-secret-key', 'secret', 'changeme', 'default', 'password'];
  if (insecureValues.some(v => secret.toLowerCase().includes(v))) {
    console.error(`FATAL: JWT_SECRET contains insecure value: "${secret}"`);
    console.error('Use a strong, unique secret generated via: openssl rand -base64 32');
    process.exit(1);
  }

  return secret;
})();

export interface AuthRequest extends Request {
  user?: {
    id: string;
    nodeId?: string;
    role: 'admin' | 'node' | 'user';
  };
}

/**
 * Authentication middleware
 */
export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'No authorization header provided'
    });
  }

  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid authorization header format'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string;
      nodeId?: string;
      role: 'admin' | 'node' | 'user';
    };

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired token'
    });
  }
}

/**
 * Generate JWT token
 */
export function generateToken(payload: { id: string; nodeId?: string; role: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

/**
 * Role-based access control middleware
 */
export function requireRole(...roles: Array<'admin' | 'node' | 'user'>) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Insufficient permissions'
      });
    }

    next();
  };
}
