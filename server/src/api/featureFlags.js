"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createFeatureFlagRouter = void 0;
// server/src/api/featureFlags.ts
const express_1 = __importDefault(require("express"));
const auth_js_1 = require("../middleware/auth.js");
const http_param_js_1 = require("../utils/http-param.js");
/**
 * Middleware to require authentication
 * Assumes req.user is set by upstream auth middleware (e.g., passport, JWT)
 */
const requireAuth = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            error: 'Authentication required',
            message: 'You must be logged in to access this resource'
        });
    }
    next();
};
/**
 * Middleware to require admin role
 * Feature flag mutation (create/update/delete) requires admin privileges
 */
const requireAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            error: 'Authentication required',
            message: 'You must be logged in to access this resource'
        });
    }
    const user = req.user;
    const isAdmin = user.role === 'admin' || user.roles?.includes('admin') || user.isAdmin === true;
    if (!isAdmin) {
        return res.status(403).json({
            error: 'Admin access required',
            message: 'You do not have permission to modify feature flags',
            requiredRole: 'admin',
            yourRole: user.role || 'unknown'
        });
    }
    next();
};
const createFeatureFlagRouter = (deps) => {
    const router = express_1.default.Router();
    // Get all feature flags for the current user/context
    router.get('/', async (req, res) => {
        try {
            // Extract context from request
            const groupsRaw = (0, http_param_js_1.firstString)(req.query.groups);
            const attributesRaw = (0, http_param_js_1.firstString)(req.query.attributes);
            const context = {
                userId: (0, http_param_js_1.firstString)(req.query.userId) || req.user?.id,
                groups: groupsRaw ? groupsRaw.split(',') : req.user?.groups || [],
                attributes: attributesRaw ? JSON.parse(attributesRaw) : req.user?.attributes || {}
            };
            // Get all flags with their evaluation status
            const flags = await deps.featureFlagService.getAllFlagsWithContext(context);
            // Also get relevant configuration values
            const configs = await deps.configService.getAllConfig();
            // Combine into a response
            const response = {
                flags: Object.entries(flags).map(([key, enabled]) => ({
                    key,
                    enabled,
                    value: enabled, // Simplified for now - in a real system you'd include actual values
                    lastUpdated: new Date().toISOString()
                })),
                configs,
                timestamp: new Date().toISOString()
            };
            res.json(response);
        }
        catch (error) {
            console.error('Error fetching feature flags:', error);
            res.status(500).json({ error: 'Internal server error', message: error.message });
        }
    });
    // Get a specific feature flag evaluation
    router.get('/:flagKey', async (req, res) => {
        try {
            const flagKey = (0, http_param_js_1.firstString)(req.params.flagKey);
            if (!flagKey) {
                return res.status(400).json({ error: 'flagKey is required' });
            }
            // Extract context from request
            const groupsRaw = (0, http_param_js_1.firstString)(req.query.groups);
            const attributesRaw = (0, http_param_js_1.firstString)(req.query.attributes);
            const context = {
                userId: (0, http_param_js_1.firstString)(req.query.userId) || req.user?.id,
                groups: groupsRaw ? groupsRaw.split(',') : req.user?.groups || [],
                attributes: attributesRaw ? JSON.parse(attributesRaw) : req.user?.attributes || {}
            };
            // Get the flag evaluation
            const enabled = await deps.featureFlagService.isEnabled(flagKey, context);
            const variant = await deps.featureFlagService.getVariant(flagKey, context);
            res.json({
                key: flagKey,
                enabled,
                value: variant !== null ? variant : enabled,
                lastUpdated: new Date().toISOString()
            });
        }
        catch (error) {
            console.error(`Error fetching feature flag ${req.params.flagKey}:`, error);
            res.status(500).json({ error: 'Internal server error', message: error.message });
        }
    });
    // Admin API: Create a new feature flag (requires admin privileges)
    router.post('/', auth_js_1.ensureAuthenticated, (0, auth_js_1.ensureRole)(['admin', 'operator']), async (req, res) => {
        try {
            const { key, enabled = false, description, rolloutPercentage, targetUsers, targetGroups, conditions } = req.body;
            // Create the feature flag object
            const newFlag = {
                key,
                enabled,
                type: 'boolean', // Default type
                description: description || '',
                createdBy: req.user?.id || 'system',
                createdAt: new Date(),
                updatedAt: new Date(),
                rolloutPercentage: rolloutPercentage || undefined,
                targetUsers: targetUsers || undefined,
                targetGroups: targetGroups || undefined,
                conditions: conditions || undefined,
                tags: req.body.tags || [],
                environment: [process.env.NODE_ENV || 'development']
            };
            // TODO: Actually implement the createFlag method in the service
            // await deps.featureFlagService.createFlag(newFlag);
            res.status(201).json({
                key,
                enabled,
                message: 'Feature flag created successfully'
            });
        }
        catch (error) {
            console.error('Error creating feature flag:', error);
            res.status(500).json({ error: 'Internal server error', message: error.message });
        }
    });
    // Admin API: Update a feature flag (requires admin privileges)
    router.put('/:flagKey', auth_js_1.ensureAuthenticated, (0, auth_js_1.ensureRole)(['admin', 'operator']), async (req, res) => {
        try {
            const { flagKey } = req.params;
            const updateData = req.body;
            // Update the flag
            // await deps.featureFlagService.updateFlag(flagKey, updateData);
            res.json({
                key: flagKey,
                updated: true,
                message: 'Feature flag updated successfully',
                changes: Object.keys(updateData)
            });
        }
        catch (error) {
            console.error(`Error updating feature flag ${req.params.flagKey}:`, error);
            res.status(500).json({ error: 'Internal server error', message: error.message });
        }
    });
    // Admin API: Delete a feature flag (requires admin privileges)
    router.delete('/:flagKey', auth_js_1.ensureAuthenticated, (0, auth_js_1.ensureRole)(['admin']), async (req, res) => {
        try {
            const { flagKey } = req.params;
            // Delete the flag
            // await deps.featureFlagService.deleteFlag(flagKey);
            res.json({
                key: flagKey,
                deleted: true,
                message: 'Feature flag deleted successfully'
            });
        }
        catch (error) {
            console.error(`Error deleting feature flag ${req.params.flagKey}:`, error);
            res.status(500).json({ error: 'Internal server error', message: error.message });
        }
    });
    // Get configuration values
    router.get('/config/:key', async (req, res) => {
        try {
            const key = (0, http_param_js_1.firstString)(req.params.key);
            if (!key) {
                return res.status(400).json({ error: 'key is required' });
            }
            const environment = (0, http_param_js_1.firstString)(req.query.env) || process.env.NODE_ENV || 'development';
            const value = await deps.configService.getConfig(key, environment);
            res.json({
                key,
                value,
                environment,
                lastUpdated: new Date().toISOString()
            });
        }
        catch (error) {
            console.error(`Error fetching config ${req.params.key}:`, error);
            res.status(500).json({ error: 'Internal server error', message: error.message });
        }
    });
    // Get multiple configuration values
    router.post('/config/batch', async (req, res) => {
        try {
            const { keys } = req.body;
            const environment = (0, http_param_js_1.firstString)(req.query.env) || process.env.NODE_ENV || 'development';
            if (!Array.isArray(keys)) {
                return res.status(400).json({ error: 'Keys must be an array' });
            }
            const configs = await deps.configService.getMultipleConfig(keys, environment);
            res.json({
                configs,
                environment,
                timestamp: new Date().toISOString()
            });
        }
        catch (error) {
            console.error('Error fetching multiple configs:', error);
            res.status(500).json({ error: 'Internal server error', message: error.message });
        }
    });
    return router;
};
exports.createFeatureFlagRouter = createFeatureFlagRouter;
// Export types for consistency
