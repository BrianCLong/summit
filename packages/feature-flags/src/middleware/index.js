"use strict";
/**
 * Feature Flag Middleware
 *
 * Express middleware for feature flag integration
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createFeatureFlagMiddleware = createFeatureFlagMiddleware;
exports.createFlagGuard = createFlagGuard;
exports.createFlagDirective = createFlagDirective;
exports.exposeFeatureFlagsMiddleware = exposeFeatureFlagsMiddleware;
/**
 * Create feature flag middleware
 */
function createFeatureFlagMiddleware(options) {
    const { service, contextBuilder, skipRoutes = [], skipMethods = [] } = options;
    return (req, res, next) => {
        try {
            // Skip if route or method is in skip list
            if (skipRoutes.some((route) => req.path.startsWith(route))) {
                return next();
            }
            if (skipMethods.includes(req.method)) {
                return next();
            }
            // Build flag context from request
            const context = buildContext(req, contextBuilder);
            // Create feature flag middleware context
            req.featureFlags = {
                isEnabled: async (key, defaultValue = false) => {
                    return service.getBooleanFlag(key, defaultValue, context);
                },
                getString: async (key, defaultValue) => {
                    return service.getStringFlag(key, defaultValue, context);
                },
                getNumber: async (key, defaultValue) => {
                    return service.getNumberFlag(key, defaultValue, context);
                },
                getJSON: async (key, defaultValue) => {
                    return service.getJSONFlag(key, defaultValue, context);
                },
                getAll: async () => {
                    return service.getAllFlags(context);
                },
                track: async (eventName, data) => {
                    return service.track(eventName, context, data);
                },
                getContext: () => context,
            };
            next();
        }
        catch (error) {
            // Feature flags should not break request handling
            console.error('Feature flag middleware error:', error);
            next();
        }
    };
}
/**
 * Build flag context from request
 */
function buildContext(req, contextBuilder) {
    // Start with default context from request
    const defaultContext = {
        userId: req.user?.id || req.user?.userId,
        userEmail: req.user?.email,
        userRole: req.user?.role || req.user?.roles,
        tenantId: req.user?.tenantId || req.tenant?.id,
        sessionId: req.sessionId || req.sessionID,
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.get('User-Agent'),
    };
    // Merge with custom context if provided
    if (contextBuilder) {
        const customContext = contextBuilder(req);
        return { ...defaultContext, ...customContext };
    }
    return defaultContext;
}
/**
 * Create a guard middleware to check if a flag is enabled
 */
function createFlagGuard(flagKey, options) {
    const { service, redirectUrl, errorMessage = 'Feature not available', statusCode = 403, contextBuilder, } = options;
    return async (req, res, next) => {
        try {
            const context = buildContext(req, contextBuilder);
            const isEnabled = await service.getBooleanFlag(flagKey, false, context);
            if (isEnabled) {
                next();
            }
            else {
                if (redirectUrl) {
                    res.redirect(redirectUrl);
                }
                else {
                    res.status(statusCode).json({
                        error: errorMessage,
                        flagKey,
                    });
                }
            }
        }
        catch (error) {
            console.error(`Flag guard error for ${flagKey}:`, error);
            // On error, deny access by default
            res.status(500).json({
                error: 'Internal server error',
            });
        }
    };
}
/**
 * Create a GraphQL directive for feature flag protection
 */
function createFlagDirective(service) {
    return {
        name: 'featureFlag',
        description: 'Protects a field or type with a feature flag',
        locations: ['FIELD_DEFINITION', 'OBJECT'],
        args: {
            key: 'String!',
            defaultValue: 'Boolean',
        },
        resolve: async (next, source, args, context, info) => {
            const flagKey = args.key;
            const defaultValue = args.defaultValue ?? false;
            // Build flag context from GraphQL context
            const flagContext = {
                userId: context.user?.id,
                userEmail: context.user?.email,
                userRole: context.user?.role,
                tenantId: context.tenantId,
            };
            const isEnabled = await service.getBooleanFlag(flagKey, defaultValue, flagContext);
            if (!isEnabled) {
                throw new Error(`Feature '${flagKey}' is not available`);
            }
            return next(source, args, context, info);
        },
    };
}
/**
 * Middleware to expose feature flags to client
 */
function exposeFeatureFlagsMiddleware(service, options = {}) {
    const { path = '/api/feature-flags', contextBuilder } = options;
    return async (req, res) => {
        try {
            if (req.path !== path) {
                res.status(404).json({ error: 'Not found' });
                return;
            }
            const context = buildContext(req, contextBuilder);
            const flags = await service.getAllFlags(context);
            res.json({
                flags,
                context: {
                    userId: context.userId,
                    tenantId: context.tenantId,
                    environment: context.environment,
                },
            });
        }
        catch (error) {
            console.error('Error exposing feature flags:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    };
}
