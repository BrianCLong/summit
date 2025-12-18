/**
 * Model API Routes
 */

import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { modelRegistry } from '../registry/ModelRegistry.js';
import { auditService } from '../governance/AuditService.js';
import { CreateModelInputSchema, UpdateModelInputSchema, CreateModelVersionInputSchema } from '../types/index.js';

export const modelsRouter = Router();

// List models
modelsRouter.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const { provider, capability, status, tags, search, limit, offset, orderBy, orderDirection } = req.query;

    const result = await modelRegistry.listModels({
      provider: provider as any,
      capability: capability as any,
      status: status as any,
      tags: tags ? (Array.isArray(tags) ? tags : [tags]) as string[] : undefined,
      search: search as string,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
      orderBy: orderBy as any,
      orderDirection: orderDirection as any,
    });

    res.json(result);
  }),
);

// Get model by ID
modelsRouter.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const model = await modelRegistry.getModel(req.params.id);
    res.json(model);
  }),
);

// Create model
modelsRouter.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const input = CreateModelInputSchema.parse(req.body);
    const model = await modelRegistry.createModel(input);

    await auditService.recordModelEvent('model.created', model.id, input.createdBy, {
      after: { name: model.name, provider: model.provider, capabilities: model.capabilities },
    });

    res.status(201).json(model);
  }),
);

// Update model
modelsRouter.patch(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const input = UpdateModelInputSchema.parse(req.body);
    const before = await modelRegistry.getModel(req.params.id);
    const model = await modelRegistry.updateModel(req.params.id, input);

    await auditService.recordModelEvent('model.updated', model.id, input.updatedBy || 'system', {
      before: { name: before.name, status: before.status },
      after: { name: model.name, status: model.status },
    });

    res.json(model);
  }),
);

// Delete model
modelsRouter.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const model = await modelRegistry.getModel(req.params.id);
    await modelRegistry.deleteModel(req.params.id);

    await auditService.recordModelEvent('model.deleted', req.params.id, req.body.deletedBy || 'system', {
      before: { name: model.name },
    });

    res.status(204).send();
  }),
);

// List model versions
modelsRouter.get(
  '/:modelId/versions',
  asyncHandler(async (req: Request, res: Response) => {
    const { status, limit, offset } = req.query;

    const result = await modelRegistry.listModelVersions({
      modelId: req.params.modelId,
      status: status as any,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });

    res.json(result);
  }),
);

// Get model version by ID
modelsRouter.get(
  '/:modelId/versions/:versionId',
  asyncHandler(async (req: Request, res: Response) => {
    const version = await modelRegistry.getModelVersion(req.params.versionId);
    res.json(version);
  }),
);

// Create model version
modelsRouter.post(
  '/:modelId/versions',
  asyncHandler(async (req: Request, res: Response) => {
    const input = CreateModelVersionInputSchema.parse({
      ...req.body,
      modelId: req.params.modelId,
    });
    const version = await modelRegistry.createModelVersion(input);

    await auditService.recordModelVersionEvent('model_version.created', version.id, input.createdBy, {
      after: { version: version.version, status: version.status },
    });

    res.status(201).json(version);
  }),
);

// Promote model version
modelsRouter.post(
  '/:modelId/versions/:versionId/promote',
  asyncHandler(async (req: Request, res: Response) => {
    const { promotedBy } = req.body;
    const before = await modelRegistry.getModelVersion(req.params.versionId);
    const version = await modelRegistry.promoteModelVersion(req.params.versionId, promotedBy);

    await auditService.recordModelVersionEvent('model_version.promoted', version.id, promotedBy, {
      before: { status: before.status },
      after: { status: version.status, promotedAt: version.promotedAt },
    });

    res.json(version);
  }),
);

// Deprecate model version
modelsRouter.post(
  '/:modelId/versions/:versionId/deprecate',
  asyncHandler(async (req: Request, res: Response) => {
    const { deprecatedBy } = req.body;
    const before = await modelRegistry.getModelVersion(req.params.versionId);
    const version = await modelRegistry.deprecateModelVersion(req.params.versionId, deprecatedBy);

    await auditService.recordModelVersionEvent('model_version.deprecated', version.id, deprecatedBy, {
      before: { status: before.status },
      after: { status: version.status },
    });

    res.json(version);
  }),
);
