"use strict";
// @ts-nocheck
/**
 * SIEM Management API Routes
 *
 * REST endpoints for managing SIEM integrations, providers, and event monitoring.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const SIEMService_js_1 = require("../services/SIEMService.js");
const auth_js_1 = require("../middleware/auth.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const errors_js_1 = require("../lib/errors.js");
const express_validator_1 = require("express-validator");
const router = (0, express_1.Router)();
// Apply authentication to all SIEM routes
router.use(auth_js_1.authMiddleware);
/**
 * GET /api/siem/providers
 * List all SIEM providers
 */
router.get('/providers', async (req, res) => {
    try {
        const providers = SIEMService_js_1.siemService.listProviders();
        // Filter sensitive information for response
        const filteredProviders = providers.map((provider) => ({
            id: provider.id,
            name: provider.name,
            type: provider.type,
            enabled: provider.enabled,
            config: {
                url: provider.config.url ? '[CONFIGURED]' : '[NOT CONFIGURED]',
                timeout: provider.config.timeout,
                retryAttempts: provider.config.retryAttempts,
            },
            rateLimits: provider.rateLimits,
            filterCount: provider.filters.length,
        }));
        res.json({
            success: true,
            data: filteredProviders,
            meta: {
                total: providers.length,
                enabled: providers.filter((p) => p.enabled).length,
                types: [...new Set(providers.map((p) => p.type))],
            },
        });
    }
    catch (error) {
        const err = error;
        logger_js_1.default.error('Failed to list SIEM providers', {
            component: 'SIEMRoutes',
            error: err.message,
            userId: req.user?.id,
        });
        throw new errors_js_1.AppError('Failed to retrieve SIEM providers', 500);
    }
});
/**
 * GET /api/siem/providers/:id
 * Get specific SIEM provider details
 */
router.get('/providers/:id', (0, express_validator_1.param)('id').isString().notEmpty(), async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            throw new errors_js_1.AppError('Invalid provider ID', 400, 'VALIDATION_ERROR');
        }
        const status = SIEMService_js_1.siemService.getProviderStatus(req.params.id);
        if (!status.provider) {
            throw new errors_js_1.AppError('SIEM provider not found', 404);
        }
        res.json({
            success: true,
            data: status,
        });
    }
    catch (error) {
        const err = error;
        if (error instanceof errors_js_1.AppError) {
            throw error;
        }
        logger_js_1.default.error('Failed to get SIEM provider', {
            component: 'SIEMRoutes',
            error: err.message,
            providerId: req.params.id,
            userId: req.user?.id,
        });
        throw new errors_js_1.AppError('Failed to retrieve SIEM provider', 500);
    }
});
/**
 * PUT /api/siem/providers/:id
 * Update SIEM provider configuration
 */
router.put('/providers/:id', (0, express_validator_1.param)('id').isString().notEmpty(), (0, express_validator_1.body)('enabled').isBoolean().optional(), (0, express_validator_1.body)('config').isObject().optional(), (0, express_validator_1.body)('rateLimits').isObject().optional(), (0, express_validator_1.body)('filters').isArray().optional(), async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            throw new errors_js_1.AppError('Validation failed', 400, 'VALIDATION_ERROR');
        }
        const providerId = req.params.id;
        const updates = req.body;
        // Validate provider exists
        const currentStatus = SIEMService_js_1.siemService.getProviderStatus(providerId);
        if (!currentStatus.provider) {
            throw new errors_js_1.AppError('SIEM provider not found', 404);
        }
        const success = SIEMService_js_1.siemService.updateProvider(providerId, updates);
        if (!success) {
            throw new errors_js_1.AppError('Failed to update SIEM provider', 500);
        }
        logger_js_1.default.info('SIEM provider updated', {
            component: 'SIEMRoutes',
            providerId,
            updatedBy: req.user?.id,
            tenantId: req.user?.tenantId,
            changes: Object.keys(updates),
        });
        res.json({
            success: true,
            message: 'SIEM provider updated successfully',
        });
    }
    catch (error) {
        const err = error;
        if (error instanceof errors_js_1.AppError) {
            throw error;
        }
        logger_js_1.default.error('Failed to update SIEM provider', {
            component: 'SIEMRoutes',
            error: err.message,
            providerId: req.params.id,
            userId: req.user?.id,
        });
        throw new errors_js_1.AppError('Failed to update SIEM provider', 500);
    }
});
/**
 * POST /api/siem/providers/:id/test
 * Test SIEM provider connectivity
 */
router.post('/providers/:id/test', (0, express_validator_1.param)('id').isString().notEmpty(), async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            throw new errors_js_1.AppError('Invalid provider ID', 400, 'VALIDATION_ERROR');
        }
        const providerId = req.params.id;
        logger_js_1.default.info('Testing SIEM provider connectivity', {
            component: 'SIEMRoutes',
            providerId,
            testedBy: req.user?.id,
            tenantId: req.user?.tenantId,
        });
        const testResult = await SIEMService_js_1.siemService.testProvider(providerId);
        res.json({
            success: true,
            data: {
                providerId,
                connected: testResult,
                testedAt: new Date().toISOString(),
            },
        });
    }
    catch (error) {
        const err = error;
        logger_js_1.default.error('SIEM provider test failed', {
            component: 'SIEMRoutes',
            error: err.message,
            providerId: req.params.id,
            userId: req.user?.id,
        });
        throw new errors_js_1.AppError('Failed to test SIEM provider', 500);
    }
});
/**
 * POST /api/siem/events
 * Manually send event to SIEM systems
 */
router.post('/events', (0, express_validator_1.body)('eventType').isString().notEmpty(), (0, express_validator_1.body)('severity').isIn(['low', 'medium', 'high', 'critical']), (0, express_validator_1.body)('source').isString().notEmpty(), (0, express_validator_1.body)('message').isString().notEmpty(), (0, express_validator_1.body)('details').isObject().optional(), (0, express_validator_1.body)('tags').isArray().optional(), async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            throw new errors_js_1.AppError('Validation failed', 400, 'VALIDATION_ERROR');
        }
        const event = {
            timestamp: new Date(),
            eventType: req.body.eventType,
            severity: req.body.severity,
            source: req.body.source,
            message: req.body.message,
            details: req.body.details || {},
            userId: req.user?.id,
            tenantId: req.user?.tenantId,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            tags: req.body.tags || ['manual'],
            rawData: {
                createdBy: req.user?.id,
                createdAt: new Date(),
                manual: true,
            },
        };
        await SIEMService_js_1.siemService.sendEvent(event);
        logger_js_1.default.info('Manual SIEM event sent', {
            component: 'SIEMRoutes',
            eventType: event.eventType,
            severity: event.severity,
            sentBy: req.user?.id,
            tenantId: req.user?.tenantId,
        });
        res.json({
            success: true,
            message: 'Event sent to SIEM systems',
            data: {
                eventId: `manual-${Date.now()}`,
                timestamp: event.timestamp,
                eventType: event.eventType,
                severity: event.severity,
            },
        });
    }
    catch (error) {
        const err = error;
        logger_js_1.default.error('Failed to send manual SIEM event', {
            component: 'SIEMRoutes',
            error: err.message,
            userId: req.user?.id,
        });
        throw new errors_js_1.AppError('Failed to send SIEM event', 500);
    }
});
/**
 * GET /api/siem/status
 * Get overall SIEM integration status
 */
router.get('/status', async (req, res) => {
    try {
        const providers = SIEMService_js_1.siemService.listProviders();
        const enabledProviders = providers.filter((p) => p.enabled);
        const statusSummary = {
            enabled: enabledProviders.length > 0,
            totalProviders: providers.length,
            enabledProviders: enabledProviders.length,
            providerStatus: enabledProviders.map((provider) => {
                const status = SIEMService_js_1.siemService.getProviderStatus(provider.id);
                return {
                    id: provider.id,
                    name: provider.name,
                    type: provider.type,
                    healthy: status.circuitBreaker?.state !== 'OPEN',
                    bufferSize: status.buffer?.size || 0,
                    lastActivity: status.buffer?.lastFlush,
                };
            }),
            healthySystems: enabledProviders.filter((provider) => {
                const status = SIEMService_js_1.siemService.getProviderStatus(provider.id);
                return status.circuitBreaker?.state !== 'OPEN';
            }).length,
        };
        res.json({
            success: true,
            data: statusSummary,
        });
    }
    catch (error) {
        const err = error;
        logger_js_1.default.error('Failed to get SIEM status', {
            component: 'SIEMRoutes',
            error: err.message,
            userId: req.user?.id,
        });
        throw new errors_js_1.AppError('Failed to retrieve SIEM status', 500);
    }
});
/**
 * GET /api/siem/metrics
 * Get SIEM metrics and statistics
 */
router.get('/metrics', (0, express_validator_1.query)('timeRange').isIn(['1h', '24h', '7d', '30d']).optional(), (0, express_validator_1.query)('provider').isString().optional(), async (req, res) => {
    try {
        const timeRange = req.query.timeRange || '24h';
        const providerFilter = req.query.provider;
        // In a real implementation, this would query actual metrics from monitoring systems
        const mockMetrics = {
            timeRange,
            provider: providerFilter || 'all',
            eventsSent: {
                total: 45672,
                successful: 45123,
                failed: 549,
                successRate: 98.8,
            },
            eventsByType: {
                authentication_failed: 1234,
                authentication_success: 12456,
                data_access: 8934,
                privilege_escalation: 456,
                suspicious_activity: 789,
                request_anomaly: 234,
            },
            eventsBySeverity: {
                low: 35000,
                medium: 8000,
                high: 2500,
                critical: 172,
            },
            providerMetrics: SIEMService_js_1.siemService
                .listProviders()
                .filter((p) => p.enabled && (!providerFilter || p.id === providerFilter))
                .map((provider) => {
                const status = SIEMService_js_1.siemService.getProviderStatus(provider.id);
                return {
                    id: provider.id,
                    name: provider.name,
                    type: provider.type,
                    eventsSent: Math.floor(Math.random() * 10000) + 5000,
                    failures: Math.floor(Math.random() * 100),
                    averageLatency: Math.floor(Math.random() * 500) + 100,
                    circuitBreakerState: status.circuitBreaker?.state || 'CLOSED',
                    bufferSize: status.buffer?.size || 0,
                };
            }),
            alerts: [
                {
                    time: new Date(Date.now() - 3600000).toISOString(),
                    message: 'High number of failed authentication attempts',
                    severity: 'high',
                    count: 45,
                },
                {
                    time: new Date(Date.now() - 7200000).toISOString(),
                    message: 'Suspicious activity patterns detected',
                    severity: 'medium',
                    count: 12,
                },
            ],
        };
        res.json({
            success: true,
            data: mockMetrics,
        });
    }
    catch (error) {
        const err = error;
        logger_js_1.default.error('Failed to get SIEM metrics', {
            component: 'SIEMRoutes',
            error: err.message,
            userId: req.user?.id,
        });
        throw new errors_js_1.AppError('Failed to retrieve SIEM metrics', 500);
    }
});
/**
 * POST /api/siem/alerts
 * Create security alert
 */
router.post('/alerts', (0, express_validator_1.body)('title').isString().notEmpty(), (0, express_validator_1.body)('description').isString().notEmpty(), (0, express_validator_1.body)('severity').isIn(['low', 'medium', 'high', 'critical']), (0, express_validator_1.body)('category').isString().optional(), (0, express_validator_1.body)('indicators').isArray().optional(), async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            throw new errors_js_1.AppError('Validation failed', 400, 'VALIDATION_ERROR');
        }
        const alert = {
            title: req.body.title,
            description: req.body.description,
            severity: req.body.severity,
            category: req.body.category || 'security',
            indicators: req.body.indicators || [],
            createdBy: req.user?.id,
            tenantId: req.user?.tenantId,
        };
        // Create SIEM event for the alert
        const event = {
            timestamp: new Date(),
            eventType: 'security_alert',
            severity: alert.severity,
            source: 'intelgraph_manual_alert',
            message: `Security alert: ${alert.title}`,
            details: {
                title: alert.title,
                description: alert.description,
                category: alert.category,
                indicators: alert.indicators,
                alertId: `alert-${Date.now()}`,
            },
            userId: req.user?.id,
            tenantId: req.user?.tenantId,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            tags: ['security', 'alert', 'manual'],
        };
        await SIEMService_js_1.siemService.sendEvent(event);
        logger_js_1.default.info('Security alert created and sent to SIEM', {
            component: 'SIEMRoutes',
            alertTitle: alert.title,
            severity: alert.severity,
            createdBy: req.user?.id,
            tenantId: req.user?.tenantId,
        });
        res.json({
            success: true,
            message: 'Security alert created and sent to SIEM systems',
            data: {
                alertId: event.details.alertId,
                timestamp: event.timestamp,
                severity: event.severity,
            },
        });
    }
    catch (error) {
        const err = error;
        logger_js_1.default.error('Failed to create security alert', {
            component: 'SIEMRoutes',
            error: err.message,
            userId: req.user?.id,
        });
        throw new errors_js_1.AppError('Failed to create security alert', 500);
    }
});
/**
 * GET /api/siem/health
 * SIEM service health check
 */
router.get('/health', async (req, res) => {
    try {
        const providers = SIEMService_js_1.siemService.listProviders();
        const enabledProviders = providers.filter((p) => p.enabled);
        const healthyProviders = enabledProviders.filter((provider) => {
            const status = SIEMService_js_1.siemService.getProviderStatus(provider.id);
            return status.circuitBreaker?.state !== 'OPEN';
        });
        const health = {
            status: healthyProviders.length === enabledProviders.length
                ? 'healthy'
                : 'degraded',
            timestamp: new Date(),
            providers: {
                total: providers.length,
                enabled: enabledProviders.length,
                healthy: healthyProviders.length,
                unhealthy: enabledProviders.length - healthyProviders.length,
            },
            details: enabledProviders.map((provider) => {
                const status = SIEMService_js_1.siemService.getProviderStatus(provider.id);
                return {
                    id: provider.id,
                    name: provider.name,
                    healthy: status.circuitBreaker?.state !== 'OPEN',
                    bufferSize: status.buffer?.size || 0,
                };
            }),
        };
        const statusCode = health.status === 'healthy' ? 200 : 503;
        res.status(statusCode).json({
            success: health.status === 'healthy',
            data: health,
        });
    }
    catch (error) {
        logger_js_1.default.error('SIEM health check failed', {
            component: 'SIEMRoutes',
            error: error.message,
        });
        res.status(500).json({
            success: false,
            error: 'SIEM service health check failed',
        });
    }
});
exports.default = router;
