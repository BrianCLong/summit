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

import { z } from 'zod';

// ============================================================================
// Enums and Constants
// ============================================================================

export const MediaType = z.enum([
  'audio',
  'video',
  'document',
  'chat_log',
  'email',
  'image',
]);
export type MediaType = z.infer<typeof MediaType>;

export const MediaFormat = z.enum([
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
export type MediaFormat = z.infer<typeof MediaFormat>;

export const ProcessingStatus = z.enum([
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
export type ProcessingStatus = z.infer<typeof ProcessingStatus>;

export const ConfidenceLevel = z.enum(['high', 'medium', 'low', 'unknown']);
export type ConfidenceLevel = z.infer<typeof ConfidenceLevel>;

export const SpeakerGender = z.enum(['male', 'female', 'unknown']);
export type SpeakerGender = z.infer<typeof SpeakerGender>;

// ============================================================================
// Policy and Metadata Types
// ============================================================================

export const PolicyLabels = z.object({
  sensitivity: z
    .enum(['unclassified', 'restricted', 'confidential', 'secret', 'top_secret'])
    .optional(),
  classification: z.string().optional(),
  clearance: z.string().optional(),
  legalBasis: z.string().optional(),
  needToKnow: z.array(z.string()).optional(),
  retentionPolicy: z.string().optional(),
  rtbfEligible: z.boolean().optional(),
  redactionRules: z.array(z.string()).optional(),
});
export type PolicyLabels = z.infer<typeof PolicyLabels>;

export const Provenance = z.object({
  sourceId: z.string(),
  sourceType: z.string(),
  ingestedAt: z.string().datetime(),
  ingestedBy: z.string(),
  transformChain: z.array(
    z.object({
      step: z.string(),
      timestamp: z.string().datetime(),
      provider: z.string().optional(),
      version: z.string().optional(),
      checksum: z.string().optional(),
    })
  ),
  originalChecksum: z.string(),
  currentChecksum: z.string().optional(),
});
export type Provenance = z.infer<typeof Provenance>;

export const GeoLocation = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  altitude: z.number().optional(),
  accuracy: z.number().optional(),
  placeName: z.string().optional(),
  country: z.string().optional(),
  region: z.string().optional(),
  city: z.string().optional(),
});
export type GeoLocation = z.infer<typeof GeoLocation>;

export const TimeRange = z.object({
  start: z.string().datetime(),
  end: z.string().datetime().optional(),
  timezone: z.string().optional(),
  duration: z.number().optional(), // milliseconds
});
export type TimeRange = z.infer<typeof TimeRange>;

// ============================================================================
// ParticipantRef - References to communication participants
// ============================================================================

export const ParticipantRef = z.object({
  id: z.string().uuid(),
  externalId: z.string().optional(),
  entityId: z.string().uuid().optional(), // Link to Graph Core entity
  speakerId: z.string().optional(), // Diarization speaker ID
  displayName: z.string().optional(),
  identifier: z.string().optional(), // Phone number, email, username, etc.
  identifierType: z
    .enum(['phone', 'email', 'username', 'device_id', 'ip_address', 'unknown'])
    .optional(),
  role: z.enum(['sender', 'recipient', 'participant', 'moderator', 'unknown']).optional(),
  confidence: z.number().min(0).max(1).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type ParticipantRef = z.infer<typeof ParticipantRef>;

// ============================================================================
// Utterance - Individual speech/message segments
// ============================================================================

export const WordTiming = z.object({
  word: z.string(),
  start: z.number(), // milliseconds from start
  end: z.number(),
  confidence: z.number().min(0).max(1).optional(),
});
export type WordTiming = z.infer<typeof WordTiming>;

export const Utterance = z.object({
  id: z.string().uuid(),
  transcriptId: z.string().uuid(),
  threadId: z.string().uuid().optional(),
  sequenceNumber: z.number().int().min(0),
  speaker: ParticipantRef.optional(),
  speakerLabel: z.string().optional(), // e.g., "SPEAKER_00"
  content: z.string(),
  contentRedacted: z.string().optional(), // Redacted version
  language: z.string().optional(), // ISO 639-1 code
  startTime: z.number(), // milliseconds from media start
  endTime: z.number(),
  duration: z.number().optional(),
  confidence: z.number().min(0).max(1).optional(),
  wordTimings: z.array(WordTiming).optional(),
  sentiment: z
    .object({
      score: z.number().min(-1).max(1),
      magnitude: z.number().min(0),
      label: z.enum(['positive', 'negative', 'neutral', 'mixed']),
    })
    .optional(),
  entities: z
    .array(
      z.object({
        text: z.string(),
        type: z.string(),
        startOffset: z.number(),
        endOffset: z.number(),
        confidence: z.number().min(0).max(1).optional(),
      })
    )
    .optional(),
  isKeyTurn: z.boolean().optional(), // Marked as significant
  annotations: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime().optional(),
});
export type Utterance = z.infer<typeof Utterance>;

// ============================================================================
// Thread - Conversation threads grouping related utterances
// ============================================================================

export const ThreadType = z.enum([
  'conversation', // General conversation
  'topic', // Topic-based thread
  'session', // Time-based session
  'channel', // Chat channel
  'reply_chain', // Reply thread
  'meeting', // Meeting segment
  'call', // Phone/video call
]);
export type ThreadType = z.infer<typeof ThreadType>;

export const Thread = z.object({
  id: z.string().uuid(),
  transcriptId: z.string().uuid(),
  parentThreadId: z.string().uuid().optional(),
  type: ThreadType,
  title: z.string().optional(),
  summary: z.string().optional(),
  participants: z.array(ParticipantRef),
  utteranceIds: z.array(z.string().uuid()),
  utteranceCount: z.number().int().min(0),
  timeRange: TimeRange.optional(),
  topics: z.array(z.string()).optional(),
  keywords: z.array(z.string()).optional(),
  language: z.string().optional(),
  sentiment: z
    .object({
      overall: z.enum(['positive', 'negative', 'neutral', 'mixed']),
      score: z.number().min(-1).max(1),
    })
    .optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime().optional(),
});
export type Thread = z.infer<typeof Thread>;

// ============================================================================
// Transcript - STT output containing utterances
// ============================================================================

export const TranscriptFormat = z.enum([
  'plain_text',
  'srt',
  'vtt',
  'json',
  'word_level',
]);
export type TranscriptFormat = z.infer<typeof TranscriptFormat>;

export const Transcript = z.object({
  id: z.string().uuid(),
  mediaAssetId: z.string().uuid(),
  format: TranscriptFormat,
  language: z.string(), // ISO 639-1 primary language
  languages: z.array(z.string()).optional(), // All detected languages
  utterances: z.array(Utterance),
  threads: z.array(Thread).optional(),
  participants: z.array(ParticipantRef),
  speakerCount: z.number().int().min(0),
  wordCount: z.number().int().min(0),
  duration: z.number(), // milliseconds
  confidence: z.number().min(0).max(1).optional(),
  sttProvider: z.string(),
  sttModelVersion: z.string().optional(),
  diarizationProvider: z.string().optional(),
  diarizationModelVersion: z.string().optional(),
  rawContent: z.string().optional(), // Full plain text
  rawContentRedacted: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  provenance: Provenance,
  policy: PolicyLabels.optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime().optional(),
});
export type Transcript = z.infer<typeof Transcript>;

// ============================================================================
// MediaAsset - Raw media files
// ============================================================================

export const MediaMetadata = z.object({
  filename: z.string(),
  originalFilename: z.string().optional(),
  mimeType: z.string(),
  size: z.number().int().min(0), // bytes
  duration: z.number().optional(), // milliseconds for audio/video
  width: z.number().int().optional(), // pixels for images/video
  height: z.number().int().optional(),
  bitrate: z.number().optional(),
  sampleRate: z.number().optional(),
  channels: z.number().int().optional(),
  codec: z.string().optional(),
  pageCount: z.number().int().optional(), // for documents
  wordCount: z.number().int().optional(),
  encoding: z.string().optional(),
  createdDate: z.string().datetime().optional(), // File creation date
  modifiedDate: z.string().datetime().optional(),
  author: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  customMetadata: z.record(z.string(), z.unknown()).optional(),
});
export type MediaMetadata = z.infer<typeof MediaMetadata>;

export const StorageLocation = z.object({
  provider: z.enum(['local', 's3', 'gcs', 'azure', 'minio']),
  bucket: z.string().optional(),
  key: z.string(),
  region: z.string().optional(),
  url: z.string().url().optional(),
  isEncrypted: z.boolean().optional(),
  encryptionKeyId: z.string().optional(),
});
export type StorageLocation = z.infer<typeof StorageLocation>;

export const ProcessingError = z.object({
  code: z.string(),
  message: z.string(),
  stage: z.string(),
  timestamp: z.string().datetime(),
  retryable: z.boolean(),
  details: z.record(z.string(), z.unknown()).optional(),
});
export type ProcessingError = z.infer<typeof ProcessingError>;

export const MediaAsset = z.object({
  id: z.string().uuid(),
  tenantId: z.string().optional(),
  caseId: z.string().uuid().optional(),
  investigationId: z.string().uuid().optional(),
  type: MediaType,
  format: MediaFormat,
  status: ProcessingStatus,
  metadata: MediaMetadata,
  storage: StorageLocation,
  checksum: z.string(), // SHA256
  transcriptId: z.string().uuid().optional(),
  communicationEntityId: z.string().uuid().optional(), // Link to Graph Core
  spacetimeEventId: z.string().uuid().optional(),
  location: GeoLocation.optional(),
  timeRange: TimeRange.optional(),
  participants: z.array(ParticipantRef).optional(),
  sourceConnector: z.string().optional(),
  sourceRef: z.string().optional(), // Original source reference
  processingErrors: z.array(ProcessingError).optional(),
  retryCount: z.number().int().min(0).default(0),
  provenance: Provenance,
  policy: PolicyLabels.optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime().optional(),
  processedAt: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional(), // Retention policy
});
export type MediaAsset = z.infer<typeof MediaAsset>;

// ============================================================================
// Processing Job Types
// ============================================================================

export const ProcessingJobType = z.enum([
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
export type ProcessingJobType = z.infer<typeof ProcessingJobType>;

export const ProcessingJob = z.object({
  id: z.string().uuid(),
  mediaAssetId: z.string().uuid(),
  type: ProcessingJobType,
  status: ProcessingStatus,
  priority: z.number().int().min(0).max(100).default(50),
  input: z.record(z.string(), z.unknown()).optional(),
  output: z.record(z.string(), z.unknown()).optional(),
  progress: z.number().min(0).max(100).optional(),
  error: ProcessingError.optional(),
  startedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
  workerNode: z.string().optional(),
  retryCount: z.number().int().min(0).default(0),
  maxRetries: z.number().int().min(0).default(3),
  timeout: z.number().int().optional(), // milliseconds
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime().optional(),
});
export type ProcessingJob = z.infer<typeof ProcessingJob>;

// ============================================================================
// Event Types for Graph/Spacetime Integration
// ============================================================================

export const CommunicationEvent = z.object({
  id: z.string().uuid(),
  mediaAssetId: z.string().uuid(),
  transcriptId: z.string().uuid().optional(),
  type: z.enum([
    'call',
    'meeting',
    'message',
    'email',
    'chat',
    'broadcast',
    'conference',
  ]),
  participants: z.array(ParticipantRef),
  timeRange: TimeRange,
  location: GeoLocation.optional(),
  direction: z.enum(['inbound', 'outbound', 'bidirectional', 'unknown']).optional(),
  channel: z.string().optional(),
  summary: z.string().optional(),
  topics: z.array(z.string()).optional(),
  sentiment: z.enum(['positive', 'negative', 'neutral', 'mixed']).optional(),
  urgency: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  provenance: Provenance,
  policy: PolicyLabels.optional(),
});
export type CommunicationEvent = z.infer<typeof CommunicationEvent>;

export const SpacetimeEvent = z.object({
  id: z.string().uuid(),
  mediaAssetId: z.string().uuid(),
  communicationEventId: z.string().uuid().optional(),
  eventType: z.string(),
  timeRange: TimeRange,
  location: GeoLocation.optional(),
  participants: z.array(z.string().uuid()), // Entity IDs
  attributes: z.record(z.string(), z.unknown()).optional(),
  confidence: z.number().min(0).max(1).optional(),
  source: z.string(),
});
export type SpacetimeEvent = z.infer<typeof SpacetimeEvent>;

// ============================================================================
// API Request/Response Types
// ============================================================================

export const MediaAssetCreateRequest = z.object({
  type: MediaType,
  format: MediaFormat.optional(),
  tenantId: z.string().optional(),
  caseId: z.string().uuid().optional(),
  investigationId: z.string().uuid().optional(),
  metadata: MediaMetadata.partial().optional(),
  storage: StorageLocation.optional(),
  sourceConnector: z.string().optional(),
  sourceRef: z.string().optional(),
  policy: PolicyLabels.optional(),
  processImmediately: z.boolean().default(true),
});
export type MediaAssetCreateRequest = z.infer<typeof MediaAssetCreateRequest>;

export const MediaAssetUpdateRequest = z.object({
  status: ProcessingStatus.optional(),
  metadata: MediaMetadata.partial().optional(),
  policy: PolicyLabels.optional(),
  transcriptId: z.string().uuid().optional(),
  communicationEntityId: z.string().uuid().optional(),
  spacetimeEventId: z.string().uuid().optional(),
});
export type MediaAssetUpdateRequest = z.infer<typeof MediaAssetUpdateRequest>;

export const TranscriptionRequest = z.object({
  mediaAssetId: z.string().uuid(),
  provider: z.string().optional(),
  language: z.string().optional(), // Hint for primary language
  enableDiarization: z.boolean().default(true),
  enableWordTimings: z.boolean().default(false),
  vocabularyHints: z.array(z.string()).optional(),
  speakerCount: z.number().int().min(1).max(20).optional(),
  priority: z.number().int().min(0).max(100).default(50),
});
export type TranscriptionRequest = z.infer<typeof TranscriptionRequest>;

export const BatchProcessingRequest = z.object({
  mediaAssetIds: z.array(z.string().uuid()),
  operations: z.array(ProcessingJobType),
  priority: z.number().int().min(0).max(100).default(50),
  options: z.record(z.string(), z.unknown()).optional(),
});
export type BatchProcessingRequest = z.infer<typeof BatchProcessingRequest>;
