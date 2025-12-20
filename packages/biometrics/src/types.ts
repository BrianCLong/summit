/**
 * Core Biometric Types and Interfaces
 *
 * Comprehensive type definitions for biometric data, processing,
 * and identity intelligence operations.
 */

import { z } from 'zod';

// ============================================================================
// Biometric Modalities
// ============================================================================

export enum BiometricModality {
  FACE = 'FACE',
  FINGERPRINT = 'FINGERPRINT',
  IRIS = 'IRIS',
  VOICE = 'VOICE',
  GAIT = 'GAIT',
  KEYSTROKE = 'KEYSTROKE',
  SIGNATURE = 'SIGNATURE',
  PALM_PRINT = 'PALM_PRINT',
  VEIN_PATTERN = 'VEIN_PATTERN',
  DNA = 'DNA',
  EAR_SHAPE = 'EAR_SHAPE',
  BEHAVIORAL = 'BEHAVIORAL'
}

// ============================================================================
// Quality Assessment
// ============================================================================

export const BiometricQualitySchema = z.object({
  score: z.number().min(0).max(100),
  isAcceptable: z.boolean(),
  metrics: z.object({
    resolution: z.number().optional(),
    contrast: z.number().optional(),
    sharpness: z.number().optional(),
    lighting: z.number().optional(),
    uniformity: z.number().optional(),
    interlace: z.number().optional(),
    compression: z.number().optional()
  }).optional(),
  issues: z.array(z.string()).optional(),
  timestamp: z.string().datetime()
});

export type BiometricQuality = z.infer<typeof BiometricQualitySchema>;

// ============================================================================
// Biometric Template
// ============================================================================

export const BiometricTemplateSchema = z.object({
  id: z.string().uuid(),
  modality: z.nativeEnum(BiometricModality),
  format: z.string(),
  data: z.string(), // Base64 encoded
  quality: BiometricQualitySchema,
  metadata: z.record(z.unknown()).optional(),
  captureDate: z.string().datetime(),
  expiryDate: z.string().datetime().optional(),
  source: z.string(),
  deviceId: z.string().optional(),
  position: z.string().optional(), // e.g., 'left_index', 'right_eye'
  compressed: z.boolean().default(false),
  encrypted: z.boolean().default(false)
});

export type BiometricTemplate = z.infer<typeof BiometricTemplateSchema>;

// ============================================================================
// Matching and Verification
// ============================================================================

export enum MatchType {
  VERIFICATION = 'VERIFICATION', // 1:1 matching
  IDENTIFICATION = 'IDENTIFICATION', // 1:N matching
  DEDUPLICATION = 'DEDUPLICATION' // N:N matching
}

export const MatchResultSchema = z.object({
  matchType: z.nativeEnum(MatchType),
  score: z.number().min(0).max(100),
  confidence: z.number().min(0).max(1),
  threshold: z.number(),
  isMatch: z.boolean(),
  candidateId: z.string().optional(),
  modality: z.nativeEnum(BiometricModality),
  matchDetails: z.object({
    algorithm: z.string(),
    algorithmVersion: z.string(),
    processingTime: z.number(),
    qualityImpact: z.number().optional()
  }),
  metadata: z.record(z.unknown()).optional(),
  timestamp: z.string().datetime()
});

export type MatchResult = z.infer<typeof MatchResultSchema>;

export const MatchRequestSchema = z.object({
  requestId: z.string().uuid(),
  matchType: z.nativeEnum(MatchType),
  probe: BiometricTemplateSchema,
  gallery: z.array(BiometricTemplateSchema).optional(),
  threshold: z.number().min(0).max(100).optional(),
  maxCandidates: z.number().int().positive().optional(),
  filters: z.record(z.unknown()).optional()
});

export type MatchRequest = z.infer<typeof MatchRequestSchema>;

// ============================================================================
// Liveness Detection
// ============================================================================

export enum LivenessType {
  PASSIVE = 'PASSIVE',
  ACTIVE = 'ACTIVE',
  HYBRID = 'HYBRID'
}

export enum LivenessResult {
  LIVE = 'LIVE',
  SPOOF = 'SPOOF',
  UNCERTAIN = 'UNCERTAIN'
}

export const LivenessAssessmentSchema = z.object({
  type: z.nativeEnum(LivenessType),
  result: z.nativeEnum(LivenessResult),
  confidence: z.number().min(0).max(1),
  score: z.number().min(0).max(100),
  spoofType: z.enum(['PHOTO', 'VIDEO', 'MASK', 'DEEPFAKE', 'NONE']).optional(),
  checks: z.array(z.object({
    name: z.string(),
    passed: z.boolean(),
    score: z.number().optional()
  })),
  timestamp: z.string().datetime()
});

export type LivenessAssessment = z.infer<typeof LivenessAssessmentSchema>;

// ============================================================================
// Biometric Person Record
// ============================================================================

export const BiometricPersonSchema = z.object({
  personId: z.string().uuid(),
  templates: z.array(BiometricTemplateSchema),
  metadata: z.object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    dateOfBirth: z.string().optional(),
    nationality: z.string().optional(),
    aliases: z.array(z.string()).optional(),
    notes: z.string().optional()
  }).optional(),
  enrollmentDate: z.string().datetime(),
  lastUpdate: z.string().datetime(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'WATCHLIST', 'BLOCKED']),
  riskScore: z.number().min(0).max(100).optional(),
  watchlistIds: z.array(z.string()).optional(),
  encounterHistory: z.array(z.object({
    timestamp: z.string().datetime(),
    location: z.string().optional(),
    matchScore: z.number(),
    modality: z.nativeEnum(BiometricModality)
  })).optional()
});

export type BiometricPerson = z.infer<typeof BiometricPersonSchema>;

// ============================================================================
// Search and Query
// ============================================================================

export const BiometricSearchSchema = z.object({
  searchId: z.string().uuid(),
  probe: BiometricTemplateSchema,
  modalities: z.array(z.nativeEnum(BiometricModality)).optional(),
  threshold: z.number().min(0).max(100),
  maxResults: z.number().int().positive().default(10),
  filters: z.object({
    watchlistOnly: z.boolean().optional(),
    riskScoreMin: z.number().optional(),
    status: z.array(z.enum(['ACTIVE', 'INACTIVE', 'WATCHLIST', 'BLOCKED'])).optional(),
    dateRange: z.object({
      start: z.string().datetime(),
      end: z.string().datetime()
    }).optional()
  }).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM')
});

export type BiometricSearch = z.infer<typeof BiometricSearchSchema>;

export const BiometricSearchResultSchema = z.object({
  searchId: z.string().uuid(),
  candidates: z.array(z.object({
    personId: z.string().uuid(),
    matchScore: z.number(),
    confidence: z.number(),
    template: BiometricTemplateSchema,
    person: BiometricPersonSchema.optional()
  })),
  processingTime: z.number(),
  searchParams: BiometricSearchSchema,
  timestamp: z.string().datetime()
});

export type BiometricSearchResult = z.infer<typeof BiometricSearchResultSchema>;

// ============================================================================
// Audit and Compliance
// ============================================================================

export const BiometricAuditEventSchema = z.object({
  eventId: z.string().uuid(),
  eventType: z.enum([
    'ENROLLMENT',
    'VERIFICATION',
    'IDENTIFICATION',
    'UPDATE',
    'DELETE',
    'ACCESS',
    'EXPORT',
    'CONSENT_GRANTED',
    'CONSENT_REVOKED',
    'DATA_ERASURE'
  ]),
  personId: z.string().uuid().optional(),
  userId: z.string().uuid(),
  userRole: z.string(),
  operation: z.string(),
  modalities: z.array(z.nativeEnum(BiometricModality)).optional(),
  result: z.enum(['SUCCESS', 'FAILURE', 'PARTIAL']),
  details: z.record(z.unknown()).optional(),
  ipAddress: z.string().optional(),
  location: z.string().optional(),
  timestamp: z.string().datetime(),
  retentionExpiry: z.string().datetime().optional()
});

export type BiometricAuditEvent = z.infer<typeof BiometricAuditEventSchema>;

// ============================================================================
// Privacy and Consent
// ============================================================================

export enum ConsentType {
  ENROLLMENT = 'ENROLLMENT',
  VERIFICATION = 'VERIFICATION',
  IDENTIFICATION = 'IDENTIFICATION',
  STORAGE = 'STORAGE',
  SHARING = 'SHARING',
  PROCESSING = 'PROCESSING',
  ANALYTICS = 'ANALYTICS'
}

export const ConsentRecordSchema = z.object({
  consentId: z.string().uuid(),
  personId: z.string().uuid(),
  consentType: z.nativeEnum(ConsentType),
  granted: z.boolean(),
  purpose: z.string(),
  legalBasis: z.enum(['CONSENT', 'CONTRACT', 'LEGAL_OBLIGATION', 'VITAL_INTEREST', 'PUBLIC_INTEREST', 'LEGITIMATE_INTEREST']),
  grantedDate: z.string().datetime(),
  expiryDate: z.string().datetime().optional(),
  revokedDate: z.string().datetime().optional(),
  scope: z.object({
    modalities: z.array(z.nativeEnum(BiometricModality)).optional(),
    operations: z.array(z.string()).optional(),
    retentionPeriod: z.number().optional()
  }).optional(),
  metadata: z.record(z.unknown()).optional()
});

export type ConsentRecord = z.infer<typeof ConsentRecordSchema>;

// ============================================================================
// Database Configuration
// ============================================================================

export const BiometricDatabaseConfigSchema = z.object({
  name: z.string(),
  type: z.enum(['PRIMARY', 'WATCHLIST', 'ARCHIVE', 'FEDERATED']),
  capacity: z.number().int().positive(),
  currentSize: z.number().int().nonnegative(),
  modalities: z.array(z.nativeEnum(BiometricModality)),
  deduplicationEnabled: z.boolean().default(true),
  encryptionEnabled: z.boolean().default(true),
  retentionPolicy: z.object({
    defaultRetentionDays: z.number().int().positive(),
    autoArchiveEnabled: z.boolean(),
    autoPurgeEnabled: z.boolean()
  }),
  performanceMetrics: z.object({
    avgSearchTime: z.number().optional(),
    avgEnrollmentTime: z.number().optional(),
    throughput: z.number().optional()
  }).optional()
});

export type BiometricDatabaseConfig = z.infer<typeof BiometricDatabaseConfigSchema>;

// ============================================================================
// Error Types
// ============================================================================

export class BiometricError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'BiometricError';
  }
}

export class QualityError extends BiometricError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'QUALITY_ERROR', details);
    this.name = 'QualityError';
  }
}

export class MatchError extends BiometricError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'MATCH_ERROR', details);
    this.name = 'MatchError';
  }
}

export class EnrollmentError extends BiometricError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'ENROLLMENT_ERROR', details);
    this.name = 'EnrollmentError';
  }
}

export class ConsentError extends BiometricError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CONSENT_ERROR', details);
    this.name = 'ConsentError';
  }
}
