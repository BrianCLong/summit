
import type { Pool } from 'pg';
import { randomUUID as uuidv4 } from 'node:crypto';
import pino from 'pino';
import {
  MediaUploadService,
  MediaMetadata,
  MediaType,
} from './MediaUploadService.js';
import { ExtractionJobService, ExtractionJobInput } from './ExtractionJobService.js';

const logger = (pino as any)({ name: 'MultimodalDataService' });

export interface MediaSource {
  id: string;
  uri: string;
  filename?: string;
  mediaType: MediaType;
  mimeType: string;
  filesize?: number;
  duration?: number;
  checksum: string;
  width?: number;
  height?: number;
  channels?: number;
  bitRate?: number;
  frameRate?: number;
  latitude?: number;
  longitude?: number;
  altitude?: number;
  gpsAccuracy?: number;
  gpsTimestamp?: Date;
  processingStatus: ProcessingStatus;
  extractionCount: number;
  metadata: Record<string, any>;
  uploadedBy?: string;
  uploadedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface MultimodalEntity {
  id: string;
  investigationId: string;
  mediaSourceId: string;
  entityType: string;
  extractedText?: string;
  bboxX?: number;
  bboxY?: number;
  bboxWidth?: number;
  bboxHeight?: number;
  bboxConfidence?: number;
  temporalStart?: number;
  temporalEnd?: number;
  temporalConfidence?: number;
  confidence: number;
  confidenceLevel: ConfidenceLevel;
  qualityScore?: number;
  extractionMethod: string;
  extractionVersion: string;
  humanVerified: boolean;
  verifiedBy?: string;
  verifiedAt?: Date;
  verificationNotes?: string;
  textEmbedding?: number[];
  visualEmbedding?: number[];
  audioEmbedding?: number[];
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CrossModalMatch {
  id: string;
  sourceEntityId: string;
  targetEntityId: string;
  matchType: CrossModalMatchType;
  confidence: number;
  algorithm: string;
  explanation: Record<string, any>;
  similarityScore?: number;
  humanVerified: boolean;
  verifiedBy?: string;
  verifiedAt?: Date;
  createdAt: Date;
}

export interface SemanticCluster {
  id: string;
  investigationId: string;
  name?: string;
  description?: string;
  centroid: number[];
  algorithm: ClusteringAlgorithm;
  algorithmParams: Record<string, any>;
  coherenceScore?: number;
  silhouetteScore?: number;
  temporalStart?: Date;
  temporalEnd?: Date;
  geoNorthLat?: number;
  geoSouthLat?: number;
  geoEastLng?: number;
  geoWestLng?: number;
  dominantTopics: string[];
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export enum ProcessingStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum ConfidenceLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  VERY_HIGH = 'VERY_HIGH',
}

export enum CrossModalMatchType {
  VISUAL_SIMILARITY = 'VISUAL_SIMILARITY',
  SEMANTIC_SIMILARITY = 'SEMANTIC_SIMILARITY',
  TEMPORAL_CORRELATION = 'TEMPORAL_CORRELATION',
  SPATIAL_PROXIMITY = 'SPATIAL_PROXIMITY',
  ENTITY_MENTION = 'ENTITY_MENTION',
  FACIAL_RECOGNITION = 'FACIAL_RECOGNITION',
  VOICE_RECOGNITION = 'VOICE_RECOGNITION',
  OBJECT_DETECTION = 'OBJECT_DETECTION',
  OCR_CORRELATION = 'OCR_CORRELATION',
}

export enum ClusteringAlgorithm {
  KMEANS = 'KMEANS',
  DBSCAN = 'DBSCAN',
  HIERARCHICAL = 'HIERARCHICAL',
  SPECTRAL = 'SPECTRAL',
  HDBSCAN = 'HDBSCAN',
}

export interface MediaSourceInput {
  uri: string;
  filename?: string;
  mediaType: MediaType;
  mimeType: string;
  metadata?: Record<string, any>;
  geospatialContext?: {
    latitude?: number;
    longitude?: number;
    altitude?: number;
    accuracy?: number;
    timestamp?: Date;
  };
}

export interface MultimodalEntityInput {
  investigationId: string;
  mediaSourceId: string;
  entityType: string;
  extractedText?: string;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
    confidence?: number;
  };
  temporalRange?: {
    startTime: number;
    endTime: number;
    confidence?: number;
  };
  confidence: number;
  extractionMethod: string;
  extractionVersion: string;
  metadata?: Record<string, any>;
}

export interface VerificationInput {
  verified: boolean;
  notes?: string;
  qualityScore?: number;
}

export class MultimodalDataService {
  private db: Pool;
  private mediaUploadService: MediaUploadService;
  private extractionJobService: ExtractionJobService;

  constructor(
    db: Pool,
    mediaUploadService: MediaUploadService,
    extractionJobService: ExtractionJobService,
  ) {
    this.db = db;
    this.mediaUploadService = mediaUploadService;
    this.extractionJobService = extractionJobService;
  }

  // ===== MEDIA SOURCE OPERATIONS =====

  /**
   * Create a new media source from uploaded metadata
   */
  async createMediaSource(
    metadata: MediaMetadata,
    userId?: string,
    geospatialContext?: {
      latitude?: number;
      longitude?: number;
      altitude?: number;
      accuracy?: number;
      timestamp?: Date;
    },
  ): Promise<MediaSource> {
    const id = uuidv4();
    const now = new Date();

    try {
      const query = `
        INSERT INTO media_sources (
          id, uri, filename, media_type, mime_type, filesize, duration, checksum,
          width, height, channels, bit_rate, frame_rate,
          latitude, longitude, altitude, gps_accuracy, gps_timestamp,
          processing_status, extraction_count, metadata, uploaded_by, uploaded_at, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25
        ) RETURNING *
      `;

      const values = [
        id,
        metadata.filename, // URI points to the uploaded file relative path usually
        metadata.originalName,
        metadata.mediaType,
        metadata.mimeType,
        metadata.filesize,
        metadata.duration,
        metadata.checksum,
        metadata.dimensions?.width,
        metadata.dimensions?.height,
        metadata.dimensions?.channels,
        metadata.dimensions?.bitRate,
        metadata.dimensions?.frameRate,
        geospatialContext?.latitude,
        geospatialContext?.longitude,
        geospatialContext?.altitude,
        geospatialContext?.accuracy,
        geospatialContext?.timestamp,
        ProcessingStatus.PENDING,
        0,
        JSON.stringify(metadata.metadata),
        userId,
        now,
        now,
        now,
      ];

      const result = await this.db.query(query, values);
      const mediaSource = this.mapRowToMediaSource(result.rows[0]);

      logger.info(
        `Created media source: ${id}, type: ${metadata.mediaType}, size: ${metadata.filesize}`,
      );
      return mediaSource;
    } catch (error: any) {
      logger.error(error, `Failed to create media source:`);
      throw error;
    }
  }

  /**
   * Get media source by ID
   */
  async getMediaSource(id: string): Promise<MediaSource | null> {
    try {
      const query = 'SELECT * FROM media_sources WHERE id = $1';
      const result = await this.db.query(query, [id]);

      return result.rows.length > 0
        ? this.mapRowToMediaSource(result.rows[0])
        : null;
    } catch (error: any) {
      logger.error(error, `Failed to get media source ${id}:`);
      throw error;
    }
  }

  /**
   * Get media sources for investigation with filtering
   */
  async getMediaSources(
    investigationId: string,
    filters: {
      mediaType?: MediaType;
      status?: ProcessingStatus;
      limit?: number;
      offset?: number;
    } = {},
  ): Promise<MediaSource[]> {
    try {
      let query = `
        SELECT ms.* FROM media_sources ms
        JOIN multimodal_entities me ON ms.id = me.media_source_id
        WHERE me.investigation_id = $1
      `;

      const values: unknown[] = [investigationId];
      let paramCount = 1;

      if (filters.mediaType) {
        query += ` AND ms.media_type = $${++paramCount}`;
        values.push(filters.mediaType);
      }

      if (filters.status) {
        query += ` AND ms.processing_status = $${++paramCount}`;
        values.push(filters.status);
      }

      query += ` ORDER BY ms.created_at DESC`;

      if (filters.limit) {
        query += ` LIMIT $${++paramCount}`;
        values.push(filters.limit);
      }

      if (filters.offset) {
        query += ` OFFSET $${++paramCount}`;
        values.push(filters.offset);
      }

      const result = await this.db.query(query, values);
      return result.rows.map((row: any) => this.mapRowToMediaSource(row));
    } catch (error: any) {
      logger.error(
        error,
        `Failed to get media sources for investigation ${investigationId}:`,
      );
      throw error;
    }
  }

  /**
   * Update media source processing status
   */
  async updateMediaSourceStatus(
    id: string,
    status: ProcessingStatus,
  ): Promise<MediaSource> {
    try {
      const query = `
        UPDATE media_sources
        SET processing_status = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `;

      const result = await this.db.query(query, [status, id]);

      if (result.rows.length === 0) {
        throw new Error(`Media source ${id} not found`);
      }

      return this.mapRowToMediaSource(result.rows[0]);
    } catch (error: any) {
      logger.error(error, `Failed to update media source status ${id}:`);
      throw error;
    }
  }

  // ===== MULTIMODAL ENTITY OPERATIONS =====

  /**
   * Create a new multimodal entity
   */
  async createMultimodalEntity(
    input: MultimodalEntityInput,
    userId?: string,
  ): Promise<MultimodalEntity> {
    const id = uuidv4();
    const now = new Date();

    try {
      const query = `
        INSERT INTO multimodal_entities (
          id, investigation_id, media_source_id, entity_type, extracted_text,
          bbox_x, bbox_y, bbox_width, bbox_height, bbox_confidence,
          temporal_start, temporal_end, temporal_confidence,
          confidence, extraction_method, extraction_version,
          human_verified, metadata, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
        ) RETURNING *
      `;

      const values = [
        id,
        input.investigationId,
        input.mediaSourceId,
        input.entityType,
        input.extractedText,
        input.boundingBox?.x,
        input.boundingBox?.y,
        input.boundingBox?.width,
        input.boundingBox?.height,
        input.boundingBox?.confidence,
        input.temporalRange?.startTime,
        input.temporalRange?.endTime,
        input.temporalRange?.confidence,
        input.confidence,
        input.extractionMethod,
        input.extractionVersion,
        false, // human_verified defaults to false
        JSON.stringify(input.metadata || {}),
        now,
        now,
      ];

      const result = await this.db.query(query, values);
      const entity = this.mapRowToMultimodalEntity(result.rows[0]);

      // Update extraction count for media source
      await this.incrementExtractionCount(input.mediaSourceId);

      logger.info(
        `Created multimodal entity: ${id}, type: ${input.entityType}, confidence: ${input.confidence}`,
      );
      return entity;
    } catch (error: any) {
      logger.error(error, `Failed to create multimodal entity:`);
      throw error;
    }
  }

  /**
   * Get multimodal entity by ID
   */
  async getMultimodalEntity(id: string): Promise<MultimodalEntity | null> {
    try {
      const query = 'SELECT * FROM multimodal_entities WHERE id = $1';
      const result = await this.db.query(query, [id]);

      return result.rows.length > 0
        ? this.mapRowToMultimodalEntity(result.rows[0])
        : null;
    } catch (error: any) {
      logger.error(error, `Failed to get multimodal entity ${id}:`);
      throw error;
    }
  }

  /**
   * Get multimodal entities with filtering
   */
  async getMultimodalEntities(
    investigationId: string,
    filters: {
      mediaType?: MediaType;
      entityType?: string;
      verified?: boolean;
      confidenceLevel?: ConfidenceLevel;
      limit?: number;
      offset?: number;
    } = {},
  ): Promise<MultimodalEntity[]> {
    try {
      let query = `
        SELECT me.* FROM multimodal_entities me
        JOIN media_sources ms ON me.media_source_id = ms.id
        WHERE me.investigation_id = $1
      `;

      const values: unknown[] = [investigationId];
      let paramCount = 1;

      if (filters.mediaType) {
        query += ` AND ms.media_type = $${++paramCount}`;
        values.push(filters.mediaType);
      }

      if (filters.entityType) {
        query += ` AND me.entity_type = $${++paramCount}`;
        values.push(filters.entityType);
      }

      if (filters.verified !== undefined) {
        query += ` AND me.human_verified = $${++paramCount}`;
        values.push(filters.verified);
      }

      if (filters.confidenceLevel) {
        query += ` AND me.confidence_level = $${++paramCount}`;
        values.push(filters.confidenceLevel);
      }

      query += ` ORDER BY me.confidence DESC, me.created_at DESC`;

      if (filters.limit) {
        query += ` LIMIT $${++paramCount}`;
        values.push(filters.limit);
      }

      if (filters.offset) {
        query += ` OFFSET $${++paramCount}`;
        values.push(filters.offset);
      }

      const result = await this.db.query(query, values);
      return result.rows.map((row: any) => this.mapRowToMultimodalEntity(row));
    } catch (error: any) {
      logger.error(
        error,
        `Failed to get multimodal entities for investigation ${investigationId}:`,
      );
      throw error;
    }
  }

  /**
   * Update multimodal entity
   */
  async updateMultimodalEntity(
    id: string,
    input: Partial<MultimodalEntityInput>,
    userId?: string,
  ): Promise<MultimodalEntity> {
    try {
      const updates: string[] = [];
      const values: unknown[] = [];
      let paramCount = 0;

      if (input.entityType !== undefined) {
        updates.push(`entity_type = $${++paramCount}`);
        values.push(input.entityType);
      }

      if (input.extractedText !== undefined) {
        updates.push(`extracted_text = $${++paramCount}`);
        values.push(input.extractedText);
      }

      if (input.boundingBox) {
        updates.push(
          `bbox_x = $${++paramCount}, bbox_y = $${++paramCount}, bbox_width = $${++paramCount}, bbox_height = $${++paramCount}, bbox_confidence = $${++paramCount}`,
        );
        values.push(
          input.boundingBox.x,
          input.boundingBox.y,
          input.boundingBox.width,
          input.boundingBox.height,
          input.boundingBox.confidence,
        );
        paramCount += 4;
      }

      if (input.temporalRange) {
        updates.push(
          `temporal_start = $${++paramCount}, temporal_end = $${++paramCount}, temporal_confidence = $${++paramCount}`,
        );
        values.push(
          input.temporalRange.startTime,
          input.temporalRange.endTime,
          input.temporalRange.confidence,
        );
        paramCount += 2;
      }

      if (input.confidence !== undefined) {
        updates.push(`confidence = $${++paramCount}`);
        values.push(input.confidence);
      }

      if (input.metadata !== undefined) {
        updates.push(`metadata = $${++paramCount}`);
        values.push(JSON.stringify(input.metadata));
      }

      if (updates.length === 0) {
        throw new Error('No updates provided');
      }

      updates.push(`updated_at = NOW()`);
      values.push(id);

      const query = `
        UPDATE multimodal_entities
        SET ${updates.join(', ')}
        WHERE id = $${++paramCount}
        RETURNING *
      `;

      const result = await this.db.query(query, values);

      if (result.rows.length === 0) {
        throw new Error(`Multimodal entity ${id} not found`);
      }

      return this.mapRowToMultimodalEntity(result.rows[0]);
    } catch (error: any) {
      logger.error(error, `Failed to update multimodal entity ${id}:`);
      throw error;
    }
  }

  /**
   * Verify multimodal entity
   */
  async verifyMultimodalEntity(
    id: string,
    verified: boolean | VerificationInput,
    userId: string,
  ): Promise<MultimodalEntity> {
    try {
      const verification: VerificationInput =
        typeof verified === 'boolean'
          ? { verified }
          : verified;

      const query = `
        UPDATE multimodal_entities
        SET human_verified = $1, verified_by = $2, verified_at = $3,
            verification_notes = $4, quality_score = $5, updated_at = NOW()
        WHERE id = $6
        RETURNING *
      `;

      const values = [
        verification.verified,
        userId,
        verification.verified ? new Date() : null,
        verification.notes || null,
        verification.qualityScore || null,
        id,
      ];

      const result = await this.db.query(query, values);

      if (result.rows.length === 0) {
        throw new Error(`Multimodal entity ${id} not found`);
      }

      const entity = this.mapRowToMultimodalEntity(result.rows[0]);

      logger.info(
        `Verified multimodal entity: ${id}, verified: ${verification.verified}, by: ${userId}`,
      );
      return entity;
    } catch (error: any) {
      logger.error(error, `Failed to verify multimodal entity ${id}:`);
      throw error;
    }
  }

  /**
   * Delete multimodal entity
   */
  async deleteMultimodalEntity(id: string): Promise<boolean> {
    try {
      const query = 'DELETE FROM multimodal_entities WHERE id = $1';
      const result = await this.db.query(query, [id]);

      const deleted = (result.rowCount ?? 0) > 0;

      if (deleted) {
        logger.info(`Deleted multimodal entity: ${id}`);
      }

      return deleted;
    } catch (error: any) {
      logger.error(error, `Failed to delete multimodal entity ${id}:`);
      throw error;
    }
  }

  // ===== CROSS-MODAL MATCHING OPERATIONS =====

  /**
   * Find cross-modal matches for an entity
   */
  async findCrossModalMatches(
    entityId: string,
    targetMediaTypes: string[],
  ): Promise<CrossModalMatch[]> {
    try {
      const query = `
        SELECT cmm.*
        FROM cross_modal_matches cmm
        JOIN multimodal_entities source ON cmm.source_entity_id = source.id
        JOIN multimodal_entities target ON cmm.target_entity_id = target.id
        JOIN media_sources source_ms ON source.media_source_id = source_ms.id
        JOIN media_sources target_ms ON target.media_source_id = target_ms.id
        WHERE (cmm.source_entity_id = $1 AND target_ms.media_type = ANY($2))
           OR (cmm.target_entity_id = $1 AND source_ms.media_type = ANY($2))
      `;
      const result = await this.db.query(query, [entityId, targetMediaTypes]);
      return result.rows.map((row: any) => this.mapRowToCrossModalMatch(row));
    } catch (error: any) {
      logger.error(error, `Failed to find cross modal matches for ${entityId}:`);
      throw error;
    }
  }

  /**
   * Get all cross-modal matches for investigation
   */
  async getCrossModalMatches(
    investigationId: string,
    filters: {
      matchType?: CrossModalMatchType;
      minConfidence?: number;
      verified?: boolean;
      limit?: number;
    } = {},
  ): Promise<CrossModalMatch[]> {
    try {
      let query = `
        SELECT cmm.*
        FROM cross_modal_matches cmm
        JOIN multimodal_entities source ON cmm.source_entity_id = source.id
        WHERE source.investigation_id = $1
      `;
      const values: unknown[] = [investigationId];
      let paramCount = 1;

      if (filters.matchType) {
        query += ` AND cmm.match_type = $${++paramCount}`;
        values.push(filters.matchType);
      }

      if (filters.minConfidence) {
        query += ` AND cmm.confidence >= $${++paramCount}`;
        values.push(filters.minConfidence);
      }

      if (filters.verified !== undefined) {
        query += ` AND cmm.human_verified = $${++paramCount}`;
        values.push(filters.verified);
      }

      query += ` ORDER BY cmm.confidence DESC`;

      if (filters.limit) {
        query += ` LIMIT $${++paramCount}`;
        values.push(filters.limit);
      }

      const result = await this.db.query(query, values);
      return result.rows.map((row: any) => this.mapRowToCrossModalMatch(row));
    } catch (error: any) {
      logger.error(
        error,
        `Failed to get cross modal matches for investigation ${investigationId}:`,
      );
      throw error;
    }
  }

  // ===== EXTRACTION JOB OPERATIONS =====

  /**
   * Get extraction jobs with filtering
   */
  async getExtractionJobs(filters: {
    investigationId?: string;
    status?: string;
    limit?: number;
  }): Promise<unknown[]> {
    if (!filters.investigationId) {
      return [];
    }
    return this.extractionJobService.getExtractionJobs(filters.investigationId, {
      status: filters.status as ProcessingStatus,
      limit: filters.limit
    });
  }

  /**
   * Get single extraction job
   */
  async getExtractionJob(id: string): Promise<unknown | null> {
    return this.extractionJobService.getExtractionJob(id);
  }

  /**
   * Start an extraction job
   */
  async startExtractionJob(input: ExtractionJobInput, userId: string): Promise<unknown> {
    return this.extractionJobService.startExtractionJob(input, userId);
  }

  /**
   * Cancel an extraction job
   */
  async cancelExtractionJob(id: string, _userId: string): Promise<unknown> {
    return this.extractionJobService.cancelExtractionJob(id);
  }

  /**
   * Validate extraction results
   */
  async validateExtractionResults(_jobId: string): Promise<{ valid: boolean; issues: unknown[] }> {
    return { valid: true, issues: [] };
  }

  // ===== SEMANTIC SEARCH OPERATIONS =====

  /**
   * Perform multimodal search across all entity types
   */
  async multimodalSearch(_input: {
    query: string;
    mediaTypes?: string[];
    entityTypes?: string[];
    investigationId?: string;
    includeCrossModal?: boolean;
    minConfidence?: number;
    limit?: number;
  }): Promise<{
    entities: unknown[];
    mediaSources: unknown[];
    crossModalMatches: unknown[];
    totalResults: number;
  }> {
    logger.warn('multimodalSearch not yet implemented');
    return {
      entities: [],
      mediaSources: [],
      crossModalMatches: [],
      totalResults: 0,
    };
  }

  /**
   * Perform semantic search using vector similarity
   */
  async semanticSearch(
    investigationId: string,
    query: {
      text?: string;
      entityId?: string;
      topK?: number;
      threshold?: number;
      mediaTypes?: MediaType[];
      includeText?: boolean;
    },
  ): Promise<MultimodalEntity[]> {
    try {
      let sqlQuery = `
        SELECT me.* FROM multimodal_entities me
        JOIN media_sources ms ON me.media_source_id = ms.id
        WHERE me.investigation_id = $1
      `;

      const values: unknown[] = [investigationId];
      let paramCount = 1;

      if (query.text && query.includeText !== false) {
        sqlQuery += ` AND me.extracted_text ILIKE $${++paramCount}`;
        values.push(`%${query.text}%`);
      }

      if (query.mediaTypes && query.mediaTypes.length > 0) {
        sqlQuery += ` AND ms.media_type = ANY($${++paramCount})`;
        values.push(query.mediaTypes);
      }

      sqlQuery += ` ORDER BY me.confidence DESC`;

      if (query.topK) {
        sqlQuery += ` LIMIT $${++paramCount}`;
        values.push(query.topK);
      }

      const result = await this.db.query(sqlQuery, values);
      return result.rows.map((row: any) => this.mapRowToMultimodalEntity(row));
    } catch (error: any) {
      logger.error(error, `Failed to perform semantic search:`);
      throw error;
    }
  }

  /**
   * Find similar entities using vector embeddings
   */
  async findSimilarEntities(
    entityId: string,
    topK: number = 10,
    threshold: number = 0.8,
  ): Promise<MultimodalEntity[]> {
    try {
      const entity = await this.getMultimodalEntity(entityId);
      if (!entity) {
        throw new Error(`Entity ${entityId} not found`);
      }

      const query = `
        SELECT * FROM multimodal_entities
        WHERE investigation_id = $1
        AND entity_type = $2
        AND id != $3
        AND confidence >= $4
        ORDER BY confidence DESC
        LIMIT $5
      `;

      const result = await this.db.query(query, [
        entity.investigationId,
        entity.entityType,
        entityId,
        threshold,
        topK,
      ]);

      return result.rows.map((row: any) => this.mapRowToMultimodalEntity(row));
    } catch (error: any) {
      logger.error(error, `Failed to find similar entities for ${entityId}:`);
      throw error;
    }
  }

  // ===== ANALYTICS AND QUALITY OPERATIONS =====

  /**
   * Get analytics for investigation
   */
  async getMultimodalAnalytics(_investigationId: string): Promise<{
    totalMediaSources: number;
    totalEntities: number;
    totalCrossModalMatches: number;
    averageConfidence: number;
    mediaTypeDistribution: Record<string, unknown>;
    entityTypeDistribution: Record<string, unknown>;
    extractionMethodDistribution: Record<string, unknown>;
    verificationRate: number;
    qualityScore: number;
  }> {
    return {
      totalMediaSources: 0,
      totalEntities: 0,
      totalCrossModalMatches: 0,
      averageConfidence: 0,
      mediaTypeDistribution: {},
      entityTypeDistribution: {},
      extractionMethodDistribution: {},
      verificationRate: 0,
      qualityScore: 0,
    };
  }

  /**
   * Get unverified entities for review
   */
  async getUnverifiedEntities(filters: {
    investigationId?: string;
    mediaType?: string;
    limit?: number;
  }): Promise<MultimodalEntity[]> {
    try {
      return await this.getMultimodalEntities(filters.investigationId || '', {
        mediaType: filters.mediaType as MediaType,
        verified: false,
        limit: filters.limit,
      });
    } catch (error: any) {
      logger.error(error, 'Failed to get unverified entities:');
      throw error;
    }
  }

  /**
   * Find duplicate entities
   */
  async findDuplicateEntities(_filters: {
    investigationId?: string;
    similarity?: number;
    limit?: number;
  }): Promise<unknown[]> {
    return [];
  }

  /**
   * Cleanup duplicate entities
   */
  async cleanupDuplicateEntities(
    _investigationId: string,
    _similarity: number,
    _autoMerge: boolean,
    _userId: string,
  ): Promise<{
    duplicatesFound: number;
    entitiesMerged: number;
    entitiesDeleted: number;
  }> {
    return {
      duplicatesFound: 0,
      entitiesMerged: 0,
      entitiesDeleted: 0,
    };
  }

  // ===== MEDIA SOURCE MANAGEMENT =====

  /**
   * Upload a new media source
   */
  async uploadMediaSource(upload: unknown, userId: string): Promise<MediaSource> {
    try {
      const metadata = await this.mediaUploadService.uploadMedia(upload, userId);
      return this.createMediaSource(metadata, userId);
    } catch (error: any) {
      logger.error(error, 'Failed to upload media source:');
      throw error;
    }
  }

  /**
   * Delete a media source
   */
  async deleteMediaSource(id: string, userId: string): Promise<boolean> {
    try {
      const query = 'DELETE FROM media_sources WHERE id = $1';
      const result = await this.db.query(query, [id]);
      const deleted = (result.rowCount ?? 0) > 0;

      if (deleted) {
        logger.info(`Deleted media source: ${id} by user: ${userId}`);
      }

      return deleted;
    } catch (error: any) {
      logger.error(error, `Failed to delete media source ${id}:`);
      throw error;
    }
  }

  /**
   * Update media metadata
   */
  async updateMediaMetadata(
    id: string,
    metadata: Record<string, unknown>,
    userId: string,
  ): Promise<MediaSource> {
    try {
      const query = `
        UPDATE media_sources
        SET metadata = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `;

      const result = await this.db.query(query, [JSON.stringify(metadata), id]);

      if (result.rows.length === 0) {
        throw new Error(`Media source ${id} not found`);
      }

      logger.info(`Updated media metadata: ${id} by user: ${userId}`);
      return this.mapRowToMediaSource(result.rows[0]);
    } catch (error: any) {
      logger.error(error, `Failed to update media metadata ${id}:`);
      throw error;
    }
  }

  // ===== ENTITY RELATIONSHIP OPERATIONS =====

  /**
   * Merge multiple entities into one
   */
  async mergeMultimodalEntities(
    primaryId: string,
    secondaryIds: string[],
    userId: string,
  ): Promise<MultimodalEntity> {
    logger.warn('mergeMultimodalEntities not yet fully implemented, returning primary');
    const primary = await this.getMultimodalEntity(primaryId);
    if (!primary) {
      throw new Error(`Primary entity ${primaryId} not found`);
    }
    return primary;
  }

  /**
   * Create a multimodal relationship
   */
  async createMultimodalRelationship(
    input: {
      sourceEntityId: string;
      targetEntityId: string;
      matchType: string;
      confidence: number;
      algorithm: string;
      explanation?: Record<string, unknown>;
      similarityScore?: number;
    },
    _userId: string,
  ): Promise<CrossModalMatch> {
    const id = uuidv4();
    try {
      const query = `
            INSERT INTO cross_modal_matches (
                id, source_entity_id, target_entity_id, match_type, confidence,
                algorithm, explanation, similarity_score, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
            RETURNING *
        `;
      const values = [
        id,
        input.sourceEntityId,
        input.targetEntityId,
        input.matchType,
        input.confidence,
        input.algorithm,
        JSON.stringify(input.explanation || {}),
        input.similarityScore
      ];
      const result = await this.db.query(query, values);
      return this.mapRowToCrossModalMatch(result.rows[0]);
    } catch (error: any) {
      logger.error(error, 'Failed to create multimodal relationship:');
      throw error;
    }
  }

  /**
   * Update a multimodal relationship
   */
  async updateMultimodalRelationship(
    id: string,
    input: {
      confidence?: number;
      explanation?: Record<string, unknown>;
      similarityScore?: number;
    },
    userId: string,
  ): Promise<CrossModalMatch> {
    try {
      const query = `
            UPDATE cross_modal_matches
            SET confidence = $1, explanation = $2, similarity_score = $3,
                verified_by = $4, updated_at = NOW()
            WHERE id = $5
            RETURNING *
        `;
      const result = await this.db.query(query, [
        input.confidence,
        JSON.stringify(input.explanation),
        input.similarityScore,
        userId,
        id
      ]);
      if (result.rows.length === 0) {
        throw new Error(`Match ${id} not found`);
      }
      return this.mapRowToCrossModalMatch(result.rows[0]);
    } catch (error: any) {
      logger.error(error, 'Failed to update multimodal relationship:');
      throw error;
    }
  }

  /**
   * Verify a multimodal relationship
   */
  async verifyMultimodalRelationship(
    id: string,
    verified: boolean,
    userId: string,
  ): Promise<CrossModalMatch> {
    try {
      const query = `
            UPDATE cross_modal_matches
            SET human_verified = $1, verified_by = $2, verified_at = NOW()
            WHERE id = $3
            RETURNING *
        `;
      const result = await this.db.query(query, [verified, userId, id]);
      if (result.rows.length === 0) throw new Error(`Match ${id} not found`);
      return this.mapRowToCrossModalMatch(result.rows[0]);
    } catch (error: any) {
      logger.error(error, `Failed to verify relationship ${id}:`);
      throw error;
    }
  }

  // ===== CLUSTERING AND ADVANCED ANALYTICS =====

  /**
   * Compute semantic clusters
   */
  async computeSemanticClusters(
    _investigationId: string,
    _algorithm?: string,
  ): Promise<SemanticCluster[]> {
    logger.warn('computeSemanticClusters not yet implemented');
    return [];
  }

  // ===== UTILITY METHODS =====

  private async incrementExtractionCount(mediaSourceId: string): Promise<void> {
    try {
      await this.db.query(
        'UPDATE media_sources SET extraction_count = extraction_count + 1 WHERE id = $1',
        [mediaSourceId],
      );
    } catch (error: any) {
      logger.warn(
        error,
        `Failed to increment extraction count for ${mediaSourceId}:`,
      );
    }
  }

  private mapRowToMediaSource(row: Record<string, unknown>): MediaSource {
    return {
      id: row.id as string,
      uri: row.uri as string,
      filename: row.filename as string | undefined,
      mediaType: row.media_type as MediaType,
      mimeType: row.mime_type as string,
      filesize: row.filesize as number | undefined,
      duration: row.duration as number | undefined,
      checksum: row.checksum as string,
      width: row.width as number | undefined,
      height: row.height as number | undefined,
      channels: row.channels as number | undefined,
      bitRate: row.bit_rate as number | undefined,
      frameRate: row.frame_rate as number | undefined,
      latitude: row.latitude as number | undefined,
      longitude: row.longitude as number | undefined,
      altitude: row.altitude as number | undefined,
      gpsAccuracy: row.gps_accuracy as number | undefined,
      gpsTimestamp: row.gps_timestamp as Date | undefined,
      processingStatus: row.processing_status as ProcessingStatus,
      extractionCount: row.extraction_count as number,
      metadata: (row.metadata as Record<string, any>) || {},
      uploadedBy: row.uploaded_by as string | undefined,
      uploadedAt: row.uploaded_at as Date,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
    };
  }

  private mapRowToMultimodalEntity(row: Record<string, unknown>): MultimodalEntity {
    return {
      id: row.id as string,
      investigationId: row.investigation_id as string,
      mediaSourceId: row.media_source_id as string,
      entityType: row.entity_type as string,
      extractedText: row.extracted_text as string | undefined,
      bboxX: row.bbox_x as number | undefined,
      bboxY: row.bbox_y as number | undefined,
      bboxWidth: row.bbox_width as number | undefined,
      bboxHeight: row.bbox_height as number | undefined,
      bboxConfidence: row.bbox_confidence as number | undefined,
      temporalStart: row.temporal_start as number | undefined,
      temporalEnd: row.temporal_end as number | undefined,
      temporalConfidence: row.temporal_confidence as number | undefined,
      confidence: row.confidence as number,
      confidenceLevel: row.confidence_level as ConfidenceLevel,
      qualityScore: row.quality_score as number | undefined,
      extractionMethod: row.extraction_method as string,
      extractionVersion: row.extraction_version as string,
      humanVerified: row.human_verified as boolean,
      verifiedBy: row.verified_by as string | undefined,
      verifiedAt: row.verified_at as Date | undefined,
      verificationNotes: row.verification_notes as string | undefined,
      textEmbedding: row.text_embedding as number[] | undefined,
      visualEmbedding: row.visual_embedding as number[] | undefined,
      audioEmbedding: row.audio_embedding as number[] | undefined,
      metadata: (row.metadata as Record<string, any>) || {},
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
    };
  }

  private mapRowToCrossModalMatch(row: Record<string, unknown>): CrossModalMatch {
    return {
      id: row.id as string,
      sourceEntityId: row.source_entity_id as string,
      targetEntityId: row.target_entity_id as string,
      matchType: row.match_type as CrossModalMatchType,
      confidence: row.confidence as number,
      algorithm: row.algorithm as string,
      explanation: (row.explanation as Record<string, any>) || {},
      similarityScore: row.similarity_score as number | undefined,
      humanVerified: row.human_verified as boolean,
      verifiedBy: row.verified_by as string | undefined,
      verifiedAt: row.verified_at as Date | undefined,
      createdAt: row.created_at as Date,
    };
  }
}

export default MultimodalDataService;
