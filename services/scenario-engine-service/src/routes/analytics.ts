/**
 * Analytics Routes
 * Compute and compare scenario metrics
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { ComputeMetricsRequestSchema, MetricType } from '../types/index.js';
import { ScenarioStore } from '../services/ScenarioStore.js';
import { ScenarioAnalytics } from '../services/ScenarioAnalytics.js';

export function createAnalyticsRoutes(store: ScenarioStore): Router {
  const router = Router();

  // ============================================================================
  // Compute Metrics
  // ============================================================================
  router.post('/:scenarioId/compute', async (req: Request, res: Response) => {
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
      } else if (context.scenario.baselineMetrics) {
        baselineMetrics = context.scenario.baselineMetrics;
      }

      // Update analytics config if topK specified
      if (includeTopK) {
        context.analytics = new ScenarioAnalytics(context.sandboxGraph, {
          topKNodes: includeTopK,
        });
      }

      const outcomeMetrics = await context.analytics.computeMetrics(
        computeDeltas !== false ? baselineMetrics : undefined,
        metrics as MetricType[]
      );

      // Store the computed metrics
      store.updateMetrics(scenarioId, outcomeMetrics);

      res.json({
        metrics: outcomeMetrics,
        computationTimeMs: outcomeMetrics.computationTimeMs,
      });
    } catch (error) {
      handleError(res, error);
    }
  });

  // ============================================================================
  // Get Current Metrics
  // ============================================================================
  router.get('/:scenarioId/metrics', (req: Request, res: Response) => {
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
    } catch (error) {
      handleError(res, error);
    }
  });

  // ============================================================================
  // Compare Scenarios
  // ============================================================================
  router.post('/compare', async (req: Request, res: Response) => {
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

      const comparison = await context1.analytics.compareScenarios(
        context1.sandboxGraph,
        context2.sandboxGraph
      );

      res.json({ comparison });
    } catch (error) {
      handleError(res, error);
    }
  });

  // ============================================================================
  // Get Baseline Metrics
  // ============================================================================
  router.get('/:scenarioId/baseline', (req: Request, res: Response) => {
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
    } catch (error) {
      handleError(res, error);
    }
  });

  // ============================================================================
  // Set Baseline Metrics
  // ============================================================================
  router.post('/:scenarioId/baseline', async (req: Request, res: Response) => {
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
      } else {
        // Compute current metrics as baseline
        baselineMetrics = await context.analytics.computeMetrics();
      }

      store.setBaselineMetrics(scenarioId, baselineMetrics);

      res.json({ baselineMetrics });
    } catch (error) {
      handleError(res, error);
    }
  });

  // ============================================================================
  // Get Deltas
  // ============================================================================
  router.get('/:scenarioId/deltas', (req: Request, res: Response) => {
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
    } catch (error) {
      handleError(res, error);
    }
  });

  // ============================================================================
  // Export Graph
  // ============================================================================
  router.get('/:scenarioId/export', async (req: Request, res: Response) => {
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
    } catch (error) {
      handleError(res, error);
    }
  });

  // ============================================================================
  // Get Top Nodes
  // ============================================================================
  router.get('/:scenarioId/top-nodes', async (req: Request, res: Response) => {
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

      const limit = k ? parseInt(k as string, 10) : 10;
      topNodes = topNodes.slice(0, limit);

      res.json({
        metric: metric || 'pagerank',
        topNodes,
      });
    } catch (error) {
      handleError(res, error);
    }
  });

  return router;
}

function handleError(res: Response, error: unknown): void {
  console.error('Analytics route error:', error);

  if (error instanceof z.ZodError) {
    res.status(400).json({
      error: 'Validation failed',
      details: error.flatten(),
    });
    return;
  }

  if (error instanceof Error) {
    const statusCode = (error as any).code === 'SCENARIO_NOT_FOUND' ? 404 : 500;

    res.status(statusCode).json({
      error: error.message,
      code: (error as any).code,
    });
    return;
  }

  res.status(500).json({
    error: 'Internal server error',
  });
}
