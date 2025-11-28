/**
 * What-If Routes
 * Operations for scenario manipulation
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { WhatIfOperationSchema } from '../types/index.js';
import { ScenarioStore } from '../services/ScenarioStore.js';

export function createWhatIfRoutes(store: ScenarioStore): Router {
  const router = Router();

  // ============================================================================
  // Execute What-If Operation
  // ============================================================================
  router.post('/:scenarioId/execute', async (req: Request, res: Response) => {
    try {
      const { scenarioId } = req.params;
      const { operation, description } = req.body;

      const context = store.getContext(scenarioId);
      if (!context) {
        return res.status(404).json({
          error: 'Scenario not found',
          scenarioId,
        });
      }

      const validationResult = WhatIfOperationSchema.safeParse(operation);
      if (!validationResult.success) {
        return res.status(400).json({
          error: 'Invalid operation',
          details: validationResult.error.flatten(),
        });
      }

      const result = await context.whatIfOps.execute(validationResult.data, description);

      if (result.success) {
        store.addDeltaSet(scenarioId, result.deltaSet);
      }

      res.json({
        success: result.success,
        deltaSet: result.deltaSet,
        affectedNodeIds: result.affectedNodeIds,
        affectedEdgeIds: result.affectedEdgeIds,
        warnings: result.warnings,
        errors: result.errors,
        graphStats: context.sandboxGraph.getStats(),
      });
    } catch (error) {
      handleError(res, error);
    }
  });

  // ============================================================================
  // Execute Batch Operations
  // ============================================================================
  router.post('/:scenarioId/execute-batch', async (req: Request, res: Response) => {
    try {
      const { scenarioId } = req.params;
      const { operations, description } = req.body;

      const context = store.getContext(scenarioId);
      if (!context) {
        return res.status(404).json({
          error: 'Scenario not found',
          scenarioId,
        });
      }

      if (!Array.isArray(operations)) {
        return res.status(400).json({
          error: 'Operations must be an array',
        });
      }

      const validatedOps = [];
      for (const op of operations) {
        const result = WhatIfOperationSchema.safeParse(op);
        if (!result.success) {
          return res.status(400).json({
            error: 'Invalid operation in batch',
            details: result.error.flatten(),
          });
        }
        validatedOps.push(result.data);
      }

      const result = await context.whatIfOps.executeBatch(validatedOps, description);

      for (const deltaSet of result.deltaSets) {
        if (deltaSet.applied) {
          store.addDeltaSet(scenarioId, deltaSet);
        }
      }

      res.json({
        totalOperations: result.totalOperations,
        successfulOperations: result.successfulOperations,
        failedOperations: result.failedOperations,
        deltaSets: result.deltaSets,
        graphStats: context.sandboxGraph.getStats(),
      });
    } catch (error) {
      handleError(res, error);
    }
  });

  // ============================================================================
  // Add Entity (Convenience)
  // ============================================================================
  router.post('/:scenarioId/entities', async (req: Request, res: Response) => {
    try {
      const { scenarioId } = req.params;
      const { type, name, attributes } = req.body;

      const context = store.getContext(scenarioId);
      if (!context) {
        return res.status(404).json({
          error: 'Scenario not found',
          scenarioId,
        });
      }

      if (!type || !name) {
        return res.status(400).json({
          error: 'Type and name are required',
        });
      }

      const result = await context.whatIfOps.addEntity(type, name, attributes || {});

      if (result.success) {
        store.addDeltaSet(scenarioId, result.deltaSet);
      }

      res.status(201).json({
        success: result.success,
        nodeId: result.affectedNodeIds[0],
        deltaSet: result.deltaSet,
        graphStats: context.sandboxGraph.getStats(),
      });
    } catch (error) {
      handleError(res, error);
    }
  });

  // ============================================================================
  // Remove Entity (Convenience)
  // ============================================================================
  router.delete('/:scenarioId/entities/:entityId', async (req: Request, res: Response) => {
    try {
      const { scenarioId, entityId } = req.params;

      const context = store.getContext(scenarioId);
      if (!context) {
        return res.status(404).json({
          error: 'Scenario not found',
          scenarioId,
        });
      }

      const result = await context.whatIfOps.removeEntity(entityId);

      if (result.success) {
        store.addDeltaSet(scenarioId, result.deltaSet);
      }

      res.json({
        success: result.success,
        deltaSet: result.deltaSet,
        graphStats: context.sandboxGraph.getStats(),
      });
    } catch (error) {
      handleError(res, error);
    }
  });

  // ============================================================================
  // Create Relationship (Convenience)
  // ============================================================================
  router.post('/:scenarioId/relationships', async (req: Request, res: Response) => {
    try {
      const { scenarioId } = req.params;
      const { fromId, toId, type, attributes } = req.body;

      const context = store.getContext(scenarioId);
      if (!context) {
        return res.status(404).json({
          error: 'Scenario not found',
          scenarioId,
        });
      }

      if (!fromId || !toId || !type) {
        return res.status(400).json({
          error: 'fromId, toId, and type are required',
        });
      }

      const result = await context.whatIfOps.createRelationship(
        fromId,
        toId,
        type,
        attributes || {}
      );

      if (result.success) {
        store.addDeltaSet(scenarioId, result.deltaSet);
      }

      res.status(201).json({
        success: result.success,
        edgeId: result.affectedEdgeIds[0],
        deltaSet: result.deltaSet,
        graphStats: context.sandboxGraph.getStats(),
      });
    } catch (error) {
      handleError(res, error);
    }
  });

  // ============================================================================
  // Remove Relationship (Convenience)
  // ============================================================================
  router.delete('/:scenarioId/relationships/:relationshipId', async (req: Request, res: Response) => {
    try {
      const { scenarioId, relationshipId } = req.params;

      const context = store.getContext(scenarioId);
      if (!context) {
        return res.status(404).json({
          error: 'Scenario not found',
          scenarioId,
        });
      }

      const result = await context.whatIfOps.removeRelationship(relationshipId);

      if (result.success) {
        store.addDeltaSet(scenarioId, result.deltaSet);
      }

      res.json({
        success: result.success,
        deltaSet: result.deltaSet,
        graphStats: context.sandboxGraph.getStats(),
      });
    } catch (error) {
      handleError(res, error);
    }
  });

  // ============================================================================
  // Delay Event (Convenience)
  // ============================================================================
  router.post('/:scenarioId/delay-event', async (req: Request, res: Response) => {
    try {
      const { scenarioId } = req.params;
      const { targetId, targetType, delayMs, timestampField } = req.body;

      const context = store.getContext(scenarioId);
      if (!context) {
        return res.status(404).json({
          error: 'Scenario not found',
          scenarioId,
        });
      }

      if (!targetId || !targetType || delayMs === undefined) {
        return res.status(400).json({
          error: 'targetId, targetType, and delayMs are required',
        });
      }

      const result = await context.whatIfOps.delayEvent(
        targetId,
        targetType,
        delayMs,
        timestampField
      );

      if (result.success) {
        store.addDeltaSet(scenarioId, result.deltaSet);
      }

      res.json({
        success: result.success,
        deltaSet: result.deltaSet,
      });
    } catch (error) {
      handleError(res, error);
    }
  });

  // ============================================================================
  // Enable/Disable Rules
  // ============================================================================
  router.post('/:scenarioId/rules/:ruleId/enable', async (req: Request, res: Response) => {
    try {
      const { scenarioId, ruleId } = req.params;
      const { parameters } = req.body;

      const context = store.getContext(scenarioId);
      if (!context) {
        return res.status(404).json({
          error: 'Scenario not found',
          scenarioId,
        });
      }

      const result = await context.whatIfOps.enableDetectionRule(ruleId, parameters);

      if (result.success) {
        store.addDeltaSet(scenarioId, result.deltaSet);
      }

      res.json({
        success: result.success,
        rule: context.whatIfOps.getRuleById(ruleId),
      });
    } catch (error) {
      handleError(res, error);
    }
  });

  router.post('/:scenarioId/rules/:ruleId/disable', async (req: Request, res: Response) => {
    try {
      const { scenarioId, ruleId } = req.params;

      const context = store.getContext(scenarioId);
      if (!context) {
        return res.status(404).json({
          error: 'Scenario not found',
          scenarioId,
        });
      }

      const result = await context.whatIfOps.disableDetectionRule(ruleId);

      if (result.success) {
        store.addDeltaSet(scenarioId, result.deltaSet);
      }

      res.json({
        success: result.success,
        rule: context.whatIfOps.getRuleById(ruleId),
      });
    } catch (error) {
      handleError(res, error);
    }
  });

  // ============================================================================
  // Get Rules
  // ============================================================================
  router.get('/:scenarioId/rules', (req: Request, res: Response) => {
    try {
      const { scenarioId } = req.params;
      const { enabled } = req.query;

      const context = store.getContext(scenarioId);
      if (!context) {
        return res.status(404).json({
          error: 'Scenario not found',
          scenarioId,
        });
      }

      let rules;
      if (enabled === 'true') {
        rules = context.whatIfOps.getEnabledRules();
      } else if (enabled === 'false') {
        rules = context.whatIfOps.getDisabledRules();
      } else {
        rules = context.whatIfOps.getAllRules();
      }

      res.json({
        rules,
        total: rules.length,
      });
    } catch (error) {
      handleError(res, error);
    }
  });

  // ============================================================================
  // Set Parameter
  // ============================================================================
  router.post('/:scenarioId/parameters', async (req: Request, res: Response) => {
    try {
      const { scenarioId } = req.params;
      const { key, value } = req.body;

      const context = store.getContext(scenarioId);
      if (!context) {
        return res.status(404).json({
          error: 'Scenario not found',
          scenarioId,
        });
      }

      if (!key) {
        return res.status(400).json({
          error: 'Key is required',
        });
      }

      const result = await context.whatIfOps.setScenarioParameter(key, value);

      if (result.success) {
        store.addDeltaSet(scenarioId, result.deltaSet);
      }

      res.json({
        success: result.success,
        parameters: context.whatIfOps.getAllParameters(),
      });
    } catch (error) {
      handleError(res, error);
    }
  });

  // ============================================================================
  // Get Parameters
  // ============================================================================
  router.get('/:scenarioId/parameters', (req: Request, res: Response) => {
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
        parameters: context.whatIfOps.getAllParameters(),
      });
    } catch (error) {
      handleError(res, error);
    }
  });

  // ============================================================================
  // Rollback Delta Set
  // ============================================================================
  router.post('/:scenarioId/rollback/:deltaSetId', async (req: Request, res: Response) => {
    try {
      const { scenarioId, deltaSetId } = req.params;

      const context = store.getContext(scenarioId);
      if (!context) {
        return res.status(404).json({
          error: 'Scenario not found',
          scenarioId,
        });
      }

      const deltas = store.getDeltaHistory(scenarioId);
      const deltaSet = deltas.find(d => d.id === deltaSetId);

      if (!deltaSet) {
        return res.status(404).json({
          error: 'Delta set not found',
          deltaSetId,
        });
      }

      await context.whatIfOps.rollback(deltaSet);

      res.json({
        success: true,
        deltaSet,
        graphStats: context.sandboxGraph.getStats(),
      });
    } catch (error) {
      handleError(res, error);
    }
  });

  return router;
}

function handleError(res: Response, error: unknown): void {
  console.error('What-if route error:', error);

  if (error instanceof z.ZodError) {
    res.status(400).json({
      error: 'Validation failed',
      details: error.flatten(),
    });
    return;
  }

  if (error instanceof Error) {
    const statusCode = (error as any).code === 'SCENARIO_NOT_FOUND' ? 404 :
                       (error as any).code === 'INVALID_DELTA' ? 400 :
                       (error as any).code === 'SCENARIO_LIMIT_EXCEEDED' ? 429 : 500;

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
