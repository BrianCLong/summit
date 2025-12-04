/**
 * Enhanced Tenant Header Middleware
 * Validates and sanitizes tenant ID from request headers
 *
 * Security features:
 * - Pattern validation (alphanumeric, underscore, hyphen only)
 * - Length limits (1-100 characters)
 * - Injection prevention
 * - Audit logging for suspicious patterns
 */

import { Request, Response, NextFunction } from 'express';
import pino from 'pino';

const logger = pino({ name: 'tenantHeader' });

// Tenant ID validation pattern - alphanumeric with underscores and hyphens only
const TENANT_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;
const MAX_TENANT_ID_LENGTH = 100;
const MIN_TENANT_ID_LENGTH = 1;

// Suspicious patterns that should never appear in tenant IDs
const SUSPICIOUS_PATTERNS = [
  /[<>]/g, // HTML tags
  /javascript:/i, // JS protocol
  /\.\.\//g, // Path traversal
  /['";]/g, // SQL/injection characters
  /[\x00-\x1f]/g, // Control characters
  /\$/g, // Variable injection
  /%[0-9a-f]{2}/gi, // URL encoded characters (potential bypass)
];

interface TenantHeaderOptions {
  required?: boolean;
  logSuspicious?: boolean;
  allowedTenants?: string[]; // Optional allowlist
}

/**
 * Validate tenant ID format and content
 */
function validateTenantId(
  tenantId: string,
  options: TenantHeaderOptions = {},
): { valid: boolean; error?: string; suspicious?: boolean } {
  // Check length
  if (tenantId.length < MIN_TENANT_ID_LENGTH) {
    return { valid: false, error: 'Tenant ID too short' };
  }

  if (tenantId.length > MAX_TENANT_ID_LENGTH) {
    return { valid: false, error: 'Tenant ID too long' };
  }

  // Check for suspicious patterns first (security check)
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(tenantId)) {
      return {
        valid: false,
        error: 'Tenant ID contains invalid characters',
        suspicious: true,
      };
    }
  }

  // Check pattern
  if (!TENANT_ID_PATTERN.test(tenantId)) {
    return {
      valid: false,
      error: 'Tenant ID must contain only alphanumeric characters, underscores, and hyphens',
    };
  }

  // Check allowlist if provided
  if (options.allowedTenants && options.allowedTenants.length > 0) {
    if (!options.allowedTenants.includes(tenantId)) {
      return { valid: false, error: 'Tenant not in allowlist' };
    }
  }

  return { valid: true };
}

/**
 * Sanitize tenant ID by removing any potentially dangerous characters
 * This is a defense-in-depth measure after validation
 */
function sanitizeTenantId(tenantId: string): string {
  return tenantId
    .replace(/[^a-zA-Z0-9_-]/g, '') // Keep only allowed characters
    .slice(0, MAX_TENANT_ID_LENGTH); // Enforce length limit
}

export function tenantHeader(
  requiredOrOptions: boolean | TenantHeaderOptions = true,
) {
  // Handle both old (boolean) and new (object) signatures
  const options: TenantHeaderOptions =
    typeof requiredOrOptions === 'boolean'
      ? { required: requiredOrOptions }
      : requiredOrOptions;

  const { required = true, logSuspicious = true } = options;

  return function (req: Request, res: Response, next: NextFunction) {
    // Extract tenant ID from headers (support multiple header names)
    const rawTenantId =
      (req.headers['x-tenant-id'] as string) ||
      (req.headers['x-tenant'] as string) ||
      '';

    // If no tenant ID provided
    if (!rawTenantId) {
      (req as any).tenantId = null;

      if (required) {
        logger.warn(
          {
            path: req.path,
            method: req.method,
            ip: req.ip,
          },
          'Missing required tenant ID header',
        );
        return res.status(400).json({
          error: 'tenant_required',
          message: 'X-Tenant-ID header is required',
        });
      }

      return next();
    }

    // Validate tenant ID
    const validation = validateTenantId(rawTenantId, options);

    if (!validation.valid) {
      // Log suspicious activity
      if (validation.suspicious && logSuspicious) {
        logger.error(
          {
            rawTenantId: rawTenantId.slice(0, 50), // Truncate for safety
            path: req.path,
            method: req.method,
            ip: req.ip,
            userAgent: req.headers['user-agent'],
          },
          'Suspicious tenant ID detected - potential injection attempt',
        );
      } else {
        logger.warn(
          {
            path: req.path,
            method: req.method,
            ip: req.ip,
            error: validation.error,
          },
          'Invalid tenant ID format',
        );
      }

      return res.status(400).json({
        error: 'invalid_tenant_id',
        message: validation.error,
      });
    }

    // Sanitize as defense-in-depth (should be no-op after validation)
    const sanitizedTenantId = sanitizeTenantId(rawTenantId);

    // Set validated tenant ID on request
    (req as any).tenantId = sanitizedTenantId;

    // Add tenant ID to response headers for debugging/tracing
    res.setHeader('X-Tenant-ID', sanitizedTenantId);

    next();
  };
}

/**
 * Middleware to validate additional custom headers
 */
export function validateCustomHeaders(
  headerConfigs: Array<{
    name: string;
    required?: boolean;
    pattern?: RegExp;
    maxLength?: number;
  }>,
) {
  return function (req: Request, res: Response, next: NextFunction) {
    for (const config of headerConfigs) {
      const headerValue = req.headers[config.name.toLowerCase()] as string;

      // Check required
      if (config.required && !headerValue) {
        logger.warn(
          { header: config.name, path: req.path, ip: req.ip },
          'Missing required header',
        );
        return res.status(400).json({
          error: 'missing_header',
          header: config.name,
        });
      }

      if (headerValue) {
        // Check length
        if (config.maxLength && headerValue.length > config.maxLength) {
          logger.warn(
            { header: config.name, length: headerValue.length, ip: req.ip },
            'Header value too long',
          );
          return res.status(400).json({
            error: 'header_too_long',
            header: config.name,
            maxLength: config.maxLength,
          });
        }

        // Check pattern
        if (config.pattern && !config.pattern.test(headerValue)) {
          logger.warn(
            { header: config.name, path: req.path, ip: req.ip },
            'Invalid header format',
          );
          return res.status(400).json({
            error: 'invalid_header_format',
            header: config.name,
          });
        }

        // Check for suspicious content
        for (const pattern of SUSPICIOUS_PATTERNS) {
          if (pattern.test(headerValue)) {
            logger.error(
              {
                header: config.name,
                path: req.path,
                ip: req.ip,
                userAgent: req.headers['user-agent'],
              },
              'Suspicious header value detected',
            );
            return res.status(400).json({
              error: 'invalid_header_content',
              header: config.name,
            });
          }
        }
      }
    }

    next();
  };
}

// Pre-configured header validators for common headers
export const commonHeaderValidators = {
  auditToken: {
    name: 'X-Audit-Token',
    required: false,
    pattern: /^[a-zA-Z0-9_-]+$/,
    maxLength: 256,
  },
  correlationId: {
    name: 'X-Correlation-ID',
    required: false,
    pattern: /^[a-zA-Z0-9_-]+$/,
    maxLength: 128,
  },
  requestId: {
    name: 'X-Request-ID',
    required: false,
    pattern: /^[a-zA-Z0-9_-]+$/,
    maxLength: 128,
  },
  userId: {
    name: 'X-User-ID',
    required: false,
    pattern: /^[a-zA-Z0-9_-]+$/,
    maxLength: 128,
  },
};
