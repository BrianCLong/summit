import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

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
