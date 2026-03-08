"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.persistedGuard = persistedGuard;
const crypto_1 = __importDefault(require("crypto"));
const node_fs_1 = __importDefault(require("node:fs"));
const mode = (process.env.PERSISTED_QUERY_MODE || 'off');
const mapPath = process.env.PERSISTED_QUERY_MAP_PATH || 'services/api/persisted/queries.json';
let MAP = {};
try {
    if (node_fs_1.default.existsSync(mapPath)) {
        MAP = JSON.parse(node_fs_1.default.readFileSync(mapPath, 'utf8'));
    }
}
catch { }
function sha256(s) {
    return crypto_1.default.createHash('sha256').update(s).digest('hex');
}
function normalize(q) {
    return String(q || '')
        .replace(/\s+/g, ' ')
        .trim();
}
function persistedGuard(req, res, next) {
    if (mode === 'off')
        return next();
    const body = req.body || {};
    const opName = body.operationName;
    const query = body.query;
    if (!opName) {
        if (mode === 'required')
            return res.status(400).json({ error: 'operationName_required' });
        return next();
    }
    const expected = MAP[opName];
    if (!expected) {
        if (mode === 'required')
            return res.status(403).json({ error: 'op_not_whitelisted', opName });
        if (mode === 'audit')
            console.warn('[persisted:audit] miss op=%s', opName);
        return next();
    }
    if (!query) {
        if (mode === 'required')
            return res.status(400).json({ error: 'query_required_for_validation' });
        return next();
    }
    const actual = sha256(normalize(query));
    const ok = actual === expected;
    if (!ok) {
        if (mode !== 'off')
            return res.status(403).json({ error: 'query_hash_mismatch', opName });
    }
    return next();
}
