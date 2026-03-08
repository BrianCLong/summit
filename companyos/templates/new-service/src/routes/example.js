"use strict";
/**
 * Example Routes
 * Demonstrates pattern for implementing API endpoints
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.exampleRoutes = void 0;
const express_1 = require("express");
const auth_js_1 = require("../middleware/auth.js");
const logger_js_1 = require("../utils/logger.js");
exports.exampleRoutes = (0, express_1.Router)();
// In-memory store for demo
const resources = new Map();
/**
 * List resources
 * Protected by OPA - requires 'resource:list' permission
 */
exports.exampleRoutes.get('/resources', (0, auth_js_1.requirePermission)('resource:list'), async (req, res) => {
    const tenantId = req.tenantContext?.tenantId;
    // Filter by tenant
    const tenantResources = Array.from(resources.values()).filter((r) => r.tenantId === tenantId);
    logger_js_1.logger.info('Listed resources', {
        tenantId,
        count: tenantResources.length,
    });
    res.json({
        data: tenantResources,
        count: tenantResources.length,
    });
});
/**
 * Get single resource
 * Protected by OPA - requires 'resource:read' permission
 */
exports.exampleRoutes.get('/resources/:id', (0, auth_js_1.requirePermission)('resource:read'), async (req, res) => {
    const { id } = req.params;
    const tenantId = req.tenantContext?.tenantId;
    const resource = resources.get(id);
    if (!resource) {
        res.status(404).json({ error: 'Resource not found' });
        return;
    }
    // Tenant isolation check
    if (resource.tenantId !== tenantId) {
        logger_js_1.logger.warn('Cross-tenant access attempt', {
            requestedTenant: resource.tenantId,
            userTenant: tenantId,
        });
        res.status(404).json({ error: 'Resource not found' });
        return;
    }
    res.json({ data: resource });
});
/**
 * Create resource
 * Protected by OPA - requires 'resource:create' permission
 */
exports.exampleRoutes.post('/resources', (0, auth_js_1.requirePermission)('resource:create'), async (req, res) => {
    const { name } = req.body;
    const tenantId = req.tenantContext?.tenantId;
    if (!name) {
        res.status(400).json({ error: 'Name is required' });
        return;
    }
    const resource = {
        id: crypto.randomUUID(),
        name,
        createdAt: new Date().toISOString(),
        tenantId: tenantId,
    };
    resources.set(resource.id, resource);
    logger_js_1.logger.info('Created resource', {
        resourceId: resource.id,
        tenantId,
    });
    res.status(201).json({ data: resource });
});
/**
 * Update resource
 * Protected by OPA - requires 'resource:update' permission
 */
exports.exampleRoutes.put('/resources/:id', (0, auth_js_1.requirePermission)('resource:update'), async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;
    const tenantId = req.tenantContext?.tenantId;
    const resource = resources.get(id);
    if (!resource || resource.tenantId !== tenantId) {
        res.status(404).json({ error: 'Resource not found' });
        return;
    }
    resource.name = name || resource.name;
    resources.set(id, resource);
    logger_js_1.logger.info('Updated resource', { resourceId: id, tenantId });
    res.json({ data: resource });
});
/**
 * Delete resource
 * Protected by OPA - requires 'resource:delete' permission
 */
exports.exampleRoutes.delete('/resources/:id', (0, auth_js_1.requirePermission)('resource:delete'), async (req, res) => {
    const { id } = req.params;
    const tenantId = req.tenantContext?.tenantId;
    const resource = resources.get(id);
    if (!resource || resource.tenantId !== tenantId) {
        res.status(404).json({ error: 'Resource not found' });
        return;
    }
    resources.delete(id);
    logger_js_1.logger.info('Deleted resource', { resourceId: id, tenantId });
    res.status(204).send();
});
