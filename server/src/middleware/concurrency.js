"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.limit = limit;
const limits = new Map();
function limit(path, max = 100) {
    limits.set(path, { in: 0, max });
    return (req, res, next) => {
        const s = limits.get(path);
        if (s.in >= s.max) {
            res.setHeader('Retry-After', '2');
            res.status(429).json({ error: 'over_capacity' });
            return;
        }
        s.in++;
        res.on('finish', () => s.in--);
        next();
    };
}
