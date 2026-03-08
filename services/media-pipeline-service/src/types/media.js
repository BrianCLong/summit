"use strict";
/**
 * Media Pipeline Core Types
 *
 * Defines the core data models for media intake and processing:
 * - MediaAsset: Raw media files (audio, video, documents, chat logs)
 * - Transcript: STT output with utterances
 * - Utterance: Individual speech segments with speaker attribution
 * - Thread: Conversation threads grouping related utterances
 * - ParticipantRef: References to communication participants
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BatchProcessingRequest = exports.TranscriptionRequest = exports.MediaAssetUpdateRequest = exports.MediaAssetCreateRequest = exports.SpacetimeEvent = exports.CommunicationEvent = exports.ProcessingJob = exports.ProcessingJobType = exports.MediaAsset = exports.ProcessingError = exports.StorageLocation = exports.MediaMetadata = exports.Transcript = exports.TranscriptFormat = exports.Thread = exports.ThreadType = exports.Utterance = exports.WordTiming = exports.ParticipantRef = exports.TimeRange = exports.GeoLocation = exports.Provenance = exports.PolicyLabels = exports.SpeakerGender = exports.ConfidenceLevel = exports.ProcessingStatus = exports.MediaFormat = exports.MediaType = void 0;
const zod_1 = require("zod");
// ============================================================================
// Enums and Constants
// ============================================================================
exports.MediaType = zod_1.z.enum([
    'audio',
    'video',
    'document',
    'chat_log',
    'email',
    'image',
]);
exports.MediaFormat = zod_1.z.enum([
    // Audio formats
    'mp3',
    'wav',
    'ogg',
    'flac',
    'm4a',
    'aac',
    'webm',
    // Video formats
    'mp4',
    'avi',
    'mov',
    'mkv',
    'wmv',
    // Document formats
    'pdf',
    'docx',
    'txt',
    'rtf',
    'html',
    'md',
    // Chat/message formats
    'json',
    'xml',
    'csv',
    // Image formats
    'png',
    'jpg',
    'jpeg',
    'gif',
    'webp',
]);
exports.ProcessingStatus = zod_1.z.enum([
    'pending',
    'queued',
    'processing',
    'transcribing',
    'diarizing',
    'segmenting',
    'completed',
    'failed',
    'cancelled',
    'retry',
]);
exports.ConfidenceLevel = zod_1.z.enum(['high', 'medium', 'low', 'unknown']);
exports.SpeakerGender = zod_1.z.enum(['male', 'female', 'unknown']);
// ============================================================================
// Policy and Metadata Types
// ============================================================================
exports.PolicyLabels = zod_1.z.object({
    sensitivity: zod_1.z
        .enum(['unclassified', 'restricted', 'confidential', 'secret', 'top_secret'])
        .optional(),
    classification: zod_1.z.string().optional(),
    clearance: zod_1.z.string().optional(),
    legalBasis: zod_1.z.string().optional(),
    needToKnow: zod_1.z.array(zod_1.z.string()).optional(),
    retentionPolicy: zod_1.z.string().optional(),
    rtbfEligible: zod_1.z.boolean().optional(),
    redactionRules: zod_1.z.array(zod_1.z.string()).optional(),
});
exports.Provenance = zod_1.z.object({
    sourceId: zod_1.z.string(),
    sourceType: zod_1.z.string(),
    ingestedAt: zod_1.z.string().datetime(),
    ingestedBy: zod_1.z.string(),
    transformChain: zod_1.z.array(zod_1.z.object({
        step: zod_1.z.string(),
        timestamp: zod_1.z.string().datetime(),
        provider: zod_1.z.string().optional(),
        version: zod_1.z.string().optional(),
        checksum: zod_1.z.string().optional(),
    })),
    originalChecksum: zod_1.z.string(),
    currentChecksum: zod_1.z.string().optional(),
});
exports.GeoLocation = zod_1.z.object({
    latitude: zod_1.z.number().min(-90).max(90),
    longitude: zod_1.z.number().min(-180).max(180),
    altitude: zod_1.z.number().optional(),
    accuracy: zod_1.z.number().optional(),
    placeName: zod_1.z.string().optional(),
    country: zod_1.z.string().optional(),
    region: zod_1.z.string().optional(),
    city: zod_1.z.string().optional(),
});
exports.TimeRange = zod_1.z.object({
    start: zod_1.z.string().datetime(),
    end: zod_1.z.string().datetime().optional(),
    timezone: zod_1.z.string().optional(),
    duration: zod_1.z.number().optional(), // milliseconds
});
// ============================================================================
// ParticipantRef - References to communication participants
// ============================================================================
exports.ParticipantRef = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    externalId: zod_1.z.string().optional(),
    entityId: zod_1.z.string().uuid().optional(), // Link to Graph Core entity
    speakerId: zod_1.z.string().optional(), // Diarization speaker ID
    displayName: zod_1.z.string().optional(),
    identifier: zod_1.z.string().optional(), // Phone number, email, username, etc.
    identifierType: zod_1.z
        .enum(['phone', 'email', 'username', 'device_id', 'ip_address', 'unknown'])
        .optional(),
    role: zod_1.z.enum(['sender', 'recipient', 'participant', 'moderator', 'unknown']).optional(),
    confidence: zod_1.z.number().min(0).max(1).optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
});
// ============================================================================
// Utterance - Individual speech/message segments
// ============================================================================
exports.WordTiming = zod_1.z.object({
    word: zod_1.z.string(),
    start: zod_1.z.number(), // milliseconds from start
    end: zod_1.z.number(),
    confidence: zod_1.z.number().min(0).max(1).optional(),
});
exports.Utterance = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    transcriptId: zod_1.z.string().uuid(),
    threadId: zod_1.z.string().uuid().optional(),
    sequenceNumber: zod_1.z.number().int().min(0),
    speaker: exports.ParticipantRef.optional(),
    speakerLabel: zod_1.z.string().optional(), // e.g., "SPEAKER_00"
    content: zod_1.z.string(),
    contentRedacted: zod_1.z.string().optional(), // Redacted version
    language: zod_1.z.string().optional(), // ISO 639-1 code
    startTime: zod_1.z.number(), // milliseconds from media start
    endTime: zod_1.z.number(),
    duration: zod_1.z.number().optional(),
    confidence: zod_1.z.number().min(0).max(1).optional(),
    wordTimings: zod_1.z.array(exports.WordTiming).optional(),
    sentiment: zod_1.z
        .object({
        score: zod_1.z.number().min(-1).max(1),
        magnitude: zod_1.z.number().min(0),
        label: zod_1.z.enum(['positive', 'negative', 'neutral', 'mixed']),
    })
        .optional(),
    entities: zod_1.z
        .array(zod_1.z.object({
        text: zod_1.z.string(),
        type: zod_1.z.string(),
        startOffset: zod_1.z.number(),
        endOffset: zod_1.z.number(),
        confidence: zod_1.z.number().min(0).max(1).optional(),
    }))
        .optional(),
    isKeyTurn: zod_1.z.boolean().optional(), // Marked as significant
    annotations: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime().optional(),
});
// ============================================================================
// Thread - Conversation threads grouping related utterances
// ============================================================================
exports.ThreadType = zod_1.z.enum([
    'conversation', // General conversation
    'topic', // Topic-based thread
    'session', // Time-based session
    'channel', // Chat channel
    'reply_chain', // Reply thread
    'meeting', // Meeting segment
    'call', // Phone/video call
]);
exports.Thread = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    transcriptId: zod_1.z.string().uuid(),
    parentThreadId: zod_1.z.string().uuid().optional(),
    type: exports.ThreadType,
    title: zod_1.z.string().optional(),
    summary: zod_1.z.string().optional(),
    participants: zod_1.z.array(exports.ParticipantRef),
    utteranceIds: zod_1.z.array(zod_1.z.string().uuid()),
    utteranceCount: zod_1.z.number().int().min(0),
    timeRange: exports.TimeRange.optional(),
    topics: zod_1.z.array(zod_1.z.string()).optional(),
    keywords: zod_1.z.array(zod_1.z.string()).optional(),
    language: zod_1.z.string().optional(),
    sentiment: zod_1.z
        .object({
        overall: zod_1.z.enum(['positive', 'negative', 'neutral', 'mixed']),
        score: zod_1.z.number().min(-1).max(1),
    })
        .optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime().optional(),
});
// ============================================================================
// Transcript - STT output containing utterances
// ============================================================================
exports.TranscriptFormat = zod_1.z.enum([
    'plain_text',
    'srt',
    'vtt',
    'json',
    'word_level',
]);
exports.Transcript = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    mediaAssetId: zod_1.z.string().uuid(),
    format: exports.TranscriptFormat,
    language: zod_1.z.string(), // ISO 639-1 primary language
    languages: zod_1.z.array(zod_1.z.string()).optional(), // All detected languages
    utterances: zod_1.z.array(exports.Utterance),
    threads: zod_1.z.array(exports.Thread).optional(),
    participants: zod_1.z.array(exports.ParticipantRef),
    speakerCount: zod_1.z.number().int().min(0),
    wordCount: zod_1.z.number().int().min(0),
    duration: zod_1.z.number(), // milliseconds
    confidence: zod_1.z.number().min(0).max(1).optional(),
    sttProvider: zod_1.z.string(),
    sttModelVersion: zod_1.z.string().optional(),
    diarizationProvider: zod_1.z.string().optional(),
    diarizationModelVersion: zod_1.z.string().optional(),
    rawContent: zod_1.z.string().optional(), // Full plain text
    rawContentRedacted: zod_1.z.string().optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
    provenance: exports.Provenance,
    policy: exports.PolicyLabels.optional(),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime().optional(),
});
// ============================================================================
// MediaAsset - Raw media files
// ============================================================================
exports.MediaMetadata = zod_1.z.object({
    filename: zod_1.z.string(),
    originalFilename: zod_1.z.string().optional(),
    mimeType: zod_1.z.string(),
    size: zod_1.z.number().int().min(0), // bytes
    duration: zod_1.z.number().optional(), // milliseconds for audio/video
    width: zod_1.z.number().int().optional(), // pixels for images/video
    height: zod_1.z.number().int().optional(),
    bitrate: zod_1.z.number().optional(),
    sampleRate: zod_1.z.number().optional(),
    channels: zod_1.z.number().int().optional(),
    codec: zod_1.z.string().optional(),
    pageCount: zod_1.z.number().int().optional(), // for documents
    wordCount: zod_1.z.number().int().optional(),
    encoding: zod_1.z.string().optional(),
    createdDate: zod_1.z.string().datetime().optional(), // File creation date
    modifiedDate: zod_1.z.string().datetime().optional(),
    author: zod_1.z.string().optional(),
    title: zod_1.z.string().optional(),
    description: zod_1.z.string().optional(),
    tags: zod_1.z.array(zod_1.z.string()).optional(),
    customMetadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
});
exports.StorageLocation = zod_1.z.object({
    provider: zod_1.z.enum(['local', 's3', 'gcs', 'azure', 'minio']),
    bucket: zod_1.z.string().optional(),
    key: zod_1.z.string(),
    region: zod_1.z.string().optional(),
    url: zod_1.z.string().url().optional(),
    isEncrypted: zod_1.z.boolean().optional(),
    encryptionKeyId: zod_1.z.string().optional(),
});
exports.ProcessingError = zod_1.z.object({
    code: zod_1.z.string(),
    message: zod_1.z.string(),
    stage: zod_1.z.string(),
    timestamp: zod_1.z.string().datetime(),
    retryable: zod_1.z.boolean(),
    details: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
});
exports.MediaAsset = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    tenantId: zod_1.z.string().optional(),
    caseId: zod_1.z.string().uuid().optional(),
    investigationId: zod_1.z.string().uuid().optional(),
    type: exports.MediaType,
    format: exports.MediaFormat,
    status: exports.ProcessingStatus,
    metadata: exports.MediaMetadata,
    storage: exports.StorageLocation,
    checksum: zod_1.z.string(), // SHA256
    transcriptId: zod_1.z.string().uuid().optional(),
    communicationEntityId: zod_1.z.string().uuid().optional(), // Link to Graph Core
    spacetimeEventId: zod_1.z.string().uuid().optional(),
    location: exports.GeoLocation.optional(),
    timeRange: exports.TimeRange.optional(),
    participants: zod_1.z.array(exports.ParticipantRef).optional(),
    sourceConnector: zod_1.z.string().optional(),
    sourceRef: zod_1.z.string().optional(), // Original source reference
    processingErrors: zod_1.z.array(exports.ProcessingError).optional(),
    retryCount: zod_1.z.number().int().min(0).default(0),
    provenance: exports.Provenance,
    policy: exports.PolicyLabels.optional(),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime().optional(),
    processedAt: zod_1.z.string().datetime().optional(),
    expiresAt: zod_1.z.string().datetime().optional(), // Retention policy
});
// ============================================================================
// Processing Job Types
// ============================================================================
exports.ProcessingJobType = zod_1.z.enum([
    'ingest',
    'validate',
    'transcode',
    'transcribe',
    'diarize',
    'segment',
    'analyze',
    'redact',
    'sync_graph',
    'sync_spacetime',
    'cleanup',
]);
exports.ProcessingJob = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    mediaAssetId: zod_1.z.string().uuid(),
    type: exports.ProcessingJobType,
    status: exports.ProcessingStatus,
    priority: zod_1.z.number().int().min(0).max(100).default(50),
    input: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
    output: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
    progress: zod_1.z.number().min(0).max(100).optional(),
    error: exports.ProcessingError.optional(),
    startedAt: zod_1.z.string().datetime().optional(),
    completedAt: zod_1.z.string().datetime().optional(),
    workerNode: zod_1.z.string().optional(),
    retryCount: zod_1.z.number().int().min(0).default(0),
    maxRetries: zod_1.z.number().int().min(0).default(3),
    timeout: zod_1.z.number().int().optional(), // milliseconds
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime().optional(),
});
// ============================================================================
// Event Types for Graph/Spacetime Integration
// ============================================================================
exports.CommunicationEvent = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    mediaAssetId: zod_1.z.string().uuid(),
    transcriptId: zod_1.z.string().uuid().optional(),
    type: zod_1.z.enum([
        'call',
        'meeting',
        'message',
        'email',
        'chat',
        'broadcast',
        'conference',
    ]),
    participants: zod_1.z.array(exports.ParticipantRef),
    timeRange: exports.TimeRange,
    location: exports.GeoLocation.optional(),
    direction: zod_1.z.enum(['inbound', 'outbound', 'bidirectional', 'unknown']).optional(),
    channel: zod_1.z.string().optional(),
    summary: zod_1.z.string().optional(),
    topics: zod_1.z.array(zod_1.z.string()).optional(),
    sentiment: zod_1.z.enum(['positive', 'negative', 'neutral', 'mixed']).optional(),
    urgency: zod_1.z.enum(['low', 'medium', 'high', 'critical']).optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
    provenance: exports.Provenance,
    policy: exports.PolicyLabels.optional(),
});
exports.SpacetimeEvent = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    mediaAssetId: zod_1.z.string().uuid(),
    communicationEventId: zod_1.z.string().uuid().optional(),
    eventType: zod_1.z.string(),
    timeRange: exports.TimeRange,
    location: exports.GeoLocation.optional(),
    participants: zod_1.z.array(zod_1.z.string().uuid()), // Entity IDs
    attributes: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
    confidence: zod_1.z.number().min(0).max(1).optional(),
    source: zod_1.z.string(),
});
// ============================================================================
// API Request/Response Types
// ============================================================================
exports.MediaAssetCreateRequest = zod_1.z.object({
    type: exports.MediaType,
    format: exports.MediaFormat.optional(),
    tenantId: zod_1.z.string().optional(),
    caseId: zod_1.z.string().uuid().optional(),
    investigationId: zod_1.z.string().uuid().optional(),
    metadata: exports.MediaMetadata.partial().optional(),
    storage: exports.StorageLocation.optional(),
    sourceConnector: zod_1.z.string().optional(),
    sourceRef: zod_1.z.string().optional(),
    policy: exports.PolicyLabels.optional(),
    processImmediately: zod_1.z.boolean().default(true),
});
exports.MediaAssetUpdateRequest = zod_1.z.object({
    status: exports.ProcessingStatus.optional(),
    metadata: exports.MediaMetadata.partial().optional(),
    policy: exports.PolicyLabels.optional(),
    transcriptId: zod_1.z.string().uuid().optional(),
    communicationEntityId: zod_1.z.string().uuid().optional(),
    spacetimeEventId: zod_1.z.string().uuid().optional(),
});
exports.TranscriptionRequest = zod_1.z.object({
    mediaAssetId: zod_1.z.string().uuid(),
    provider: zod_1.z.string().optional(),
    language: zod_1.z.string().optional(), // Hint for primary language
    enableDiarization: zod_1.z.boolean().default(true),
    enableWordTimings: zod_1.z.boolean().default(false),
    vocabularyHints: zod_1.z.array(zod_1.z.string()).optional(),
    speakerCount: zod_1.z.number().int().min(1).max(20).optional(),
    priority: zod_1.z.number().int().min(0).max(100).default(50),
});
exports.BatchProcessingRequest = zod_1.z.object({
    mediaAssetIds: zod_1.z.array(zod_1.z.string().uuid()),
    operations: zod_1.z.array(exports.ProcessingJobType),
    priority: zod_1.z.number().int().min(0).max(100).default(50),
    options: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
});
