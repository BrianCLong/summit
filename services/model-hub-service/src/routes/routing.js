"use strict";
/**
 * Routing and Model Selection API Routes
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.routingRouter = void 0;
const express_1 = require("express");
const errorHandler_js_1 = require("../middleware/errorHandler.js");
const ModelSelectionService_js_1 = require("../routing/ModelSelectionService.js");
const RoutingRegistry_js_1 = require("../registry/RoutingRegistry.js");
const DeploymentRegistry_js_1 = require("../registry/DeploymentRegistry.js");
const PolicyRegistry_js_1 = require("../registry/PolicyRegistry.js");
const AuditService_js_1 = require("../governance/AuditService.js");
const index_js_1 = require("../types/index.js");
exports.routingRouter = (0, express_1.Router)();
// ============================================================================
// Model Selection
// ============================================================================
// Select model for request
exports.routingRouter.post('/select', (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const request = index_js_1.ModelSelectionRequestSchema.parse(req.body);
    const response = await ModelSelectionService_js_1.modelSelectionService.selectModel(request);
    res.json(response);
}));
// Record model invocation success
exports.routingRouter.post('/record-success', (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const { modelVersionId } = req.body;
    ModelSelectionService_js_1.modelSelectionService.recordSuccess(modelVersionId);
    res.json({ recorded: true });
}));
// Record model invocation failure
exports.routingRouter.post('/record-failure', (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const { modelVersionId } = req.body;
    ModelSelectionService_js_1.modelSelectionService.recordFailure(modelVersionId);
    res.json({ recorded: true });
}));
// ============================================================================
// Routing Rules
// ============================================================================
// List routing rules
exports.routingRouter.get('/rules', (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const { isEnabled, targetModelVersionId, limit, offset } = req.query;
    const result = await RoutingRegistry_js_1.routingRegistry.listRoutingRules({
        isEnabled: isEnabled !== undefined ? isEnabled === 'true' : undefined,
        targetModelVersionId: targetModelVersionId,
        limit: limit ? parseInt(limit) : undefined,
        offset: offset ? parseInt(offset) : undefined,
    });
    res.json(result);
}));
// Get routing rule
exports.routingRouter.get('/rules/:id', (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const rule = await RoutingRegistry_js_1.routingRegistry.getRoutingRule(req.params.id);
    res.json(rule);
}));
// Create routing rule
exports.routingRouter.post('/rules', (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const input = index_js_1.CreateRoutingRuleInputSchema.parse(req.body);
    const rule = await RoutingRegistry_js_1.routingRegistry.createRoutingRule(input);
    await AuditService_js_1.auditService.recordEvent({
        eventType: 'routing_rule.created',
        entityType: 'routing_rule',
        entityId: rule.id,
        actorId: input.createdBy,
        actorType: 'user',
        changes: { after: { name: rule.name, priority: rule.priority } },
    });
    res.status(201).json(rule);
}));
// Update routing rule
exports.routingRouter.patch('/rules/:id', (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const before = await RoutingRegistry_js_1.routingRegistry.getRoutingRule(req.params.id);
    const rule = await RoutingRegistry_js_1.routingRegistry.updateRoutingRule(req.params.id, req.body);
    await AuditService_js_1.auditService.recordEvent({
        eventType: 'routing_rule.updated',
        entityType: 'routing_rule',
        entityId: rule.id,
        actorId: req.body.updatedBy || 'system',
        actorType: 'user',
        changes: {
            before: { priority: before.priority, isEnabled: before.isEnabled },
            after: { priority: rule.priority, isEnabled: rule.isEnabled },
        },
    });
    res.json(rule);
}));
// Delete routing rule
exports.routingRouter.delete('/rules/:id', (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    await RoutingRegistry_js_1.routingRegistry.deleteRoutingRule(req.params.id);
    await AuditService_js_1.auditService.recordEvent({
        eventType: 'routing_rule.deleted',
        entityType: 'routing_rule',
        entityId: req.params.id,
        actorId: req.body.deletedBy || 'system',
        actorType: 'user',
    });
    res.status(204).send();
}));
// ============================================================================
// Tenant Bindings
// ============================================================================
// List tenant bindings
exports.routingRouter.get('/tenant-bindings', (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const { tenantId, capability, modelVersionId, isEnabled, limit, offset } = req.query;
    const result = await RoutingRegistry_js_1.routingRegistry.listTenantBindings({
        tenantId: tenantId,
        capability: capability,
        modelVersionId: modelVersionId,
        isEnabled: isEnabled !== undefined ? isEnabled === 'true' : undefined,
        limit: limit ? parseInt(limit) : undefined,
        offset: offset ? parseInt(offset) : undefined,
    });
    res.json(result);
}));
// Create tenant binding
exports.routingRouter.post('/tenant-bindings', (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const input = index_js_1.CreateTenantBindingInputSchema.parse(req.body);
    const binding = await RoutingRegistry_js_1.routingRegistry.createTenantBinding(input);
    await AuditService_js_1.auditService.recordEvent({
        eventType: 'tenant_binding.created',
        entityType: 'tenant_binding',
        entityId: binding.id,
        actorId: input.createdBy,
        actorType: 'user',
        tenantId: binding.tenantId,
        changes: { after: { capability: binding.capability, modelVersionId: binding.modelVersionId } },
    });
    res.status(201).json(binding);
}));
// Update tenant binding
exports.routingRouter.patch('/tenant-bindings/:id', (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const binding = await RoutingRegistry_js_1.routingRegistry.updateTenantBinding(req.params.id, req.body);
    res.json(binding);
}));
// Delete tenant binding
exports.routingRouter.delete('/tenant-bindings/:id', (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    await RoutingRegistry_js_1.routingRegistry.deleteTenantBinding(req.params.id);
    res.status(204).send();
}));
// ============================================================================
// Deployments
// ============================================================================
// List deployments
exports.routingRouter.get('/deployments', (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const { modelVersionId, environment, mode, isActive, limit, offset } = req.query;
    const result = await DeploymentRegistry_js_1.deploymentRegistry.listDeploymentConfigs({
        modelVersionId: modelVersionId,
        environment: environment,
        mode: mode,
        isActive: isActive !== undefined ? isActive === 'true' : undefined,
        limit: limit ? parseInt(limit) : undefined,
        offset: offset ? parseInt(offset) : undefined,
    });
    res.json(result);
}));
// Create deployment
exports.routingRouter.post('/deployments', (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const input = index_js_1.CreateDeploymentConfigInputSchema.parse(req.body);
    const deployment = await DeploymentRegistry_js_1.deploymentRegistry.createDeploymentConfig(input);
    await AuditService_js_1.auditService.recordDeploymentEvent('deployment.created', deployment.id, input.createdBy, {
        after: { environment: deployment.environment, mode: deployment.mode },
    });
    res.status(201).json(deployment);
}));
// Activate deployment
exports.routingRouter.post('/deployments/:id/activate', (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const { activatedBy } = req.body;
    const deployment = await DeploymentRegistry_js_1.deploymentRegistry.activateDeployment(req.params.id, activatedBy);
    await AuditService_js_1.auditService.recordDeploymentEvent('deployment.activated', deployment.id, activatedBy, {
        after: { isActive: true, activatedAt: deployment.activatedAt },
    });
    res.json(deployment);
}));
// Deactivate deployment
exports.routingRouter.post('/deployments/:id/deactivate', (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const { deactivatedBy } = req.body;
    const deployment = await DeploymentRegistry_js_1.deploymentRegistry.deactivateDeployment(req.params.id, deactivatedBy);
    await AuditService_js_1.auditService.recordDeploymentEvent('deployment.deactivated', deployment.id, deactivatedBy, {
        after: { isActive: false, deactivatedAt: deployment.deactivatedAt },
    });
    res.json(deployment);
}));
// Update traffic percentage
exports.routingRouter.patch('/deployments/:id/traffic', (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const { trafficPercentage, updatedBy } = req.body;
    const before = await DeploymentRegistry_js_1.deploymentRegistry.getDeploymentConfig(req.params.id);
    const deployment = await DeploymentRegistry_js_1.deploymentRegistry.updateTrafficPercentage(req.params.id, trafficPercentage);
    await AuditService_js_1.auditService.recordDeploymentEvent('deployment.traffic_updated', deployment.id, updatedBy || 'system', {
        before: { trafficPercentage: before.trafficPercentage },
        after: { trafficPercentage: deployment.trafficPercentage },
    });
    res.json(deployment);
}));
// ============================================================================
// Policy Profiles
// ============================================================================
// List policy profiles
exports.routingRouter.get('/policies', (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const { isActive, isDefault, search, limit, offset } = req.query;
    const result = await PolicyRegistry_js_1.policyRegistry.listPolicyProfiles({
        isActive: isActive !== undefined ? isActive === 'true' : undefined,
        isDefault: isDefault !== undefined ? isDefault === 'true' : undefined,
        search: search,
        limit: limit ? parseInt(limit) : undefined,
        offset: offset ? parseInt(offset) : undefined,
    });
    res.json(result);
}));
// Create policy profile
exports.routingRouter.post('/policies', (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const input = index_js_1.CreatePolicyProfileInputSchema.parse(req.body);
    const profile = await PolicyRegistry_js_1.policyRegistry.createPolicyProfile(input);
    await AuditService_js_1.auditService.recordEvent({
        eventType: 'policy_profile.created',
        entityType: 'policy_profile',
        entityId: profile.id,
        actorId: input.createdBy,
        actorType: 'user',
        changes: { after: { name: profile.name, isDefault: profile.isDefault } },
    });
    res.status(201).json(profile);
}));
// Get policy profile
exports.routingRouter.get('/policies/:id', (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const profile = await PolicyRegistry_js_1.policyRegistry.getPolicyProfile(req.params.id);
    res.json(profile);
}));
// Update policy profile
exports.routingRouter.patch('/policies/:id', (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const profile = await PolicyRegistry_js_1.policyRegistry.updatePolicyProfile(req.params.id, req.body);
    res.json(profile);
}));
// Delete policy profile
exports.routingRouter.delete('/policies/:id', (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    await PolicyRegistry_js_1.policyRegistry.deletePolicyProfile(req.params.id);
    res.status(204).send();
}));
