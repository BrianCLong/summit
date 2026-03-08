"use strict";
/**
 * Model API Routes
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.modelsRouter = void 0;
const express_1 = require("express");
const errorHandler_js_1 = require("../middleware/errorHandler.js");
const ModelRegistry_js_1 = require("../registry/ModelRegistry.js");
const AuditService_js_1 = require("../governance/AuditService.js");
const index_js_1 = require("../types/index.js");
exports.modelsRouter = (0, express_1.Router)();
// List models
exports.modelsRouter.get('/', (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const { provider, capability, status, tags, search, limit, offset, orderBy, orderDirection } = req.query;
    const result = await ModelRegistry_js_1.modelRegistry.listModels({
        provider: provider,
        capability: capability,
        status: status,
        tags: tags ? (Array.isArray(tags) ? tags : [tags]) : undefined,
        search: search,
        limit: limit ? parseInt(limit) : undefined,
        offset: offset ? parseInt(offset) : undefined,
        orderBy: orderBy,
        orderDirection: orderDirection,
    });
    res.json(result);
}));
// Get model by ID
exports.modelsRouter.get('/:id', (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const model = await ModelRegistry_js_1.modelRegistry.getModel(req.params.id);
    res.json(model);
}));
// Create model
exports.modelsRouter.post('/', (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const input = index_js_1.CreateModelInputSchema.parse(req.body);
    const model = await ModelRegistry_js_1.modelRegistry.createModel(input);
    await AuditService_js_1.auditService.recordModelEvent('model.created', model.id, input.createdBy, {
        after: { name: model.name, provider: model.provider, capabilities: model.capabilities },
    });
    res.status(201).json(model);
}));
// Update model
exports.modelsRouter.patch('/:id', (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const input = index_js_1.UpdateModelInputSchema.parse(req.body);
    const before = await ModelRegistry_js_1.modelRegistry.getModel(req.params.id);
    const model = await ModelRegistry_js_1.modelRegistry.updateModel(req.params.id, input);
    await AuditService_js_1.auditService.recordModelEvent('model.updated', model.id, input.updatedBy || 'system', {
        before: { name: before.name, status: before.status },
        after: { name: model.name, status: model.status },
    });
    res.json(model);
}));
// Delete model
exports.modelsRouter.delete('/:id', (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const model = await ModelRegistry_js_1.modelRegistry.getModel(req.params.id);
    await ModelRegistry_js_1.modelRegistry.deleteModel(req.params.id);
    await AuditService_js_1.auditService.recordModelEvent('model.deleted', req.params.id, req.body.deletedBy || 'system', {
        before: { name: model.name },
    });
    res.status(204).send();
}));
// List model versions
exports.modelsRouter.get('/:modelId/versions', (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const { status, limit, offset } = req.query;
    const result = await ModelRegistry_js_1.modelRegistry.listModelVersions({
        modelId: req.params.modelId,
        status: status,
        limit: limit ? parseInt(limit) : undefined,
        offset: offset ? parseInt(offset) : undefined,
    });
    res.json(result);
}));
// Get model version by ID
exports.modelsRouter.get('/:modelId/versions/:versionId', (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const version = await ModelRegistry_js_1.modelRegistry.getModelVersion(req.params.versionId);
    res.json(version);
}));
// Create model version
exports.modelsRouter.post('/:modelId/versions', (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const input = index_js_1.CreateModelVersionInputSchema.parse({
        ...req.body,
        modelId: req.params.modelId,
    });
    const version = await ModelRegistry_js_1.modelRegistry.createModelVersion(input);
    await AuditService_js_1.auditService.recordModelVersionEvent('model_version.created', version.id, input.createdBy, {
        after: { version: version.version, status: version.status },
    });
    res.status(201).json(version);
}));
// Promote model version
exports.modelsRouter.post('/:modelId/versions/:versionId/promote', (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const { promotedBy } = req.body;
    const before = await ModelRegistry_js_1.modelRegistry.getModelVersion(req.params.versionId);
    const version = await ModelRegistry_js_1.modelRegistry.promoteModelVersion(req.params.versionId, promotedBy);
    await AuditService_js_1.auditService.recordModelVersionEvent('model_version.promoted', version.id, promotedBy, {
        before: { status: before.status },
        after: { status: version.status, promotedAt: version.promotedAt },
    });
    res.json(version);
}));
// Deprecate model version
exports.modelsRouter.post('/:modelId/versions/:versionId/deprecate', (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const { deprecatedBy } = req.body;
    const before = await ModelRegistry_js_1.modelRegistry.getModelVersion(req.params.versionId);
    const version = await ModelRegistry_js_1.modelRegistry.deprecateModelVersion(req.params.versionId, deprecatedBy);
    await AuditService_js_1.auditService.recordModelVersionEvent('model_version.deprecated', version.id, deprecatedBy, {
        before: { status: before.status },
        after: { status: version.status },
    });
    res.json(version);
}));
