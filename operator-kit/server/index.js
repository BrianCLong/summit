"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const metrics_1 = require("./metrics");
const metricsFetcher_1 = require("./metricsFetcher");
const events_1 = require("./events");
const plan_1 = require("./routes/plan");
const execute_1 = require("./routes/execute");
const rag_1 = require("./routes/rag");
const github_1 = require("./routes/github");
const security_1 = require("./security");
const policy_1 = require("./policy");
require("./otel"); // Import to activate OpenTelemetry instrumentation
const PORT = Number(process.env.PORT || 8787);
const app = (0, express_1.default)();
app.use(express_1.default.json({ limit: '2mb' }));
const accessLogStream = fs_1.default.createWriteStream(path_1.default.join(__dirname, 'access.log'), { flags: 'a' });
app.use((0, morgan_1.default)('combined', { stream: accessLogStream }));
app.use(security_1.securityMiddleware);
app.use((0, cors_1.default)({
    origin: (origin, cb) => {
        const allow = (process.env.CORS_ORIGINS ||
            'http://127.0.0.1:5173,http://localhost:5173').split(',');
        if (!origin || allow.includes(origin))
            return cb(null, true);
        return cb(new Error('CORS blocked'));
    },
    credentials: false,
}));
app.use((0, helmet_1.default)({
    contentSecurityPolicy: {
        useDefaults: true,
        directives: (0, security_1.cspDirectives)(),
    },
}));
// Health & burndown passthroughs (plug into your existing impls if you already have them)
app.get('/status/health.json', (_req, res) => {
    res.json({
        services: { litellm: true, ollama: true },
        policy_loaded: !!(0, policy_1.loadPolicy)()._loadedAt,
        generated_at: new Date().toISOString(),
    });
});
app.get('/status/burndown.json', (_req, res) => {
    // placeholder window buckets; your existing generator can replace this
    res.json({
        generated_at: new Date().toISOString(),
        windows: { m1: {}, h1: {}, d1: {} },
    });
});
// Feature routers
app.use('/metrics', metrics_1.metricsRouter);
app.use('/events', events_1.eventsRouter);
app.use('/route/plan', plan_1.planRoute);
app.set('policy', (0, policy_1.loadPolicy)());
app.use('/route/execute', execute_1.execRouter);
app.use('/rag', rag_1.ragRouter);
app.use('/integrations/github', github_1.ghRouter);
(0, metrics_1.registerDefaultMetrics)();
(0, metricsFetcher_1.fetchAndCacheMetrics)();
setInterval(metricsFetcher_1.fetchAndCacheMetrics, 60 * 1000); // Every 1 minute
(0, policy_1.watchPolicy)((p) => {
    events_1.opsBus.emit({ type: 'policy.update', policy_hash: p._hash, at: Date.now() });
});
app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Symphony operator kit listening on :${PORT}`);
});
