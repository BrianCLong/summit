"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.waitFor = waitFor;
/**
 * Repeatedly evaluates the provided condition until it returns a truthy value
 * or the timeout is reached. Useful for replacing arbitrary timeouts with
 * deterministic checks.
 */
async function waitFor(condition, timeout = 5000, interval = 100) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
        try {
            if (await condition()) {
                return;
            }
        }
        catch {
            // ignore condition errors and retry
        }
        await new Promise((resolve) => setTimeout(resolve, interval));
    }
    throw new Error(`waitFor: condition not met within ${timeout}ms`);
}
