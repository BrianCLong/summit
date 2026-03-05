// Orchestrator API routes for workflow management
import { Router, Request, Response } from 'express';
import { orchestrator, WorkflowDefinition, WorkflowRecipes } from './orchestrator.js';
import logger from '../../config/logger.js';

const router = Router();

// POST /orchestrator/workflows - Register a workflow
router.post('/workflows', async (req: Request, res: Response) => {
  try {
    const workflow: WorkflowDefinition = req.body;
    orchestrator.registerWorkflow(workflow);
    res.status(201).json({ success: true, workflowId: workflow.id });
  } catch (error: any) {
    logger.error('Failed to register workflow', error);
    res.status(400).json({ error: error.message });
  }
});

// GET /orchestrator/workflows - List workflows
router.get('/workflows', (_req: Request, res: Response) => {
  const workflows = orchestrator.listWorkflows().map(w => ({
    id: w.id,
    name: w.name,
    description: w.description,
    stepCount: w.steps.length,
  }));
  res.json({ workflows });
});

// POST /orchestrator/execute/:workflowId - Execute a workflow
router.post('/execute/:workflowId', async (req: Request, res: Response) => {
  try {
    const { workflowId } = req.params;
    const { initialState = {}, scopes = [] } = req.body;

    const execution = await orchestrator.executeWorkflow(
      workflowId,
      initialState,
      scopes,
    );

    res.json({
      executionId: execution.id,
      status: execution.status,
      evaluation: execution.evaluation,
      stepResults: execution.stepResults.map(r => ({
        stepId: r.stepId,
        status: r.status,
        durationMs: r.durationMs,
        error: r.error?.message,
      })),
    });
  } catch (error: any) {
    logger.error('Workflow execution failed', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /orchestrator/executions/:id - Get execution status
router.get('/executions/:id', (req: Request, res: Response) => {
  const execution = orchestrator.getExecution(req.params.id);
  if (!execution) {
    return res.status(404).json({ error: 'Execution not found' });
  }
  res.json(execution);
});

// GET /orchestrator/recipes - List available recipe templates
router.get('/recipes', (_req: Request, res: Response) => {
  res.json({
    recipes: Object.keys(WorkflowRecipes),
    descriptions: {
      leadAssignment: 'Intelligent lead scoring and routing',
      entityEnrichment: 'Graph entity OSINT/ML enrichment pipeline',
      auditTrail: 'Compliance audit trail generation',
    },
  });
});

// POST /orchestrator/recipes/:name - Execute a pre-built recipe
router.post('/recipes/:name', async (req: Request, res: Response) => {
  const { name } = req.params;
  const recipeFactory = (WorkflowRecipes as any)[name];

  if (!recipeFactory) {
    return res.status(404).json({ error: `Recipe '${name}' not found` });
  }

  try {
    // Pass first arg from body (e.g., leadId, entityId)
    const arg = req.body.id || req.body.entityId || req.body.leadId;
    const workflow = recipeFactory(arg);

    orchestrator.registerWorkflow(workflow);
    const execution = await orchestrator.executeWorkflow(
      workflow.id,
      req.body.initialState || {},
      req.body.scopes || [],
    );

    res.json({
      executionId: execution.id,
      status: execution.status,
      evaluation: execution.evaluation,
    });
  } catch (error: any) {
    logger.error(`Recipe ${name} failed`, error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
