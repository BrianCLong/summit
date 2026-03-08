"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.alertManager = exports.app = void 0;
// @ts-nocheck
const express_1 = __importDefault(require("express"));
const pino_http_1 = __importDefault(require("pino-http"));
const pino_1 = __importDefault(require("pino"));
const alert_manager_1 = require("./alert-manager");
const logger = (0, pino_1.default)({ name: 'alert-engine-server' });
const app = (0, express_1.default)();
exports.app = app;
app.use(express_1.default.json());
app.use((0, pino_http_1.default)({ logger }));
// Initialize alert manager
const alertManager = new alert_manager_1.AlertManager(process.env.REDIS_URL);
exports.alertManager = alertManager;
// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', service: 'alert-engine' });
});
// Get active alerts
app.get('/api/alerts', async (req, res) => {
    try {
        const { severity, source, limit } = req.query;
        const alerts = await alertManager.getActiveAlerts({
            severity: severity,
            source: source,
            limit: limit ? parseInt(limit) : undefined,
        });
        res.json({ alerts });
    }
    catch (error) {
        logger.error({ error }, 'Failed to get alerts');
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get alert statistics
app.get('/api/alerts/stats', async (req, res) => {
    try {
        const stats = await alertManager.getStatistics();
        res.json(stats);
    }
    catch (error) {
        logger.error({ error }, 'Failed to get statistics');
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Acknowledge alert
app.post('/api/alerts/:id/acknowledge', async (req, res) => {
    try {
        const { id } = req.params;
        const { acknowledgedBy } = req.body;
        await alertManager.acknowledgeAlert(id, acknowledgedBy);
        res.json({ success: true });
    }
    catch (error) {
        logger.error({ error }, 'Failed to acknowledge alert');
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Resolve alert
app.post('/api/alerts/:id/resolve', async (req, res) => {
    try {
        const { id } = req.params;
        const { resolvedBy } = req.body;
        await alertManager.resolveAlert(id, resolvedBy);
        res.json({ success: true });
    }
    catch (error) {
        logger.error({ error }, 'Failed to resolve alert');
        res.status(500).json({ error: 'Internal server error' });
    }
});
const PORT = process.env.PORT || 3003;
app.listen(PORT, () => {
    logger.info({ port: PORT }, 'Alert Engine server started');
});
