/**
 * Response Formatting Middleware
 *
 * Standardizes API responses
 */

import type { Request, Response, NextFunction } from 'express';
import type { APIResponse, HATEOASLinks } from '../types';

/**
 * Helper to send a standardized success response
 */
export function sendSuccess<T>(
  req: Request,
  res: Response,
  data: T,
  options?: {
    statusCode?: number;
    links?: HATEOASLinks;
  }
) {
  const statusCode = options?.statusCode || 200;

  const response: APIResponse<T> = {
    success: true,
    data,
    metadata: {
      timestamp: new Date().toISOString(),
      version: req.context?.apiVersion || '1.0',
      requestId: req.context?.requestId || 'unknown',
      duration: req.context?.startTime ? Date.now() - req.context.startTime : 0,
      pagination: req.pagination,
    },
    links: options?.links,
  };

  res.status(statusCode).json(response);
}

/**
 * Helper to generate HATEOAS links
 */
export function generateHATEOASLinks(
  req: Request,
  options?: {
    nextCursor?: string;
    prevCursor?: string;
    resourceId?: string;
  }
): HATEOASLinks {
  const baseUrl = `${req.protocol}://${req.get('host')}${req.baseUrl}${req.path}`;

  const links: HATEOASLinks = {
    self: {
      href: baseUrl + (req.originalUrl.includes('?') ? req.originalUrl.split('?')[1] : ''),
      method: req.method,
    },
  };

  // Add pagination links
  if (req.pagination) {
    if ('offset' in req.pagination && typeof req.pagination.offset === 'number') {
      // Offset-based pagination
      const limit = req.pagination.limit;
      const offset = req.pagination.offset;

      if (offset > 0) {
        const prevOffset = Math.max(0, offset - limit);
        links.prev = {
          href: `${baseUrl}?limit=${limit}&offset=${prevOffset}`,
          method: 'GET',
        };
      }

      if (req.pagination.hasMore) {
        const nextOffset = offset + limit;
        links.next = {
          href: `${baseUrl}?limit=${limit}&offset=${nextOffset}`,
          method: 'GET',
        };
      }

      links.first = {
        href: `${baseUrl}?limit=${limit}&offset=0`,
        method: 'GET',
      };
    } else if (options?.nextCursor) {
      // Cursor-based pagination
      links.next = {
        href: `${baseUrl}?limit=${req.pagination.limit}&cursor=${options.nextCursor}`,
        method: 'GET',
      };
    }
  }

  // Add resource-specific links
  if (options?.resourceId) {
    links.item = {
      href: `${baseUrl}/${options.resourceId}`,
      method: 'GET',
    };
  }

  return links;
}

/**
 * Middleware to add response helpers
 */
export function responseMiddleware(req: Request, res: Response, next: NextFunction) {
  // Add success helper
  // Using type assertion to avoid namespace error if possible, or just attaching directly
  (res as any).success = function <T>(data: T, options?: any) {
    sendSuccess(req, res, data, options);
  };

  next();
}

// Extend Express Response type
/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace Express {
    interface Response {
      success<T>(data: T, options?: { statusCode?: number; links?: HATEOASLinks }): void;
    }
  }
}
/* eslint-enable @typescript-eslint/no-namespace */
