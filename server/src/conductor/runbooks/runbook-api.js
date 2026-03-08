"use strict";
// @ts-nocheck
// Runbook API for Conductor
// Provides endpoints for managing signed runbooks and approval workflows
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runbookRouter = void 0;
const express_1 = __importDefault(require("express"));
const registry_js_1 = require("./registry.js");
const prometheus_js_1 = require("../observability/prometheus.js");
const crypto_1 = __importDefault(require("crypto"));
exports.runbookRouter = express_1.default.Router();
/**
 * Create new runbook
 */
exports.runbookRouter.post('/create', async (req, res) => {
    const startTime = Date.now();
    try {
        const createRequest = req.body;
        const author = req.user?.sub || 'unknown';
        // Validation
        if (!createRequest.name ||
            !createRequest.description ||
            !createRequest.steps?.length) {
            return res.status(400).json({
                success: false,
                message: 'Name, description, and steps are required',
                processingTime: Date.now() - startTime,
            });
        }
        // Generate runbook ID and version
        const runbookId = crypto_1.default.randomUUID();
        const version = '1.0.0';
        const runbook = {
            id: runbookId,
            name: createRequest.name,
            version,
            description: createRequest.description,
            category: createRequest.category,
            severity: createRequest.severity,
            approvalRequired: createRequest.approvalRequired ?? createRequest.severity !== 'low',
            steps: createRequest.steps.map((step, index) => ({
                ...step,
                id: step.id || crypto_1.default.randomUUID(),
                order: index + 1,
            })),
            metadata: {
                author,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                tags: createRequest.tags || [],
                tenantId: createRequest.tenantId,
                businessUnit: createRequest.businessUnit,
            },
            approvals: [],
        };
        // Register runbook
        const signatureHash = await registry_js_1.runbookRegistry.registerRunbook(runbook, author);
        const response = {
            success: true,
            runbookId,
            version,
            signatureHash,
            message: 'Runbook created and signed successfully',
            processingTime: Date.now() - startTime,
        };
        // Record metrics
        prometheus_js_1.prometheusConductorMetrics.recordOperationalEvent('runbook_created', { success: true });
        prometheus_js_1.prometheusConductorMetrics.recordOperationalMetric('runbook_creation_time', response.processingTime);
        res.status(201).json(response);
    }
    catch (error) {
        console.error('Runbook creation error:', error);
        prometheus_js_1.prometheusConductorMetrics.recordOperationalEvent('runbook_creation_error', { success: false });
        res.status(500).json({
            success: false,
            message: 'Failed to create runbook',
            error: error instanceof Error ? error.message : 'Unknown error',
            processingTime: Date.now() - startTime,
        });
    }
});
/**
 * Get runbook by ID
 */
exports.runbookRouter.get('/:runbookId', async (req, res) => {
    try {
        const { runbookId } = req.params;
        const { version } = req.query;
        const runbook = await registry_js_1.runbookRegistry.getRunbook(runbookId, version);
        if (!runbook) {
            return res.status(404).json({
                success: false,
                message: 'Runbook not found',
            });
        }
        // Check tenant access if applicable
        const requestingTenantId = req.headers['x-tenant-id'];
        if (runbook.metadata.tenantId &&
            runbook.metadata.tenantId !== requestingTenantId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied: tenant boundary violation',
            });
        }
        res.json({
            success: true,
            runbook,
        });
    }
    catch (error) {
        console.error('Runbook retrieval error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve runbook',
        });
    }
});
/**
 * List runbooks
 */
exports.runbookRouter.get('/', async (req, res) => {
    try {
        const { category, tenantId } = req.query;
        const runbooks = await registry_js_1.runbookRegistry.listRunbooks(category, tenantId);
        res.json({
            success: true,
            runbooks,
            total: runbooks.length,
        });
    }
    catch (error) {
        console.error('Runbook listing error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to list runbooks',
        });
    }
});
/**
 * Execute runbook
 */
exports.runbookRouter.post('/:runbookId/execute', async (req, res) => {
    const startTime = Date.now();
    try {
        const { runbookId } = req.params;
        const { version, context, priority } = req.body;
        const executorId = req.user?.sub || 'unknown';
        const tenantId = req.headers['x-tenant-id'] || 'default';
        if (!tenantId) {
            return res.status(400).json({
                success: false,
                message: 'Tenant ID is required',
            });
        }
        const executionId = await registry_js_1.runbookRegistry.executeRunbook(runbookId, executorId, tenantId, context, version);
        const response = {
            success: true,
            executionId,
            message: 'Runbook execution initiated',
            processingTime: Date.now() - startTime,
        };
        // Record metrics
        prometheus_js_1.prometheusConductorMetrics.recordOperationalEvent('runbook_executed', { success: true });
        prometheus_js_1.prometheusConductorMetrics.recordOperationalMetric('runbook_execution_time', response.processingTime);
        res.json(response);
    }
    catch (error) {
        console.error('Runbook execution error:', error);
        prometheus_js_1.prometheusConductorMetrics.recordOperationalEvent('runbook_execution_error', { success: false });
        res.status(500).json({
            success: false,
            message: 'Failed to execute runbook',
            error: error instanceof Error ? error.message : 'Unknown error',
            processingTime: Date.now() - startTime,
        });
    }
});
/**
 * Get execution status
 */
exports.runbookRouter.get('/executions/:executionId', async (req, res) => {
    try {
        const { executionId } = req.params;
        const execution = await registry_js_1.runbookRegistry.getExecution(executionId);
        if (!execution) {
            return res.status(404).json({
                success: false,
                message: 'Execution not found',
            });
        }
        // Check tenant access
        const requestingTenantId = req.headers['x-tenant-id'];
        if (execution.tenantId !== requestingTenantId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied: tenant boundary violation',
            });
        }
        res.json({
            success: true,
            execution,
        });
    }
    catch (error) {
        console.error('Execution retrieval error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve execution',
        });
    }
});
/**
 * Process approval for runbook execution
 */
exports.runbookRouter.post('/approvals/:approvalId/process', async (req, res) => {
    const startTime = Date.now();
    try {
        const { approvalId } = req.params;
        const { decision, comments } = req.body;
        const approverId = req.user?.sub || 'unknown';
        if (!['approved', 'rejected'].includes(decision)) {
            return res.status(400).json({
                success: false,
                message: 'Decision must be "approved" or "rejected"',
            });
        }
        const result = await registry_js_1.runbookRegistry.processApproval(approvalId, approverId, decision, comments);
        const response = {
            ...result,
            processingTime: Date.now() - startTime,
        };
        // Record metrics
        prometheus_js_1.prometheusConductorMetrics.recordOperationalEvent('runbook_approval_processed', result.success);
        if (result.success) {
            prometheus_js_1.prometheusConductorMetrics.recordOperationalEvent(`runbook_${decision}`, true);
        }
        res.json(response);
    }
    catch (error) {
        console.error('Approval processing error:', error);
        prometheus_js_1.prometheusConductorMetrics.recordOperationalEvent('runbook_approval_error', { success: false });
        res.status(500).json({
            success: false,
            message: 'Failed to process approval',
            error: error instanceof Error ? error.message : 'Unknown error',
            processingTime: Date.now() - startTime,
        });
    }
});
/**
 * Update runbook (creates new version)
 */
exports.runbookRouter.put('/:runbookId', async (req, res) => {
    const startTime = Date.now();
    try {
        const { runbookId } = req.params;
        const updateRequest = req.body;
        const author = req.user?.sub || 'unknown';
        // Get current runbook to determine new version
        const currentRunbook = await registry_js_1.runbookRegistry.getRunbook(runbookId);
        if (!currentRunbook) {
            return res.status(404).json({
                success: false,
                message: 'Runbook not found',
            });
        }
        // Generate new version
        const versionParts = currentRunbook.version.split('.').map(Number);
        const increment = updateRequest.versionIncrement || 'patch';
        switch (increment) {
            case 'major':
                versionParts[0]++;
                versionParts[1] = 0;
                versionParts[2] = 0;
                break;
            case 'minor':
                versionParts[1]++;
                versionParts[2] = 0;
                break;
            case 'patch':
            default:
                versionParts[2]++;
                break;
        }
        const newVersion = versionParts.join('.');
        const updatedRunbook = {
            id: runbookId,
            name: updateRequest.name || currentRunbook.name,
            version: newVersion,
            description: updateRequest.description || currentRunbook.description,
            category: updateRequest.category || currentRunbook.category,
            severity: updateRequest.severity || currentRunbook.severity,
            approvalRequired: updateRequest.approvalRequired ?? currentRunbook.approvalRequired,
            steps: updateRequest.steps || currentRunbook.steps,
            metadata: {
                ...currentRunbook.metadata,
                updatedAt: Date.now(),
                tags: updateRequest.tags || currentRunbook.metadata.tags,
                tenantId: updateRequest.tenantId || currentRunbook.metadata.tenantId,
                businessUnit: updateRequest.businessUnit || currentRunbook.metadata.businessUnit,
            },
            approvals: [],
        };
        // Register new version
        const signatureHash = await registry_js_1.runbookRegistry.registerRunbook(updatedRunbook, author);
        const response = {
            success: true,
            runbookId,
            version: newVersion,
            signatureHash,
            message: 'Runbook updated successfully',
            processingTime: Date.now() - startTime,
        };
        // Record metrics
        prometheus_js_1.prometheusConductorMetrics.recordOperationalEvent('runbook_updated', { success: true });
        res.json(response);
    }
    catch (error) {
        console.error('Runbook update error:', error);
        prometheus_js_1.prometheusConductorMetrics.recordOperationalEvent('runbook_update_error', { success: false });
        res.status(500).json({
            success: false,
            message: 'Failed to update runbook',
            error: error instanceof Error ? error.message : 'Unknown error',
            processingTime: Date.now() - startTime,
        });
    }
});
/**
 * Validate runbook signature
 */
exports.runbookRouter.post('/:runbookId/validate', async (req, res) => {
    try {
        const { runbookId } = req.params;
        const { version } = req.query;
        const runbook = await registry_js_1.runbookRegistry.getRunbook(runbookId, version);
        if (!runbook) {
            return res.status(404).json({
                success: false,
                message: 'Runbook not found',
            });
        }
        // Signature verification is done automatically in getRunbook
        // If we get here, the signature is valid
        res.json({
            success: true,
            valid: true,
            signature: {
                algorithm: runbook.signature.algorithm,
                hash: runbook.signature.hash,
                signer: runbook.signature.signer,
                timestamp: runbook.signature.timestamp,
            },
            message: 'Runbook signature is valid',
        });
    }
    catch (error) {
        console.error('Runbook validation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to validate runbook',
        });
    }
});
/**
 * Get runbook categories and statistics
 */
exports.runbookRouter.get('/stats/overview', async (req, res) => {
    try {
        const { tenantId } = req.query;
        const allRunbooks = await registry_js_1.runbookRegistry.listRunbooks(undefined, tenantId);
        // Calculate statistics
        const stats = {
            totalRunbooks: allRunbooks.length,
            byCategory: {},
            bySeverity: {},
            recentActivity: {
                created: 0,
                executed: 0,
            },
        };
        // Count by category and severity
        allRunbooks.forEach((runbook) => {
            stats.byCategory[runbook.category] =
                (stats.byCategory[runbook.category] || 0) + 1;
        });
        res.json({
            success: true,
            stats,
        });
    }
    catch (error) {
        console.error('Stats retrieval error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve statistics',
        });
    }
});
/**
 * Health check
 */
exports.runbookRouter.get('/health', (req, res) => {
    res.json({
        success: true,
        status: 'healthy',
        timestamp: Date.now(),
        service: 'runbook-api',
    });
});
// Request logging middleware
exports.runbookRouter.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`Runbook API: ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
        prometheus_js_1.prometheusConductorMetrics.recordOperationalMetric('runbook_api_request_duration', duration);
        prometheus_js_1.prometheusConductorMetrics.recordOperationalEvent(`runbook_api_${req.method.toLowerCase()}`, res.statusCode < 400);
    });
    next();
});
exports.default = exports.runbookRouter;
