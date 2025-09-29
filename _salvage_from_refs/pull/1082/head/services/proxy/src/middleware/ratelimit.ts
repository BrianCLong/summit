import rateLimit from 'express-rate-limit';
export const strictRate = rateLimit({ windowMs: 60_000, max: 60, standardHeaders: true, legacyHeaders: false });
