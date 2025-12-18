/**
 * @fileoverview Security Hardening Configuration
 *
 * Centralized security configuration for the IntelGraph platform.
 * Implements OWASP Top 10 protections and enterprise security standards.
 *
 * @module security/SecurityHardeningConfig
 */

import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';

/**
 * Security configuration interface
 */
export interface SecurityConfig {
  /** Enable strict security mode (recommended for production) */
  strictMode: boolean;
  /** Content Security Policy configuration */
  csp: {
    enabled: boolean;
    directives: Record<string, string[]>;
    reportUri?: string;
  };
  /** Rate limiting configuration */
  rateLimit: {
    windowMs: number;
    maxRequests: number;
    skipSuccessfulRequests: boolean;
  };
  /** CORS configuration */
  cors: {
    allowedOrigins: string[];
    allowCredentials: boolean;
    maxAge: number;
  };
  /** Session security */
  session: {
    secure: boolean;
    httpOnly: boolean;
    sameSite: 'strict' | 'lax' | 'none';
    maxAge: number;
  };
  /** Input validation settings */
  input: {
    maxBodySize: string;
    maxUrlLength: number;
    maxQueryParams: number;
    sanitizeInput: boolean;
  };
  /** Audit logging settings */
  audit: {
    enabled: boolean;
    logLevel: 'minimal' | 'standard' | 'detailed';
    sensitiveFields: string[];
  };
}

/**
 * Default security configuration
 */
export const defaultSecurityConfig: SecurityConfig = {
  strictMode: process.env.NODE_ENV === 'production',
  csp: {
    enabled: true,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: [],
    },
    reportUri: process.env.CSP_REPORT_URI,
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
    skipSuccessfulRequests: false,
  },
  cors: {
    allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(','),
    allowCredentials: true,
    maxAge: 86400, // 24 hours
  },
  session: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
  input: {
    maxBodySize: '10mb',
    maxUrlLength: 2048,
    maxQueryParams: 100,
    sanitizeInput: true,
  },
  audit: {
    enabled: true,
    logLevel: 'standard',
    sensitiveFields: ['password', 'token', 'secret', 'apiKey', 'authorization', 'cookie'],
  },
};

/**
 * Security Hardening Manager
 *
 * Provides centralized security controls and middleware for the application.
 */
export class SecurityHardeningManager {
  private config: SecurityConfig;
  private nonce: string = '';

  constructor(config: Partial<SecurityConfig> = {}) {
    this.config = { ...defaultSecurityConfig, ...config };
  }

  /**
   * Generate a cryptographic nonce for CSP
   */
  generateNonce(): string {
    this.nonce = crypto.randomBytes(16).toString('base64');
    return this.nonce;
  }

  /**
   * Get Helmet configuration with security headers
   */
  getHelmetConfig(): Parameters<typeof helmet>[0] {
    return {
      contentSecurityPolicy: this.config.csp.enabled
        ? {
            directives: {
              ...this.config.csp.directives,
              scriptSrc: [...(this.config.csp.directives.scriptSrc || []), `'nonce-${this.nonce}'`],
            },
            reportOnly: process.env.NODE_ENV !== 'production',
          }
        : false,
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: { policy: 'same-origin' as const },
      crossOriginResourcePolicy: { policy: 'same-origin' as const },
      dnsPrefetchControl: { allow: false },
      frameguard: { action: 'deny' as const },
      hidePoweredBy: true,
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
      ieNoOpen: true,
      noSniff: true,
      originAgentCluster: true,
      permittedCrossDomainPolicies: { permittedPolicies: 'none' as const },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' as const },
      xssFilter: true,
    };
  }

  /**
   * Get rate limiter middleware
   */
  getRateLimiter(customConfig?: Partial<SecurityConfig['rateLimit']>): ReturnType<typeof rateLimit> {
    const config = { ...this.config.rateLimit, ...customConfig };
    return rateLimit({
      windowMs: config.windowMs,
      max: config.maxRequests,
      skipSuccessfulRequests: config.skipSuccessfulRequests,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        error: 'Too many requests',
        retryAfter: Math.ceil(config.windowMs / 1000),
      },
      keyGenerator: (req: Request): string => {
        return req.ip || req.headers['x-forwarded-for']?.toString() || 'unknown';
      },
    });
  }

  /**
   * Input validation middleware
   */
  getInputValidationMiddleware(): (req: Request, res: Response, next: NextFunction) => void {
    return (req: Request, res: Response, next: NextFunction): void => {
      // Check URL length
      if (req.originalUrl.length > this.config.input.maxUrlLength) {
        res.status(414).json({ error: 'URI too long' });
        return;
      }

      // Check query params count
      const queryParamsCount = Object.keys(req.query).length;
      if (queryParamsCount > this.config.input.maxQueryParams) {
        res.status(400).json({ error: 'Too many query parameters' });
        return;
      }

      // Sanitize input if enabled
      if (this.config.input.sanitizeInput) {
        req.body = this.sanitizeObject(req.body);
        req.query = this.sanitizeObject(req.query);
        req.params = this.sanitizeObject(req.params);
      }

      next();
    };
  }

  /**
   * Security headers middleware (additional headers beyond Helmet)
   */
  getSecurityHeadersMiddleware(): (req: Request, res: Response, next: NextFunction) => void {
    return (req: Request, res: Response, next: NextFunction): void => {
      // Generate nonce for each request
      this.generateNonce();

      // Additional security headers
      res.setHeader('X-Request-Id', crypto.randomUUID());
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Surrogate-Control', 'no-store');

      // Clear sensitive headers
      res.removeHeader('X-Powered-By');
      res.removeHeader('Server');

      // Store nonce for use in templates
      res.locals.nonce = this.nonce;

      next();
    };
  }

  /**
   * Audit logging middleware
   */
  getAuditMiddleware(): (req: Request, res: Response, next: NextFunction) => void {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (!this.config.audit.enabled) {
        next();
        return;
      }

      const startTime = Date.now();
      const requestId = res.getHeader('X-Request-Id') || crypto.randomUUID();

      // Capture original end function
      const originalEnd = res.end;
      const self = this;

      res.end = function (this: Response, ...args: Parameters<Response['end']>): Response {
        const duration = Date.now() - startTime;
        const auditEntry = self.createAuditEntry(req, res, duration, requestId.toString());

        // Log audit entry (in production, send to audit service)
        if (process.env.NODE_ENV !== 'test') {
          console.log(JSON.stringify(auditEntry));
        }

        return originalEnd.apply(this, args);
      };

      next();
    };
  }

  /**
   * SQL injection prevention middleware
   */
  getSQLInjectionProtection(): (req: Request, res: Response, next: NextFunction) => void {
    const sqlPatterns = [
      /(\%27)|(\')|(\-\-)|(\%23)|(#)/i,
      /((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))/i,
      /\w*((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/i,
      /((\%27)|(\'))union/i,
      /exec(\s|\+)+(s|x)p\w+/i,
      /UNION(\s+)+(ALL(\s+)+)?SELECT/i,
      /INSERT(\s+)+INTO/i,
      /DELETE(\s+)+FROM/i,
      /DROP(\s+)+TABLE/i,
      /UPDATE(\s+)+\w+(\s+)+SET/i,
    ];

    return (req: Request, res: Response, next: NextFunction): void => {
      const checkValue = (value: unknown): boolean => {
        if (typeof value === 'string') {
          return sqlPatterns.some((pattern) => pattern.test(value));
        }
        if (typeof value === 'object' && value !== null) {
          return Object.values(value).some(checkValue);
        }
        return false;
      };

      const isSuspicious =
        checkValue(req.query) ||
        checkValue(req.body) ||
        checkValue(req.params);

      if (isSuspicious) {
        res.status(400).json({ error: 'Invalid request' });
        return;
      }

      next();
    };
  }

  /**
   * XSS protection middleware
   */
  getXSSProtection(): (req: Request, res: Response, next: NextFunction) => void {
    const xssPatterns = [
      /<script\b[^>]*>[\s\S]*?<\/script>/gi,
      /<script\b[^>]*>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe/gi,
      /<embed/gi,
      /<object/gi,
      /data:/gi,
      /vbscript:/gi,
    ];

    return (req: Request, res: Response, next: NextFunction): void => {
      const checkValue = (value: unknown): boolean => {
        if (typeof value === 'string') {
          return xssPatterns.some((pattern) => pattern.test(value));
        }
        if (typeof value === 'object' && value !== null) {
          return Object.values(value).some(checkValue);
        }
        return false;
      };

      const isSuspicious =
        checkValue(req.query) ||
        checkValue(req.body) ||
        checkValue(req.params);

      if (isSuspicious && this.config.strictMode) {
        res.status(400).json({ error: 'Invalid request content' });
        return;
      }

      next();
    };
  }

  /**
   * Path traversal protection middleware
   */
  getPathTraversalProtection(): (req: Request, res: Response, next: NextFunction) => void {
    const pathTraversalPatterns = [
      /\.\.\//g,
      /\.\.\\/g,
      /%2e%2e%2f/gi,
      /%2e%2e\//gi,
      /\.\.%2f/gi,
      /%2e%2e%5c/gi,
      /\.\.%5c/gi,
      /%252e%252e%252f/gi,
    ];

    return (req: Request, res: Response, next: NextFunction): void => {
      const checkPathTraversal = (value: string): boolean => {
        return pathTraversalPatterns.some((pattern) => pattern.test(value));
      };

      if (checkPathTraversal(req.path) || checkPathTraversal(req.originalUrl)) {
        res.status(400).json({ error: 'Invalid path' });
        return;
      }

      next();
    };
  }

  /**
   * Create audit log entry
   */
  private createAuditEntry(
    req: Request,
    res: Response,
    duration: number,
    requestId: string
  ): Record<string, unknown> {
    const sanitizedBody = this.redactSensitiveFields(req.body);
    const sanitizedHeaders = this.redactSensitiveFields(req.headers);

    return {
      timestamp: new Date().toISOString(),
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: (req as any).user?.id || 'anonymous',
      ...(this.config.audit.logLevel === 'detailed' && {
        body: sanitizedBody,
        query: req.query,
        headers: sanitizedHeaders,
      }),
    };
  }

  /**
   * Redact sensitive fields from object
   */
  private redactSensitiveFields(obj: unknown): unknown {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      if (this.config.audit.sensitiveFields.some((field) => lowerKey.includes(field.toLowerCase()))) {
        result[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        result[key] = this.redactSensitiveFields(value);
      } else {
        result[key] = value;
      }
    }
    return result;
  }

  /**
   * Sanitize object values (basic XSS prevention)
   */
  private sanitizeObject<T>(obj: T): T {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (typeof value === 'string') {
        result[key] = this.sanitizeString(value);
      } else if (typeof value === 'object' && value !== null) {
        result[key] = this.sanitizeObject(value);
      } else {
        result[key] = value;
      }
    }
    return result as T;
  }

  /**
   * Sanitize string (escape HTML entities)
   */
  private sanitizeString(str: string): string {
    const htmlEntities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;',
    };
    return str.replace(/[&<>"'/]/g, (char) => htmlEntities[char]);
  }

  /**
   * Get all security middleware as an array
   */
  getAllMiddleware(): Array<(req: Request, res: Response, next: NextFunction) => void> {
    return [
      helmet(this.getHelmetConfig()),
      this.getSecurityHeadersMiddleware(),
      this.getPathTraversalProtection(),
      this.getSQLInjectionProtection(),
      this.getXSSProtection(),
      this.getInputValidationMiddleware(),
      this.getRateLimiter(),
      this.getAuditMiddleware(),
    ];
  }
}

/**
 * Create and export default security manager instance
 */
export const securityManager = new SecurityHardeningManager();

export default SecurityHardeningManager;
