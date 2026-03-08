"use strict";
/**
 * Response Formatting Middleware
 *
 * Standardizes API responses
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendSuccess = sendSuccess;
exports.generateHATEOASLinks = generateHATEOASLinks;
exports.responseMiddleware = responseMiddleware;
/**
 * Helper to send a standardized success response
 */
function sendSuccess(req, res, data, options) {
    const statusCode = options?.statusCode || 200;
    const response = {
        success: true,
        data,
        metadata: {
            timestamp: new Date().toISOString(),
            version: req.context?.apiVersion || '1.0',
            requestId: req.context.requestId,
            duration: Date.now() - req.context.startTime,
            pagination: req.pagination,
        },
        links: options?.links,
    };
    res.status(statusCode).json(response);
}
/**
 * Helper to generate HATEOAS links
 */
function generateHATEOASLinks(req, options) {
    const baseUrl = `${req.protocol}://${req.get('host')}${req.baseUrl}${req.path}`;
    const links = {
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
        }
        else if (options?.nextCursor) {
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
function responseMiddleware(req, res, next) {
    // Add success helper
    res.success = function (data, options) {
        sendSuccess(req, res, data, options);
    };
    next();
}
