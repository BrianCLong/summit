"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ScenarioService_js_1 = require("../cases/scenarios/ScenarioService.js");
const logger_js_1 = __importDefault(require("../config/logger.js"));
const router = (0, express_1.Router)();
const routeLogger = logger_js_1.default.child({ name: 'ScenarioRoutes' });
/**
 * Helper to extract user from request
 */
function getUserId(req) {
    // SEC-2025-008: Do not trust x-user-id header for scenarios.
    // Rely exclusively on the authenticated req.user object.
    return req.user?.id || req.user?.sub || req.user?.email || 'system';
}
/**
 * GET /api/scenarios/investigation/:id
 * List scenarios for a specific investigation
 */
router.get('/investigation/:id', (req, res) => {
    try {
        const { id } = req.params;
        const scenarios = ScenarioService_js_1.scenarioService.getScenariosForInvestigation(id);
        res.json(scenarios);
    }
    catch (error) {
        routeLogger.error({ error: error.message }, 'Failed to list scenarios');
        res.status(500).json({ error: error.message });
    }
});
/**
 * GET /api/scenarios/:id
 * Get a specific scenario
 */
router.get('/:id', (req, res) => {
    try {
        const { id } = req.params;
        const scenario = ScenarioService_js_1.scenarioService.getScenario(id);
        if (!scenario) {
            return res.status(404).json({ error: 'Scenario not found' });
        }
        res.json(scenario);
    }
    catch (error) {
        routeLogger.error({ error: error.message }, 'Failed to get scenario');
        res.status(500).json({ error: error.message });
    }
});
/**
 * POST /api/scenarios
 * Create a new scenario
 */
router.post('/', async (req, res) => {
    try {
        const { investigationId, name, description } = req.body;
        const userId = getUserId(req);
        if (!investigationId || !name) {
            return res.status(400).json({ error: 'investigationId and name are required' });
        }
        const scenario = await ScenarioService_js_1.scenarioService.createScenario(investigationId, name, description, userId);
        res.status(201).json(scenario);
    }
    catch (error) {
        routeLogger.error({ error: error.message }, 'Failed to create scenario');
        res.status(500).json({ error: error.message });
    }
});
/**
 * POST /api/scenarios/:id/modifications
 * Add a modification to a scenario
 */
router.post('/:id/modifications', async (req, res) => {
    try {
        const { id } = req.params;
        const { type, data, targetId } = req.body;
        const userId = getUserId(req);
        if (!type) {
            return res.status(400).json({ error: 'Modification type is required' });
        }
        const scenario = await ScenarioService_js_1.scenarioService.addModification(id, type, data, targetId, userId);
        res.json(scenario);
    }
    catch (error) {
        routeLogger.error({ error: error.message }, 'Failed to add modification');
        res.status(500).json({ error: error.message });
    }
});
/**
 * POST /api/scenarios/:id/resolve
 * Resolve scenario state (simulation)
 * NOTE: Currently this endpoint expects the client to provide the base state context
 * because the investigation service only holds IDs. In a full implementation,
 * the backend would fetch this from Neo4j/Postgres.
 */
router.post('/:id/resolve', async (req, res) => {
    try {
        const { id } = req.params;
        const { entities, relationships, timeline } = req.body; // Base state provided by client
        const result = ScenarioService_js_1.scenarioService.resolveState(id, entities || [], relationships || [], timeline || []);
        res.json(result);
    }
    catch (error) {
        routeLogger.error({ error: error.message }, 'Failed to resolve scenario');
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
