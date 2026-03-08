"use strict";
/**
 * DLP Management API Routes
 *
 * REST endpoints for managing DLP policies and monitoring violations.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const DLPService_js_1 = require("../services/DLPService.js");
const dlpMiddleware_js_1 = require("../middleware/dlpMiddleware.js");
const auth_js_1 = require("../middleware/auth.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const errors_js_1 = require("../lib/errors.js");
const express_validator_1 = require("express-validator");
const router = (0, express_1.Router)();
// Apply authentication to all DLP routes
router.use(auth_js_1.authMiddleware);
/**
 * GET /api/dlp/status
 * Get DLP service status and policy summary
 */
router.get('/status', dlpMiddleware_js_1.dlpStatusMiddleware);
/**
 * GET /api/dlp/policies
 * List all DLP policies
 */
router.get('/policies', async (req, res) => {
    try {
        const policies = DLPService_js_1.dlpService.listPolicies();
        // Filter sensitive information for non-admin users
        const filteredPolicies = policies.map((policy) => ({
            id: policy.id,
            name: policy.name,
            description: policy.description,
            enabled: policy.enabled,
            priority: policy.priority,
            actionTypes: policy.actions.map((a) => a.type),
            exemptionCount: policy.exemptions.length,
            createdAt: policy.createdAt,
            updatedAt: policy.updatedAt,
        }));
        res.json({
            success: true,
            data: filteredPolicies,
            meta: {
                total: policies.length,
                enabled: policies.filter((p) => p.enabled).length,
                disabled: policies.filter((p) => !p.enabled).length,
            },
        });
    }
    catch (error) {
        const err = error;
        logger_js_1.default.error('Failed to list DLP policies', {
            component: 'DLPRoutes',
            error: err.message,
            userId: req.user?.id,
        });
        throw new errors_js_1.AppError('Failed to retrieve DLP policies', 500);
    }
});
/**
 * GET /api/dlp/policies/:id
 * Get a specific DLP policy
 */
router.get('/policies/:id', (0, express_validator_1.param)('id').isString().notEmpty(), async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            throw new errors_js_1.AppError('Invalid policy ID', 400, 'VALIDATION_ERROR');
        }
        const policy = DLPService_js_1.dlpService.getPolicy(req.params.id);
        if (!policy) {
            throw new errors_js_1.AppError('DLP policy not found', 404);
        }
        res.json({
            success: true,
            data: policy,
        });
    }
    catch (error) {
        if (error instanceof errors_js_1.AppError) {
            throw error;
        }
        const err = error;
        logger_js_1.default.error('Failed to get DLP policy', {
            component: 'DLPRoutes',
            error: err.message,
            policyId: req.params.id,
            userId: req.user?.id,
        });
        throw new errors_js_1.AppError('Failed to retrieve DLP policy', 500);
    }
});
/**
 * POST /api/dlp/policies
 * Create a new DLP policy
 */
router.post('/policies', (0, express_validator_1.body)('name').isString().notEmpty().isLength({ min: 1, max: 100 }), (0, express_validator_1.body)('description').isString().optional().isLength({ max: 500 }), (0, express_validator_1.body)('enabled').isBoolean().optional(), (0, express_validator_1.body)('priority').isInt({ min: 1, max: 100 }).optional(), (0, express_validator_1.body)('conditions').isArray({ min: 1 }), (0, express_validator_1.body)('actions').isArray({ min: 1 }), (0, express_validator_1.body)('exemptions').isArray().optional(), async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            throw new errors_js_1.AppError('Validation failed', 400, 'VALIDATION_ERROR');
        }
        const policyData = {
            name: req.body.name,
            description: req.body.description || '',
            enabled: req.body.enabled ?? true,
            priority: req.body.priority || 10,
            conditions: req.body.conditions,
            actions: req.body.actions,
            exemptions: req.body.exemptions || [],
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        // Validate policy structure
        validatePolicyStructure(policyData);
        DLPService_js_1.dlpService.addPolicy(policyData);
        logger_js_1.default.info('DLP policy created', {
            component: 'DLPRoutes',
            policyName: policyData.name,
            createdBy: req.user?.id,
            tenantId: req.user?.tenantId,
        });
        res.status(201).json({
            success: true,
            message: 'DLP policy created successfully',
            data: { id: policyData.name.toLowerCase().replace(/\s+/g, '-') },
        });
    }
    catch (error) {
        if (error instanceof errors_js_1.AppError) {
            throw error;
        }
        const err = error;
        logger_js_1.default.error('Failed to create DLP policy', {
            component: 'DLPRoutes',
            error: err.message,
            userId: req.user?.id,
        });
        throw new errors_js_1.AppError('Failed to create DLP policy', 500);
    }
});
/**
 * PUT /api/dlp/policies/:id
 * Update an existing DLP policy
 */
router.put('/policies/:id', (0, express_validator_1.param)('id').isString().notEmpty(), (0, express_validator_1.body)('name').isString().optional().isLength({ min: 1, max: 100 }), (0, express_validator_1.body)('description').isString().optional().isLength({ max: 500 }), (0, express_validator_1.body)('enabled').isBoolean().optional(), (0, express_validator_1.body)('priority').isInt({ min: 1, max: 100 }).optional(), (0, express_validator_1.body)('conditions').isArray().optional(), (0, express_validator_1.body)('actions').isArray().optional(), (0, express_validator_1.body)('exemptions').isArray().optional(), async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            throw new errors_js_1.AppError('Validation failed', 400, 'VALIDATION_ERROR');
        }
        const policyId = req.params.id;
        const updates = { ...req.body, updatedAt: new Date() };
        if (!DLPService_js_1.dlpService.getPolicy(policyId)) {
            throw new errors_js_1.AppError('DLP policy not found', 404);
        }
        // Validate updated policy structure if conditions/actions provided
        if (updates.conditions || updates.actions) {
            const existingPolicy = DLPService_js_1.dlpService.getPolicy(policyId);
            const updatedPolicy = { ...existingPolicy, ...updates };
            validatePolicyStructure(updatedPolicy);
        }
        const success = DLPService_js_1.dlpService.updatePolicy(policyId, updates);
        if (!success) {
            throw new errors_js_1.AppError('Failed to update DLP policy', 500);
        }
        logger_js_1.default.info('DLP policy updated', {
            component: 'DLPRoutes',
            policyId,
            updatedBy: req.user?.id,
            tenantId: req.user?.tenantId,
            changes: Object.keys(updates),
        });
        res.json({
            success: true,
            message: 'DLP policy updated successfully',
        });
    }
    catch (error) {
        if (error instanceof errors_js_1.AppError) {
            throw error;
        }
        const err = error;
        logger_js_1.default.error('Failed to update DLP policy', {
            component: 'DLPRoutes',
            error: err.message,
            policyId: req.params.id,
            userId: req.user?.id,
        });
        throw new errors_js_1.AppError('Failed to update DLP policy', 500);
    }
});
/**
 * DELETE /api/dlp/policies/:id
 * Delete a DLP policy
 */
router.delete('/policies/:id', (0, express_validator_1.param)('id').isString().notEmpty(), async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            throw new errors_js_1.AppError('Invalid policy ID', 400, 'VALIDATION_ERROR');
        }
        const policyId = req.params.id;
        if (!DLPService_js_1.dlpService.getPolicy(policyId)) {
            throw new errors_js_1.AppError('DLP policy not found', 404);
        }
        const success = DLPService_js_1.dlpService.deletePolicy(policyId);
        if (!success) {
            throw new errors_js_1.AppError('Failed to delete DLP policy', 500);
        }
        logger_js_1.default.info('DLP policy deleted', {
            component: 'DLPRoutes',
            policyId,
            deletedBy: req.user?.id,
            tenantId: req.user?.tenantId,
        });
        res.json({
            success: true,
            message: 'DLP policy deleted successfully',
        });
    }
    catch (error) {
        if (error instanceof errors_js_1.AppError) {
            throw error;
        }
        const err = error;
        logger_js_1.default.error('Failed to delete DLP policy', {
            component: 'DLPRoutes',
            error: err.message,
            policyId: req.params.id,
            userId: req.user?.id,
        });
        throw new errors_js_1.AppError('Failed to delete DLP policy', 500);
    }
});
/**
 * POST /api/dlp/policies/:id/toggle
 * Toggle a DLP policy enabled/disabled state
 */
router.post('/policies/:id/toggle', (0, express_validator_1.param)('id').isString().notEmpty(), async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            throw new errors_js_1.AppError('Invalid policy ID', 400, 'VALIDATION_ERROR');
        }
        const policyId = req.params.id;
        const policy = DLPService_js_1.dlpService.getPolicy(policyId);
        if (!policy) {
            throw new errors_js_1.AppError('DLP policy not found', 404);
        }
        const success = DLPService_js_1.dlpService.updatePolicy(policyId, {
            enabled: !policy.enabled,
            updatedAt: new Date(),
        });
        if (!success) {
            throw new errors_js_1.AppError('Failed to toggle DLP policy', 500);
        }
        logger_js_1.default.info('DLP policy toggled', {
            component: 'DLPRoutes',
            policyId,
            newState: !policy.enabled,
            toggledBy: req.user?.id,
            tenantId: req.user?.tenantId,
        });
        res.json({
            success: true,
            message: `DLP policy ${!policy.enabled ? 'enabled' : 'disabled'} successfully`,
            data: { enabled: !policy.enabled },
        });
    }
    catch (error) {
        if (error instanceof errors_js_1.AppError) {
            throw error;
        }
        const err = error;
        logger_js_1.default.error('Failed to toggle DLP policy', {
            component: 'DLPRoutes',
            error: err.message,
            policyId: req.params.id,
            userId: req.user?.id,
        });
        throw new errors_js_1.AppError('Failed to toggle DLP policy', 500);
    }
});
/**
 * POST /api/dlp/scan
 * Manual content scanning endpoint
 */
router.post('/scan', (0, express_validator_1.body)('content').notEmpty(), (0, express_validator_1.body)('operationType')
    .isIn(['read', 'write', 'delete', 'export', 'share'])
    .optional(), async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            throw new errors_js_1.AppError('Validation failed', 400, 'VALIDATION_ERROR');
        }
        const context = {
            userId: req.user?.id || 'anonymous',
            tenantId: req.user?.tenantId || 'default',
            userRole: req.user?.role || 'user',
            operationType: req.body.operationType || 'read',
            contentType: 'manual-scan',
            metadata: {
                scanType: 'manual',
                requestedBy: req.user?.id,
            },
        };
        const scanResults = await DLPService_js_1.dlpService.scanContent(req.body.content, context);
        const response = {
            success: true,
            data: {
                violations: scanResults.map((result) => ({
                    policyId: result.policyId,
                    matched: result.matched,
                    confidence: result.confidence,
                    detectedEntities: result.metadata.detectedEntities,
                    recommendedActions: result.recommendedActions.map((action) => ({
                        type: action.type,
                        severity: action.severity,
                    })),
                    scanDuration: result.metadata.scanDuration,
                })),
                summary: {
                    totalViolations: scanResults.length,
                    highSeverityViolations: scanResults.filter((r) => r.recommendedActions.some((a) => a.severity === 'high' || a.severity === 'critical')).length,
                    wouldBlock: scanResults.some((r) => r.recommendedActions.some((a) => a.type === 'block')),
                },
            },
        };
        logger_js_1.default.info('Manual DLP scan completed', {
            component: 'DLPRoutes',
            userId: req.user?.id,
            tenantId: req.user?.tenantId,
            violationCount: scanResults.length,
            contentSize: JSON.stringify(req.body.content).length,
        });
        res.json(response);
    }
    catch (error) {
        const err = error;
        logger_js_1.default.error('Manual DLP scan failed', {
            component: 'DLPRoutes',
            error: err.message,
            userId: req.user?.id,
        });
        throw new errors_js_1.AppError('DLP scan failed', 500);
    }
});
/**
 * GET /api/dlp/metrics
 * Get DLP metrics and statistics
 */
router.get('/metrics', (0, express_validator_1.query)('timeRange').isIn(['1h', '24h', '7d', '30d']).optional(), async (req, res) => {
    try {
        const timeRange = req.query.timeRange || '24h';
        // In a real implementation, this would query metrics from a time-series database
        const mockMetrics = {
            timeRange,
            totalScans: 1250,
            violations: {
                total: 45,
                blocked: 12,
                redacted: 28,
                quarantined: 5,
            },
            topViolatedPolicies: [
                { policyId: 'pii-detection', violations: 18, name: 'PII Detection' },
                {
                    policyId: 'credentials-detection',
                    violations: 12,
                    name: 'Credentials Detection',
                },
                {
                    policyId: 'financial-data',
                    violations: 8,
                    name: 'Financial Data Protection',
                },
            ],
            violationsByType: {
                email: 15,
                ssn: 8,
                creditCard: 6,
                apiKey: 12,
                phone: 4,
            },
            trends: {
                daily: [2, 5, 3, 8, 12, 6, 9], // Last 7 days
                hourly: Array.from({ length: 24 }, () => Math.floor(Math.random() * 5)),
            },
        };
        res.json({
            success: true,
            data: mockMetrics,
        });
    }
    catch (error) {
        const err = error;
        logger_js_1.default.error('Failed to get DLP metrics', {
            component: 'DLPRoutes',
            error: err.message,
            userId: req.user?.id,
        });
        throw new errors_js_1.AppError('Failed to retrieve DLP metrics', 500);
    }
});
/**
 * Helper function to validate policy structure
 */
function validatePolicyStructure(policy) {
    // Validate conditions
    if (policy.conditions) {
        for (const condition of policy.conditions) {
            if (!condition.type ||
                !condition.operator ||
                condition.value === undefined) {
                throw new errors_js_1.AppError('Invalid policy condition structure', 400);
            }
            const validTypes = [
                'content_match',
                'field_match',
                'metadata_match',
                'user_role',
                'tenant_id',
            ];
            if (!validTypes.includes(condition.type)) {
                throw new errors_js_1.AppError(`Invalid condition type: ${condition.type}`, 400);
            }
            const validOperators = [
                'contains',
                'matches',
                'equals',
                'starts_with',
                'ends_with',
            ];
            if (!validOperators.includes(condition.operator)) {
                throw new errors_js_1.AppError(`Invalid condition operator: ${condition.operator}`, 400);
            }
        }
    }
    // Validate actions
    if (policy.actions) {
        for (const action of policy.actions) {
            if (!action.type || !action.severity) {
                throw new errors_js_1.AppError('Invalid policy action structure', 400);
            }
            const validActionTypes = [
                'block',
                'redact',
                'quarantine',
                'alert',
                'audit',
                'encrypt',
            ];
            if (!validActionTypes.includes(action.type)) {
                throw new errors_js_1.AppError(`Invalid action type: ${action.type}`, 400);
            }
            const validSeverities = ['low', 'medium', 'high', 'critical'];
            if (!validSeverities.includes(action.severity)) {
                throw new errors_js_1.AppError(`Invalid action severity: ${action.severity}`, 400);
            }
        }
    }
}
exports.default = router;
