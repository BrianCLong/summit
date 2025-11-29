/**
 * Routing and Model Selection API Routes
 */

import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { modelSelectionService } from '../routing/ModelSelectionService.js';
import { routingRegistry } from '../registry/RoutingRegistry.js';
import { deploymentRegistry } from '../registry/DeploymentRegistry.js';
import { policyRegistry } from '../registry/PolicyRegistry.js';
import { auditService } from '../governance/AuditService.js';
import {
  ModelSelectionRequestSchema,
  CreateRoutingRuleInputSchema,
  CreateTenantBindingInputSchema,
  CreateDeploymentConfigInputSchema,
  CreatePolicyProfileInputSchema,
} from '../types/index.js';

export const routingRouter = Router();

// ============================================================================
// Model Selection
// ============================================================================

// Select model for request
routingRouter.post(
  '/select',
  asyncHandler(async (req: Request, res: Response) => {
    const request = ModelSelectionRequestSchema.parse(req.body);
    const response = await modelSelectionService.selectModel(request);
    res.json(response);
  }),
);

// Record model invocation success
routingRouter.post(
  '/record-success',
  asyncHandler(async (req: Request, res: Response) => {
    const { modelVersionId } = req.body;
    modelSelectionService.recordSuccess(modelVersionId);
    res.json({ recorded: true });
  }),
);

// Record model invocation failure
routingRouter.post(
  '/record-failure',
  asyncHandler(async (req: Request, res: Response) => {
    const { modelVersionId } = req.body;
    modelSelectionService.recordFailure(modelVersionId);
    res.json({ recorded: true });
  }),
);

// ============================================================================
// Routing Rules
// ============================================================================

// List routing rules
routingRouter.get(
  '/rules',
  asyncHandler(async (req: Request, res: Response) => {
    const { isEnabled, targetModelVersionId, limit, offset } = req.query;

    const result = await routingRegistry.listRoutingRules({
      isEnabled: isEnabled !== undefined ? isEnabled === 'true' : undefined,
      targetModelVersionId: targetModelVersionId as string,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });

    res.json(result);
  }),
);

// Get routing rule
routingRouter.get(
  '/rules/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const rule = await routingRegistry.getRoutingRule(req.params.id);
    res.json(rule);
  }),
);

// Create routing rule
routingRouter.post(
  '/rules',
  asyncHandler(async (req: Request, res: Response) => {
    const input = CreateRoutingRuleInputSchema.parse(req.body);
    const rule = await routingRegistry.createRoutingRule(input);

    await auditService.recordEvent({
      eventType: 'routing_rule.created',
      entityType: 'routing_rule',
      entityId: rule.id,
      actorId: input.createdBy,
      actorType: 'user',
      changes: { after: { name: rule.name, priority: rule.priority } },
    });

    res.status(201).json(rule);
  }),
);

// Update routing rule
routingRouter.patch(
  '/rules/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const before = await routingRegistry.getRoutingRule(req.params.id);
    const rule = await routingRegistry.updateRoutingRule(req.params.id, req.body);

    await auditService.recordEvent({
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
  }),
);

// Delete routing rule
routingRouter.delete(
  '/rules/:id',
  asyncHandler(async (req: Request, res: Response) => {
    await routingRegistry.deleteRoutingRule(req.params.id);

    await auditService.recordEvent({
      eventType: 'routing_rule.deleted',
      entityType: 'routing_rule',
      entityId: req.params.id,
      actorId: req.body.deletedBy || 'system',
      actorType: 'user',
    });

    res.status(204).send();
  }),
);

// ============================================================================
// Tenant Bindings
// ============================================================================

// List tenant bindings
routingRouter.get(
  '/tenant-bindings',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, capability, modelVersionId, isEnabled, limit, offset } = req.query;

    const result = await routingRegistry.listTenantBindings({
      tenantId: tenantId as string,
      capability: capability as any,
      modelVersionId: modelVersionId as string,
      isEnabled: isEnabled !== undefined ? isEnabled === 'true' : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });

    res.json(result);
  }),
);

// Create tenant binding
routingRouter.post(
  '/tenant-bindings',
  asyncHandler(async (req: Request, res: Response) => {
    const input = CreateTenantBindingInputSchema.parse(req.body);
    const binding = await routingRegistry.createTenantBinding(input);

    await auditService.recordEvent({
      eventType: 'tenant_binding.created',
      entityType: 'tenant_binding',
      entityId: binding.id,
      actorId: input.createdBy,
      actorType: 'user',
      tenantId: binding.tenantId,
      changes: { after: { capability: binding.capability, modelVersionId: binding.modelVersionId } },
    });

    res.status(201).json(binding);
  }),
);

// Update tenant binding
routingRouter.patch(
  '/tenant-bindings/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const binding = await routingRegistry.updateTenantBinding(req.params.id, req.body);
    res.json(binding);
  }),
);

// Delete tenant binding
routingRouter.delete(
  '/tenant-bindings/:id',
  asyncHandler(async (req: Request, res: Response) => {
    await routingRegistry.deleteTenantBinding(req.params.id);
    res.status(204).send();
  }),
);

// ============================================================================
// Deployments
// ============================================================================

// List deployments
routingRouter.get(
  '/deployments',
  asyncHandler(async (req: Request, res: Response) => {
    const { modelVersionId, environment, mode, isActive, limit, offset } = req.query;

    const result = await deploymentRegistry.listDeploymentConfigs({
      modelVersionId: modelVersionId as string,
      environment: environment as any,
      mode: mode as any,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });

    res.json(result);
  }),
);

// Create deployment
routingRouter.post(
  '/deployments',
  asyncHandler(async (req: Request, res: Response) => {
    const input = CreateDeploymentConfigInputSchema.parse(req.body);
    const deployment = await deploymentRegistry.createDeploymentConfig(input);

    await auditService.recordDeploymentEvent('deployment.created', deployment.id, input.createdBy, {
      after: { environment: deployment.environment, mode: deployment.mode },
    });

    res.status(201).json(deployment);
  }),
);

// Activate deployment
routingRouter.post(
  '/deployments/:id/activate',
  asyncHandler(async (req: Request, res: Response) => {
    const { activatedBy } = req.body;
    const deployment = await deploymentRegistry.activateDeployment(req.params.id, activatedBy);

    await auditService.recordDeploymentEvent('deployment.activated', deployment.id, activatedBy, {
      after: { isActive: true, activatedAt: deployment.activatedAt },
    });

    res.json(deployment);
  }),
);

// Deactivate deployment
routingRouter.post(
  '/deployments/:id/deactivate',
  asyncHandler(async (req: Request, res: Response) => {
    const { deactivatedBy } = req.body;
    const deployment = await deploymentRegistry.deactivateDeployment(req.params.id, deactivatedBy);

    await auditService.recordDeploymentEvent('deployment.deactivated', deployment.id, deactivatedBy, {
      after: { isActive: false, deactivatedAt: deployment.deactivatedAt },
    });

    res.json(deployment);
  }),
);

// Update traffic percentage
routingRouter.patch(
  '/deployments/:id/traffic',
  asyncHandler(async (req: Request, res: Response) => {
    const { trafficPercentage, updatedBy } = req.body;
    const before = await deploymentRegistry.getDeploymentConfig(req.params.id);
    const deployment = await deploymentRegistry.updateTrafficPercentage(req.params.id, trafficPercentage);

    await auditService.recordDeploymentEvent('deployment.traffic_updated', deployment.id, updatedBy || 'system', {
      before: { trafficPercentage: before.trafficPercentage },
      after: { trafficPercentage: deployment.trafficPercentage },
    });

    res.json(deployment);
  }),
);

// ============================================================================
// Policy Profiles
// ============================================================================

// List policy profiles
routingRouter.get(
  '/policies',
  asyncHandler(async (req: Request, res: Response) => {
    const { isActive, isDefault, search, limit, offset } = req.query;

    const result = await policyRegistry.listPolicyProfiles({
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      isDefault: isDefault !== undefined ? isDefault === 'true' : undefined,
      search: search as string,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });

    res.json(result);
  }),
);

// Create policy profile
routingRouter.post(
  '/policies',
  asyncHandler(async (req: Request, res: Response) => {
    const input = CreatePolicyProfileInputSchema.parse(req.body);
    const profile = await policyRegistry.createPolicyProfile(input);

    await auditService.recordEvent({
      eventType: 'policy_profile.created',
      entityType: 'policy_profile',
      entityId: profile.id,
      actorId: input.createdBy,
      actorType: 'user',
      changes: { after: { name: profile.name, isDefault: profile.isDefault } },
    });

    res.status(201).json(profile);
  }),
);

// Get policy profile
routingRouter.get(
  '/policies/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const profile = await policyRegistry.getPolicyProfile(req.params.id);
    res.json(profile);
  }),
);

// Update policy profile
routingRouter.patch(
  '/policies/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const profile = await policyRegistry.updatePolicyProfile(req.params.id, req.body);
    res.json(profile);
  }),
);

// Delete policy profile
routingRouter.delete(
  '/policies/:id',
  asyncHandler(async (req: Request, res: Response) => {
    await policyRegistry.deletePolicyProfile(req.params.id);
    res.status(204).send();
  }),
);
