// server/src/routes/oracle.ts
import { Router } from 'express';
import { oracleService } from '../oracle/OracleService';
import { SimulationParameters } from '../oracle/oracle.types';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Project ORACLE
 *   description: API for the Causal Time-Loop Forecasting Engine.
 */

/**
 * @swagger
 * /api/oracle/run-simulation:
 *   post:
 *     summary: Initiate a new forecasting simulation
 *     tags: [Project ORACLE]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SimulationParameters'
 *     responses:
 *       202:
 *         description: Simulation accepted and started. Returns the initial run object.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SimulationRun'
 *       400:
 *         description: Invalid simulation parameters provided.
 */
router.post('/run-simulation', async (req, res, next) => {
  try {
    const params: SimulationParameters = req.body;
    if (!params.narrativeQuery || !params.horizonDays || !params.eventSigmaThreshold) {
      return res.status(400).json({ message: 'Missing required simulation parameters.' });
    }
    const simulationRun = await oracleService.runCausalLoop(params);
    res.status(202).json(simulationRun);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/oracle/timeline/{runId}:
 *   get:
 *     summary: Get the status and results of a forecasting run
 *     tags: [Project ORACLE]
 *     parameters:
 *       - in: path
 *         name: runId
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the simulation run.
 *     responses:
 *       200:
 *         description: The simulation run object, which may be in-progress or complete.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SimulationRun'
 *       404:
 *         description: Simulation run not found.
 */
router.get('/timeline/:runId', async (req, res, next) => {
  try {
    const { runId } = req.params;
    const timeline = await oracleService.getVerifiedTimeline(runId);
    if (timeline) {
      res.json(timeline);
    } else {
      res.status(404).json({ message: `Simulation run with ID ${runId} not found.` });
    }
  } catch (error) {
    next(error);
  }
});

export const oracleRouter = router;
