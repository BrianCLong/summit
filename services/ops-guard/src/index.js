"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const budgetGuard_js_1 = require("./budgetGuard.js");
const config_js_1 = require("./config.js");
const costGovernor_js_1 = require("./costGovernor.js");
const logger_js_1 = require("./logger.js");
const metrics_js_1 = require("./metrics.js");
const chaosRunner_js_1 = require("./chaosRunner.js");
const config = (0, config_js_1.loadConfig)();
const logger = (0, logger_js_1.createLogger)();
const app = (0, express_1.default)();
const chaos = new chaosRunner_js_1.ChaosRunner(config, logger);
chaos.start();
app.use(express_1.default.json());
app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
});
app.get('/metrics', async (_req, res) => {
    res.set('Content-Type', 'text/plain');
    res.send(await (0, metrics_js_1.renderMetrics)());
});
app.post('/guard/query', (0, budgetGuard_js_1.buildBudgetGuard)(config, logger), (req, res) => {
    const plan = req.body;
    res.json({
        status: 'accepted',
        durationMs: res.locals.durationMs,
        governance: res.locals.planGovernance,
        plan
    });
});
app.post('/governor/suggest', (req, res) => {
    const plan = req.body;
    const governance = (0, costGovernor_js_1.evaluatePlan)(plan);
    res.json({ status: 'ok', governance });
});
app.post('/chaos/run', (_req, res) => {
    const run = chaos.run();
    res.json({ status: 'triggered', run });
});
app.get('/chaos/tasks', (_req, res) => {
    res.json({ followUps: chaos.getTasks() });
});
app.get('/chaos/slo-trend', (_req, res) => {
    res.json(chaos.sloTrend());
});
app.use((err, _req, res, _next) => {
    logger.error({ err }, 'Unhandled error');
    res.status(500).json({ status: 'error', message: err.message });
});
app.listen(config.port, () => {
    logger.info({ port: config.port }, 'Ops Guard listening');
});
