"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pollUntilTerminal = pollUntilTerminal;
const TERMINAL = new Set(["completed", "failed", "cancelled", "unknown"]);
async function pollUntilTerminal(opts) {
    const start = Date.now();
    let pollMs = opts.defaultPollMs ?? 500;
    while (true) {
        if (opts.signal?.aborted)
            throw new Error("poll aborted");
        const t = await opts.tasks.get(opts.taskId);
        opts.onUpdate?.(t);
        if (TERMINAL.has(t.status))
            return t;
        const suggested = typeof t.pollFrequency === "number" ? t.pollFrequency : null;
        pollMs = clampMs(suggested ?? pollMs * 1.5, 200, 5000);
        const elapsed = Date.now() - start;
        if (opts.maxMs != null && elapsed > opts.maxMs)
            throw new Error("poll timeout");
        await sleep(pollMs, opts.signal);
    }
}
function clampMs(v, lo, hi) {
    return Math.max(lo, Math.min(hi, Math.floor(v)));
}
function sleep(ms, signal) {
    return new Promise((resolve, reject) => {
        const t = setTimeout(resolve, ms);
        const onAbort = () => {
            clearTimeout(t);
            reject(new Error("sleep aborted"));
        };
        if (signal) {
            if (signal.aborted) {
                clearTimeout(t);
                reject(new Error("sleep aborted"));
            }
            else {
                signal.addEventListener("abort", onAbort, { once: true });
            }
        }
    });
}
