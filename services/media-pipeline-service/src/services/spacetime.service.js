"use strict";
/**
 * Spacetime Integration Service
 *
 * Emits spacetime events for communications with location and time data.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.spacetimeService = exports.SpacetimeService = void 0;
const axios_1 = __importDefault(require("axios"));
const logger_js_1 = require("../utils/logger.js");
const hash_js_1 = require("../utils/hash.js");
const time_js_1 = require("../utils/time.js");
const index_js_1 = __importDefault(require("../config/index.js"));
class SpacetimeService {
    log = (0, logger_js_1.createChildLogger)({ service: 'SpacetimeService' });
    client;
    constructor() {
        this.client = axios_1.default.create({
            baseURL: index_js_1.default.spacetimeUrl,
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
                'X-Authority-Id': index_js_1.default.authorityId,
                'X-Reason-For-Access': 'media-pipeline-sync',
            },
        });
    }
    /**
     * Emit a spacetime event for a media asset
     */
    async emitEvent(mediaAsset, communicationEntityId, transcript) {
        const correlationId = (0, hash_js_1.generateId)();
        this.log.info({ mediaAssetId: mediaAsset.id, correlationId }, 'Emitting spacetime event');
        try {
            // Validate we have enough data
            if (!mediaAsset.timeRange && !mediaAsset.metadata.duration) {
                this.log.warn({ mediaAssetId: mediaAsset.id }, 'No time range available for spacetime event');
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
            const event = this.buildSpacetimeEvent(mediaAsset, timeRange, communicationEntityId, transcript, correlationId);
            // Send to spacetime service
            const response = await this.sendEvent(event);
            this.log.info({ mediaAssetId: mediaAsset.id, eventId: event.id, correlationId }, 'Spacetime event emitted');
            return {
                success: true,
                eventId: response.id || event.id,
            };
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            this.log.error({ mediaAssetId: mediaAsset.id, correlationId, error: message }, 'Spacetime event emission failed');
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
    buildTimeRange(mediaAsset) {
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
    buildSpacetimeEvent(mediaAsset, timeRange, communicationEntityId, transcript, correlationId) {
        // Determine event type
        const eventType = this.determineEventType(mediaAsset);
        // Collect participant entity IDs
        const participantEntityIds = [];
        const participants = transcript?.participants || mediaAsset.participants || [];
        for (const participant of participants) {
            if (participant.entityId) {
                participantEntityIds.push(participant.entityId);
            }
        }
        // Build attributes
        const attributes = {
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
            id: (0, hash_js_1.generateId)(),
            mediaAssetId: mediaAsset.id,
            communicationEntityId,
            correlationId,
            timestamp: (0, time_js_1.now)(),
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
                ingestedAt: (0, time_js_1.now)(),
                ingestedBy: index_js_1.default.authorityId,
                transformChain: [
                    {
                        step: 'spacetime_sync',
                        timestamp: (0, time_js_1.now)(),
                        provider: 'spacetime-service',
                        checksum: (0, hash_js_1.hashObject)(attributes),
                    },
                ],
                originalChecksum: mediaAsset.checksum,
            },
        };
    }
    /**
     * Determine spacetime event type from media type
     */
    determineEventType(mediaAsset) {
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
    async sendEvent(event) {
        try {
            const response = await this.client.post('/api/v1/events', event);
            return { id: response.data.id };
        }
        catch (error) {
            // In development/test, simulate success
            if (index_js_1.default.nodeEnv !== 'production') {
                this.log.warn({ eventId: event.id }, 'Spacetime service unavailable, simulating event emission');
                return { id: event.id };
            }
            throw error;
        }
    }
    /**
     * Query spacetime events for a time range and location
     */
    async queryEvents(timeRange, location, radius) {
        try {
            const params = {
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
        }
        catch (error) {
            this.log.error({ error }, 'Failed to query spacetime events');
            return [];
        }
    }
}
exports.SpacetimeService = SpacetimeService;
exports.spacetimeService = new SpacetimeService();
exports.default = exports.spacetimeService;
