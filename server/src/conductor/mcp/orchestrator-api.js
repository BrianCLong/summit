"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Orchestrator API routes for workflow management
const express_1 = require("express");
const orchestrator_js_1 = require("./orchestrator.js");
const logger_js_1 = __importDefault(require("../../config/logger.js"));
const http_param_js_1 = require("../../utils/http-param.js");
const router = (0, express_1.Router)();
// POST /orchestrator/workflows - Register a workflow
router.post('/workflows', async (req, res) => {
    try {
        const workflow = req.body;
        orchestrator_js_1.orchestrator.registerWorkflow(workflow);
        res.status(201).json({ success: true, workflowId: workflow.id });
    }
    catch (error) {
        logger_js_1.default.error('Failed to register workflow', error);
        res.status(400).json({ error: error.message });
    }
});
// GET /orchestrator/workflows - List workflows
router.get('/workflows', (_req, res) => {
    const workflows = orchestrator_js_1.orchestrator.listWorkflows().map(w => ({
        id: w.id,
        name: w.name,
        description: w.description,
        stepCount: w.steps.length,
    }));
    res.json({ workflows });
});
// POST /orchestrator/execute/:workflowId - Execute a workflow
router.post('/execute/:workflowId', async (req, res) => {
    try {
        const workflowId = (0, http_param_js_1.firstString)(req.params.workflowId);
        if (!workflowId) {
            res.status(400).json({ error: 'workflowId is required' });
            return;
        }
        const { initialState = {}, scopes = [] } = req.body;
        const execution = await orchestrator_js_1.orchestrator.executeWorkflow(workflowId, initialState, scopes);
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
    }
    catch (error) {
        logger_js_1.default.error('Workflow execution failed', error);
        res.status(500).json({ error: error.message });
    }
});
// GET /orchestrator/executions/:id - Get execution status
router.get('/executions/:id', (req, res) => {
    const executionId = (0, http_param_js_1.firstString)(req.params.id);
    if (!executionId) {
        res.status(400).json({ error: 'id is required' });
        return;
    }
    const execution = orchestrator_js_1.orchestrator.getExecution(executionId);
    if (!execution) {
        return res.status(404).json({ error: 'Execution not found' });
    }
    res.json(execution);
});
// GET /orchestrator/recipes - List available recipe templates
router.get('/recipes', (_req, res) => {
    res.json({
        recipes: Object.keys(orchestrator_js_1.WorkflowRecipes),
        descriptions: {
            leadAssignment: 'Intelligent lead scoring and routing',
            entityEnrichment: 'Graph entity OSINT/ML enrichment pipeline',
            auditTrail: 'Compliance audit trail generation',
        },
    });
});
// POST /orchestrator/recipes/:name - Execute a pre-built recipe
router.post('/recipes/:name', async (req, res) => {
    const name = (0, http_param_js_1.firstString)(req.params.name);
    if (!name) {
        res.status(400).json({ error: 'name is required' });
        return;
    }
    const recipeFactory = orchestrator_js_1.WorkflowRecipes[name];
    if (!recipeFactory) {
        return res.status(404).json({ error: `Recipe '${name}' not found` });
    }
    try {
        // Pass first arg from body (e.g., leadId, entityId)
        const arg = req.body.id || req.body.entityId || req.body.leadId;
        const workflow = recipeFactory(arg);
        orchestrator_js_1.orchestrator.registerWorkflow(workflow);
        const execution = await orchestrator_js_1.orchestrator.executeWorkflow(workflow.id, req.body.initialState || {}, req.body.scopes || []);
        res.json({
            executionId: execution.id,
            status: execution.status,
            evaluation: execution.evaluation,
        });
    }
    catch (error) {
        logger_js_1.default.error(`Recipe ${name} failed`, error);
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
