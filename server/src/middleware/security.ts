/**
 * Security middleware for IntelGraph API
 */
import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
import helmet from 'helmet';
import { Request, Response, NextFunction } from 'express';
import { trackError } from '../monitoring/middleware.js';
import logger from '../utils/logger.js';

interface RateLimiterOptions {
  windowMs?: number;
  max?: number;
  message?: string;
}

/**
 * General API rate limiter
 */
export const createRateLimiter = (
  windowMs: number = 15 * 60 * 1000,
  max: number = 100,
  message: string = 'Too many requests',
): RateLimitRequestHandler => {
  return rateLimit({
    windowMs,
    max,
    message: { error: message, retryAfter: Math.ceil(windowMs / 1000) },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      trackError('rate_limiting', 'RateLimitExceeded');
      logger.warn(
        `Rate limit exceeded. IP: ${req.ip}, User Agent: ${req.get('User-Agent')}, Path: ${req.path}, Method: ${req.method}`,
      );

      res.status(429).json({
        error: message,
        retryAfter: Math.ceil(windowMs / 1000),
        timestamp: new Date().toISOString(),
      });
    },
  });
};

/**
 * Strict rate limiter for sensitive endpoints
 */
export const strictRateLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  20, // 20 requests max
  'Too many requests to sensitive endpoint',
);

/**
 * Auth rate limiter for login attempts
 * OWASP Requirement: 5 requests per minute
 */
export const authRateLimiter = createRateLimiter(
  60 * 1000, // 1 minute
  5, // 5 attempts max per minute
  'Too many authentication attempts. Please try again later.',
);

/**
 * AI/ML processing rate limiter
 */
export const aiRateLimiter = createRateLimiter(
  60 * 1000, // 1 minute
  10, // 10 requests max
  'Too many AI processing requests',
);

/**
 * GraphQL rate limiter
 * OWASP Requirement: 100 requests per minute
 */
export const graphqlRateLimiter = createRateLimiter(
  60 * 1000, // 1 minute
  100, // 100 queries max per minute
  'Too many GraphQL requests. Please slow down.',
);

/**
 * REST API rate limiter
 * OWASP Requirement: 1000 requests per hour
 */
export const restApiRateLimiter = createRateLimiter(
  60 * 60 * 1000, // 1 hour
  1000, // 1000 requests max per hour
  'REST API rate limit exceeded. Please try again later.',
);

/**
 * Request size limiter middleware
 */
export const requestSizeLimiter = (maxSize: string | number = '10mb') => {
  return (req: Request, res: Response, next: NextFunction): Response | void => {
    const contentLength = parseInt(req.headers['content-length'] || '0');
    const maxBytes =
      typeof maxSize === 'string'
        ? parseInt(maxSize.replace(/\D/g, '')) *
          (maxSize.includes('mb') ? 1024 * 1024 : 1024)
        : maxSize;

    if (contentLength > maxBytes) {
      trackError('security', 'RequestTooLarge');
      logger.warn(
        `Request size exceeded limit. IP: ${req.ip}, Content Length: ${contentLength}, Max Bytes: ${maxBytes}, Path: ${req.path}`,
      );

      return res.status(413).json({
        error: 'Request entity too large',
        maxSize: maxSize,
        received: contentLength,
      });
    }

    next();
  };
};

/**
 * IP whitelist middleware for admin endpoints
 */
export const ipWhitelist = (allowedIPs: string[] = []) => {
  return (req: Request, res: Response, next: NextFunction): Response | void => {
    const clientIP = req.ip || req.connection?.remoteAddress;

    // Allow localhost in development
    const devIPs = ['127.0.0.1', '::1', '::ffff:127.0.0.1'];
    const allAllowedIPs = [...allowedIPs, ...devIPs];

    if (!allAllowedIPs.includes(clientIP)) {
      trackError('security', 'UnauthorizedIP');
      logger.warn(
        `Unauthorized IP access attempt. IP: ${clientIP}, Path: ${req.path}, User Agent: ${req.get('User-Agent')}`,
      );

      return res.status(403).json({
        error: 'Access denied',
        message: 'IP not authorized',
      });
    }

    next();
  };
};

interface APIKeyRequest extends Request {
  apiKey?: string;
}

/**
 * API key validation middleware
 */
export const apiKeyAuth = (
  req: APIKeyRequest,
  res: Response,
  next: NextFunction,
): Response | void => {
  const apiKey =
    (req.headers['x-api-key'] as string) || (req.query.api_key as string);
  const validKeys = process.env.VALID_API_KEYS?.split(',') || [];

  if (!apiKey) {
    trackError('security', 'MissingAPIKey');
    return res.status(401).json({
      error: 'API key required',
      message: 'Include X-API-Key header or api_key query parameter',
    });
  }

  if (!validKeys.includes(apiKey)) {
    trackError('security', 'InvalidAPIKey');
    logger.warn(
      `Invalid API key used. IP: ${req.ip}, Path: ${req.path}, Key Prefix: ${apiKey.substring(0, 8)}...`,
    );

    return res.status(401).json({
      error: 'Invalid API key',
    });
  }

  req.apiKey = apiKey;
  next();
};

/**
 * Request validation middleware
 */
export const validateRequest = (
  req: Request,
  res: Response,
  next: NextFunction,
): Response | void => {
  // Check for suspicious patterns
  const suspiciousPatterns = [
    /\.\.\//g, // Path traversal
    /<script/gi, // XSS
    /union.*select/gi, // SQL injection
    /javascript:/gi, // XSS
    /eval\(/gi, // Code injection
  ];

  const requestStr = JSON.stringify({
    url: req.url,
    query: req.query,
    body: req.body,
  });

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(requestStr)) {
      trackError('security', 'SuspiciousRequest');
      logger.warn(
        `Suspicious request pattern detected. IP: ${req.ip}, Path: ${req.path}, Pattern: ${pattern.toString()}, User Agent: ${req.get('User-Agent')}`,
      );

      return res.status(400).json({
        error: 'Invalid request format',
      });
    }
  }

  next();
};

/**
 * Security headers middleware
 */
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
});

type CorsCallback = (err: Error | null, allow?: boolean) => void;

/**
 * CORS configuration for specific origins
 */
export const corsConfig = {
  origin: (origin: string | undefined, callback: CorsCallback) => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:3000',
      'http://localhost:5173',
      'https://intelgraph.app',
    ];

    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      trackError('security', 'UnauthorizedOrigin');
      logger.warn(`Unauthorized CORS origin. Origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-API-Key',
    'X-Requested-With',
  ],
};

/**
 * Request logging middleware
 */
export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? 'warn' : 'info';

    logger[logLevel](
      `HTTP Request. Method: ${req.method}, URL: ${req.url}, Status Code: ${res.statusCode}, Duration: ${duration}, IP: ${req.ip}, User Agent: ${req.get('User-Agent')}, Content Length: ${res.get('Content-Length')}`,
    );
  });

  next();
};

interface ErrorWithStatus extends Error {
  status?: number;
}

/**
 * Error handling middleware
 */
export const errorHandler = (
  err: ErrorWithStatus,
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  trackError('middleware', err.name || 'UnknownError');

  logger.error(
    `Middleware error. Error: ${err.message}, Stack: ${err.stack}, URL: ${req.url}, Method: ${req.method}, IP: ${req.ip}`,
  );

  // Don't expose internal errors in production
  const isDev = process.env.NODE_ENV === 'development';

  res.status(err.status || 500).json({
    error: isDev ? err.message : 'Internal server error',
    ...(isDev && { stack: err.stack }),
  });
};
