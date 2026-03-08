"use strict";
// @ts-nocheck
/**
 * DLP Middleware
 *
 * Express middleware that integrates DLP scanning into API requests and responses.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dlpStrictMiddleware = exports.dlpReadOnlyMiddleware = exports.dlpMiddleware = void 0;
exports.createDLPMiddleware = createDLPMiddleware;
exports.dlpStatusMiddleware = dlpStatusMiddleware;
const DLPService_js_1 = require("../services/DLPService.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const errors_js_1 = require("../lib/errors.js");
const defaultOptions = {
    enabled: true,
    scanBody: true,
    scanParams: false,
    scanQuery: false,
    scanResponse: false,
    exemptRoutes: ['/health', '/metrics', '/favicon.ico'],
    exemptMethods: ['OPTIONS', 'HEAD'],
    blockOnViolation: true,
    maxContentSize: 1024 * 1024, // 1MB
};
/**
 * Create DLP middleware with specified options
 */
function createDLPMiddleware(options = {}) {
    const config = { ...defaultOptions, ...options };
    return async (req, res, next) => {
        try {
            // Skip if DLP is disabled
            if (!config.enabled) {
                return next();
            }
            // Skip exempt routes
            if (config.exemptRoutes?.some((route) => req.path.startsWith(route))) {
                return next();
            }
            // Skip exempt methods
            if (config.exemptMethods?.includes(req.method)) {
                return next();
            }
            // Extract DLP context from request
            const context = {
                userId: req.user?.id || 'anonymous',
                tenantId: req.user?.tenantId || 'default',
                userRole: req.user?.role || 'user',
                operationType: getDLPOperationType(req.method),
                contentType: req.get('Content-Type') || 'application/json',
                metadata: {
                    userAgent: req.get('User-Agent'),
                    ip: req.ip,
                    route: req.route?.path,
                    method: req.method,
                },
            };
            const violations = [];
            let processedBody = req.body;
            // Scan request body
            if (config.scanBody && req.body) {
                const bodyResult = await scanRequestData(req.body, 'body', context, config);
                if (bodyResult.violations.length > 0) {
                    violations.push(...bodyResult.violations);
                    processedBody = bodyResult.processedContent;
                }
            }
            // Scan request parameters
            if (config.scanParams && Object.keys(req.params).length > 0) {
                const paramsResult = await scanRequestData(req.params, 'params', context, config);
                if (paramsResult.violations.length > 0) {
                    violations.push(...paramsResult.violations);
                }
            }
            // Scan query parameters
            if (config.scanQuery && Object.keys(req.query).length > 0) {
                const queryResult = await scanRequestData(req.query, 'query', context, config);
                if (queryResult.violations.length > 0) {
                    violations.push(...queryResult.violations);
                }
            }
            // Attach DLP information to request
            req.dlp = {
                scanned: true,
                violations,
                processedBody,
            };
            // Block request if violations found and blocking is enabled
            if (config.blockOnViolation && violations.length > 0) {
                const criticalViolations = violations.filter((v) => v.recommendedActions.some((action) => action.severity === 'critical'));
                if (criticalViolations.length > 0) {
                    logger_js_1.default.warn('DLP middleware blocked request due to critical violations', {
                        component: 'DLPMiddleware',
                        tenantId: context.tenantId,
                        userId: context.userId,
                        path: req.path,
                        method: req.method,
                        violationCount: criticalViolations.length,
                        violations: criticalViolations.map((v) => ({
                            policyId: v.policyId,
                            detectedEntities: v.metadata.detectedEntities,
                        })),
                    });
                    throw new errors_js_1.AppError('Request blocked due to data loss prevention policy violations', 403, 'DLP_VIOLATION');
                }
            }
            // Replace request body with processed content if redacted
            if (processedBody !== req.body) {
                req.body = processedBody;
            }
            // Scan response if enabled
            if (config.scanResponse) {
                const originalSend = res.send;
                const originalJson = res.json;
                // Override res.send()
                res.send = function (body) {
                    if (body && typeof body === 'string') {
                        scanAndProcessResponse(body, context, config)
                            .then((processedResponse) => {
                            return originalSend.call(this, processedResponse);
                        })
                            .catch((error) => {
                            logger_js_1.default.error('DLP response scanning failed', {
                                component: 'DLPMiddleware',
                                error: error.message,
                                tenantId: context.tenantId,
                            });
                            return originalSend.call(this, body);
                        });
                    }
                    else {
                        return originalSend.call(this, body);
                    }
                };
                // Override res.json()
                res.json = function (obj) {
                    if (obj) {
                        scanAndProcessResponse(obj, context, config)
                            .then((processedResponse) => {
                            return originalJson.call(this, processedResponse);
                        })
                            .catch((error) => {
                            logger_js_1.default.error('DLP response scanning failed', {
                                component: 'DLPMiddleware',
                                error: error.message,
                                tenantId: context.tenantId,
                            });
                            return originalJson.call(this, obj);
                        });
                    }
                    else {
                        return originalJson.call(this, obj);
                    }
                };
            }
            next();
        }
        catch (error) {
            logger_js_1.default.error('DLP middleware error', {
                component: 'DLPMiddleware',
                error: error.message,
                path: req.path,
                method: req.method,
                userId: req.user?.id,
            });
            if (error instanceof errors_js_1.AppError) {
                throw error;
            }
            next(error);
        }
    };
}
/**
 * Scan request data for DLP violations
 */
async function scanRequestData(data, dataType, context, config) {
    try {
        // Check content size
        const contentStr = JSON.stringify(data);
        if (config.maxContentSize && contentStr.length > config.maxContentSize) {
            logger_js_1.default.warn('DLP middleware skipped scanning due to size limit', {
                component: 'DLPMiddleware',
                contentSize: contentStr.length,
                maxSize: config.maxContentSize,
                dataType,
                tenantId: context.tenantId,
            });
            return { violations: [], processedContent: data };
        }
        // Scan for violations
        const scanResults = await DLPService_js_1.dlpService.scanContent(data, context);
        if (scanResults.length === 0) {
            return { violations: [], processedContent: data };
        }
        // Apply DLP actions
        const { processedContent, actionsApplied, blocked } = await DLPService_js_1.dlpService.applyActions(data, scanResults, context);
        logger_js_1.default.info('DLP middleware scan completed', {
            component: 'DLPMiddleware',
            dataType,
            tenantId: context.tenantId,
            userId: context.userId,
            violationCount: scanResults.length,
            actionsApplied,
            blocked,
        });
        return {
            violations: scanResults,
            processedContent,
        };
    }
    catch (error) {
        logger_js_1.default.error('DLP request data scanning failed', {
            component: 'DLPMiddleware',
            error: error.message,
            dataType,
            tenantId: context.tenantId,
        });
        // Return original data if scanning fails
        return { violations: [], processedContent: data };
    }
}
/**
 * Scan and process response data
 */
async function scanAndProcessResponse(responseData, context, config) {
    try {
        const responseContext = {
            ...context,
            operationType: 'read',
        };
        const scanResults = await DLPService_js_1.dlpService.scanContent(responseData, responseContext);
        if (scanResults.length === 0) {
            return responseData;
        }
        const { processedContent } = await DLPService_js_1.dlpService.applyActions(responseData, scanResults, responseContext);
        logger_js_1.default.info('DLP response scanning completed', {
            component: 'DLPMiddleware',
            tenantId: context.tenantId,
            userId: context.userId,
            violationCount: scanResults.length,
        });
        return processedContent;
    }
    catch (error) {
        logger_js_1.default.error('DLP response scanning failed', {
            component: 'DLPMiddleware',
            error: error.message,
            tenantId: context.tenantId,
        });
        return responseData;
    }
}
/**
 * Map HTTP method to DLP operation type
 */
function getDLPOperationType(method) {
    switch (method.toUpperCase()) {
        case 'GET':
        case 'HEAD':
            return 'read';
        case 'POST':
        case 'PUT':
        case 'PATCH':
            return 'write';
        case 'DELETE':
            return 'delete';
        default:
            return 'read';
    }
}
/**
 * DLP status endpoint middleware
 */
function dlpStatusMiddleware(req, res, next) {
    try {
        const policies = DLPService_js_1.dlpService.listPolicies();
        const enabledPolicies = policies.filter((p) => p.enabled);
        const status = {
            enabled: true,
            totalPolicies: policies.length,
            enabledPolicies: enabledPolicies.length,
            policies: enabledPolicies.map((p) => ({
                id: p.id,
                name: p.name,
                priority: p.priority,
                enabled: p.enabled,
                actionTypes: p.actions.map((a) => a.type),
            })),
        };
        res.json(status);
    }
    catch (error) {
        logger_js_1.default.error('DLP status endpoint error', {
            component: 'DLPMiddleware',
            error: error.message,
        });
        next(error);
    }
}
// Pre-configured middleware instances
exports.dlpMiddleware = createDLPMiddleware();
exports.dlpReadOnlyMiddleware = createDLPMiddleware({
    scanBody: true,
    scanResponse: true,
    blockOnViolation: false,
});
exports.dlpStrictMiddleware = createDLPMiddleware({
    scanBody: true,
    scanParams: true,
    scanQuery: true,
    scanResponse: true,
    blockOnViolation: true,
});
exports.default = createDLPMiddleware;
