"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.opHash = opHash;
exports.enforceSafelist = enforceSafelist;
exports.safelistMiddleware = safelistMiddleware;
const crypto_1 = __importDefault(require("crypto"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const GENERATED_PATH = path_1.default.resolve(process.cwd(), 'server/src/graphql/safelist.generated.json');
function loadSafelist() {
    try {
        if (fs_1.default.existsSync(GENERATED_PATH)) {
            const arr = JSON.parse(fs_1.default.readFileSync(GENERATED_PATH, 'utf8'));
            return new Set(arr);
        }
    }
    catch { }
    return new Set();
}
const SAFE = loadSafelist();
function opHash(body) {
    return crypto_1.default
        .createHash('sha256')
        .update(body || '')
        .digest('hex');
}
function enforceSafelist(req, enabled = process.env.SAFELIST === '1') {
    if (!enabled)
        return;
    const q = req.body?.query || '';
    const hash = opHash(q);
    if (!SAFE.has(hash)) {
        const err = new Error('Operation not safelisted');
        err.statusCode = 403;
        throw err;
    }
}
function safelistMiddleware(req, res, next) {
    try {
        enforceSafelist(req);
        next();
    }
    catch (e) {
        res.status(e?.statusCode || 403).json({ error: e?.message || 'Forbidden' });
    }
}
