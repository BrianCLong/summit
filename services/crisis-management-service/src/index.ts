import express from 'express';
import { CrisisManagementOrchestrator } from './orchestrator.js';
import { logger } from './logger.js';

const app = express();
const port = process.env.PORT || 3100;

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'crisis-management-service' });
});

// Initialize orchestrator
const orchestrator = new CrisisManagementOrchestrator();

// Incident Management Endpoints
app.post('/api/v1/incidents', async (req, res) => {
  try {
    const incident = await orchestrator.createIncident(req.body);
    res.status(201).json(incident);
  } catch (error: any) {
    logger.error('Error creating incident:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/v1/incidents/:id', async (req, res) => {
  try {
    const incident = await orchestrator.getIncident(req.params.id);
    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }
    res.json(incident);
  } catch (error: any) {
    logger.error('Error fetching incident:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/v1/incidents', async (req, res) => {
  try {
    const incidents = await orchestrator.getActiveIncidents();
    res.json(incidents);
  } catch (error: any) {
    logger.error('Error fetching incidents:', error);
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/v1/incidents/:id/activate', async (req, res) => {
  try {
    await orchestrator.activateIncident(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    logger.error('Error activating incident:', error);
    res.status(500).json({ error: error.message });
  }
});

// Alert Management
app.get('/api/v1/alerts', async (req, res) => {
  try {
    const alerts = await orchestrator.getActiveAlerts();
    res.json(alerts);
  } catch (error: any) {
    logger.error('Error fetching alerts:', error);
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/v1/alerts/:id/acknowledge', async (req, res) => {
  try {
    await orchestrator.acknowledgeAlert(req.params.id, req.body.userId);
    res.json({ success: true });
  } catch (error: any) {
    logger.error('Error acknowledging alert:', error);
    res.status(500).json({ error: error.message });
  }
});

// Situational Awareness
app.get('/api/v1/incidents/:id/cop', async (req, res) => {
  try {
    const cop = await orchestrator.getCommonOperatingPicture(req.params.id);
    res.json(cop);
  } catch (error: any) {
    logger.error('Error fetching COP:', error);
    res.status(500).json({ error: error.message });
  }
});

// Resource Management
app.get('/api/v1/resources/available', async (req, res) => {
  try {
    const resources = await orchestrator.getAvailableResources();
    res.json(resources);
  } catch (error: any) {
    logger.error('Error fetching resources:', error);
    res.status(500).json({ error: error.message });
  }
});

// Medical Response
app.get('/api/v1/medical/statistics', async (req, res) => {
  try {
    const stats = await orchestrator.getMedicalStatistics();
    res.json(stats);
  } catch (error: any) {
    logger.error('Error fetching medical statistics:', error);
    res.status(500).json({ error: error.message });
  }
});

// Evacuation
app.get('/api/v1/evacuation/progress', async (req, res) => {
  try {
    const progress = await orchestrator.getEvacuationProgress();
    res.json(progress);
  } catch (error: any) {
    logger.error('Error fetching evacuation progress:', error);
    res.status(500).json({ error: error.message });
  }
});

// Analytics Dashboard
app.get('/api/v1/dashboard', async (req, res) => {
  try {
    const dashboard = await orchestrator.getDashboardData();
    res.json(dashboard);
  } catch (error: any) {
    logger.error('Error fetching dashboard:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(port, () => {
  logger.info(`Crisis Management Service listening on port ${port}`);
});

export default app;
