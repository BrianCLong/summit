"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.webhookRatelimit = void 0;
exports.replayGuard = replayGuard;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const seen = new Map();
const TTL_MS = 5 * 60 * 1000; // 5 minutes
function replayGuard() {
    return (req, res, next) => {
        const sig = req.header('Stripe-Signature') || req.header('X-Hub-Signature-256') || '';
        const key = `${req.originalUrl}:${sig}`;
        const now = Date.now();
        for (const [k, v] of seen)
            if (v < now)
                seen.delete(k);
        if (sig && seen.has(key))
            return res.status(409).send('replay detected');
        if (sig)
            seen.set(key, now + TTL_MS);
        next();
    };
}
exports.webhookRatelimit = (0, express_rate_limit_1.default)({
    windowMs: 60_000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
});
