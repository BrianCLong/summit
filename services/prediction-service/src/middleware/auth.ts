/**
 * Authentication Middleware
 */

import { type Request, type Response, type NextFunction } from 'express';

export interface AuthConfig {
  apiKeys: Set<string>;
  jwtSecret?: string;
  enabled: boolean;
}

const defaultConfig: AuthConfig = {
  apiKeys: new Set(process.env.API_KEYS?.split(',') || ['dev-api-key']),
  jwtSecret: process.env.JWT_SECRET,
  enabled: process.env.AUTH_ENABLED !== 'false',
};

/**
 * API Key authentication middleware
 */
export function apiKeyAuth(config: AuthConfig = defaultConfig) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!config.enabled) {
      next();
      return;
    }

    const apiKey = req.headers['x-api-key'] as string || req.query.api_key as string;

    if (!apiKey) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'API key required. Provide X-API-Key header or api_key query parameter.',
      });
      return;
    }

    if (!config.apiKeys.has(apiKey)) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Invalid API key.',
      });
      return;
    }

    next();
  };
}

/**
 * Rate limiting middleware
 */
export function rateLimiter(options: {
  windowMs: number;
  maxRequests: number;
} = { windowMs: 60000, maxRequests: 100 }) {
  const requests = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const clientId = req.ip || req.headers['x-forwarded-for'] as string || 'unknown';
    const now = Date.now();

    let clientData = requests.get(clientId);

    if (!clientData || now > clientData.resetTime) {
      clientData = { count: 0, resetTime: now + options.windowMs };
      requests.set(clientId, clientData);
    }

    clientData.count++;

    res.setHeader('X-RateLimit-Limit', options.maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, options.maxRequests - clientData.count));
    res.setHeader('X-RateLimit-Reset', clientData.resetTime);

    if (clientData.count > options.maxRequests) {
      res.status(429).json({
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Try again after ${new Date(clientData.resetTime).toISOString()}`,
        retryAfter: Math.ceil((clientData.resetTime - now) / 1000),
      });
      return;
    }

    next();
  };
}

/**
 * Request logging middleware
 */
export function requestLogger() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const startTime = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - startTime;
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration,
        userAgent: req.headers['user-agent'],
        ip: req.ip,
      }));
    });

    next();
  };
}
