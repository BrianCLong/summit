"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = run;
async function run(ctx) {
    const started = Date.now();
    try {
        const res = await fetch(`${ctx.endpoint}/health`, {
            headers: ctx.token ? { authorization: `Bearer ${ctx.token}` } : undefined,
        });
        const durationMs = Date.now() - started;
        const pass = res.ok && durationMs <= 250;
        return { name: 'latency', pass, durationMs, status: res.status };
    }
    catch (error) {
        return {
            name: 'latency',
            pass: false,
            durationMs: Date.now() - started,
            error: String(error),
        };
    }
}
