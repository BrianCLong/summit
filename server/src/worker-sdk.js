"use strict";
// Worker SDK heartbeat (TypeScript, excerpt)
// This is a placeholder for the actual worker SDK implementation.
Object.defineProperty(exports, "__esModule", { value: true });
exports.runTaskLoop = runTaskLoop;
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
function isRetryable(e) {
    // Implement logic to determine if an error is retryable
    return false;
}
async function runTaskLoop(client, handler) {
    while (true) {
        const lease = await client.leaseTask();
        if (!lease) {
            await sleep(250);
            continue;
        }
        const ctrl = new AbortController();
        const hb = setInterval(() => client.renewLease(lease.id).catch(() => ctrl.abort()), 2000);
        try {
            const res = await handler(lease, { signal: ctrl.signal });
            await client.ackTask(lease.id, res.checkpoint, res.artifacts);
        }
        catch (e) {
            const retryable = isRetryable(e);
            await client.nackTask(lease.id, retryable, String(e)); // Convert error to string
        }
        finally {
            clearInterval(hb);
        }
    }
}
