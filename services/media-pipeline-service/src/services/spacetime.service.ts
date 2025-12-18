/**
 * Spacetime Integration Service
 *
 * Emits spacetime events for communications with location and time data.
 */

import axios, { AxiosInstance } from 'axios';
import type {
  MediaAsset,
  Transcript,
  TimeRange,
  GeoLocation,
} from '../types/media.js';
import type { SpacetimeSyncEvent, SpacetimeEventType } from '../types/events.js';
import { createChildLogger } from '../utils/logger.js';
import { generateId, hashObject } from '../utils/hash.js';
import { now } from '../utils/time.js';
import config from '../config/index.js';

export interface SpacetimeSyncResult {
  success: boolean;
  eventId?: string;
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
}

export class SpacetimeService {
  private log = createChildLogger({ service: 'SpacetimeService' });
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: config.spacetimeUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'X-Authority-Id': config.authorityId,
        'X-Reason-For-Access': 'media-pipeline-sync',
      },
    });
  }

  /**
   * Emit a spacetime event for a media asset
   */
  async emitEvent(
    mediaAsset: MediaAsset,
    communicationEntityId?: string,
    transcript?: Transcript
  ): Promise<SpacetimeSyncResult> {
    const correlationId = generateId();

    this.log.info(
      { mediaAssetId: mediaAsset.id, correlationId },
      'Emitting spacetime event'
    );

    try {
      // Validate we have enough data
      if (!mediaAsset.timeRange && !mediaAsset.metadata.duration) {
        this.log.warn(
          { mediaAssetId: mediaAsset.id },
          'No time range available for spacetime event'
        );
        return {
          success: false,
          error: {
            code: 'MISSING_TIME_DATA',
            message: 'No time range or duration available',
            retryable: false,
          },
        };
      }

      // Build time range
      const timeRange = this.buildTimeRange(mediaAsset);

      // Build spacetime event
      const event = this.buildSpacetimeEvent(
        mediaAsset,
        timeRange,
        communicationEntityId,
        transcript,
        correlationId
      );

      // Send to spacetime service
      const response = await this.sendEvent(event);

      this.log.info(
        { mediaAssetId: mediaAsset.id, eventId: event.id, correlationId },
        'Spacetime event emitted'
      );

      return {
        success: true,
        eventId: response.id || event.id,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.log.error(
        { mediaAssetId: mediaAsset.id, correlationId, error: message },
        'Spacetime event emission failed'
      );

      return {
        success: false,
        error: {
          code: 'SPACETIME_SYNC_FAILED',
          message,
          retryable: true,
        },
      };
    }
  }

  /**
   * Build time range from media asset
   */
  private buildTimeRange(mediaAsset: MediaAsset): TimeRange {
    if (mediaAsset.timeRange) {
      return mediaAsset.timeRange;
    }

    // Fallback: use created time + duration
    const startTime = mediaAsset.createdAt;
    const duration = mediaAsset.metadata.duration || 0;
    const endTime = new Date(new Date(startTime).getTime() + duration).toISOString();

    return {
      start: startTime,
      end: endTime,
      duration,
    };
  }

  /**
   * Build spacetime sync event
   */
  private buildSpacetimeEvent(
    mediaAsset: MediaAsset,
    timeRange: TimeRange,
    communicationEntityId: string | undefined,
    transcript: Transcript | undefined,
    correlationId: string
  ): SpacetimeSyncEvent {
    // Determine event type
    const eventType = this.determineEventType(mediaAsset);

    // Collect participant entity IDs
    const participantEntityIds: string[] = [];
    const participants = transcript?.participants || mediaAsset.participants || [];
    for (const participant of participants) {
      if (participant.entityId) {
        participantEntityIds.push(participant.entityId);
      }
    }

    // Build attributes
    const attributes: Record<string, unknown> = {
      mediaType: mediaAsset.type,
      mediaFormat: mediaAsset.format,
      filename: mediaAsset.metadata.filename,
      hasTranscript: !!transcript,
    };

    if (transcript) {
      attributes.language = transcript.language;
      attributes.speakerCount = transcript.speakerCount;
      attributes.wordCount = transcript.wordCount;
      attributes.confidence = transcript.confidence;
    }

    if (mediaAsset.metadata.duration) {
      attributes.duration = mediaAsset.metadata.duration;
    }

    return {
      id: generateId(),
      mediaAssetId: mediaAsset.id,
      communicationEntityId,
      correlationId,
      timestamp: now(),
      eventType,
      timeRange,
      location: mediaAsset.location,
      participantEntityIds,
      attributes,
      confidence: transcript?.confidence,
      source: 'media-pipeline-service',
      provenance: {
        sourceId: mediaAsset.id,
        sourceType: 'media_asset',
        ingestedAt: now(),
        ingestedBy: config.authorityId,
        transformChain: [
          {
            step: 'spacetime_sync',
            timestamp: now(),
            provider: 'spacetime-service',
            checksum: hashObject(attributes),
          },
        ],
        originalChecksum: mediaAsset.checksum,
      },
    };
  }

  /**
   * Determine spacetime event type from media type
   */
  private determineEventType(mediaAsset: MediaAsset): SpacetimeEventType {
    switch (mediaAsset.type) {
      case 'audio':
        return 'communication.call';
      case 'video':
        return 'communication.meeting';
      case 'chat_log':
        return 'communication.message';
      case 'email':
        return 'communication.email';
      default:
        return 'communication.message';
    }
  }

  /**
   * Send event to spacetime service
   */
  private async sendEvent(event: SpacetimeSyncEvent): Promise<{ id?: string }> {
    try {
      const response = await this.client.post('/api/v1/events', event);
      return { id: response.data.id };
    } catch (error) {
      // In development/test, simulate success
      if (config.nodeEnv !== 'production') {
        this.log.warn(
          { eventId: event.id },
          'Spacetime service unavailable, simulating event emission'
        );
        return { id: event.id };
      }
      throw error;
    }
  }

  /**
   * Query spacetime events for a time range and location
   */
  async queryEvents(
    timeRange: TimeRange,
    location?: GeoLocation,
    radius?: number
  ): Promise<SpacetimeSyncEvent[]> {
    try {
      const params: Record<string, unknown> = {
        startTime: timeRange.start,
        endTime: timeRange.end,
      };

      if (location) {
        params.latitude = location.latitude;
        params.longitude = location.longitude;
        params.radius = radius || 1000; // default 1km
      }

      const response = await this.client.get('/api/v1/events', { params });
      return response.data.events || [];
    } catch (error) {
      this.log.error({ error }, 'Failed to query spacetime events');
      return [];
    }
  }
}

export const spacetimeService = new SpacetimeService();
export default spacetimeService;
