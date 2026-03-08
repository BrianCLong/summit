"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.execRouter = void 0;
const express_1 = __importDefault(require("express"));
const metrics_1 = require("../metrics");
const events_1 = require("../events");
const util_1 = require("../util");
const store_1 = require("../quotas/store");
exports.execRouter = express_1.default.Router();
exports.execRouter.post('/', async (req, res) => {
    const t0 = Date.now();
    const { task, input, env, loa = 1, tenant = 'default' } = req.body || {};
    const audit_id = (0, util_1.traceId)();
    try {
        // In a real system, call your actual model runner here.
        const decision_detail = { model: 'local/ollama', chosen_by: 'score-top' };
        const output = `echo: ${input ?? ''}`;
        // Placeholder for provider API call and header parsing
        // In a real implementation, this would be where you make the actual call to Perplexity/Venice
        // and read their rate-limit headers (e.g., X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset)
        const providerResponseHeaders = {
            'x-ratelimit-limit': '100',
            'x-ratelimit-remaining': '90',
            'x-ratelimit-reset': (Date.now() / 1000 + 60).toString(), // Reset in 60 seconds
        };
        // Example of parsing headers and updating QuotaStore
        const limit = parseInt(providerResponseHeaders['x-ratelimit-limit'] || '0', 10);
        const remaining = parseInt(providerResponseHeaders['x-ratelimit-remaining'] || '0', 10);
        const resetTime = parseInt(providerResponseHeaders['x-ratelimit-reset'] || '0', 10) * 1000; // Convert to milliseconds
        // Assuming 'decision_detail.model' is the model used
        // And 'tokensTotal' is the unit
        // This is a simplified example
        if (limit > 0) {
            const quotaStore = new store_1.RedisQuotaStore(); // Or get from app context
            // Record the usage for the current request
            await quotaStore.record(decision_detail.model, 'requests', 1); // Assuming 1 request per execution
            // Update the cap and remaining based on headers (this is more complex for rolling windows)
            // For fixed windows, you might update the cap directly if the provider sends it
        }
        const latency_ms = Date.now() - t0;
        metrics_1.routeLatency.labels(decision_detail.model, tenant).observe(latency_ms);
        metrics_1.tokensTotal.labels(decision_detail.model, tenant, 'prompt').inc(50);
        metrics_1.tokensTotal.labels(decision_detail.model, tenant, 'completion').inc(20);
        const payload = { audit_id, latency_ms, decision_detail, output };
        (0, events_1.emit)({ type: 'route.execute', detail: payload });
        res.json(payload);
    }
    catch (e) {
        metrics_1.errorsTotal.labels('/route/execute', '500').inc();
        (0, events_1.emit)({
            type: 'error',
            route: '/route/execute',
            code: 500,
            msg: e?.message,
        });
        res.status(500).json({ error: 'execution_failed', audit_id });
    }
});
