import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../logger';

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * JWT Authentication Middleware
 * Validates incoming Bearer tokens and populates req.user with verified identity.
 * Fail-closed: Rejects requests if JWT_SECRET is missing or token is invalid.
 */
export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'unauthenticated',
      message: 'Authentication required'
    });
  }

  const token = authHeader.split(' ')[1];

  if (!JWT_SECRET) {
    logger.error('CRITICAL: JWT_SECRET environment variable is missing');
    // Fail-closed in production, but provide feedback
    return res.status(500).json({
      error: 'internal_error',
      message: 'Security configuration mismatch'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    // Fail-closed: Ensure critical identity claims are present in the token
    if (!decoded.sub || !decoded.tenantId) {
      logger.warn('JWT missing required claims', {
        hasSub: !!decoded.sub,
        hasTenantId: !!decoded.tenantId
      });
      return res.status(401).json({
        error: 'invalid_token',
        message: 'Token missing required identity context'
      });
    }

    // Attach verified identity to the request object
    (req as any).user = {
      id: decoded.sub,
      tenantId: decoded.tenantId,
      roles: Array.isArray(decoded.roles) ? decoded.roles : [],
      clearance: decoded.clearance || 0,
    };

    next();
  } catch (err: any) {
    logger.warn('JWT verification failed', {
      message: err.message,
      name: err.name
    });
    return res.status(401).json({
      error: 'invalid_token',
      message: 'Token is invalid or expired'
    });
  }
};
