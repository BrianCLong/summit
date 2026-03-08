"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
/**
 * Summit Code UI – Express server
 *
 * Serves the API under /api/* and static Vite build under /.
 * Port defaults to 3741 (configurable via SUMMIT_UI_PORT env var).
 */
const express_1 = __importDefault(require("express"));
const path_1 = require("path");
const url_1 = require("url");
const config_js_1 = require("./config.js");
const prompts_js_1 = require("./routes/prompts.js");
const artifacts_js_1 = require("./routes/artifacts.js");
const dashboard_js_1 = require("./routes/dashboard.js");
const release_js_1 = require("./routes/release.js");
const metrics_js_1 = require("./utils/metrics.js");
const __dirname = (0, url_1.fileURLToPath)(new URL('.', import.meta.url));
function createApp() {
    const app = (0, express_1.default)();
    app.use(express_1.default.json());
    app.use(metrics_js_1.metricsMiddleware);
    // ── API routes ────────────────────────────────────────────────────────────
    app.use('/api/prompts', prompts_js_1.promptsRouter);
    app.use('/api/artifacts', artifacts_js_1.artifactsRouter);
    app.use('/api/dashboard', dashboard_js_1.dashboardRouter);
    app.use('/api/release', release_js_1.releaseRouter);
    // ── Observability ─────────────────────────────────────────────────────────
    app.get('/metrics', (_req, res) => {
        res.setHeader('Content-Type', 'text/plain; version=0.0.4');
        res.send((0, metrics_js_1.renderPrometheus)());
    });
    app.get('/health', (_req, res) => {
        res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });
    // ── Static files (production) ─────────────────────────────────────────────
    const distDir = (0, path_1.join)(__dirname, '..', 'dist');
    app.use(express_1.default.static(distDir));
    // SPA fallback
    app.get('*', (_req, res) => {
        res.sendFile((0, path_1.join)(distDir, 'index.html'));
    });
    return app;
}
// Start server only when run directly
if (process.argv[1] === (0, url_1.fileURLToPath)(import.meta.url)) {
    const app = createApp();
    app.listen(config_js_1.PORT, () => {
        console.info(`Summit Code UI server running on http://localhost:${config_js_1.PORT}`);
        console.info(`Metrics: http://localhost:${config_js_1.PORT}/metrics`);
        console.info(`Health:  http://localhost:${config_js_1.PORT}/health`);
    });
}
