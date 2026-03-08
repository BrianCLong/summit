"use strict";
/**
 * Runbook Runtime API
 *
 * REST API endpoints for runbook execution with:
 * - Start execution
 * - Get execution status
 * - Control execution (pause/resume/cancel)
 * - Get execution logs
 *
 * @module runbooks/runtime/api
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runtimeApiRouter = void 0;
const express_1 = __importDefault(require("express"));
const ioredis_1 = __importDefault(require("ioredis"));
const types_js_1 = require("../dags/types.js");
const state_manager_js_1 = require("./state-manager.js");
const engine_js_1 = require("./engine.js");
const registry_js_1 = require("./executors/registry.js");
const rapid_attribution_runbook_js_1 = require("./rapid-attribution-runbook.js");
// ============================================================================
// Router Setup
// ============================================================================
exports.runtimeApiRouter = express_1.default.Router();
// ============================================================================
// Runtime Initialization
// ============================================================================
let runtimeEngine = null;
let stateManager = null;
let logRepository = null;
/**
 * Initialize the runtime with Redis or in-memory storage
 */
function initializeRuntime() {
    if (runtimeEngine)
        return;
    const useRedis = process.env.REDIS_URL && process.env.NODE_ENV !== 'test';
    let executionRepo;
    let logRepo;
    if (useRedis) {
        const redis = new ioredis_1.default(process.env.REDIS_URL);
        executionRepo = new state_manager_js_1.RedisRunbookExecutionRepository(redis);
        logRepo = new state_manager_js_1.RedisRunbookExecutionLogRepository(redis);
    }
    else {
        executionRepo = new state_manager_js_1.InMemoryRunbookExecutionRepository();
        logRepo = new state_manager_js_1.InMemoryRunbookExecutionLogRepository();
    }
    logRepository = logRepo;
    stateManager = new state_manager_js_1.RunbookStateManager(executionRepo, logRepo);
    // Create definition repository and register default runbooks
    const definitionRepo = new engine_js_1.InMemoryRunbookDefinitionRepository();
    definitionRepo.register(rapid_attribution_runbook_js_1.RapidAttributionRunbook);
    // Create executor registry with all default executors
    const executorRegistry = (0, registry_js_1.createExecutorRegistry)();
    // Create runtime engine
    runtimeEngine = new engine_js_1.RunbookRuntimeEngine(definitionRepo, stateManager, executorRegistry, {
        defaultTimeoutMs: 300000, // 5 minutes
        maxParallelSteps: 5,
        pollIntervalMs: 100,
    });
}
// Middleware to ensure runtime is initialized
function ensureRuntime(req, res, next) {
    initializeRuntime();
    next();
}
exports.runtimeApiRouter.use(ensureRuntime);
// ============================================================================
// API Endpoints
// ============================================================================
/**
 * Start a new runbook execution
 * POST /runtime/runbooks/:runbookId/execute
 */
exports.runtimeApiRouter.post('/runbooks/:runbookId/execute', async (req, res) => {
    const startTime = Date.now();
    try {
        const { runbookId } = req.params;
        const body = req.body;
        const userId = req.user?.sub || 'anonymous';
        const tenantId = req.headers['x-tenant-id'] || 'default';
        // Validate input for known runbooks
        if (runbookId === 'rapid_attribution_cti') {
            const validation = (0, rapid_attribution_runbook_js_1.validateRapidAttributionInput)(body.input);
            if (!validation.valid) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid input',
                    errors: validation.errors,
                    processingTime: Date.now() - startTime,
                });
            }
        }
        // Parse legal basis and data licenses
        const legalBasis = body.legalBasis
            ? body.legalBasis
            : types_js_1.LegalBasis.LEGITIMATE_INTERESTS;
        const dataLicenses = body.dataLicenses
            ? body.dataLicenses
            : [types_js_1.DataLicense.INTERNAL_USE_ONLY];
        // Start execution
        const execution = await runtimeEngine.startExecution(runbookId, body.input, {
            startedBy: userId,
            tenantId,
            authorityIds: body.authorityIds,
            legalBasis,
            dataLicenses,
        });
        res.status(202).json({
            success: true,
            executionId: execution.executionId,
            status: execution.status,
            message: 'Execution started',
            processingTime: Date.now() - startTime,
        });
    }
    catch (error) {
        console.error('Execution start error:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Failed to start execution',
            processingTime: Date.now() - startTime,
        });
    }
});
/**
 * Get execution status
 * GET /runtime/executions/:executionId
 */
exports.runtimeApiRouter.get('/executions/:executionId', async (req, res) => {
    try {
        const { executionId } = req.params;
        const tenantId = req.headers['x-tenant-id'] || 'default';
        const execution = await runtimeEngine.getExecution(executionId);
        if (!execution) {
            return res.status(404).json({
                success: false,
                message: 'Execution not found',
            });
        }
        // Check tenant access
        if (execution.tenantId !== tenantId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied: tenant boundary violation',
            });
        }
        res.json({
            success: true,
            execution: formatExecutionResponse(execution),
        });
    }
    catch (error) {
        console.error('Execution retrieval error:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Failed to retrieve execution',
        });
    }
});
/**
 * Control execution (pause/resume/cancel)
 * POST /runtime/executions/:executionId/control
 */
exports.runtimeApiRouter.post('/executions/:executionId/control', async (req, res) => {
    const startTime = Date.now();
    try {
        const { executionId } = req.params;
        const { action } = req.body;
        const userId = req.user?.sub || 'anonymous';
        const tenantId = req.headers['x-tenant-id'] || 'default';
        // Validate action
        if (!['PAUSE', 'RESUME', 'CANCEL'].includes(action)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid action. Must be PAUSE, RESUME, or CANCEL',
                processingTime: Date.now() - startTime,
            });
        }
        // Get execution to verify tenant access
        const currentExecution = await runtimeEngine.getExecution(executionId);
        if (!currentExecution) {
            return res.status(404).json({
                success: false,
                message: 'Execution not found',
                processingTime: Date.now() - startTime,
            });
        }
        if (currentExecution.tenantId !== tenantId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied: tenant boundary violation',
                processingTime: Date.now() - startTime,
            });
        }
        // Execute control action
        const execution = await runtimeEngine.controlExecution(executionId, action, userId);
        res.json({
            success: true,
            executionId: execution.executionId,
            status: execution.status,
            message: `Execution ${action.toLowerCase()}${action === 'PAUSE' ? 'd' : action === 'RESUME' ? 'd' : 'led'}`,
            processingTime: Date.now() - startTime,
        });
    }
    catch (error) {
        console.error('Execution control error:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Failed to control execution',
            processingTime: Date.now() - startTime,
        });
    }
});
/**
 * Get execution logs
 * GET /runtime/executions/:executionId/logs
 */
exports.runtimeApiRouter.get('/executions/:executionId/logs', async (req, res) => {
    try {
        const { executionId } = req.params;
        const tenantId = req.headers['x-tenant-id'] || 'default';
        // Get execution to verify tenant access
        const execution = await runtimeEngine.getExecution(executionId);
        if (!execution) {
            return res.status(404).json({
                success: false,
                message: 'Execution not found',
            });
        }
        if (execution.tenantId !== tenantId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied: tenant boundary violation',
            });
        }
        // Get logs
        const logs = await logRepository.listByExecution(executionId);
        res.json({
            success: true,
            executionId,
            logs: logs.map(formatLogEntry),
            total: logs.length,
        });
    }
    catch (error) {
        console.error('Logs retrieval error:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Failed to retrieve logs',
        });
    }
});
/**
 * Verify log chain integrity
 * GET /runtime/executions/:executionId/logs/verify
 */
exports.runtimeApiRouter.get('/executions/:executionId/logs/verify', async (req, res) => {
    try {
        const { executionId } = req.params;
        const tenantId = req.headers['x-tenant-id'] || 'default';
        // Get execution to verify tenant access
        const execution = await runtimeEngine.getExecution(executionId);
        if (!execution) {
            return res.status(404).json({
                success: false,
                message: 'Execution not found',
            });
        }
        if (execution.tenantId !== tenantId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied: tenant boundary violation',
            });
        }
        // Verify chain
        const verification = await logRepository.verifyChain(executionId);
        res.json({
            success: true,
            executionId,
            chainIntegrity: verification,
        });
    }
    catch (error) {
        console.error('Chain verification error:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Failed to verify chain',
        });
    }
});
/**
 * List available runbooks
 * GET /runtime/runbooks
 */
exports.runtimeApiRouter.get('/runbooks', async (req, res) => {
    try {
        // For now, return the registered runbooks
        res.json({
            success: true,
            runbooks: [
                {
                    id: rapid_attribution_runbook_js_1.RapidAttributionRunbook.id,
                    name: rapid_attribution_runbook_js_1.RapidAttributionRunbook.name,
                    version: rapid_attribution_runbook_js_1.RapidAttributionRunbook.version,
                    purpose: rapid_attribution_runbook_js_1.RapidAttributionRunbook.purpose,
                    stepCount: rapid_attribution_runbook_js_1.RapidAttributionRunbook.steps.length,
                    estimatedDurationMs: rapid_attribution_runbook_js_1.RapidAttributionRunbook.benchmarks?.totalMs,
                },
            ],
        });
    }
    catch (error) {
        console.error('Runbook listing error:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Failed to list runbooks',
        });
    }
});
/**
 * Get runbook details
 * GET /runtime/runbooks/:runbookId
 */
exports.runtimeApiRouter.get('/runbooks/:runbookId', async (req, res) => {
    try {
        const { runbookId } = req.params;
        if (runbookId === 'rapid_attribution_cti') {
            res.json({
                success: true,
                runbook: {
                    ...rapid_attribution_runbook_js_1.RapidAttributionRunbook,
                    steps: rapid_attribution_runbook_js_1.RapidAttributionRunbook.steps.map((step) => ({
                        id: step.id,
                        name: step.name,
                        description: step.description,
                        actionType: step.actionType,
                        dependsOn: step.dependsOn,
                        timeoutMs: step.timeoutMs,
                        retryPolicy: step.retryPolicy,
                    })),
                },
            });
        }
        else {
            res.status(404).json({
                success: false,
                message: 'Runbook not found',
            });
        }
    }
    catch (error) {
        console.error('Runbook retrieval error:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Failed to retrieve runbook',
        });
    }
});
/**
 * Health check
 * GET /runtime/health
 */
exports.runtimeApiRouter.get('/health', (req, res) => {
    res.json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'runbook-runtime-api',
    });
});
// ============================================================================
// Response Formatters
// ============================================================================
function formatExecutionResponse(execution) {
    return {
        executionId: execution.executionId,
        runbookId: execution.runbookId,
        runbookVersion: execution.runbookVersion,
        status: execution.status,
        startedBy: execution.startedBy,
        tenantId: execution.tenantId,
        startedAt: execution.startedAt,
        lastUpdatedAt: execution.lastUpdatedAt,
        finishedAt: execution.finishedAt,
        steps: execution.steps.map((step) => ({
            stepId: step.stepId,
            status: step.status,
            attempt: step.attempt,
            startedAt: step.startedAt,
            finishedAt: step.finishedAt,
            durationMs: step.durationMs,
            errorMessage: step.errorMessage,
            hasOutput: !!step.output,
        })),
        kpis: execution.kpis,
        evidenceCount: execution.evidence.length,
        citationCount: execution.citations.length,
        proofCount: execution.proofs.length,
        error: execution.error,
        controlledBy: execution.controlledBy,
        controlledAt: execution.controlledAt,
    };
}
function formatLogEntry(entry) {
    return {
        logId: entry.logId,
        timestamp: entry.timestamp,
        eventType: entry.eventType,
        stepId: entry.stepId,
        actorId: entry.actorId,
        details: entry.details,
        hash: entry.hash,
    };
}
exports.default = exports.runtimeApiRouter;
