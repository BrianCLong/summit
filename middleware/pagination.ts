/**
 * GraphQL Pagination Utilities
 *
 * Implements:
 * - Cursor-based pagination for GraphQL
 * - Default page size limit: 100 items
 * - Total count queries
 * - Offset-based pagination support
 */

import pino from 'pino';

const logger = pino();

/**
 * Default pagination limits
 */
export const PAGINATION_DEFAULTS = {
  DEFAULT_PAGE_SIZE: 100,
  MAX_PAGE_SIZE: 1000,
  MIN_PAGE_SIZE: 1,
} as const;

/**
 * Cursor-based pagination input
 */
export interface CursorPaginationInput {
  first?: number;
  after?: string;
  last?: number;
  before?: string;
}

/**
 * Offset-based pagination input
 */
export interface OffsetPaginationInput {
  limit?: number;
  offset?: number;
}

/**
 * Page info for cursor-based pagination
 */
export interface PageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor?: string;
  endCursor?: string;
  totalCount?: number;
}

/**
 * Edge structure for cursor-based pagination
 */
export interface Edge<T> {
  node: T;
  cursor: string;
}

/**
 * Connection structure for cursor-based pagination
 */
export interface Connection<T> {
  edges: Edge<T>[];
  pageInfo: PageInfo;
  totalCount?: number;
}

/**
 * Offset-based page result
 */
export interface PageResult<T> {
  items: T[];
  totalCount: number;
  hasMore: boolean;
  offset: number;
  limit: number;
}

/**
 * Encode cursor from object ID
 */
export function encodeCursor(id: string | number): string {
  return Buffer.from(`cursor:${id}`).toString('base64');
}

/**
 * Decode cursor to object ID
 */
export function decodeCursor(cursor: string): string {
  try {
    const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
    const [prefix, id] = decoded.split(':');

    if (prefix !== 'cursor') {
      throw new Error('Invalid cursor format');
    }

    return id;
  } catch (error) {
    logger.error('Failed to decode cursor:', error);
    throw new Error('Invalid cursor');
  }
}

/**
 * Validate and normalize pagination input
 */
export function validatePaginationInput(input: CursorPaginationInput): {
  limit: number;
  isForward: boolean;
  cursor?: string;
} {
  const { first, after, last, before } = input;

  // Validate conflicting arguments
  if (first && last) {
    throw new Error('Cannot use both "first" and "last" arguments');
  }

  if (after && before) {
    throw new Error('Cannot use both "after" and "before" arguments');
  }

  // Determine direction and limit
  const isForward = !last;
  let limit = first || last || PAGINATION_DEFAULTS.DEFAULT_PAGE_SIZE;

  // Enforce limits
  if (limit < PAGINATION_DEFAULTS.MIN_PAGE_SIZE) {
    limit = PAGINATION_DEFAULTS.MIN_PAGE_SIZE;
  }

  if (limit > PAGINATION_DEFAULTS.MAX_PAGE_SIZE) {
    limit = PAGINATION_DEFAULTS.MAX_PAGE_SIZE;
    logger.warn(`Pagination limit exceeded maximum, capping at ${PAGINATION_DEFAULTS.MAX_PAGE_SIZE}`);
  }

  // Get cursor if provided
  const cursor = after || before;

  return { limit, isForward, cursor };
}

/**
 * Create connection from array of items
 */
export function createConnection<T extends { id: string | number }>(
  items: T[],
  input: CursorPaginationInput,
  totalCount?: number,
): Connection<T> {
  const { limit, isForward } = validatePaginationInput(input);

  // Check if there are more items
  const hasMore = items.length > limit;
  const nodes = hasMore ? items.slice(0, limit) : items;

  // Create edges with cursors
  const edges: Edge<T>[] = nodes.map((node) => ({
    node,
    cursor: encodeCursor(node.id),
  }));

  // Determine page info
  const pageInfo: PageInfo = {
    hasNextPage: isForward ? hasMore : false,
    hasPreviousPage: !isForward ? hasMore : false,
    startCursor: edges.length > 0 ? edges[0].cursor : undefined,
    endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : undefined,
    totalCount,
  };

  return {
    edges,
    pageInfo,
    totalCount,
  };
}

/**
 * Create offset-based page result
 */
export function createPageResult<T>(
  items: T[],
  totalCount: number,
  input: OffsetPaginationInput,
): PageResult<T> {
  const limit = Math.min(
    input.limit || PAGINATION_DEFAULTS.DEFAULT_PAGE_SIZE,
    PAGINATION_DEFAULTS.MAX_PAGE_SIZE,
  );
  const offset = input.offset || 0;

  return {
    items,
    totalCount,
    hasMore: offset + items.length < totalCount,
    offset,
    limit,
  };
}

/**
 * PostgreSQL cursor pagination query builder
 */
export class PostgresCursorPagination {
  /**
   * Build WHERE clause for cursor-based pagination
   */
  static buildWhereClause(
    cursor: string | undefined,
    isForward: boolean,
    cursorColumn: string = 'id',
  ): { where: string; params: any[] } {
    if (!cursor) {
      return { where: '', params: [] };
    }

    try {
      const cursorValue = decodeCursor(cursor);
      const operator = isForward ? '>' : '<';
      return {
        where: `${cursorColumn} ${operator} $1`,
        params: [cursorValue],
      };
    } catch (error) {
      logger.error('Invalid cursor in pagination:', error);
      return { where: '', params: [] };
    }
  }

  /**
   * Build ORDER BY clause for cursor-based pagination
   */
  static buildOrderClause(
    isForward: boolean,
    orderColumn: string = 'id',
    direction: 'ASC' | 'DESC' = 'ASC',
  ): string {
    if (isForward) {
      return `ORDER BY ${orderColumn} ${direction}`;
    } else {
      // Reverse order for backward pagination
      const reverseDirection = direction === 'ASC' ? 'DESC' : 'ASC';
      return `ORDER BY ${orderColumn} ${reverseDirection}`;
    }
  }

  /**
   * Build LIMIT clause (fetch one extra to check for more pages)
   */
  static buildLimitClause(limit: number): string {
    return `LIMIT ${limit + 1}`;
  }
}

/**
 * Neo4j cursor pagination query builder
 */
export class Neo4jCursorPagination {
  /**
   * Build WHERE clause for cursor-based pagination
   */
  static buildWhereClause(
    cursor: string | undefined,
    isForward: boolean,
    cursorProperty: string = 'id',
  ): { where: string; params: any } {
    if (!cursor) {
      return { where: '', params: {} };
    }

    try {
      const cursorValue = decodeCursor(cursor);
      const operator = isForward ? '>' : '<';
      return {
        where: `n.${cursorProperty} ${operator} $cursorValue`,
        params: { cursorValue },
      };
    } catch (error) {
      logger.error('Invalid cursor in pagination:', error);
      return { where: '', params: {} };
    }
  }

  /**
   * Build ORDER BY clause for cursor-based pagination
   */
  static buildOrderClause(
    isForward: boolean,
    orderProperty: string = 'id',
  ): string {
    if (isForward) {
      return `ORDER BY n.${orderProperty} ASC`;
    } else {
      return `ORDER BY n.${orderProperty} DESC`;
    }
  }

  /**
   * Build LIMIT clause (fetch one extra to check for more pages)
   */
  static buildLimitClause(limit: number): string {
    return `LIMIT ${limit + 1}`;
  }
}

/**
 * Helper to get total count from database
 */
export async function getTotalCount(
  queryFn: () => Promise<number>,
  useCache: boolean = true,
): Promise<number> {
  try {
    return await queryFn();
  } catch (error) {
    logger.error('Failed to get total count:', error);
    return 0;
  }
}

/**
 * GraphQL pagination field resolvers
 */
export const paginationFieldResolvers = {
  /**
   * Resolve cursor from edge
   */
  cursor: (edge: Edge<any>) => edge.cursor,

  /**
   * Resolve node from edge
   */
  node: (edge: Edge<any>) => edge.node,

  /**
   * Resolve page info
   */
  pageInfo: (connection: Connection<any>) => connection.pageInfo,

  /**
   * Resolve total count
   */
  totalCount: (connection: Connection<any>) => connection.totalCount,
};

/**
 * Example usage in GraphQL resolver
 */
export const exampleResolver = {
  entities: async (
    parent: any,
    args: { first?: number; after?: string },
    context: any,
  ): Promise<Connection<any>> => {
    const { limit, isForward, cursor } = validatePaginationInput(args);

    // Build query with cursor
    const { where, params } = PostgresCursorPagination.buildWhereClause(
      cursor,
      isForward,
    );
    const orderBy = PostgresCursorPagination.buildOrderClause(isForward);
    const limitClause = PostgresCursorPagination.buildLimitClause(limit);

    // Execute query (example)
    // const items = await db.query(`SELECT * FROM entities WHERE ${where} ${orderBy} ${limitClause}`, params);
    const items: any[] = []; // Placeholder

    // Get total count (can be cached)
    // const totalCount = await getTotalCount(() => db.query('SELECT COUNT(*) FROM entities'));
    const totalCount = 0; // Placeholder

    return createConnection(items, args, totalCount);
  },
};

export default {
  encodeCursor,
  decodeCursor,
  validatePaginationInput,
  createConnection,
  createPageResult,
  getTotalCount,
  PostgresCursorPagination,
  Neo4jCursorPagination,
  paginationFieldResolvers,
  PAGINATION_DEFAULTS,
};
