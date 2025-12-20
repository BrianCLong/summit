import express, { Request, Response } from 'express';
import cron from 'node-cron';
import { TrendAnalyzer } from './analyzers/TrendAnalyzer.js';
import { UpgradeManager } from './managers/UpgradeManager.js';
import { HealthManager } from './managers/HealthManager.js';
import { logger } from './utils/logger.js';
import type { SensorConfig, UpgradePolicy } from './types/index.js';

const PORT = process.env.PORT || 3080;

// Configuration
const sensorConfig: SensorConfig = {
  marketTrendSources: ['tech_trends_api', 'security_advisories', 'ux_research'],
  competitorMonitoringEnabled: true,
  regulatoryFeedUrls: [
    'https://compliance.example.com/feed/eu',
    'https://compliance.example.com/feed/us',
  ],
  scanIntervalMinutes: 60,
};

const upgradePolicy: UpgradePolicy = {
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
const trendAnalyzer = new TrendAnalyzer(sensorConfig);
const upgradeManager = new UpgradeManager(upgradePolicy);
const healthManager = new HealthManager({
  checkIntervalMs: 30000,
  unhealthyThreshold: 3,
  degradedLatencyMs: 500,
});

// Event handlers
trendAnalyzer.on('actionable_trend', async (trend) => {
  logger.info('Actionable market trend detected', { trend: trend.signal });
  await upgradeManager.createUpgradeFromTrend(trend);
});

trendAnalyzer.on('competitive_threat', async (threat) => {
  logger.warn('Competitive threat detected', { threat: threat.description });
  await upgradeManager.createUpgradeFromThreat(threat);
});

trendAnalyzer.on('regulatory_change', async (change) => {
  logger.warn('Regulatory change detected', { regulation: change.regulation });
  await upgradeManager.createUpgradeFromRegulatory(change);
});

upgradeManager.on('upgrade_queued', (upgrade) => {
  logger.info('Upgrade queued', { id: upgrade.id, component: upgrade.component });
});

upgradeManager.on('upgrade_completed', (upgrade) => {
  logger.info('Upgrade completed successfully', { id: upgrade.id, component: upgrade.component });
});

upgradeManager.on('upgrade_failed', (upgrade, error) => {
  logger.error('Upgrade failed', { id: upgrade.id, component: upgrade.component, error });
});

healthManager.on('component_unhealthy', (health) => {
  logger.error('Component unhealthy', { component: health.component });
});

// Express app
const app = express();
app.use(express.json());

// Health endpoints
app.get('/health', (_req: Request, res: Response) => {
  const health = healthManager.getSystemHealth();
  res.status(health.overall === 'healthy' ? 200 : 503).json(health);
});

app.get('/health/ready', (_req: Request, res: Response) => {
  res.json({ status: 'ready' });
});

app.get('/health/live', (_req: Request, res: Response) => {
  res.json({ status: 'live' });
});

// Trends API
app.get('/api/trends', (_req: Request, res: Response) => {
  res.json(trendAnalyzer.getAllTrends());
});

app.post('/api/trends/scan', async (_req: Request, res: Response) => {
  const trends = await trendAnalyzer.analyzeMarketTrends();
  res.json(trends);
});

// Threats API
app.get('/api/threats', (_req: Request, res: Response) => {
  res.json(trendAnalyzer.getAllThreats());
});

app.post('/api/threats/scan', async (_req: Request, res: Response) => {
  const threats = await trendAnalyzer.detectCompetitiveThreats();
  res.json(threats);
});

// Regulatory API
app.get('/api/regulatory', (_req: Request, res: Response) => {
  res.json(trendAnalyzer.getAllRegulatoryChanges());
});

app.post('/api/regulatory/scan', async (_req: Request, res: Response) => {
  const changes = await trendAnalyzer.detectRegulatoryChanges();
  res.json(changes);
});

// Upgrades API
app.get('/api/upgrades', (_req: Request, res: Response) => {
  res.json(upgradeManager.getAllUpgrades());
});

app.get('/api/upgrades/pending', (_req: Request, res: Response) => {
  res.json(upgradeManager.getPendingUpgrades());
});

app.get('/api/upgrades/active', (_req: Request, res: Response) => {
  res.json(upgradeManager.getActiveUpgrades());
});

app.get('/api/upgrades/:id', (req: Request, res: Response) => {
  const upgrade = upgradeManager.getUpgrade(req.params.id);
  if (!upgrade) {
    res.status(404).json({ error: 'Upgrade not found' });
    return;
  }
  res.json(upgrade);
});

app.post('/api/upgrades/:id/approve', async (req: Request, res: Response) => {
  const upgrade = upgradeManager.getUpgrade(req.params.id);
  if (!upgrade) {
    res.status(404).json({ error: 'Upgrade not found' });
    return;
  }
  const success = await upgradeManager.processUpgrade(req.params.id);
  res.json({ success, upgrade: upgradeManager.getUpgrade(req.params.id) });
});

// Component versions API
app.get('/api/components', (_req: Request, res: Response) => {
  res.json(upgradeManager.getComponentVersions());
});

// Policy API
app.get('/api/policy', (_req: Request, res: Response) => {
  res.json(upgradePolicy);
});

app.patch('/api/policy', (req: Request, res: Response) => {
  upgradeManager.updatePolicy(req.body);
  res.json({ success: true });
});

// Full scan endpoint
app.post('/api/scan', async (_req: Request, res: Response) => {
  logger.info('Running full infrastructure scan');
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
cron.schedule(`*/${sensorConfig.scanIntervalMinutes} * * * *`, async () => {
  logger.info('Running scheduled trend analysis');
  await trendAnalyzer.analyzeMarketTrends();
  await trendAnalyzer.detectCompetitiveThreats();
  await trendAnalyzer.detectRegulatoryChanges();
});

cron.schedule('0 */4 * * *', async () => {
  logger.info('Processing pending upgrades');
  for (const upgrade of upgradeManager.getPendingUpgrades()) {
    if (!upgradePolicy.requireApproval) {
      await upgradeManager.processUpgrade(upgrade.id);
    }
  }
});

// Start server
const server = app.listen(PORT, () => {
  logger.info(`Self-Upgrading Infrastructure service started on port ${PORT}`);
  healthManager.start();
});

// Graceful shutdown
const shutdown = async () => {
  logger.info('Shutting down gracefully...');
  healthManager.stop();
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export { app, trendAnalyzer, upgradeManager, healthManager };
