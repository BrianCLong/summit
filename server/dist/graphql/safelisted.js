import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
const GENERATED_PATH = path.resolve(process.cwd(), 'server/src/graphql/safelist.generated.json');
function loadSafelist() {
    try {
        if (fs.existsSync(GENERATED_PATH)) {
            const arr = JSON.parse(fs.readFileSync(GENERATED_PATH, 'utf8'));
            return new Set(arr);
        }
    }
    catch { }
    return new Set();
}
const SAFE = loadSafelist();
export function opHash(body) {
    return crypto
        .createHash('sha256')
        .update(body || '')
        .digest('hex');
}
export function enforceSafelist(req, enabled = process.env.SAFELIST === '1') {
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
export function safelistMiddleware(req, res, next) {
    try {
        enforceSafelist(req);
        next();
    }
    catch (e) {
        res.status(e?.statusCode || 403).json({ error: e?.message || 'Forbidden' });
    }
}
//# sourceMappingURL=safelisted.js.map