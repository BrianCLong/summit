/**
 * SIGINT Service API Routes
 * TRAINING/SIMULATION ONLY
 */

import { Router } from 'express';
import { SIGINTEngine } from '../processing/SIGINTEngine';
import { ComplianceManager } from '../compliance/ComplianceManager';

export function createAPIRouter(
  engine: SIGINTEngine,
  compliance: ComplianceManager
): Router {
  const router = Router();

  // Middleware to log all API access
  router.use((req, res, next) => {
    compliance.log('API_ACCESS', `${req.method} ${req.path}`, {
      userId: req.headers['x-user-id'] as string,
      sessionId: req.headers['x-session-id'] as string
    });
    next();
  });

  // Engine status
  router.get('/status', (req, res) => {
    res.json({
      ...engine.getStatus(),
      disclaimer: 'TRAINING/SIMULATION ONLY'
    });
  });

  // Start engine
  router.post('/engine/start', async (req, res) => {
    try {
      await engine.start();
      res.json({ success: true, status: engine.getStatus() });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Stop engine
  router.post('/engine/stop', async (req, res) => {
    try {
      await engine.stop();
      res.json({ success: true, status: engine.getStatus() });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Submit processing task
  router.post('/tasks', (req, res) => {
    const { type, data, priority } = req.body;

    if (!['COMINT', 'ELINT', 'NETWORK', 'GEOLOCATION'].includes(type)) {
      return res.status(400).json({ error: 'Invalid task type' });
    }

    const taskId = engine.submitTask(type, data, priority);
    res.json({ taskId, status: 'submitted' });
  });

  // Generate training scenario
  router.post('/training/scenario', async (req, res) => {
    const { type = 'basic' } = req.body;

    if (!['basic', 'advanced', 'full'].includes(type)) {
      return res.status(400).json({ error: 'Invalid scenario type' });
    }

    try {
      const scenario = await engine.generateTrainingScenario(type);
      res.json({
        success: true,
        scenario,
        disclaimer: 'SIMULATED DATA FOR TRAINING ONLY'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get spectrum data
  router.get('/spectrum', (req, res) => {
    const monitor = engine.getSpectrumMonitor();
    res.json({
      running: monitor.isRunning(),
      signals: monitor.getActiveSignals(),
      disclaimer: 'SIMULATED SPECTRUM DATA'
    });
  });

  // Get communications network
  router.get('/comms/network', (req, res) => {
    const mapper = engine.getCommunicationsMapper();
    res.json({
      nodes: mapper.getNodes(),
      edges: mapper.getEdges(),
      metrics: mapper.calculateMetrics(),
      disclaimer: 'SIMULATED COMMUNICATIONS DATA'
    });
  });

  // Get active tracks
  router.get('/geolocation/tracks', (req, res) => {
    const trackManager = engine.getTrackManager();
    res.json({
      tracks: trackManager.getActiveTracks(),
      total: trackManager.getTracks().length,
      disclaimer: 'SIMULATED TRACK DATA'
    });
  });

  // Compliance routes
  router.get('/compliance/status', (req, res) => {
    res.json({
      status: compliance.getComplianceStatus(),
      mode: 'TRAINING'
    });
  });

  router.get('/compliance/audit', (req, res) => {
    const { startDate, endDate, action, userId } = req.query;

    const report = compliance.getAuditReport({
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      action: action as string,
      userId: userId as string
    });

    res.json(report);
  });

  router.get('/compliance/authorities', (req, res) => {
    res.json({
      authorities: compliance.getAuthorities(),
      mode: 'TRAINING'
    });
  });

  router.post('/compliance/minimize', (req, res) => {
    const { content, triggers } = req.body;

    if (!content || !triggers) {
      return res.status(400).json({ error: 'Content and triggers required' });
    }

    const result = compliance.applyMinimization(content, triggers);
    res.json(result);
  });

  router.get('/compliance/export', (req, res) => {
    const report = compliance.exportForOversight();
    res.json(report);
  });

  return router;
}
