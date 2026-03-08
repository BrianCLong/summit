"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.persistedOnlyPlugin = persistedOnlyPlugin;
const keyv_1 = __importDefault(require("keyv"));
const keyv = new keyv_1.default(process.env.REDIS_URL || 'redis://redis:6379');
function persistedOnlyPlugin() {
    const enabled = (process.env.ENFORCE_PERSISTED || 'true') === 'true';
    return {
        async requestDidStart(ctx) {
            if (!enabled)
                return;
            const h = ctx.request.http?.headers.get('x-persisted-hash') || '';
            const tenant = ctx.request.http?.headers.get('x-tenant') || 'default';
            const ok = h.startsWith('sha256:') && (await keyv.get(`pq:${tenant}:${h}`));
            if (!ok)
                throw new Error('Persisted queries only in production');
        },
    };
}
