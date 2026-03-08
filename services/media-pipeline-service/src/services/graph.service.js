"use strict";
/**
 * Graph Integration Service
 *
 * Creates and updates Communication entities and relationships in Graph Core.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.graphService = exports.GraphService = void 0;
const axios_1 = __importDefault(require("axios"));
const logger_js_1 = require("../utils/logger.js");
const hash_js_1 = require("../utils/hash.js");
const time_js_1 = require("../utils/time.js");
const index_js_1 = __importDefault(require("../config/index.js"));
class GraphService {
    log = (0, logger_js_1.createChildLogger)({ service: 'GraphService' });
    client;
    constructor() {
        this.client = axios_1.default.create({
            baseURL: index_js_1.default.graphCoreUrl,
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
                'X-Authority-Id': index_js_1.default.authorityId,
                'X-Reason-For-Access': 'media-pipeline-sync',
            },
        });
    }
    /**
     * Sync media asset and transcript to Graph Core
     */
    async syncToGraph(mediaAsset, transcript) {
        const correlationId = (0, hash_js_1.generateId)();
        this.log.info({ mediaAssetId: mediaAsset.id, transcriptId: transcript?.id, correlationId }, 'Starting graph sync');
        try {
            // Build graph sync event
            const syncEvent = this.buildGraphSyncEvent(mediaAsset, transcript, correlationId);
            // Create Communication entity
            const communicationEntity = syncEvent.entities.find((e) => e.type === 'Communication');
            if (!communicationEntity) {
                throw new Error('No Communication entity in sync event');
            }
            const communicationResult = await this.createEntity(communicationEntity);
            if (!communicationResult.id) {
                throw new Error('Failed to create Communication entity');
            }
            // Create participant entities and relationships
            const participantIds = [];
            const relationshipIds = [];
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
            this.log.info({
                mediaAssetId: mediaAsset.id,
                communicationEntityId: communicationResult.id,
                participantCount: participantIds.length,
                relationshipCount: relationshipIds.length,
                correlationId,
            }, 'Graph sync completed');
            return {
                success: true,
                communicationEntityId: communicationResult.id,
                participantEntityIds: participantIds,
                relationshipIds,
            };
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            this.log.error({ mediaAssetId: mediaAsset.id, correlationId, error: message }, 'Graph sync failed');
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
    buildGraphSyncEvent(mediaAsset, transcript, correlationId) {
        const entities = [];
        const relationships = [];
        // Create Communication entity
        const communicationId = (0, hash_js_1.generateId)();
        const communicationAttributes = {
            mediaAssetId: mediaAsset.id,
            transcriptId: transcript?.id,
            communicationType: this.mapMediaTypeToCommunicationType(mediaAsset.type),
            startTime: mediaAsset.timeRange?.start || (0, time_js_1.now)(),
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
            attributes: communicationAttributes,
            validFrom: mediaAsset.timeRange?.start,
            validTo: mediaAsset.timeRange?.end,
            policy: mediaAsset.policy,
        });
        // Create MediaAsset entity
        const mediaAssetEntityId = (0, hash_js_1.generateId)();
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
            const participantEntityId = participant.entityId || (0, hash_js_1.generateId)();
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
            const locationEntityId = (0, hash_js_1.generateId)();
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
        const provenance = {
            sourceId: mediaAsset.id,
            sourceType: 'media_asset',
            ingestedAt: (0, time_js_1.now)(),
            ingestedBy: index_js_1.default.authorityId,
            transformChain: [
                {
                    step: 'graph_sync',
                    timestamp: (0, time_js_1.now)(),
                    provider: 'graph-service',
                    checksum: (0, hash_js_1.hashObject)(entities),
                },
            ],
            originalChecksum: mediaAsset.checksum,
        };
        return {
            id: (0, hash_js_1.generateId)(),
            mediaAssetId: mediaAsset.id,
            transcriptId: transcript?.id,
            correlationId,
            timestamp: (0, time_js_1.now)(),
            entities,
            relationships,
            provenance,
        };
    }
    /**
     * Create an entity in Graph Core
     */
    async createEntity(entity) {
        try {
            const response = await this.client.post(`/api/v1/entities/${entity.type}`, entity);
            return { id: response.data.id || entity.id };
        }
        catch (error) {
            // In development/test, simulate success
            if (index_js_1.default.nodeEnv !== 'production') {
                this.log.warn({ entityType: entity.type, entityId: entity.id }, 'Graph Core unavailable, simulating entity creation');
                return { id: entity.id };
            }
            throw error;
        }
    }
    /**
     * Create a relationship in Graph Core
     */
    async createRelationship(relationship) {
        try {
            const response = await this.client.post('/api/v1/relationships', relationship);
            return { id: response.data.id || relationship.id };
        }
        catch (error) {
            // In development/test, simulate success
            if (index_js_1.default.nodeEnv !== 'production') {
                this.log.warn({ relationshipType: relationship.type }, 'Graph Core unavailable, simulating relationship creation');
                return { id: relationship.id || (0, hash_js_1.generateId)() };
            }
            throw error;
        }
    }
    /**
     * Map media type to communication type
     */
    mapMediaTypeToCommunicationType(mediaType) {
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
exports.GraphService = GraphService;
exports.graphService = new GraphService();
exports.default = exports.graphService;
