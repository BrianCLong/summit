"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const golden_path_1 = require("@intelgraph/golden-path");
const app = (0, express_1.default)();
app.use(express_1.default.json());
const metrics = (0, golden_path_1.createMetrics)();
app.use((0, golden_path_1.createTraceMiddleware)());
app.use((0, golden_path_1.createHttpMetricsMiddleware)(metrics));
const ingestStore = new golden_path_1.InMemoryIngestStore();
const policy = new golden_path_1.PolicyEngine(golden_path_1.denyByDefaultBundle);
app.get('/healthz', (_req, res) => res.json({ status: 'ok' }));
app.get('/readyz', (_req, res) => res.json({ ready: true }));
app.get('/metrics', async (_req, res) => {
    res.setHeader('Content-Type', metrics.registry.contentType);
    res.send(await metrics.registry.metrics());
});
app.post('/api/ingest', (req, res) => {
    const allowed = policy.evaluate({
        role: 'service',
        resource: 'ingest',
        action: 'write',
        tenant: 'default',
        region: req.body?.entity?.tags?.residencyRegion ?? 'unknown',
        classification: req.body?.entity?.tags?.classification ?? 'public',
    }, res.locals.traceId);
    if (!allowed) {
        return res.status(403).json({ error: 'unauthorized' });
    }
    try {
        ingestStore.ingest(req.body, ['us-east', 'eu-west']);
        return res.status(201).json({ accepted: true });
    }
    catch (error) {
        return res.status(400).json({ error: error.message });
    }
});
app.get('/api/timeline', (req, res) => {
    const items = ingestStore.getTimeline({
        entityId: req.query.entityId,
        source: req.query.source,
        confidenceGte: req.query.confidenceGte
            ? Number(req.query.confidenceGte)
            : undefined,
        start: req.query.start,
        end: req.query.end,
    });
    res.json(items);
});
const port = process.env.PORT ?? 8080;
app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`__SERVICE_NAME__ listening on ${port}`);
});
