/**
 * Enhanced Sanitization Middleware
 *
 * Uses comprehensive sanitization utilities to protect against:
 * - XSS attacks
 * - SQL/Cypher injection attempts
 * - Malicious payloads
 * - Excessive input sizes
 */

import type { Request, Response, NextFunction } from 'express';
import { SanitizationUtils } from '../validation/index.js';
import pino from 'pino';

const logger = pino();

/**
 * Legacy escape function for backwards compatibility
 */
function escape(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Enhanced sanitization with comprehensive security checks
 */
function sanitize(value: any): any {
  if (typeof value === 'string') {
    // Use enhanced sanitization utilities
    let sanitized = SanitizationUtils.sanitizeHTML(value);
    sanitized = SanitizationUtils.removeDangerousContent(sanitized);
    return sanitized;
  }
  if (Array.isArray(value)) return value.map(sanitize);
  if (value && typeof value === 'object') {
    const result: Record<string, any> = {};
    for (const [key, val] of Object.entries(value)) {
      result[key] = sanitize(val);
    }
    return result;
  }
  return value;
}

/**
 * Default sanitization middleware (enhanced version)
 */
export default function sanitizeRequest(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  try {
    if (req.body) {
      req.body = SanitizationUtils.sanitizeUserInput(req.body);
    }
    if (req.query) {
      req.query = SanitizationUtils.sanitizeUserInput(req.query);
    }
    if (req.params) {
      const sanitizedParams: Record<string, string> = {};
      for (const [key, value] of Object.entries(req.params)) {
        if (typeof value === 'string') {
          sanitizedParams[key] = SanitizationUtils.sanitizeHTML(value);
        } else {
          sanitizedParams[key] = value;
        }
      }
      req.params = sanitizedParams;
    }

    next();
  } catch (error) {
    logger.error({ error, path: req.path }, 'Sanitization error');
    res.status(500).json({ error: 'Input sanitization failed' });
  }
}

/**
 * Strict sanitization mode - removes all potentially dangerous content
 */
export function strictSanitizeRequest(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  try {
    if (req.body && typeof req.body === 'object') {
      const sanitized: Record<string, any> = {};
      for (const [key, value] of Object.entries(req.body)) {
        if (typeof value === 'string') {
          sanitized[key] = SanitizationUtils.removeDangerousContent(
            SanitizationUtils.sanitizeHTML(value)
          );
        } else if (value && typeof value === 'object') {
          sanitized[key] = SanitizationUtils.sanitizeUserInput(value);
        } else {
          sanitized[key] = value;
        }
      }
      req.body = sanitized;
    }

    next();
  } catch (error) {
    logger.error({ error, path: req.path }, 'Strict sanitization error');
    res.status(400).json({ error: 'Input contains invalid content' });
  }
}
