"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNarrativeRouter = createNarrativeRouter;
const express_1 = require("express");
const SimulationEngine_js_1 = require("../core/SimulationEngine.js");
const telemetry_js_1 = require("../telemetry.js");
function createNarrativeRouter(engine) {
    const router = (0, express_1.Router)();
    const telemetry = telemetry_js_1.simulationTelemetry;
    const runtime = engine ?? new SimulationEngine_js_1.SimulationEngine(telemetry);
    router.post('/api/narrative/init', (req, res) => {
        const config = req.body;
        try {
            runtime.initialize(config);
            res.status(200).json({
                status: 'initialized',
                timestamp: runtime.getState().timestamp,
            });
        }
        catch (error) {
            telemetry.logError('narrative_init_failed', {
                message: error.message,
            });
            res
                .status(400)
                .json({ status: 'error', message: error.message });
        }
    });
    router.post('/api/narrative/step', (_req, res) => {
        try {
            runtime.step();
            res
                .status(200)
                .json({ status: 'advanced', timestamp: runtime.getState().timestamp });
        }
        catch (error) {
            telemetry.logError('narrative_step_failed', {
                message: error.message,
            });
            res
                .status(400)
                .json({ status: 'error', message: error.message });
        }
    });
    router.post('/api/narrative/inject-event', (req, res) => {
        const event = req.body;
        try {
            runtime.injectEvent(event);
            res.status(202).json({ status: 'accepted', queueSize: 1 });
        }
        catch (error) {
            telemetry.logError('narrative_injection_failed', {
                message: error.message,
                eventType: event.type,
            });
            res
                .status(400)
                .json({ status: 'error', message: error.message });
        }
    });
    router.get('/api/narrative/state', (_req, res) => {
        try {
            const snapshot = runtime.getState().toJSON();
            res.status(200).json(snapshot);
        }
        catch (error) {
            telemetry.logError('narrative_state_failed', {
                message: error.message,
            });
            res
                .status(400)
                .json({ status: 'error', message: error.message });
        }
    });
    router.get('/api/narrative/metrics', async (_req, res) => {
        try {
            res.type('text/plain').send(await telemetry.metrics());
        }
        catch (error) {
            res
                .status(500)
                .json({ status: 'error', message: error.message });
        }
    });
    return router;
}
