import helmet from 'helmet';
import csurf from 'csurf';
import cookieParser from 'cookie-parser';
import { Request, Response, NextFunction, RequestHandler } from 'express';
import { cfg } from '../config.js';
import { createRedisRateLimiter } from '../middleware/redisRateLimiter.js';

export const cookieParserMiddleware = cookieParser();

export function buildContentSecurityPolicy(): RequestHandler {
  const connectSources = Array.from(
    new Set([
      "'self'",
      ...cfg.CORS_ORIGIN.split(',')
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

export function createCsrfLayer(skip?: (req: Request) => boolean): {
  middleware: RequestHandler;
  tokenRoute: RequestHandler;
} {
  const csrfProtection = csurf({
    cookie: {
      httpOnly: true,
      sameSite: 'strict',
      secure: cfg.NODE_ENV === 'production',
      maxAge: 60 * 60 * 1000,
    },
    ignoreMethods: ['GET', 'HEAD', 'OPTIONS'],
    value: (req) =>
      (req.headers['x-csrf-token'] as string) ||
      (req.body && (req.body._csrf as string)) ||
      (req.query && (req.query._csrf as string)) ||
      '',
  });

  const middleware: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
    if (skip?.(req)) return next();
    if (!req.headers.cookie) return next();
    return csrfProtection(req, res, next);
  };

  const tokenRoute: RequestHandler = (req: Request, res: Response) => {
    csrfProtection(req, res, () => {
      res.status(200).json({ csrfToken: (req as any).csrfToken?.() });
    });
  };

  return { middleware, tokenRoute };
}

export function createUserIpRateLimiter(): RequestHandler {
  return createRedisRateLimiter({
    windowMs: cfg.RATE_LIMIT_WINDOW_MS,
    max: (req) => {
      // @ts-ignore
      const user = req.user;
      return user ? cfg.RATE_LIMIT_MAX_AUTHENTICATED : cfg.RATE_LIMIT_MAX_REQUESTS;
    },
    keyGenerator: (req) => {
      // @ts-ignore
      const user = req.user;
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
