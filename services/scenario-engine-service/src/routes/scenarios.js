"use strict";
// @ts-nocheck
/**
 * Scenario Routes
 * CRUD operations for scenarios
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createScenarioRoutes = createScenarioRoutes;
const express_1 = require("express");
const zod_1 = require("zod");
const index_js_1 = require("../types/index.js");
function createScenarioRoutes(store) {
    const router = (0, express_1.Router)();
    // ============================================================================
    // Create Scenario
    // ============================================================================
    router.post('/', async (req, res) => {
        try {
            const tenantReq = req;
            const validationResult = index_js_1.CreateScenarioRequestSchema.safeParse({
                ...req.body,
                tenantId: tenantReq.tenantId,
                createdBy: tenantReq.userId,
            });
            if (!validationResult.success) {
                return res.status(400).json({
                    error: 'Validation failed',
                    details: validationResult.error.flatten(),
                });
            }
            const { name, description, mode, params, tenantId, createdBy, assumptions, tags } = validationResult.data;
            const context = await store.createScenario({
                name,
                description,
                mode,
                scenarioParams: params,
                tenantId,
                createdBy,
                assumptions,
                tags,
            });
            res.status(201).json({
                scenario: context.scenario,
                graphStats: context.sandboxGraph.getStats(),
            });
        }
        catch (error) {
            handleError(res, error);
        }
    });
    // ============================================================================
    // List Scenarios
    // ============================================================================
    router.get('/', (req, res) => {
        try {
            const tenantReq = req;
            const { status, mode, tags, limit, offset } = req.query;
            const scenarios = store.listScenarios(tenantReq.tenantId, {
                status: status,
                mode: mode,
                tags: tags ? tags.split(',') : undefined,
                limit: limit ? parseInt(limit, 10) : undefined,
                offset: offset ? parseInt(offset, 10) : undefined,
            });
            res.json({
                scenarios,
                total: scenarios.length,
            });
        }
        catch (error) {
            handleError(res, error);
        }
    });
    // ============================================================================
    // Get Scenario
    // ============================================================================
    router.get('/:scenarioId', (req, res) => {
        try {
            const { scenarioId } = req.params;
            const context = store.getContext(scenarioId);
            if (!context) {
                return res.status(404).json({
                    error: 'Scenario not found',
                    scenarioId,
                });
            }
            res.json({
                scenario: context.scenario,
                graphStats: context.sandboxGraph.getStats(),
            });
        }
        catch (error) {
            handleError(res, error);
        }
    });
    // ============================================================================
    // Update Scenario
    // ============================================================================
    router.patch('/:scenarioId', (req, res) => {
        try {
            const { scenarioId } = req.params;
            const { name, description, assumptions, tags, notes, status } = req.body;
            const scenario = store.updateScenario(scenarioId, {
                name,
                description,
                assumptions,
                tags,
                notes,
                status,
            });
            if (!scenario) {
                return res.status(404).json({
                    error: 'Scenario not found',
                    scenarioId,
                });
            }
            res.json({ scenario });
        }
        catch (error) {
            handleError(res, error);
        }
    });
    // ============================================================================
    // Delete Scenario
    // ============================================================================
    router.delete('/:scenarioId', (req, res) => {
        try {
            const { scenarioId } = req.params;
            const deleted = store.deleteScenario(scenarioId);
            if (!deleted) {
                return res.status(404).json({
                    error: 'Scenario not found',
                    scenarioId,
                });
            }
            res.status(204).send();
        }
        catch (error) {
            handleError(res, error);
        }
    });
    // ============================================================================
    // Branch Scenario
    // ============================================================================
    router.post('/:scenarioId/branch', async (req, res) => {
        try {
            const tenantReq = req;
            const { scenarioId } = req.params;
            const { name, description } = req.body;
            if (!name) {
                return res.status(400).json({
                    error: 'Name is required for branch',
                });
            }
            const context = await store.branchScenario(scenarioId, {
                name,
                description,
                createdBy: tenantReq.userId,
            });
            res.status(201).json({
                scenario: context.scenario,
                graphStats: context.sandboxGraph.getStats(),
            });
        }
        catch (error) {
            handleError(res, error);
        }
    });
    // ============================================================================
    // Snapshot Scenario
    // ============================================================================
    router.post('/:scenarioId/snapshot', async (req, res) => {
        try {
            const { scenarioId } = req.params;
            const scenario = await store.snapshotScenario(scenarioId);
            res.json({
                scenario,
                metrics: scenario.currentMetrics,
            });
        }
        catch (error) {
            handleError(res, error);
        }
    });
    // ============================================================================
    // Activate Scenario
    // ============================================================================
    router.post('/:scenarioId/activate', (req, res) => {
        try {
            const { scenarioId } = req.params;
            const scenario = store.activateScenario(scenarioId);
            res.json({ scenario });
        }
        catch (error) {
            handleError(res, error);
        }
    });
    // ============================================================================
    // Archive Scenario
    // ============================================================================
    router.post('/:scenarioId/archive', (req, res) => {
        try {
            const { scenarioId } = req.params;
            const scenario = store.archiveScenario(scenarioId);
            res.json({ scenario });
        }
        catch (error) {
            handleError(res, error);
        }
    });
    // ============================================================================
    // Get Delta History
    // ============================================================================
    router.get('/:scenarioId/deltas', (req, res) => {
        try {
            const { scenarioId } = req.params;
            const deltas = store.getDeltaHistory(scenarioId);
            res.json({
                deltas,
                total: deltas.length,
            });
        }
        catch (error) {
            handleError(res, error);
        }
    });
    return router;
}
function handleError(res, error) {
    console.error('Scenario route error:', error);
    if (error instanceof zod_1.z.ZodError) {
        res.status(400).json({
            error: 'Validation failed',
            details: error.flatten(),
        });
        return;
    }
    if (error instanceof Error) {
        const statusCode = error.code === 'SCENARIO_NOT_FOUND' ? 404 :
            error.code === 'PRODUCTION_DATA_GUARD' ? 403 :
                error.code === 'SCENARIO_LIMIT_EXCEEDED' ? 429 : 500;
        res.status(statusCode).json({
            error: error.message,
            code: error.code,
        });
        return;
    }
    res.status(500).json({
        error: 'Internal server error',
    });
}
