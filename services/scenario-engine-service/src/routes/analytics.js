"use strict";
// @ts-nocheck
/**
 * Analytics Routes
 * Compute and compare scenario metrics
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAnalyticsRoutes = createAnalyticsRoutes;
const express_1 = require("express");
const zod_1 = require("zod");
const ScenarioAnalytics_js_1 = require("../services/ScenarioAnalytics.js");
function createAnalyticsRoutes(store) {
    const router = (0, express_1.Router)();
    // ============================================================================
    // Compute Metrics
    // ============================================================================
    router.post('/:scenarioId/compute', async (req, res) => {
        try {
            const { scenarioId } = req.params;
            const { baselineScenarioId, metrics, includeTopK, computeDeltas } = req.body;
            const context = store.getContext(scenarioId);
            if (!context) {
                return res.status(404).json({
                    error: 'Scenario not found',
                    scenarioId,
                });
            }
            // Get baseline metrics if specified
            let baselineMetrics;
            if (baselineScenarioId) {
                const baselineContext = store.getContext(baselineScenarioId);
                if (baselineContext?.scenario.currentMetrics) {
                    baselineMetrics = baselineContext.scenario.currentMetrics;
                }
            }
            else if (context.scenario.baselineMetrics) {
                baselineMetrics = context.scenario.baselineMetrics;
            }
            // Update analytics config if topK specified
            if (includeTopK) {
                context.analytics = new ScenarioAnalytics_js_1.ScenarioAnalytics(context.sandboxGraph, {
                    topKNodes: includeTopK,
                });
            }
            const outcomeMetrics = await context.analytics.computeMetrics(computeDeltas !== false ? baselineMetrics : undefined, metrics);
            // Store the computed metrics
            store.updateMetrics(scenarioId, outcomeMetrics);
            res.json({
                metrics: outcomeMetrics,
                computationTimeMs: outcomeMetrics.computationTimeMs,
            });
        }
        catch (error) {
            handleError(res, error);
        }
    });
    // ============================================================================
    // Get Current Metrics
    // ============================================================================
    router.get('/:scenarioId/metrics', (req, res) => {
        try {
            const { scenarioId } = req.params;
            const context = store.getContext(scenarioId);
            if (!context) {
                return res.status(404).json({
                    error: 'Scenario not found',
                    scenarioId,
                });
            }
            const metrics = context.scenario.currentMetrics;
            if (!metrics) {
                return res.status(404).json({
                    error: 'Metrics not computed yet',
                    hint: 'POST to /:scenarioId/compute to compute metrics',
                });
            }
            res.json({ metrics });
        }
        catch (error) {
            handleError(res, error);
        }
    });
    // ============================================================================
    // Compare Scenarios
    // ============================================================================
    router.post('/compare', async (req, res) => {
        try {
            const { scenario1Id, scenario2Id } = req.body;
            if (!scenario1Id || !scenario2Id) {
                return res.status(400).json({
                    error: 'scenario1Id and scenario2Id are required',
                });
            }
            const context1 = store.getContext(scenario1Id);
            const context2 = store.getContext(scenario2Id);
            if (!context1) {
                return res.status(404).json({
                    error: 'Scenario 1 not found',
                    scenarioId: scenario1Id,
                });
            }
            if (!context2) {
                return res.status(404).json({
                    error: 'Scenario 2 not found',
                    scenarioId: scenario2Id,
                });
            }
            const comparison = await context1.analytics.compareScenarios(context1.sandboxGraph, context2.sandboxGraph);
            res.json({ comparison });
        }
        catch (error) {
            handleError(res, error);
        }
    });
    // ============================================================================
    // Get Baseline Metrics
    // ============================================================================
    router.get('/:scenarioId/baseline', (req, res) => {
        try {
            const { scenarioId } = req.params;
            const context = store.getContext(scenarioId);
            if (!context) {
                return res.status(404).json({
                    error: 'Scenario not found',
                    scenarioId,
                });
            }
            const baselineMetrics = context.scenario.baselineMetrics;
            if (!baselineMetrics) {
                return res.status(404).json({
                    error: 'No baseline metrics set',
                });
            }
            res.json({ baselineMetrics });
        }
        catch (error) {
            handleError(res, error);
        }
    });
    // ============================================================================
    // Set Baseline Metrics
    // ============================================================================
    router.post('/:scenarioId/baseline', async (req, res) => {
        try {
            const { scenarioId } = req.params;
            const { sourceScenarioId } = req.body;
            const context = store.getContext(scenarioId);
            if (!context) {
                return res.status(404).json({
                    error: 'Scenario not found',
                    scenarioId,
                });
            }
            let baselineMetrics;
            if (sourceScenarioId) {
                // Use metrics from another scenario as baseline
                const sourceContext = store.getContext(sourceScenarioId);
                if (!sourceContext?.scenario.currentMetrics) {
                    return res.status(400).json({
                        error: 'Source scenario has no computed metrics',
                    });
                }
                baselineMetrics = sourceContext.scenario.currentMetrics;
            }
            else {
                // Compute current metrics as baseline
                baselineMetrics = await context.analytics.computeMetrics();
            }
            store.setBaselineMetrics(scenarioId, baselineMetrics);
            res.json({ baselineMetrics });
        }
        catch (error) {
            handleError(res, error);
        }
    });
    // ============================================================================
    // Get Deltas
    // ============================================================================
    router.get('/:scenarioId/deltas', (req, res) => {
        try {
            const { scenarioId } = req.params;
            const context = store.getContext(scenarioId);
            if (!context) {
                return res.status(404).json({
                    error: 'Scenario not found',
                    scenarioId,
                });
            }
            const currentMetrics = context.scenario.currentMetrics;
            if (!currentMetrics) {
                return res.status(404).json({
                    error: 'No metrics computed yet',
                });
            }
            res.json({
                deltas: currentMetrics.deltas,
                baselineScenarioId: currentMetrics.baselineScenarioId,
            });
        }
        catch (error) {
            handleError(res, error);
        }
    });
    // ============================================================================
    // Export Graph
    // ============================================================================
    router.get('/:scenarioId/export', async (req, res) => {
        try {
            const { scenarioId } = req.params;
            const context = store.getContext(scenarioId);
            if (!context) {
                return res.status(404).json({
                    error: 'Scenario not found',
                    scenarioId,
                });
            }
            const graph = await context.sandboxGraph.exportGraph();
            res.json({
                scenarioId,
                nodes: graph.nodes,
                edges: graph.edges,
                stats: context.sandboxGraph.getStats(),
            });
        }
        catch (error) {
            handleError(res, error);
        }
    });
    // ============================================================================
    // Get Top Nodes
    // ============================================================================
    router.get('/:scenarioId/top-nodes', async (req, res) => {
        try {
            const { scenarioId } = req.params;
            const { metric, k } = req.query;
            const context = store.getContext(scenarioId);
            if (!context) {
                return res.status(404).json({
                    error: 'Scenario not found',
                    scenarioId,
                });
            }
            // Compute metrics if not available
            if (!context.scenario.currentMetrics) {
                await context.analytics.computeMetrics();
            }
            const metrics = context.scenario.currentMetrics;
            if (!metrics) {
                return res.status(500).json({
                    error: 'Failed to compute metrics',
                });
            }
            let topNodes;
            switch (metric) {
                case 'betweenness':
                    topNodes = metrics.topNodesByBetweenness;
                    break;
                case 'pagerank':
                default:
                    topNodes = metrics.topNodesByPageRank;
                    break;
            }
            const limit = k ? parseInt(k, 10) : 10;
            topNodes = topNodes.slice(0, limit);
            res.json({
                metric: metric || 'pagerank',
                topNodes,
            });
        }
        catch (error) {
            handleError(res, error);
        }
    });
    return router;
}
function handleError(res, error) {
    console.error('Analytics route error:', error);
    if (error instanceof zod_1.z.ZodError) {
        res.status(400).json({
            error: 'Validation failed',
            details: error.flatten(),
        });
        return;
    }
    if (error instanceof Error) {
        const statusCode = error.code === 'SCENARIO_NOT_FOUND' ? 404 : 500;
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
