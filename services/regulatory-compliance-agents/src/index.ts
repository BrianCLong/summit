import express from 'express';
import cron from 'node-cron';
import { ComplianceOrchestrator } from './services/ComplianceOrchestrator.js';
import { logger } from './utils/logger.js';

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3400;

// Initialize orchestrator
const orchestrator = new ComplianceOrchestrator(undefined, {
  autoApplyLowRiskAdaptations: process.env.AUTO_APPLY_ADAPTATIONS === 'true',
  riskThresholdForAutoApply: parseInt(process.env.RISK_THRESHOLD || '30', 10),
  enableCrossBorderMonitoring: true,
  jurisdictions: (process.env.JURISDICTIONS || 'US,EU,UK').split(','),
});

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'regulatory-compliance-agents',
    timestamp: new Date().toISOString(),
  });
});

// Get system statistics
app.get('/api/stats', (_req, res) => {
  res.json(orchestrator.getStats());
});

// Generate compliance report
app.get('/api/reports', (req, res) => {
  const startDate = req.query.start ? new Date(String(req.query.start)) : undefined;
  const endDate = req.query.end ? new Date(String(req.query.end)) : undefined;
  const report = orchestrator.generateReport(startDate, endDate);
  res.json(report);
});

// Get event log
app.get('/api/events', (req, res) => {
  const limit = parseInt(String(req.query.limit || '100'), 10);
  res.json(orchestrator.getEventLog(limit));
});

// Manually analyze a regulation
app.post('/api/analyze', async (req, res) => {
  try {
    const { url, jurisdiction } = req.body;
    if (!url || !jurisdiction) {
      return res.status(400).json({ error: 'url and jurisdiction required' });
    }

    const result = await orchestrator.analyzeRegulationUrl(url, jurisdiction);
    res.json(result);
  } catch (error) {
    logger.error({ error }, 'Analysis failed');
    res.status(500).json({ error: 'Analysis failed' });
  }
});

// Get pending adaptations
app.get('/api/adaptations/pending', (_req, res) => {
  res.json(orchestrator.getPendingAdaptations());
});

// Approve an adaptation
app.post('/api/adaptations/:id/approve', (req, res) => {
  const { id } = req.params;
  const { approvedBy } = req.body;

  if (!approvedBy) {
    return res.status(400).json({ error: 'approvedBy required' });
  }

  const success = orchestrator.approveAdaptation(id, approvedBy);
  if (success) {
    res.json({ message: 'Adaptation approved', id });
  } else {
    res.status(404).json({ error: 'Adaptation not found or not pending' });
  }
});

// Apply an adaptation
app.post('/api/adaptations/:id/apply', async (req, res) => {
  const { id } = req.params;
  const success = await orchestrator.applyAdaptation(id);
  if (success) {
    res.json({ message: 'Adaptation applied', id });
  } else {
    res.status(400).json({ error: 'Failed to apply adaptation' });
  }
});

// Event listener for compliance cycles
orchestrator.on('compliance_cycle_complete', (data) => {
  logger.info({
    regulationId: data.regulationId,
    riskScore: data.assessment?.riskScore,
    adaptations: data.adaptations?.length,
  }, 'Compliance cycle completed');
});

// Schedule daily compliance report generation
cron.schedule('0 6 * * *', () => {
  logger.info('Generating daily compliance report');
  const report = orchestrator.generateReport();
  logger.info({
    regulationsDetected: report.summary.regulationsDetected,
    adaptationsCreated: report.summary.adaptationsCreated,
    avgRiskScore: report.summary.averageRiskScore,
  }, 'Daily report generated');
});

// Graceful shutdown
const shutdown = async () => {
  logger.info('Shutting down...');
  orchestrator.stop();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start server
app.listen(PORT, async () => {
  logger.info({ port: PORT }, 'Regulatory Compliance Agents service started');

  // Start monitoring
  await orchestrator.start();
});

export { app, orchestrator };
