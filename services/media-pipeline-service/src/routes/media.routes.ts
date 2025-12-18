/**
 * Media Asset Routes
 *
 * API endpoints for media intake and management.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import {
  MediaAssetCreateRequest,
  MediaAssetUpdateRequest,
  MediaAsset,
  MediaType,
  MediaFormat,
  ProcessingStatus,
  Provenance,
} from '../types/media.js';
import { pipelineService } from '../services/pipeline.service.js';
import { policyService } from '../services/policy.service.js';
import { provenanceService } from '../services/provenance.service.js';
import { logger } from '../utils/logger.js';
import { generateId, hashString } from '../utils/hash.js';
import { now, getExpirationDate } from '../utils/time.js';
import config from '../config/index.js';

// In-memory storage for demo purposes
// In production, this would be replaced with a database
const mediaAssets: Map<string, MediaAsset> = new Map();

export async function mediaRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * Create a new media asset
   */
  fastify.post(
    '/api/v1/media',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const log = logger.child({ correlationId: request.correlationId });

      try {
        const parseResult = MediaAssetCreateRequest.safeParse(request.body);

        if (!parseResult.success) {
          return reply.status(400).send({
            error: 'Validation failed',
            details: parseResult.error.flatten(),
          });
        }

        const input = parseResult.data;
        const assetId = generateId();

        // Create media asset
        const mediaAsset: MediaAsset = {
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
          checksum: hashString(assetId + now()),
          sourceConnector: input.sourceConnector,
          sourceRef: input.sourceRef,
          provenance: {
            sourceId: assetId,
            sourceType: 'upload',
            ingestedAt: now(),
            ingestedBy: request.authorityId || config.authorityId,
            transformChain: [],
            originalChecksum: hashString(assetId + now()),
          },
          policy: input.policy,
          retryCount: 0,
          createdAt: now(),
        };

        // Apply retention policy
        const retention = policyService.applyRetentionPolicy(mediaAsset);
        mediaAsset.expiresAt = retention.expiresAt;

        // Store asset
        mediaAssets.set(assetId, mediaAsset);

        log.info({ mediaAssetId: assetId }, 'Media asset created');

        // Process immediately if requested
        if (input.processImmediately) {
          // Process asynchronously
          setImmediate(async () => {
            try {
              const result = await pipelineService.process(mediaAsset);
              mediaAssets.set(assetId, result.mediaAsset);
              log.info({ mediaAssetId: assetId, success: result.success }, 'Pipeline processing completed');
            } catch (error) {
              log.error({ mediaAssetId: assetId, error }, 'Pipeline processing failed');
            }
          });
        }

        return reply.status(201).send({
          id: assetId,
          status: mediaAsset.status,
          message: input.processImmediately ? 'Processing started' : 'Asset created',
        });
      } catch (error) {
        log.error({ error }, 'Failed to create media asset');
        return reply.status(500).send({
          error: 'Internal server error',
        });
      }
    }
  );

  /**
   * Get a media asset by ID
   */
  fastify.get(
    '/api/v1/media/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = request.params;
      const asset = mediaAssets.get(id);

      if (!asset) {
        return reply.status(404).send({
          error: 'Not found',
          message: `Media asset ${id} not found`,
        });
      }

      return reply.status(200).send(asset);
    }
  );

  /**
   * Update a media asset
   */
  fastify.patch(
    '/api/v1/media/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = request.params;
      const asset = mediaAssets.get(id);

      if (!asset) {
        return reply.status(404).send({
          error: 'Not found',
          message: `Media asset ${id} not found`,
        });
      }

      const parseResult = MediaAssetUpdateRequest.safeParse(request.body);

      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Validation failed',
          details: parseResult.error.flatten(),
        });
      }

      const updates = parseResult.data;

      // Apply updates
      const updatedAsset: MediaAsset = {
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
        updatedAt: now(),
      };

      mediaAssets.set(id, updatedAsset);

      return reply.status(200).send(updatedAsset);
    }
  );

  /**
   * Delete a media asset
   */
  fastify.delete(
    '/api/v1/media/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
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
    }
  );

  /**
   * List media assets
   */
  fastify.get(
    '/api/v1/media',
    async (
      request: FastifyRequest<{
        Querystring: {
          status?: string;
          type?: string;
          caseId?: string;
          limit?: string;
          offset?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
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
    }
  );

  /**
   * Trigger processing for a media asset
   */
  fastify.post(
    '/api/v1/media/:id/process',
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: {
          skipTranscription?: boolean;
          skipDiarization?: boolean;
          skipRedaction?: boolean;
          language?: string;
          expectedSpeakerCount?: number;
        };
      }>,
      reply: FastifyReply
    ) => {
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
        const log = logger.child({ mediaAssetId: id, correlationId: request.correlationId });
        try {
          const result = await pipelineService.process(asset, options);
          mediaAssets.set(id, result.mediaAsset);
          log.info({ success: result.success }, 'Pipeline processing completed');
        } catch (error) {
          log.error({ error }, 'Pipeline processing failed');
        }
      });

      return reply.status(202).send({
        id,
        status: 'queued',
        message: 'Processing started',
      });
    }
  );

  /**
   * Get processing status for a media asset
   */
  fastify.get(
    '/api/v1/media/:id/status',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
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
    }
  );
}
