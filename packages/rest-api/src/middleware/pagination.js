"use strict";
/**
 * Pagination Middleware
 *
 * Handles pagination parameters and metadata
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.paginationMiddleware = paginationMiddleware;
exports.addPaginationMetadata = addPaginationMetadata;
function paginationMiddleware(options) {
    return (req, res, next) => {
        const { defaultLimit, maxLimit, strategy } = options;
        if (strategy === 'offset') {
            // Offset-based pagination
            const limit = Math.min(parseInt(req.query.limit) || defaultLimit, maxLimit);
            const offset = parseInt(req.query.offset) || 0;
            req.pagination = {
                limit,
                offset,
                count: 0,
                hasMore: false,
            };
        }
        else {
            // Cursor-based pagination
            const limit = Math.min(parseInt(req.query.limit) || defaultLimit, maxLimit);
            const cursor = req.query.cursor;
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
function addPaginationMetadata(req, total, count, nextCursor) {
    const pagination = req.pagination;
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
    }
    else {
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
