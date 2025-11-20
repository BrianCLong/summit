import { Request, Response, NextFunction, Express } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';
import crypto from 'crypto';
import { productionAuthMiddleware } from '../config/production-security.js';
import { validateApiKey } from './apiKey.js';
import { cfg } from '../config.js';
import pino from 'pino';

const logger = pino();

// Priority 2: Rate Limiting (Per User/IP)
// Uses user ID if authenticated, otherwise IP
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each User/IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Use user ID if available (from auth middleware), otherwise IP
    return (req as any).user?.id || (req as any).user?.sub || req.ip || 'unknown';
  },
  // Disable IPv6 validation warning as we rely on Express req.ip
  validate: {
      trustProxy: false,
      xForwardedForHeader: false,
      ip: false
  }
});

// Priority 4: Unified Auth Middleware (API Key OR JWT)
export const unifiedAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // 1. Check API Key first
  const apiKey = req.headers['x-api-key'];
  if (apiKey) {
     return validateApiKey(req, res, (err) => {
         if (err) return next(err);
         if ((req as any).user) {
             return next();
         }
         return res.status(401).json({ error: 'Invalid authentication state' });
     });
  }

  // 2. Check JWT (Fallback)
  if ((req as any).user) return next();

  return productionAuthMiddleware(req as any, res, next);
};

// Priority 5: Request Signing for Sensitive Operations
// Implements HMAC-SHA256 verification
export const verifyRequestSignature = (req: Request, res: Response, next: NextFunction) => {
  const sensitivePaths = ['/admin', '/transfer', '/keys'];

  // Only apply to sensitive paths
  if (sensitivePaths.some(path => req.path.includes(path))) {
      const signature = req.headers['x-signature'] as string;

      // NON-BREAKING: If no signature, just warn for now (until clients update)
      if (!signature) {
          logger.warn(`Security Warning: Missing signature for sensitive path: ${req.path} from ${req.ip}`);
          // In strict mode (future), we would return 403 here.
          return next();
      }

      // Verify signature
      try {
          const secret = process.env.API_SIGNATURE_SECRET || process.env.JWT_SECRET || 'default-secret';
          // We sign the request body (if JSON) or full URL?
          // Standard practice: Sign body + timestamp.
          // For this implementation, we assume body signing.

          const timestamp = req.headers['x-timestamp'] as string;
          if (!timestamp) {
              // Fail if signature present but timestamp missing (partial implementation attempt)
              return res.status(400).json({ error: 'Missing X-Timestamp header' });
          }

          // Prevent replay attacks (5 minute window)
          const now = Date.now();
          const reqTime = parseInt(timestamp, 10);
          if (isNaN(reqTime) || Math.abs(now - reqTime) > 5 * 60 * 1000) {
               return res.status(400).json({ error: 'Request timestamp expired' });
          }

          const payload = JSON.stringify(req.body || {}) + timestamp;
          const expectedSignature = crypto
              .createHmac('sha256', secret)
              .update(payload)
              .digest('hex');

          // Constant time comparison
          const signatureBuf = Buffer.from(signature);
          const expectedBuf = Buffer.from(expectedSignature);

          if (signatureBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(signatureBuf, expectedBuf)) {
              logger.warn(`Invalid signature for path: ${req.path}`);
              return res.status(403).json({ error: 'Invalid request signature' });
          }

      } catch (error) {
          logger.error('Error verifying signature', error);
          return res.status(500).json({ error: 'Signature verification failed' });
      }
  }
  next();
};

// Priority 7: API Versioning Strategy
export const apiVersionCheck = (req: Request, res: Response, next: NextFunction) => {
   res.setHeader('X-API-Version', '1.0');
   next();
};

export const securityChain = [
    apiVersionCheck,
    // Rate limiter handles per-user logic but depends on auth being run FIRST if we want User ID.
    // So we should probably run Auth first?
    // But Rate Limit usually comes first to prevent DDoS.
    // If we want per-user, we need Auth first.
    // Splitting: Global IP limit first. Then Auth. Then User limit.
    // For simplicity in this chain, we use IP (default fallback) if not auth'd.
    // If unifiedAuthMiddleware is run BEFORE this, we get user ID.
    // In app.ts, we apply unifiedAuthMiddleware to /api, and then apiRateLimiter to /api.
    // So Auth runs first?
    // app.use('/api', unifiedAuthMiddleware);
    // app.use('/api', apiRateLimiter);
    // Yes, middleware added earlier runs earlier.

    // apiRateLimiter is separate in app.ts
    verifyRequestSignature,
    // unifiedAuthMiddleware is separate in app.ts
];

export const configureSecurity = (app: Express) => {
  // 1. Helmet (Headers)
  app.use(helmet());

  // 2. CORS
  const allowedOrigins = cfg.CORS_ORIGIN.split(',').map(o => o.trim()).filter(Boolean);
  app.use(cors({
    origin: (origin, callback) => {
        if (!origin && process.env.NODE_ENV !== 'production') return callback(null, true);
        if (origin && allowedOrigins.includes(origin)) return callback(null, true);
        if (!origin) return callback(null, true); // Allow non-browser for now
        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true
  }));

  // 3. Global Rate Limit (IP based always)
  app.use(rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 1000,
      standardHeaders: true,
      legacyHeaders: false,
  }));
};
