"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.take = take;
const ioredis_1 = __importDefault(require("ioredis"));
const r = new ioredis_1.default(process.env.REDIS_URL || 'redis://localhost:6379');
async function take(tenant, capacity, refillPerMin, cost) {
    const key = `q:${tenant}`;
    const now = Date.now();
    const s = JSON.parse((await r.get(key)) || `{"tokens":${capacity},"ts":${now}}`);
    const elapsed = (now - s.ts) / 60000;
    s.tokens = Math.min(capacity, s.tokens + elapsed * refillPerMin);
    if (s.tokens < cost)
        return { ok: false, waitMs: Math.ceil((cost - s.tokens) / refillPerMin * 60000) };
    s.tokens -= cost;
    s.ts = now;
    await r.set(key, JSON.stringify(s));
    return { ok: true, remaining: s.tokens };
}
