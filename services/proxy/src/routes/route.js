"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const policy_1 = require("../router/policy");
const metrics_1 = require("../metrics");
const github_1 = require("../integrations/github");
const r = (0, express_1.Router)();
r.post('/route/plan', (req, res) => {
    const decision = (0, policy_1.decide)(req.app.get('policy'), req.body);
    res.json({ decision, policy: { allow: decision.allow } });
});
r.post('/route/execute', async (req, res) => {
    const start = process.hrtime.bigint();
    const decision = (0, policy_1.decide)(req.app.get('policy'), req.body);
    if (!decision.allow || !decision.model)
        return res.status(429).json(decision);
    // pseudo‑call to gateway here (replace with real client)
    const { model } = decision;
    try {
        const output = { text: `hello from ${model}` };
        const latencyMs = Number((process.hrtime.bigint() - start) / 1000000n);
        metrics_1.routeExecuteLatency.observe({ model, stream: String(Boolean(req.body.stream)), status: 'ok' }, latencyMs / 1000);
        const audit_id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        await (0, github_1.upsertRunReport)(audit_id, JSON.stringify({ decision, req }, null, 0) + '\n');
        res.json({
            audit_id,
            latency_ms: latencyMs,
            output,
            explain: decision.reasons,
        });
    }
    catch (e) {
        metrics_1.routeExecuteLatency.observe({ model, stream: String(Boolean(req.body.stream)), status: 'err' }, 0);
        return res.status(502).json({ error: 'gateway_failed', detail: e.message });
    }
});
exports.default = r;
