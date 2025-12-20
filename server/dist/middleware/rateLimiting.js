import rateLimit from 'express-rate-limit';
export function rateLimiter({ windowMs = 60000, max = 60, }) {
    return rateLimit({ windowMs, max });
}
//# sourceMappingURL=rateLimiting.js.map