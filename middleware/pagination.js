"use strict";
/**
 * GraphQL Pagination Utilities
 *
 * Implements:
 * - Cursor-based pagination for GraphQL
 * - Default page size limit: 100 items
 * - Total count queries
 * - Offset-based pagination support
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.exampleResolver = exports.paginationFieldResolvers = exports.Neo4jCursorPagination = exports.PostgresCursorPagination = exports.PAGINATION_DEFAULTS = void 0;
exports.encodeCursor = encodeCursor;
exports.decodeCursor = decodeCursor;
exports.validatePaginationInput = validatePaginationInput;
exports.createConnection = createConnection;
exports.createPageResult = createPageResult;
exports.getTotalCount = getTotalCount;
const pino_1 = __importDefault(require("pino"));
const logger = (0, pino_1.default)();
/**
 * Default pagination limits
 */
exports.PAGINATION_DEFAULTS = {
    DEFAULT_PAGE_SIZE: 100,
    MAX_PAGE_SIZE: 1000,
    MIN_PAGE_SIZE: 1,
};
/**
 * Encode cursor from object ID
 */
function encodeCursor(id) {
    return Buffer.from(`cursor:${id}`).toString('base64');
}
/**
 * Decode cursor to object ID
 */
function decodeCursor(cursor) {
    try {
        const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
        const [prefix, id] = decoded.split(':');
        if (prefix !== 'cursor') {
            throw new Error('Invalid cursor format');
        }
        return id;
    }
    catch (error) {
        logger.error('Failed to decode cursor:', error);
        throw new Error('Invalid cursor');
    }
}
/**
 * Validate and normalize pagination input
 */
function validatePaginationInput(input) {
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
    let limit = first || last || exports.PAGINATION_DEFAULTS.DEFAULT_PAGE_SIZE;
    // Enforce limits
    if (limit < exports.PAGINATION_DEFAULTS.MIN_PAGE_SIZE) {
        limit = exports.PAGINATION_DEFAULTS.MIN_PAGE_SIZE;
    }
    if (limit > exports.PAGINATION_DEFAULTS.MAX_PAGE_SIZE) {
        limit = exports.PAGINATION_DEFAULTS.MAX_PAGE_SIZE;
        logger.warn(`Pagination limit exceeded maximum, capping at ${exports.PAGINATION_DEFAULTS.MAX_PAGE_SIZE}`);
    }
    // Get cursor if provided
    const cursor = after || before;
    return { limit, isForward, cursor };
}
/**
 * Create connection from array of items
 */
function createConnection(items, input, totalCount) {
    const { limit, isForward } = validatePaginationInput(input);
    // Check if there are more items
    const hasMore = items.length > limit;
    const nodes = hasMore ? items.slice(0, limit) : items;
    // Create edges with cursors
    const edges = nodes.map((node) => ({
        node,
        cursor: encodeCursor(node.id),
    }));
    // Determine page info
    const pageInfo = {
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
function createPageResult(items, totalCount, input) {
    const limit = Math.min(input.limit || exports.PAGINATION_DEFAULTS.DEFAULT_PAGE_SIZE, exports.PAGINATION_DEFAULTS.MAX_PAGE_SIZE);
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
class PostgresCursorPagination {
    /**
     * Build WHERE clause for cursor-based pagination
     */
    static buildWhereClause(cursor, isForward, cursorColumn = 'id') {
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
        }
        catch (error) {
            logger.error('Invalid cursor in pagination:', error);
            return { where: '', params: [] };
        }
    }
    /**
     * Build ORDER BY clause for cursor-based pagination
     */
    static buildOrderClause(isForward, orderColumn = 'id', direction = 'ASC') {
        if (isForward) {
            return `ORDER BY ${orderColumn} ${direction}`;
        }
        else {
            // Reverse order for backward pagination
            const reverseDirection = direction === 'ASC' ? 'DESC' : 'ASC';
            return `ORDER BY ${orderColumn} ${reverseDirection}`;
        }
    }
    /**
     * Build LIMIT clause (fetch one extra to check for more pages)
     */
    static buildLimitClause(limit) {
        return `LIMIT ${limit + 1}`;
    }
}
exports.PostgresCursorPagination = PostgresCursorPagination;
/**
 * Neo4j cursor pagination query builder
 */
class Neo4jCursorPagination {
    /**
     * Build WHERE clause for cursor-based pagination
     */
    static buildWhereClause(cursor, isForward, cursorProperty = 'id') {
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
        }
        catch (error) {
            logger.error('Invalid cursor in pagination:', error);
            return { where: '', params: {} };
        }
    }
    /**
     * Build ORDER BY clause for cursor-based pagination
     */
    static buildOrderClause(isForward, orderProperty = 'id') {
        if (isForward) {
            return `ORDER BY n.${orderProperty} ASC`;
        }
        else {
            return `ORDER BY n.${orderProperty} DESC`;
        }
    }
    /**
     * Build LIMIT clause (fetch one extra to check for more pages)
     */
    static buildLimitClause(limit) {
        return `LIMIT ${limit + 1}`;
    }
}
exports.Neo4jCursorPagination = Neo4jCursorPagination;
/**
 * Helper to get total count from database
 */
async function getTotalCount(queryFn, _useCache = true) {
    try {
        return await queryFn();
    }
    catch (error) {
        logger.error('Failed to get total count:', error);
        return 0;
    }
}
/**
 * GraphQL pagination field resolvers
 */
exports.paginationFieldResolvers = {
    /**
     * Resolve cursor from edge
     */
    cursor: (edge) => edge.cursor,
    /**
     * Resolve node from edge
     */
    node: (edge) => edge.node,
    /**
     * Resolve page info
     */
    pageInfo: (connection) => connection.pageInfo,
    /**
     * Resolve total count
     */
    totalCount: (connection) => connection.totalCount,
};
/**
 * Example usage in GraphQL resolver
 */
exports.exampleResolver = {
    entities: (_parent, args, _context) => {
        const { limit, isForward, cursor } = validatePaginationInput(args);
        // Build query with cursor
        const { where: _where, params: _params } = PostgresCursorPagination.buildWhereClause(cursor, isForward);
        const _orderBy = PostgresCursorPagination.buildOrderClause(isForward);
        const _limitClause = PostgresCursorPagination.buildLimitClause(limit);
        // Execute query (example)
        // const items = await db.query(`SELECT * FROM entities WHERE ${where} ${orderBy} ${limitClause}`, params);
        const items = []; // Placeholder
        // Get total count (can be cached)
        // const totalCount = await getTotalCount(() => db.query('SELECT COUNT(*) FROM entities'));
        const totalCount = 0; // Placeholder
        return createConnection(items, args, totalCount);
    },
};
exports.default = {
    encodeCursor,
    decodeCursor,
    validatePaginationInput,
    createConnection,
    createPageResult,
    getTotalCount,
    PostgresCursorPagination,
    Neo4jCursorPagination,
    paginationFieldResolvers: exports.paginationFieldResolvers,
    PAGINATION_DEFAULTS: exports.PAGINATION_DEFAULTS,
};
