// @ts-nocheck
import helmet from 'helmet';
// Removed csurf due to EOL. Apollo Server 5 provides built-in CSRF prevention for GraphQL.
// For REST routes, consider using a modern alternative if cookies are used for auth.
import cookieParser from 'cookie-parser';
import { Request, Response, NextFunction, RequestHandler } from 'express';
import { cfg } from '../config.js';
import { createRedisRateLimiter } from '../middleware/redisRateLimiter.js';

interface AuthenticatedUser {
  id?: string;
  sub?: string;
}

interface RequestWithUser extends Request {
  user?: AuthenticatedUser;
  csrfToken?: () => string;
}

export const cookieParserMiddleware = cookieParser();

export function buildContentSecurityPolicy(origins?: string): RequestHandler {
  const connectSources = Array.from(
    new Set([
      "'self'",
      ...(origins || cfg.CORS_ORIGIN)
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    ]),
  );

  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: connectSources,
        fontSrc: ["'self'", 'https:'],
        objectSrc: ["'none'"],
        frameSrc: ["'none'"],
        baseUri: ["'self'"],
      },
    },
    referrerPolicy: { policy: 'no-referrer' },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    crossOriginResourcePolicy: { policy: 'same-site' },
    frameguard: { action: 'deny' },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  });
}

/**
 * CSRF Layer (STUBBED out after removing EOL 'csurf' package)
 */
export function createCsrfLayer(skip?: (req: Request) => boolean): {
  middleware: RequestHandler;
  tokenRoute: RequestHandler;
} {
  // Simple pass-through middleware
  const middleware: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
    next();
  };

  // Return a generic token route that returns null
  const tokenRoute: RequestHandler = (req: Request, res: Response) => {
    res.status(200).json({ csrfToken: null });
  };

  return { middleware, tokenRoute };
}

export function createUserIpRateLimiter(): RequestHandler {
  return createRedisRateLimiter({
    windowMs: cfg.RATE_LIMIT_WINDOW_MS,
    max: (req) => {
      const reqWithUser = req as RequestWithUser;
      const user = reqWithUser.user;
      return user ? cfg.RATE_LIMIT_MAX_AUTHENTICATED : cfg.RATE_LIMIT_MAX_REQUESTS;
    },
    keyGenerator: (req) => {
      const reqWithUser = req as RequestWithUser;
      const user = reqWithUser.user;
      if (user?.id) return `user:${user.id}`;
      if (user?.sub) return `user:${user.sub}`;
      return `ip:${req.ip}`;
    },
    message: {
      error: 'Too many requests, please slow down',
    },
  });
}

export function shouldBypassCsrf(req: Request): boolean {
  return (
    req.headers.authorization !== undefined ||
    req.path.startsWith('/metrics') ||
    req.path.startsWith('/monitoring') ||
    req.path.startsWith('/health') ||
    req.path.startsWith('/healthz') ||
    req.path.startsWith('/api/webhooks') ||
    req.path.startsWith('/webhooks')
  );
}
