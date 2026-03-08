import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Use environment variable, do not hardcode a fallback secret
const JWT_SECRET = process.env.JWT_SECRET;

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
  if (!JWT_SECRET) {
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Authentication service is not configured correctly'
    });
  }

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
  if (!JWT_SECRET) {
    throw new Error('FATAL: JWT_SECRET environment variable is required to generate tokens');
  }
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
