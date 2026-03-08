"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GraphqlPersistedAllowlistMiddleware = void 0;
exports.createGraphqlPersistedAllowlistMiddleware = createGraphqlPersistedAllowlistMiddleware;
exports.hashPersistedQuery = hashPersistedQuery;
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const pino_1 = __importDefault(require("pino"));
const logger = pino_1.default({ name: 'graphqlPersistedAllowlist' });
function hashQuery(query) {
    return crypto_1.default.createHash('sha256').update(query.trim()).digest('hex');
}
function loadManifest(paths) {
    const allowlist = new Map();
    for (const manifestPath of paths) {
        try {
            if (!(0, fs_1.existsSync)(manifestPath))
                continue;
            const raw = (0, fs_1.readFileSync)(manifestPath, 'utf8');
            const parsed = JSON.parse(raw);
            const entries = Object.entries(parsed);
            if (!entries.length)
                continue;
            for (const [id, query] of entries) {
                const normalized = query.trim();
                allowlist.set(id, normalized);
                // Also allow APQ style hashes to match this query
                allowlist.set(hashQuery(normalized), normalized);
            }
            logger.info({
                manifestPath,
                operations: entries.length,
            }, 'Persisted GraphQL allowlist loaded');
        }
        catch (error) {
            logger.warn({
                manifestPath,
                error: error.message,
            }, 'Failed to load persisted operations manifest – checking next path');
        }
    }
    if (!allowlist.size) {
        logger.warn('No persisted operations manifest found; running without allowlist');
    }
    return allowlist;
}
class GraphqlPersistedAllowlistMiddleware {
    allowlist;
    enforce;
    allowDevFallback;
    constructor(options = {}) {
        const manifestPaths = (options.manifestPaths || [
            process.env.PERSISTED_OPERATIONS_PATH,
            path_1.default.join(process.cwd(), 'client/src/generated/graphql.json'),
            path_1.default.join(process.cwd(), 'persisted-operations.json'),
            path_1.default.join(process.cwd(), 'persisted-queries.json'),
        ]).filter(Boolean);
        this.allowlist = loadManifest(manifestPaths);
        const isProd = process.env.NODE_ENV === 'production';
        this.enforce = options.enforceInProduction ?? isProd;
        this.allowDevFallback = options.allowDevFallback ?? !isProd;
    }
    middleware = (req, res, next) => {
        if (!this.isGraphQLRequest(req))
            return next();
        const body = this.getRequestPayload(req);
        // Ensure downstream middleware sees the normalized payload
        req.body = body;
        const enforcementEnabled = this.enforce;
        const resolvedQuery = this.resolvePersistedQuery(body);
        if (resolvedQuery) {
            req.body.query = resolvedQuery;
            return next();
        }
        if (!enforcementEnabled && this.allowDevFallback) {
            logger.warn({
                path: req.path,
                operationName: body.operationName,
            }, 'Allowing non-persisted GraphQL query (development fallback)');
            return next();
        }
        logger.warn({
            path: req.path,
            operationName: body.operationName,
        }, 'Blocked GraphQL query – not found in persisted allowlist');
        return res.status(403).json({
            errors: [
                {
                    message: 'Persisted query required in production',
                    extensions: {
                        code: 'PERSISTED_QUERY_REQUIRED',
                        operationName: body.operationName,
                    },
                },
            ],
        });
    };
    resolvePersistedQuery(body) {
        // APQ hash
        const apqHash = body.extensions?.persistedQuery?.sha256Hash;
        if (apqHash && this.allowlist.has(apqHash)) {
            return this.allowlist.get(apqHash);
        }
        // Operation id
        if (body.id && this.allowlist.has(body.id)) {
            return this.allowlist.get(body.id);
        }
        // Inline query that matches allowlist hash
        if (body.query) {
            const queryHash = hashQuery(body.query);
            if (this.allowlist.has(queryHash)) {
                return body.query;
            }
        }
        return undefined;
    }
    isGraphQLRequest(req) {
        return req.path === '/graphql' && (req.method === 'POST' || req.method === 'GET');
    }
    parseMaybeJson(value) {
        if (typeof value !== 'string')
            return value;
        try {
            return JSON.parse(value);
        }
        catch {
            return value;
        }
    }
    getRequestPayload(req) {
        if (req.method === 'GET') {
            const queryParams = req.query || {};
            const normalized = {};
            for (const [key, value] of Object.entries(queryParams)) {
                if (Array.isArray(value))
                    continue;
                normalized[key] = this.parseMaybeJson(value);
            }
            return normalized;
        }
        return (req.body || {});
    }
}
exports.GraphqlPersistedAllowlistMiddleware = GraphqlPersistedAllowlistMiddleware;
function createGraphqlPersistedAllowlistMiddleware(options) {
    const middleware = new GraphqlPersistedAllowlistMiddleware(options);
    return middleware.middleware;
}
function hashPersistedQuery(query) {
    return hashQuery(query);
}
