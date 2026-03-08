"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.idempotency = idempotency;
const cache = new Map();
const TTL = 5 * 60 * 1000; // 5m
function idempotency(req, res, next) {
    if (req.method !== "POST")
        return next();
    const key = (req.headers["idempotency-key"] || "");
    if (!key || key.length < 8)
        return res.status(400).json({ error: "missing idempotency-key" });
    const hit = cache.get(key);
    const now = Date.now();
    // Cleanup old keys
    for (const [k, v] of Array.from(cache)) {
        if (now - v.ts > TTL)
            cache.delete(k);
    }
    if (hit)
        return res.status(hit.status).json(hit.body);
    // Intercept json response
    const _json = res.json.bind(res);
    res.json = (body) => {
        cache.set(key, { status: res.statusCode || 200, body, ts: now });
        return _json(body);
    };
    next();
}
