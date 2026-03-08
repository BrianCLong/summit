"use strict";
/**
 * Media Asset Routes
 *
 * API endpoints for media intake and management.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mediaRoutes = mediaRoutes;
const media_js_1 = require("../types/media.js");
const pipeline_service_js_1 = require("../services/pipeline.service.js");
const policy_service_js_1 = require("../services/policy.service.js");
const logger_js_1 = require("../utils/logger.js");
const hash_js_1 = require("../utils/hash.js");
const time_js_1 = require("../utils/time.js");
const index_js_1 = __importDefault(require("../config/index.js"));
// In-memory storage for demo purposes
// In production, this would be replaced with a database
const mediaAssets = new Map();
async function mediaRoutes(fastify) {
    /**
     * Create a new media asset
     */
    fastify.post('/api/v1/media', async (request, reply) => {
        const log = logger_js_1.logger.child({ correlationId: request.correlationId });
        try {
            const parseResult = media_js_1.MediaAssetCreateRequest.safeParse(request.body);
            if (!parseResult.success) {
                return reply.status(400).send({
                    error: 'Validation failed',
                    details: parseResult.error.flatten(),
                });
            }
            const input = parseResult.data;
            const assetId = (0, hash_js_1.generateId)();
            // Create media asset
            const mediaAsset = {
                id: assetId,
                tenantId: input.tenantId,
                caseId: input.caseId,
                investigationId: input.investigationId,
                type: input.type,
                format: input.format || 'mp3',
                status: 'pending',
                metadata: {
                    filename: input.metadata?.filename || `asset-${assetId}`,
                    mimeType: input.metadata?.mimeType || 'application/octet-stream',
                    size: input.metadata?.size || 0,
                    ...input.metadata,
                },
                storage: input.storage || {
                    provider: 'local',
                    key: `${assetId}`,
                },
                checksum: (0, hash_js_1.hashString)(assetId + (0, time_js_1.now)()),
                sourceConnector: input.sourceConnector,
                sourceRef: input.sourceRef,
                provenance: {
                    sourceId: assetId,
                    sourceType: 'upload',
                    ingestedAt: (0, time_js_1.now)(),
                    ingestedBy: request.authorityId || index_js_1.default.authorityId,
                    transformChain: [],
                    originalChecksum: (0, hash_js_1.hashString)(assetId + (0, time_js_1.now)()),
                },
                policy: input.policy,
                retryCount: 0,
                createdAt: (0, time_js_1.now)(),
            };
            // Apply retention policy
            const retention = policy_service_js_1.policyService.applyRetentionPolicy(mediaAsset);
            mediaAsset.expiresAt = retention.expiresAt;
            // Store asset
            mediaAssets.set(assetId, mediaAsset);
            log.info({ mediaAssetId: assetId }, 'Media asset created');
            // Process immediately if requested
            if (input.processImmediately) {
                // Process asynchronously
                setImmediate(async () => {
                    try {
                        const result = await pipeline_service_js_1.pipelineService.process(mediaAsset);
                        mediaAssets.set(assetId, result.mediaAsset);
                        log.info({ mediaAssetId: assetId, success: result.success }, 'Pipeline processing completed');
                    }
                    catch (error) {
                        log.error({ mediaAssetId: assetId, error }, 'Pipeline processing failed');
                    }
                });
            }
            return reply.status(201).send({
                id: assetId,
                status: mediaAsset.status,
                message: input.processImmediately ? 'Processing started' : 'Asset created',
            });
        }
        catch (error) {
            log.error({ error }, 'Failed to create media asset');
            return reply.status(500).send({
                error: 'Internal server error',
            });
        }
    });
    /**
     * Get a media asset by ID
     */
    fastify.get('/api/v1/media/:id', async (request, reply) => {
        const { id } = request.params;
        const asset = mediaAssets.get(id);
        if (!asset) {
            return reply.status(404).send({
                error: 'Not found',
                message: `Media asset ${id} not found`,
            });
        }
        return reply.status(200).send(asset);
    });
    /**
     * Update a media asset
     */
    fastify.patch('/api/v1/media/:id', async (request, reply) => {
        const { id } = request.params;
        const asset = mediaAssets.get(id);
        if (!asset) {
            return reply.status(404).send({
                error: 'Not found',
                message: `Media asset ${id} not found`,
            });
        }
        const parseResult = media_js_1.MediaAssetUpdateRequest.safeParse(request.body);
        if (!parseResult.success) {
            return reply.status(400).send({
                error: 'Validation failed',
                details: parseResult.error.flatten(),
            });
        }
        const updates = parseResult.data;
        // Apply updates
        const updatedAsset = {
            ...asset,
            ...updates,
            metadata: {
                ...asset.metadata,
                ...updates.metadata,
            },
            policy: {
                ...asset.policy,
                ...updates.policy,
            },
            updatedAt: (0, time_js_1.now)(),
        };
        mediaAssets.set(id, updatedAsset);
        return reply.status(200).send(updatedAsset);
    });
    /**
     * Delete a media asset
     */
    fastify.delete('/api/v1/media/:id', async (request, reply) => {
        const { id } = request.params;
        const asset = mediaAssets.get(id);
        if (!asset) {
            return reply.status(404).send({
                error: 'Not found',
                message: `Media asset ${id} not found`,
            });
        }
        // Check for legal holds
        if (asset.policy?.retentionPolicy === 'legal-hold') {
            return reply.status(403).send({
                error: 'Forbidden',
                message: 'Asset is under legal hold and cannot be deleted',
            });
        }
        mediaAssets.delete(id);
        return reply.status(204).send();
    });
    /**
     * List media assets
     */
    fastify.get('/api/v1/media', async (request, reply) => {
        const { status, type, caseId, limit = '50', offset = '0' } = request.query;
        let assets = Array.from(mediaAssets.values());
        // Apply filters
        if (status) {
            assets = assets.filter((a) => a.status === status);
        }
        if (type) {
            assets = assets.filter((a) => a.type === type);
        }
        if (caseId) {
            assets = assets.filter((a) => a.caseId === caseId);
        }
        // Apply pagination
        const total = assets.length;
        const limitNum = parseInt(limit, 10);
        const offsetNum = parseInt(offset, 10);
        assets = assets.slice(offsetNum, offsetNum + limitNum);
        return reply.status(200).send({
            data: assets,
            pagination: {
                total,
                limit: limitNum,
                offset: offsetNum,
                hasMore: offsetNum + limitNum < total,
            },
        });
    });
    /**
     * Trigger processing for a media asset
     */
    fastify.post('/api/v1/media/:id/process', async (request, reply) => {
        const { id } = request.params;
        const asset = mediaAssets.get(id);
        if (!asset) {
            return reply.status(404).send({
                error: 'Not found',
                message: `Media asset ${id} not found`,
            });
        }
        if (asset.status === 'processing') {
            return reply.status(409).send({
                error: 'Conflict',
                message: 'Asset is already being processed',
            });
        }
        const options = request.body || {};
        // Update status
        asset.status = 'queued';
        mediaAssets.set(id, asset);
        // Process asynchronously
        setImmediate(async () => {
            const log = logger_js_1.logger.child({ mediaAssetId: id, correlationId: request.correlationId });
            try {
                const result = await pipeline_service_js_1.pipelineService.process(asset, options);
                mediaAssets.set(id, result.mediaAsset);
                log.info({ success: result.success }, 'Pipeline processing completed');
            }
            catch (error) {
                log.error({ error }, 'Pipeline processing failed');
            }
        });
        return reply.status(202).send({
            id,
            status: 'queued',
            message: 'Processing started',
        });
    });
    /**
     * Get processing status for a media asset
     */
    fastify.get('/api/v1/media/:id/status', async (request, reply) => {
        const { id } = request.params;
        const asset = mediaAssets.get(id);
        if (!asset) {
            return reply.status(404).send({
                error: 'Not found',
                message: `Media asset ${id} not found`,
            });
        }
        return reply.status(200).send({
            id: asset.id,
            status: asset.status,
            transcriptId: asset.transcriptId,
            communicationEntityId: asset.communicationEntityId,
            spacetimeEventId: asset.spacetimeEventId,
            processingErrors: asset.processingErrors,
            createdAt: asset.createdAt,
            processedAt: asset.processedAt,
        });
    });
}
