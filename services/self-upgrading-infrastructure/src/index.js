"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthManager = exports.upgradeManager = exports.trendAnalyzer = exports.app = void 0;
// @ts-nocheck
const express_1 = __importDefault(require("express"));
const node_cron_1 = __importDefault(require("node-cron"));
const TrendAnalyzer_js_1 = require("./analyzers/TrendAnalyzer.js");
const UpgradeManager_js_1 = require("./managers/UpgradeManager.js");
const HealthManager_js_1 = require("./managers/HealthManager.js");
const logger_js_1 = require("./utils/logger.js");
const PORT = process.env.PORT || 3080;
// Configuration
const sensorConfig = {
    marketTrendSources: ['tech_trends_api', 'security_advisories', 'ux_research'],
    competitorMonitoringEnabled: true,
    regulatoryFeedUrls: [
        'https://compliance.example.com/feed/eu',
        'https://compliance.example.com/feed/us',
    ],
    scanIntervalMinutes: 60,
};
const upgradePolicy = {
    autoUpgrade: process.env.AUTO_UPGRADE === 'true',
    requireApproval: process.env.REQUIRE_APPROVAL !== 'false',
    maintenanceWindow: {
        dayOfWeek: [0, 6], // Sunday, Saturday
        startHour: 2,
        endHour: 6,
        timezone: 'UTC',
    },
    rollbackThreshold: 0.1,
    maxConcurrentUpgrades: 2,
};
// Initialize services
const trendAnalyzer = new TrendAnalyzer_js_1.TrendAnalyzer(sensorConfig);
exports.trendAnalyzer = trendAnalyzer;
const upgradeManager = new UpgradeManager_js_1.UpgradeManager(upgradePolicy);
exports.upgradeManager = upgradeManager;
const healthManager = new HealthManager_js_1.HealthManager({
    checkIntervalMs: 30000,
    unhealthyThreshold: 3,
    degradedLatencyMs: 500,
});
exports.healthManager = healthManager;
// Event handlers
trendAnalyzer.on('actionable_trend', async (trend) => {
    logger_js_1.logger.info('Actionable market trend detected', { trend: trend.signal });
    await upgradeManager.createUpgradeFromTrend(trend);
});
trendAnalyzer.on('competitive_threat', async (threat) => {
    logger_js_1.logger.warn('Competitive threat detected', { threat: threat.description });
    await upgradeManager.createUpgradeFromThreat(threat);
});
trendAnalyzer.on('regulatory_change', async (change) => {
    logger_js_1.logger.warn('Regulatory change detected', { regulation: change.regulation });
    await upgradeManager.createUpgradeFromRegulatory(change);
});
upgradeManager.on('upgrade_queued', (upgrade) => {
    logger_js_1.logger.info('Upgrade queued', { id: upgrade.id, component: upgrade.component });
});
upgradeManager.on('upgrade_completed', (upgrade) => {
    logger_js_1.logger.info('Upgrade completed successfully', { id: upgrade.id, component: upgrade.component });
});
upgradeManager.on('upgrade_failed', (upgrade, error) => {
    logger_js_1.logger.error('Upgrade failed', { id: upgrade.id, component: upgrade.component, error });
});
healthManager.on('component_unhealthy', (health) => {
    logger_js_1.logger.error('Component unhealthy', { component: health.component });
});
// Express app
const app = (0, express_1.default)();
exports.app = app;
app.use(express_1.default.json());
// Health endpoints
app.get('/health', (_req, res) => {
    const health = healthManager.getSystemHealth();
    res.status(health.overall === 'healthy' ? 200 : 503).json(health);
});
app.get('/health/ready', (_req, res) => {
    res.json({ status: 'ready' });
});
app.get('/health/live', (_req, res) => {
    res.json({ status: 'live' });
});
// Trends API
app.get('/api/trends', (_req, res) => {
    res.json(trendAnalyzer.getAllTrends());
});
app.post('/api/trends/scan', async (_req, res) => {
    const trends = await trendAnalyzer.analyzeMarketTrends();
    res.json(trends);
});
// Threats API
app.get('/api/threats', (_req, res) => {
    res.json(trendAnalyzer.getAllThreats());
});
app.post('/api/threats/scan', async (_req, res) => {
    const threats = await trendAnalyzer.detectCompetitiveThreats();
    res.json(threats);
});
// Regulatory API
app.get('/api/regulatory', (_req, res) => {
    res.json(trendAnalyzer.getAllRegulatoryChanges());
});
app.post('/api/regulatory/scan', async (_req, res) => {
    const changes = await trendAnalyzer.detectRegulatoryChanges();
    res.json(changes);
});
// Upgrades API
app.get('/api/upgrades', (_req, res) => {
    res.json(upgradeManager.getAllUpgrades());
});
app.get('/api/upgrades/pending', (_req, res) => {
    res.json(upgradeManager.getPendingUpgrades());
});
app.get('/api/upgrades/active', (_req, res) => {
    res.json(upgradeManager.getActiveUpgrades());
});
app.get('/api/upgrades/:id', (req, res) => {
    const upgrade = upgradeManager.getUpgrade(req.params.id);
    if (!upgrade) {
        res.status(404).json({ error: 'Upgrade not found' });
        return;
    }
    res.json(upgrade);
});
app.post('/api/upgrades/:id/approve', async (req, res) => {
    const upgrade = upgradeManager.getUpgrade(req.params.id);
    if (!upgrade) {
        res.status(404).json({ error: 'Upgrade not found' });
        return;
    }
    const success = await upgradeManager.processUpgrade(req.params.id);
    res.json({ success, upgrade: upgradeManager.getUpgrade(req.params.id) });
});
// Component versions API
app.get('/api/components', (_req, res) => {
    res.json(upgradeManager.getComponentVersions());
});
// Policy API
app.get('/api/policy', (_req, res) => {
    res.json(upgradePolicy);
});
app.patch('/api/policy', (req, res) => {
    upgradeManager.updatePolicy(req.body);
    res.json({ success: true });
});
// Full scan endpoint
app.post('/api/scan', async (_req, res) => {
    logger_js_1.logger.info('Running full infrastructure scan');
    const [trends, threats, regulatory] = await Promise.all([
        trendAnalyzer.analyzeMarketTrends(),
        trendAnalyzer.detectCompetitiveThreats(),
        trendAnalyzer.detectRegulatoryChanges(),
    ]);
    res.json({
        trends: trends.length,
        threats: threats.length,
        regulatory: regulatory.length,
        upgrades: upgradeManager.getPendingUpgrades().length,
    });
});
// Scheduled tasks
node_cron_1.default.schedule(`*/${sensorConfig.scanIntervalMinutes} * * * *`, async () => {
    logger_js_1.logger.info('Running scheduled trend analysis');
    await trendAnalyzer.analyzeMarketTrends();
    await trendAnalyzer.detectCompetitiveThreats();
    await trendAnalyzer.detectRegulatoryChanges();
});
node_cron_1.default.schedule('0 */4 * * *', async () => {
    logger_js_1.logger.info('Processing pending upgrades');
    for (const upgrade of upgradeManager.getPendingUpgrades()) {
        if (!upgradePolicy.requireApproval) {
            await upgradeManager.processUpgrade(upgrade.id);
        }
    }
});
// Start server
const server = app.listen(PORT, () => {
    logger_js_1.logger.info(`Self-Upgrading Infrastructure service started on port ${PORT}`);
    healthManager.start();
});
// Graceful shutdown
const shutdown = async () => {
    logger_js_1.logger.info('Shutting down gracefully...');
    healthManager.stop();
    server.close(() => {
        logger_js_1.logger.info('Server closed');
        process.exit(0);
    });
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
