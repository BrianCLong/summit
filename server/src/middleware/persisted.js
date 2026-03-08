"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.enforcePersisted = enforcePersisted;
const crypto_1 = require("crypto");
const persisted_queries_json_1 = __importDefault(require("../../.maestro/persisted-queries.json"));
function enforcePersisted(req, res, next) {
    const { query, extensions, id } = req.body || {};
    // Support multiple persisted query formats:
    // 1. Direct id field (used by k6 tests)
    // 2. Apollo client format: extensions.persistedQuery.sha256Hash
    // 3. Fallback: hash the query if provided (dev mode only)
    let hash = id || extensions?.persistedQuery?.sha256Hash;
    if (!hash && query) {
        // Dev mode: compute hash from query
        hash = (0, crypto_1.createHash)('sha256').update(query).digest('hex');
    }
    if (!hash) {
        return res.status(400).json({
            error: 'Missing query identifier',
            code: 'PERSISTED_QUERY_NOT_FOUND',
        });
    }
    const persistedQuery = persisted_queries_json_1.default[hash];
    if (!persistedQuery) {
        console.warn(`Rejected unknown query hash: ${hash}`);
        return res.status(400).json({
            error: 'Unknown query',
            code: 'PERSISTED_QUERY_NOT_FOUND',
            hash,
        });
    }
    // Replace request with persisted query
    req.body.query = persistedQuery;
    delete req.body.id; // Remove id to avoid confusion
    next();
}
