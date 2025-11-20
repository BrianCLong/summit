/**
 * Pagination Middleware
 *
 * Handles pagination parameters and metadata
 */

import type { Request, Response, NextFunction, PaginationOptions, PaginationMetadata } from '../types';

export function paginationMiddleware(options: PaginationOptions) {
  return (req: Request, res: Response, next: NextFunction) => {
    const { defaultLimit, maxLimit, strategy } = options;

    if (strategy === 'offset') {
      // Offset-based pagination
      const limit = Math.min(
        parseInt(req.query.limit as string) || defaultLimit,
        maxLimit
      );
      const offset = parseInt(req.query.offset as string) || 0;

      req.pagination = {
        limit,
        offset,
        count: 0,
        hasMore: false,
      };
    } else {
      // Cursor-based pagination
      const limit = Math.min(
        parseInt(req.query.limit as string) || defaultLimit,
        maxLimit
      );
      const cursor = req.query.cursor as string | undefined;

      req.pagination = {
        limit,
        cursor,
        count: 0,
        hasMore: false,
      };
    }

    next();
  };
}

export function addPaginationMetadata(
  req: Request,
  total: number,
  count: number,
  nextCursor?: string
): PaginationMetadata {
  const pagination = req.pagination!;

  if ('offset' in pagination && typeof pagination.offset === 'number') {
    // Offset-based
    const hasMore = pagination.offset + count < total;

    return {
      total,
      count,
      limit: pagination.limit,
      offset: pagination.offset,
      hasMore,
    };
  } else {
    // Cursor-based
    return {
      total,
      count,
      limit: pagination.limit,
      cursor: nextCursor,
      hasMore: !!nextCursor,
    };
  }
}
