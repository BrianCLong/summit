/**
 * Monitoring API routes
 */

import express from 'express';
import { OrchestrationController } from '../controllers/OrchestrationController.js';

export function createMonitoringRouter(controller: OrchestrationController) {
  const router = express.Router();

  /**
   * GET /api/monitoring/metrics
   * Get metrics
   */
  router.get('/metrics', (req, res) => {
    try {
      const metricName = req.query.name as string;

      if (metricName) {
        const metrics = controller.metricsCollector.getMetricsByName(metricName);
        res.json({ metrics });
      } else {
        const metrics = controller.metricsCollector.getAllMetrics();
        res.json({ metrics, total: metrics.length });
      }
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  /**
   * GET /api/monitoring/metrics/:name/stats
   * Get metric statistics
   */
  router.get('/metrics/:name/stats', (req, res) => {
    try {
      const stats = controller.metricsCollector.getMetricStats(req.params.name);
      if (!stats) {
        return res.status(404).json({ error: 'Metric not found' });
      }
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  /**
   * GET /api/monitoring/alerts
   * Get alerts
   */
  router.get('/alerts', (req, res) => {
    try {
      const severity = req.query.severity as any;

      let alerts;
      if (severity) {
        alerts = controller.alertManager.getAlertsBySeverity(severity);
      } else if (req.query.active === 'true') {
        alerts = controller.alertManager.getActiveAlerts();
      } else {
        alerts = controller.alertManager.getAllAlerts();
      }

      res.json({ alerts, total: alerts.length });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  /**
   * POST /api/monitoring/alerts/:alertId/resolve
   * Resolve alert
   */
  router.post('/alerts/:alertId/resolve', (req, res) => {
    try {
      controller.alertManager.resolveAlert(req.params.alertId);
      res.json({ message: 'Alert resolved' });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  /**
   * GET /api/monitoring/statistics
   * Get overall statistics
   */
  router.get('/statistics', (req, res) => {
    try {
      const stats = controller.stateManager.getStatistics();
      const activeWorkflows = controller.stateManager.getActiveWorkflows();
      const activeAlerts = controller.alertManager.getActiveAlerts();

      res.json({
        ...stats,
        activeWorkflows: activeWorkflows.length,
        activeAlerts: activeAlerts.length,
      });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  /**
   * GET /api/monitoring/workers
   * Get worker pool status
   */
  router.get('/workers', (req, res) => {
    try {
      const workers = controller.workerPool.getAllWorkers();
      res.json({
        workers: workers.map(w => ({
          workerId: w.workerId,
          status: w.status,
          concurrency: w.config.concurrency,
          currentTasks: w.currentTasks.size,
          totalTasksExecuted: w.totalTasksExecuted,
          lastHeartbeat: w.lastHeartbeat,
        })),
        total: workers.length,
        active: workers.filter(w => w.status !== 'offline').length,
      });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  return router;
}
