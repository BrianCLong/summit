"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.oracleRouter = void 0;
// server/src/routes/oracle.ts
const express_1 = require("express");
const OracleService_js_1 = require("../oracle/OracleService.js");
const router = (0, express_1.Router)();
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
        const params = req.body;
        if (!params.narrativeQuery || !params.horizonDays || !params.eventSigmaThreshold) {
            return res.status(400).json({ message: 'Missing required simulation parameters.' });
        }
        const simulationRun = await OracleService_js_1.oracleService.runCausalLoop(params);
        res.status(202).json(simulationRun);
    }
    catch (error) {
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
        const timeline = await OracleService_js_1.oracleService.getVerifiedTimeline(runId);
        if (timeline) {
            res.json(timeline);
        }
        else {
            res.status(404).json({ message: `Simulation run with ID ${runId} not found.` });
        }
    }
    catch (error) {
        next(error);
    }
});
exports.oracleRouter = router;
