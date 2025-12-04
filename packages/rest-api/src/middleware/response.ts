/**
 * Response Formatting Middleware
 *
 * Standardizes API responses
 */

import type { Request, Response, APIResponse, HATEOASLinks, Link } from '../types';

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
      requestId: req.context!.requestId,
      duration: Date.now() - req.context!.startTime,
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
  res.success = function <T>(data: T, options?: any) {
    sendSuccess(req, res, data, options);
  };

  next();
}

// Extend Express Response type
declare global {
  namespace Express {
    interface Response {
      success<T>(data: T, options?: { statusCode?: number; links?: HATEOASLinks }): void;
    }
  }
}
