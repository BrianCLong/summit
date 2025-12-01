/**
 * Request Validation and Size Limit Middleware
 *
 * Provides comprehensive request validation including:
 * - Payload size limits
 * - Content-type validation
 * - Request rate limiting by size
 * - Suspicious pattern detection
 * - Request sanitization
 */

import { Request, Response, NextFunction } from 'express';
import { GraphQLError } from 'graphql';
import pino from 'pino';

const logger = pino();

interface RequestValidationOptions {
  maxBodySize?: number; // in bytes
  maxUrlLength?: number;
  maxHeaderSize?: number;
  allowedContentTypes?: string[];
  enableCompression?: boolean;
  blockSuspiciousPatterns?: boolean;
}

const defaultOptions: Required<RequestValidationOptions> = {
  maxBodySize: 10 * 1024 * 1024, // 10MB
  maxUrlLength: 2048,
  maxHeaderSize: 8192,
  allowedContentTypes: [
    'application/json',
    'application/graphql',
    'multipart/form-data',
    'application/x-www-form-urlencoded',
    'text/plain',
  ],
  enableCompression: true,
  blockSuspiciousPatterns: true,
};

/**
 * Create request validation middleware
 */
export function createRequestValidationMiddleware(
  options: RequestValidationOptions = {}
) {
  const config = { ...defaultOptions, ...options };

  return (req: Request, res: Response, next: NextFunction): void | Response => {
    try {
      // Validate URL length
      if (req.url.length > config.maxUrlLength) {
        logger.warn({
          message: 'Request URL exceeds maximum length',
          urlLength: req.url.length,
          maxLength: config.maxUrlLength,
          ip: req.ip,
        });
        return res.status(414).json({
          error: 'Request URL too long',
          maxLength: config.maxUrlLength,
        });
      }

      // Validate content type
      const contentType = req.headers['content-type'];
      if (
        req.method !== 'GET' &&
        req.method !== 'HEAD' &&
        contentType &&
        !config.allowedContentTypes.some((allowed) => contentType.includes(allowed))
      ) {
        logger.warn({
          message: 'Unsupported content type',
          contentType,
          ip: req.ip,
          path: req.path,
        });
        return res.status(415).json({
          error: 'Unsupported content type',
          allowed: config.allowedContentTypes,
        });
      }

      // Validate header size
      const headersSize = JSON.stringify(req.headers).length;
      if (headersSize > config.maxHeaderSize) {
        logger.warn({
          message: 'Request headers exceed maximum size',
          headerSize: headersSize,
          maxSize: config.maxHeaderSize,
          ip: req.ip,
        });
        return res.status(431).json({
          error: 'Request headers too large',
          maxSize: config.maxHeaderSize,
        });
      }

      // Check for suspicious patterns in URL
      if (config.blockSuspiciousPatterns) {
        const suspiciousPatterns = [
          /\.\.\//g, // Path traversal
          /<script/gi, // XSS attempt
          /javascript:/gi, // JS protocol
          /data:.*base64/gi, // Base64 data URIs
          /[<>]/g, // HTML tags
        ];

        for (const pattern of suspiciousPatterns) {
          if (pattern.test(req.url)) {
            logger.error({
              message: 'Suspicious pattern detected in URL',
              url: req.url,
              pattern: pattern.source,
              ip: req.ip,
            });
            return res.status(400).json({
              error: 'Invalid request format',
            });
          }
        }

        // Check query parameters
        for (const [key, value] of Object.entries(req.query)) {
          if (typeof value === 'string') {
            for (const pattern of suspiciousPatterns) {
              if (pattern.test(value)) {
                logger.error({
                  message: 'Suspicious pattern detected in query parameter',
                  param: key,
                  value,
                  ip: req.ip,
                });
                return res.status(400).json({
                  error: 'Invalid query parameter',
                });
              }
            }
          }
        }
      }

      // Track request size for rate limiting
      let requestSize = 0;
      req.on('data', (chunk) => {
        requestSize += chunk.length;

        // Check if size exceeds limit
        if (requestSize > config.maxBodySize) {
          logger.warn({
            message: 'Request body exceeds maximum size',
            size: requestSize,
            maxSize: config.maxBodySize,
            ip: req.ip,
            path: req.path,
          });

          // Destroy the request
          req.destroy();

          return res.status(413).json({
            error: 'Request body too large',
            maxSize: config.maxBodySize,
          });
        }
      });

      // Add size info to request object
      req.on('end', () => {
        (req as any).bodySize = requestSize;
      });

      next();
    } catch (error) {
      logger.error({ error, path: req.path, ip: req.ip }, 'Request validation error');
      return res.status(500).json({
        error: 'Internal server error during request validation',
      });
    }
  };
}

/**
 * Create JSON body size validator middleware
 */
export function createJsonBodySizeValidator(maxSize: number = 10 * 1024 * 1024) {
  return (req: Request, res: Response, next: NextFunction): void | Response => {
    if (req.body && typeof req.body === 'object') {
      const bodySize = JSON.stringify(req.body).length;

      if (bodySize > maxSize) {
        logger.warn({
          message: 'JSON body exceeds maximum size',
          size: bodySize,
          maxSize,
          ip: req.ip,
          path: req.path,
        });
        return res.status(413).json({
          error: 'Request body too large',
          maxSize,
        });
      }
    }

    next();
  };
}

/**
 * Validate multipart file uploads
 */
export function createFileUploadValidator(options: {
  maxFileSize?: number;
  maxFiles?: number;
  allowedMimeTypes?: string[];
}) {
  const config = {
    maxFileSize: options.maxFileSize || 10 * 1024 * 1024, // 10MB
    maxFiles: options.maxFiles || 10,
    allowedMimeTypes: options.allowedMimeTypes || [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'text/plain',
      'application/json',
    ],
  };

  return (req: Request, res: Response, next: NextFunction): void | Response => {
    // @ts-ignore - files may be added by multer or similar
    const files = req.files || [];
    const filesArray = Array.isArray(files) ? files : Object.values(files).flat();

    if (filesArray.length > config.maxFiles) {
      logger.warn({
        message: 'Too many files in upload',
        fileCount: filesArray.length,
        maxFiles: config.maxFiles,
        ip: req.ip,
      });
      return res.status(400).json({
        error: 'Too many files',
        maxFiles: config.maxFiles,
      });
    }

    for (const file of filesArray) {
      // Validate file size
      if (file.size > config.maxFileSize) {
        logger.warn({
          message: 'File exceeds maximum size',
          filename: file.originalname,
          size: file.size,
          maxSize: config.maxFileSize,
          ip: req.ip,
        });
        return res.status(413).json({
          error: 'File too large',
          filename: file.originalname,
          maxSize: config.maxFileSize,
        });
      }

      // Validate MIME type
      if (!config.allowedMimeTypes.includes(file.mimetype)) {
        logger.warn({
          message: 'Invalid file type',
          filename: file.originalname,
          mimetype: file.mimetype,
          ip: req.ip,
        });
        return res.status(415).json({
          error: 'Invalid file type',
          filename: file.originalname,
          allowedTypes: config.allowedMimeTypes,
        });
      }

      // Validate filename
      const suspiciousFilenamePatterns = [
        /\.\./g, // Path traversal
        /<|>/g, // HTML tags
        /[;\|&$]/g, // Shell characters
      ];

      for (const pattern of suspiciousFilenamePatterns) {
        if (pattern.test(file.originalname)) {
          logger.warn({
            message: 'Suspicious filename detected',
            filename: file.originalname,
            ip: req.ip,
          });
          return res.status(400).json({
            error: 'Invalid filename',
          });
        }
      }
    }

    next();
  };
}

/**
 * Rate limit by request size
 */
class SizeBasedRateLimiter {
  private sizes: Map<string, { total: number; timestamp: number }> = new Map();
  private readonly windowMs: number;
  private readonly maxBytes: number;

  constructor(windowMs: number = 60000, maxBytes: number = 100 * 1024 * 1024) {
    this.windowMs = windowMs;
    this.maxBytes = maxBytes;

    // Cleanup old entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  check(key: string, size: number): { allowed: boolean; retryAfter?: number } {
    const now = Date.now();
    const entry = this.sizes.get(key);

    // Clean up old entry
    if (entry && now - entry.timestamp > this.windowMs) {
      this.sizes.delete(key);
    }

    // Get current or create new entry
    const current = this.sizes.get(key) || { total: 0, timestamp: now };

    // Check if adding this request would exceed limit
    if (current.total + size > this.maxBytes) {
      const retryAfter = Math.ceil((this.windowMs - (now - current.timestamp)) / 1000);
      return { allowed: false, retryAfter };
    }

    // Update total
    current.total += size;
    current.timestamp = now;
    this.sizes.set(key, current);

    return { allowed: true };
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.sizes.entries()) {
      if (now - entry.timestamp > this.windowMs) {
        this.sizes.delete(key);
      }
    }
  }
}

// Global size-based rate limiter
const sizeRateLimiter = new SizeBasedRateLimiter();

/**
 * Create size-based rate limiting middleware
 */
export function createSizeBasedRateLimiter(options: {
  windowMs?: number;
  maxBytes?: number;
  keyGenerator?: (req: Request) => string;
}) {
  const config = {
    windowMs: options.windowMs || 60000,
    maxBytes: options.maxBytes || 100 * 1024 * 1024,
    keyGenerator: options.keyGenerator || ((req: Request) => req.ip || 'unknown'),
  };

  const limiter = new SizeBasedRateLimiter(config.windowMs, config.maxBytes);

  return (req: Request, res: Response, next: NextFunction): void | Response => {
    const key = config.keyGenerator(req);
    const size = (req as any).bodySize || 0;

    const result = limiter.check(key, size);

    if (!result.allowed) {
      logger.warn({
        message: 'Size-based rate limit exceeded',
        key,
        size,
        maxBytes: config.maxBytes,
      });

      res.set('Retry-After', String(result.retryAfter));
      return res.status(429).json({
        error: 'Too much data transferred',
        retryAfter: result.retryAfter,
      });
    }

    next();
  };
}
