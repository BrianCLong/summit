import { Request } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../../config/environment.js';
import { logger } from '../observability/logger.js';

export interface AuthContext {
  user: {
    id: string;
    tenantId: string;
    scopes: string[];
  } | null;
}

export const createContext = async ({ req }: { req: Request }): Promise<AuthContext> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { user: null };
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, config.JWT_PUBLIC_KEY, {
      algorithms: [config.JWT_ALGORITHM as jwt.Algorithm],
      issuer: config.JWT_ISSUER,
      audience: config.JWT_AUDIENCE,
    }) as any;

    return {
      user: {
        id: decoded.sub || decoded.id,
        tenantId: decoded.tenantId,
        scopes: decoded.scopes || [],
      },
    };
  } catch (error) {
    logger.warn('GraphQL context authentication failed', { error: error.message });
    return { user: null };
  }
};
