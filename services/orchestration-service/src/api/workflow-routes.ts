/**
 * Workflow API routes
 */

import express from 'express';
import { DAG } from '../types/dag-types.js';
import { OrchestrationController } from '../controllers/OrchestrationController.js';

export function createWorkflowRouter(controller: OrchestrationController) {
  const router = express.Router();

  /**
   * GET /api/workflows
   * List all DAGs
   */
  router.get('/', (req, res) => {
    try {
      const dags = controller.getAllDAGs();
      res.json({
        dags: dags.map(dag => dag.toJSON()),
        total: dags.length,
      });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  /**
   * GET /api/workflows/:dagId
   * Get DAG details
   */
  router.get('/:dagId', (req, res) => {
    try {
      const dag = controller.getDAG(req.params.dagId);
      if (!dag) {
        return res.status(404).json({ error: 'DAG not found' });
      }
      res.json(dag.toJSON());
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  /**
   * POST /api/workflows
   * Register new DAG
   */
  router.post('/', (req, res) => {
    try {
      const dag = DAG.fromJSON(req.body);
      controller.registerDAG(dag);
      res.status(201).json({ message: 'DAG registered', dagId: dag.dagId });
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });

  /**
   * DELETE /api/workflows/:dagId
   * Unregister DAG
   */
  router.delete('/:dagId', (req, res) => {
    try {
      controller.unregisterDAG(req.params.dagId);
      res.json({ message: 'DAG unregistered' });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  /**
   * POST /api/workflows/:dagId/execute
   * Execute workflow
   */
  router.post('/:dagId/execute', async (req, res) => {
    try {
      const dag = controller.getDAG(req.params.dagId);
      if (!dag) {
        return res.status(404).json({ error: 'DAG not found' });
      }

      const execution = await controller.executeWorkflow(dag, req.body.params);
      res.json({
        message: 'Workflow execution started',
        executionId: execution.executionId,
        execution,
      });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  /**
   * GET /api/workflows/:dagId/executions
   * Get workflow execution history
   */
  router.get('/:dagId/executions', (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const executions = controller.stateManager.getWorkflowHistory(
        req.params.dagId,
        limit
      );
      res.json({ executions, total: executions.length });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  /**
   * GET /api/workflows/:dagId/executions/:executionId
   * Get execution details
   */
  router.get('/:dagId/executions/:executionId', (req, res) => {
    try {
      const execution = controller.stateManager.getWorkflowExecution(
        req.params.executionId
      );
      if (!execution) {
        return res.status(404).json({ error: 'Execution not found' });
      }

      const tasks = controller.stateManager.getWorkflowTaskExecutions(
        req.params.executionId
      );

      res.json({ execution, tasks });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  /**
   * POST /api/workflows/:dagId/executions/:executionId/pause
   * Pause workflow execution
   */
  router.post('/:dagId/executions/:executionId/pause', (req, res) => {
    try {
      controller.pauseWorkflow(req.params.executionId);
      res.json({ message: 'Workflow paused' });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  /**
   * POST /api/workflows/:dagId/executions/:executionId/resume
   * Resume workflow execution
   */
  router.post('/:dagId/executions/:executionId/resume', (req, res) => {
    try {
      controller.resumeWorkflow(req.params.executionId);
      res.json({ message: 'Workflow resumed' });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  /**
   * POST /api/workflows/:dagId/executions/:executionId/cancel
   * Cancel workflow execution
   */
  router.post('/:dagId/executions/:executionId/cancel', (req, res) => {
    try {
      controller.cancelWorkflow(req.params.executionId);
      res.json({ message: 'Workflow cancelled' });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  return router;
}
