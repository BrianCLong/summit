/**
 * Graph Integration Service
 *
 * Creates and updates Communication entities and relationships in Graph Core.
 */

import axios, { AxiosInstance } from 'axios';
import type {
  MediaAsset,
  Transcript,
  ParticipantRef,
  CommunicationEvent,
  Provenance,
} from '../types/media.js';
import type {
  GraphSyncEvent,
  GraphEntityRequest,
  GraphRelationshipRequest,
  CommunicationEntityAttributes,
} from '../types/events.js';
import { createChildLogger } from '../utils/logger.js';
import { generateId, hashObject } from '../utils/hash.js';
import { now } from '../utils/time.js';
import config from '../config/index.js';

export interface GraphSyncResult {
  success: boolean;
  communicationEntityId?: string;
  participantEntityIds?: string[];
  relationshipIds?: string[];
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
}

export class GraphService {
  private log = createChildLogger({ service: 'GraphService' });
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: config.graphCoreUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'X-Authority-Id': config.authorityId,
        'X-Reason-For-Access': 'media-pipeline-sync',
      },
    });
  }

  /**
   * Sync media asset and transcript to Graph Core
   */
  async syncToGraph(
    mediaAsset: MediaAsset,
    transcript?: Transcript
  ): Promise<GraphSyncResult> {
    const correlationId = generateId();

    this.log.info(
      { mediaAssetId: mediaAsset.id, transcriptId: transcript?.id, correlationId },
      'Starting graph sync'
    );

    try {
      // Build graph sync event
      const syncEvent = this.buildGraphSyncEvent(mediaAsset, transcript, correlationId);

      // Create Communication entity
      const communicationEntity = syncEvent.entities.find(
        (e) => e.type === 'Communication'
      );

      if (!communicationEntity) {
        throw new Error('No Communication entity in sync event');
      }

      const communicationResult = await this.createEntity(communicationEntity);

      if (!communicationResult.id) {
        throw new Error('Failed to create Communication entity');
      }

      // Create participant entities and relationships
      const participantIds: string[] = [];
      const relationshipIds: string[] = [];

      for (const entity of syncEvent.entities) {
        if (entity.type !== 'Communication') {
          const result = await this.createEntity(entity);
          if (result.id) {
            participantIds.push(result.id);
          }
        }
      }

      // Create relationships
      for (const relationship of syncEvent.relationships) {
        // Update relationship with actual IDs if needed
        const result = await this.createRelationship(relationship);
        if (result.id) {
          relationshipIds.push(result.id);
        }
      }

      this.log.info(
        {
          mediaAssetId: mediaAsset.id,
          communicationEntityId: communicationResult.id,
          participantCount: participantIds.length,
          relationshipCount: relationshipIds.length,
          correlationId,
        },
        'Graph sync completed'
      );

      return {
        success: true,
        communicationEntityId: communicationResult.id,
        participantEntityIds: participantIds,
        relationshipIds,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.log.error(
        { mediaAssetId: mediaAsset.id, correlationId, error: message },
        'Graph sync failed'
      );

      return {
        success: false,
        error: {
          code: 'GRAPH_SYNC_FAILED',
          message,
          retryable: true,
        },
      };
    }
  }

  /**
   * Build a GraphSyncEvent from media asset and transcript
   */
  private buildGraphSyncEvent(
    mediaAsset: MediaAsset,
    transcript: Transcript | undefined,
    correlationId: string
  ): GraphSyncEvent {
    const entities: GraphEntityRequest[] = [];
    const relationships: GraphRelationshipRequest[] = [];

    // Create Communication entity
    const communicationId = generateId();
    const communicationAttributes: CommunicationEntityAttributes = {
      mediaAssetId: mediaAsset.id,
      transcriptId: transcript?.id,
      communicationType: this.mapMediaTypeToCommunicationType(mediaAsset.type),
      startTime: mediaAsset.timeRange?.start || now(),
      endTime: mediaAsset.timeRange?.end,
      duration: mediaAsset.metadata.duration,
      participantCount: transcript?.participants.length || mediaAsset.participants?.length || 0,
      utteranceCount: transcript?.utterances.length,
      wordCount: transcript?.wordCount,
      primaryLanguage: transcript?.language,
      hasTranscript: !!transcript,
      transcriptConfidence: transcript?.confidence,
      location: mediaAsset.location,
      sourceRef: mediaAsset.sourceRef,
      sourceConnector: mediaAsset.sourceConnector,
    };

    entities.push({
      id: communicationId,
      type: 'Communication',
      attributes: communicationAttributes as unknown as Record<string, unknown>,
      validFrom: mediaAsset.timeRange?.start,
      validTo: mediaAsset.timeRange?.end,
      policy: mediaAsset.policy,
    });

    // Create MediaAsset entity
    const mediaAssetEntityId = generateId();
    entities.push({
      id: mediaAssetEntityId,
      type: 'MediaAsset',
      attributes: {
        originalId: mediaAsset.id,
        type: mediaAsset.type,
        format: mediaAsset.format,
        filename: mediaAsset.metadata.filename,
        size: mediaAsset.metadata.size,
        duration: mediaAsset.metadata.duration,
        checksum: mediaAsset.checksum,
      },
      policy: mediaAsset.policy,
    });

    // Create relationship: Communication -> MediaAsset
    relationships.push({
      from: communicationId,
      to: mediaAssetEntityId,
      type: 'TRANSCRIBED_FROM',
      attributes: {
        transcriptId: transcript?.id,
        confidence: transcript?.confidence,
      },
    });

    // Create participant entities and relationships
    const participants = transcript?.participants || mediaAsset.participants || [];
    for (const participant of participants) {
      const participantEntityId = participant.entityId || generateId();

      // Only create entity if no existing entityId
      if (!participant.entityId) {
        entities.push({
          id: participantEntityId,
          type: 'Person',
          attributes: {
            speakerId: participant.speakerId,
            displayName: participant.displayName,
            identifier: participant.identifier,
            identifierType: participant.identifierType,
          },
          policy: mediaAsset.policy,
        });
      }

      // Create PARTICIPATED_IN relationship
      relationships.push({
        from: participantEntityId,
        to: communicationId,
        type: 'PARTICIPATED_IN',
        attributes: {
          role: participant.role,
          confidence: participant.confidence,
        },
        validFrom: mediaAsset.timeRange?.start,
        validTo: mediaAsset.timeRange?.end,
      });
    }

    // Create location entity if present
    if (mediaAsset.location) {
      const locationEntityId = generateId();
      entities.push({
        id: locationEntityId,
        type: 'Location',
        attributes: {
          latitude: mediaAsset.location.latitude,
          longitude: mediaAsset.location.longitude,
          placeName: mediaAsset.location.placeName,
          country: mediaAsset.location.country,
          region: mediaAsset.location.region,
          city: mediaAsset.location.city,
        },
      });

      relationships.push({
        from: communicationId,
        to: locationEntityId,
        type: 'LOCATED_AT',
        validFrom: mediaAsset.timeRange?.start,
        validTo: mediaAsset.timeRange?.end,
      });
    }

    const provenance: Provenance = {
      sourceId: mediaAsset.id,
      sourceType: 'media_asset',
      ingestedAt: now(),
      ingestedBy: config.authorityId,
      transformChain: [
        {
          step: 'graph_sync',
          timestamp: now(),
          provider: 'graph-service',
          checksum: hashObject(entities),
        },
      ],
      originalChecksum: mediaAsset.checksum,
    };

    return {
      id: generateId(),
      mediaAssetId: mediaAsset.id,
      transcriptId: transcript?.id,
      correlationId,
      timestamp: now(),
      entities,
      relationships,
      provenance,
    };
  }

  /**
   * Create an entity in Graph Core
   */
  private async createEntity(entity: GraphEntityRequest): Promise<{ id?: string }> {
    try {
      const response = await this.client.post(
        `/api/v1/entities/${entity.type}`,
        entity
      );
      return { id: response.data.id || entity.id };
    } catch (error) {
      // In development/test, simulate success
      if (config.nodeEnv !== 'production') {
        this.log.warn(
          { entityType: entity.type, entityId: entity.id },
          'Graph Core unavailable, simulating entity creation'
        );
        return { id: entity.id };
      }
      throw error;
    }
  }

  /**
   * Create a relationship in Graph Core
   */
  private async createRelationship(
    relationship: GraphRelationshipRequest
  ): Promise<{ id?: string }> {
    try {
      const response = await this.client.post(
        '/api/v1/relationships',
        relationship
      );
      return { id: response.data.id || relationship.id };
    } catch (error) {
      // In development/test, simulate success
      if (config.nodeEnv !== 'production') {
        this.log.warn(
          { relationshipType: relationship.type },
          'Graph Core unavailable, simulating relationship creation'
        );
        return { id: relationship.id || generateId() };
      }
      throw error;
    }
  }

  /**
   * Map media type to communication type
   */
  private mapMediaTypeToCommunicationType(
    mediaType: string
  ): 'call' | 'meeting' | 'message' | 'email' | 'chat' | 'broadcast' | 'conference' {
    switch (mediaType) {
      case 'audio':
        return 'call';
      case 'video':
        return 'meeting';
      case 'chat_log':
        return 'chat';
      case 'email':
        return 'email';
      case 'document':
        return 'message';
      default:
        return 'message';
    }
  }
}

export const graphService = new GraphService();
export default graphService;
