import express from 'express';
import pinoHttp from 'pino-http';
import pino from 'pino';
import { AlertManager } from './alert-manager';
import { AlertSeverity } from './alert-types';

const logger = pino({ name: 'alert-engine-server' });
const app = express();

app.use(express.json());
app.use(pinoHttp({ logger }));

// Initialize alert manager
const alertManager = new AlertManager(process.env.REDIS_URL);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'alert-engine' });
});

// Get active alerts
app.get('/api/alerts', async (req, res) => {
  try {
    const { severity, source, limit } = req.query;

    const alerts = await alertManager.getActiveAlerts({
      severity: severity as AlertSeverity,
      source: source as string,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    res.json({ alerts });
  } catch (error) {
    logger.error({ error }, 'Failed to get alerts');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get alert statistics
app.get('/api/alerts/stats', async (req, res) => {
  try {
    const stats = await alertManager.getStatistics();
    res.json(stats);
  } catch (error) {
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
  } catch (error) {
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
  } catch (error) {
    logger.error({ error }, 'Failed to resolve alert');
    res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 3003;

app.listen(PORT, () => {
  logger.info({ port: PORT }, 'Alert Engine server started');
});

export { app, alertManager };
