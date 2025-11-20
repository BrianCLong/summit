/**
 * Schedule API routes
 */

import express from 'express';
import { OrchestrationController } from '../controllers/OrchestrationController.js';

export function createScheduleRouter(controller: OrchestrationController) {
  const router = express.Router();

  /**
   * GET /api/schedules
   * List all schedules
   */
  router.get('/', (req, res) => {
    try {
      const schedules = controller.scheduler.getAllSchedules();
      res.json({ schedules, total: schedules.length });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  /**
   * GET /api/schedules/:dagId
   * Get schedule for DAG
   */
  router.get('/:dagId', (req, res) => {
    try {
      const schedule = controller.scheduler.getSchedule(req.params.dagId);
      if (!schedule) {
        return res.status(404).json({ error: 'Schedule not found' });
      }

      const nextRun = controller.scheduler.getNextRunTime(req.params.dagId);
      const prevRun = controller.scheduler.getPreviousRunTime(req.params.dagId);

      res.json({ schedule, nextRun, prevRun });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  /**
   * POST /api/schedules
   * Add schedule
   */
  router.post('/', (req, res) => {
    try {
      controller.scheduler.addSchedule(req.body);
      res.status(201).json({ message: 'Schedule added' });
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });

  /**
   * DELETE /api/schedules/:dagId
   * Remove schedule
   */
  router.delete('/:dagId', (req, res) => {
    try {
      controller.scheduler.removeSchedule(req.params.dagId);
      res.json({ message: 'Schedule removed' });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  /**
   * POST /api/schedules/:dagId/pause
   * Pause schedule
   */
  router.post('/:dagId/pause', (req, res) => {
    try {
      controller.scheduler.pauseSchedule(req.params.dagId);
      res.json({ message: 'Schedule paused' });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  /**
   * POST /api/schedules/:dagId/resume
   * Resume schedule
   */
  router.post('/:dagId/resume', (req, res) => {
    try {
      controller.scheduler.resumeSchedule(req.params.dagId);
      res.json({ message: 'Schedule resumed' });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  return router;
}
