"use strict";
/**
 * Core Biometric Types and Interfaces
 *
 * Comprehensive type definitions for biometric data, processing,
 * and identity intelligence operations.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsentError = exports.EnrollmentError = exports.MatchError = exports.QualityError = exports.BiometricError = exports.BiometricDatabaseConfigSchema = exports.ConsentRecordSchema = exports.ConsentType = exports.BiometricAuditEventSchema = exports.BiometricSearchResultSchema = exports.BiometricSearchSchema = exports.BiometricPersonSchema = exports.LivenessAssessmentSchema = exports.LivenessResult = exports.LivenessType = exports.MatchRequestSchema = exports.MatchResultSchema = exports.MatchType = exports.BiometricTemplateSchema = exports.BiometricQualitySchema = exports.BiometricModality = void 0;
const zod_1 = require("zod");
// ============================================================================
// Biometric Modalities
// ============================================================================
var BiometricModality;
(function (BiometricModality) {
    BiometricModality["FACE"] = "FACE";
    BiometricModality["FINGERPRINT"] = "FINGERPRINT";
    BiometricModality["IRIS"] = "IRIS";
    BiometricModality["VOICE"] = "VOICE";
    BiometricModality["GAIT"] = "GAIT";
    BiometricModality["KEYSTROKE"] = "KEYSTROKE";
    BiometricModality["SIGNATURE"] = "SIGNATURE";
    BiometricModality["PALM_PRINT"] = "PALM_PRINT";
    BiometricModality["VEIN_PATTERN"] = "VEIN_PATTERN";
    BiometricModality["DNA"] = "DNA";
    BiometricModality["EAR_SHAPE"] = "EAR_SHAPE";
    BiometricModality["BEHAVIORAL"] = "BEHAVIORAL";
})(BiometricModality || (exports.BiometricModality = BiometricModality = {}));
// ============================================================================
// Quality Assessment
// ============================================================================
exports.BiometricQualitySchema = zod_1.z.object({
    score: zod_1.z.number().min(0).max(100),
    isAcceptable: zod_1.z.boolean(),
    metrics: zod_1.z.object({
        resolution: zod_1.z.number().optional(),
        contrast: zod_1.z.number().optional(),
        sharpness: zod_1.z.number().optional(),
        lighting: zod_1.z.number().optional(),
        uniformity: zod_1.z.number().optional(),
        interlace: zod_1.z.number().optional(),
        compression: zod_1.z.number().optional()
    }).optional(),
    issues: zod_1.z.array(zod_1.z.string()).optional(),
    timestamp: zod_1.z.string().datetime()
});
// ============================================================================
// Biometric Template
// ============================================================================
exports.BiometricTemplateSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    modality: zod_1.z.nativeEnum(BiometricModality),
    format: zod_1.z.string(),
    data: zod_1.z.string(), // Base64 encoded
    quality: exports.BiometricQualitySchema,
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
    captureDate: zod_1.z.string().datetime(),
    expiryDate: zod_1.z.string().datetime().optional(),
    source: zod_1.z.string(),
    deviceId: zod_1.z.string().optional(),
    position: zod_1.z.string().optional(), // e.g., 'left_index', 'right_eye'
    compressed: zod_1.z.boolean().default(false),
    encrypted: zod_1.z.boolean().default(false)
});
// ============================================================================
// Matching and Verification
// ============================================================================
var MatchType;
(function (MatchType) {
    MatchType["VERIFICATION"] = "VERIFICATION";
    MatchType["IDENTIFICATION"] = "IDENTIFICATION";
    MatchType["DEDUPLICATION"] = "DEDUPLICATION"; // N:N matching
})(MatchType || (exports.MatchType = MatchType = {}));
exports.MatchResultSchema = zod_1.z.object({
    matchType: zod_1.z.nativeEnum(MatchType),
    score: zod_1.z.number().min(0).max(100),
    confidence: zod_1.z.number().min(0).max(1),
    threshold: zod_1.z.number(),
    isMatch: zod_1.z.boolean(),
    candidateId: zod_1.z.string().optional(),
    modality: zod_1.z.nativeEnum(BiometricModality),
    matchDetails: zod_1.z.object({
        algorithm: zod_1.z.string(),
        algorithmVersion: zod_1.z.string(),
        processingTime: zod_1.z.number(),
        qualityImpact: zod_1.z.number().optional()
    }),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
    timestamp: zod_1.z.string().datetime()
});
exports.MatchRequestSchema = zod_1.z.object({
    requestId: zod_1.z.string().uuid(),
    matchType: zod_1.z.nativeEnum(MatchType),
    probe: exports.BiometricTemplateSchema,
    gallery: zod_1.z.array(exports.BiometricTemplateSchema).optional(),
    threshold: zod_1.z.number().min(0).max(100).optional(),
    maxCandidates: zod_1.z.number().int().positive().optional(),
    filters: zod_1.z.record(zod_1.z.unknown()).optional()
});
// ============================================================================
// Liveness Detection
// ============================================================================
var LivenessType;
(function (LivenessType) {
    LivenessType["PASSIVE"] = "PASSIVE";
    LivenessType["ACTIVE"] = "ACTIVE";
    LivenessType["HYBRID"] = "HYBRID";
})(LivenessType || (exports.LivenessType = LivenessType = {}));
var LivenessResult;
(function (LivenessResult) {
    LivenessResult["LIVE"] = "LIVE";
    LivenessResult["SPOOF"] = "SPOOF";
    LivenessResult["UNCERTAIN"] = "UNCERTAIN";
})(LivenessResult || (exports.LivenessResult = LivenessResult = {}));
exports.LivenessAssessmentSchema = zod_1.z.object({
    type: zod_1.z.nativeEnum(LivenessType),
    result: zod_1.z.nativeEnum(LivenessResult),
    confidence: zod_1.z.number().min(0).max(1),
    score: zod_1.z.number().min(0).max(100),
    spoofType: zod_1.z.enum(['PHOTO', 'VIDEO', 'MASK', 'DEEPFAKE', 'NONE']).optional(),
    checks: zod_1.z.array(zod_1.z.object({
        name: zod_1.z.string(),
        passed: zod_1.z.boolean(),
        score: zod_1.z.number().optional()
    })),
    timestamp: zod_1.z.string().datetime()
});
// ============================================================================
// Biometric Person Record
// ============================================================================
exports.BiometricPersonSchema = zod_1.z.object({
    personId: zod_1.z.string().uuid(),
    templates: zod_1.z.array(exports.BiometricTemplateSchema),
    metadata: zod_1.z.object({
        firstName: zod_1.z.string().optional(),
        lastName: zod_1.z.string().optional(),
        dateOfBirth: zod_1.z.string().optional(),
        nationality: zod_1.z.string().optional(),
        aliases: zod_1.z.array(zod_1.z.string()).optional(),
        notes: zod_1.z.string().optional()
    }).optional(),
    enrollmentDate: zod_1.z.string().datetime(),
    lastUpdate: zod_1.z.string().datetime(),
    status: zod_1.z.enum(['ACTIVE', 'INACTIVE', 'WATCHLIST', 'BLOCKED']),
    riskScore: zod_1.z.number().min(0).max(100).optional(),
    watchlistIds: zod_1.z.array(zod_1.z.string()).optional(),
    encounterHistory: zod_1.z.array(zod_1.z.object({
        timestamp: zod_1.z.string().datetime(),
        location: zod_1.z.string().optional(),
        matchScore: zod_1.z.number(),
        modality: zod_1.z.nativeEnum(BiometricModality)
    })).optional()
});
// ============================================================================
// Search and Query
// ============================================================================
exports.BiometricSearchSchema = zod_1.z.object({
    searchId: zod_1.z.string().uuid(),
    probe: exports.BiometricTemplateSchema,
    modalities: zod_1.z.array(zod_1.z.nativeEnum(BiometricModality)).optional(),
    threshold: zod_1.z.number().min(0).max(100),
    maxResults: zod_1.z.number().int().positive().default(10),
    filters: zod_1.z.object({
        watchlistOnly: zod_1.z.boolean().optional(),
        riskScoreMin: zod_1.z.number().optional(),
        status: zod_1.z.array(zod_1.z.enum(['ACTIVE', 'INACTIVE', 'WATCHLIST', 'BLOCKED'])).optional(),
        dateRange: zod_1.z.object({
            start: zod_1.z.string().datetime(),
            end: zod_1.z.string().datetime()
        }).optional()
    }).optional(),
    priority: zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM')
});
exports.BiometricSearchResultSchema = zod_1.z.object({
    searchId: zod_1.z.string().uuid(),
    candidates: zod_1.z.array(zod_1.z.object({
        personId: zod_1.z.string().uuid(),
        matchScore: zod_1.z.number(),
        confidence: zod_1.z.number(),
        template: exports.BiometricTemplateSchema,
        person: exports.BiometricPersonSchema.optional()
    })),
    processingTime: zod_1.z.number(),
    searchParams: exports.BiometricSearchSchema,
    timestamp: zod_1.z.string().datetime()
});
// ============================================================================
// Audit and Compliance
// ============================================================================
exports.BiometricAuditEventSchema = zod_1.z.object({
    eventId: zod_1.z.string().uuid(),
    eventType: zod_1.z.enum([
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
    personId: zod_1.z.string().uuid().optional(),
    userId: zod_1.z.string().uuid(),
    userRole: zod_1.z.string(),
    operation: zod_1.z.string(),
    modalities: zod_1.z.array(zod_1.z.nativeEnum(BiometricModality)).optional(),
    result: zod_1.z.enum(['SUCCESS', 'FAILURE', 'PARTIAL']),
    details: zod_1.z.record(zod_1.z.unknown()).optional(),
    ipAddress: zod_1.z.string().optional(),
    location: zod_1.z.string().optional(),
    timestamp: zod_1.z.string().datetime(),
    retentionExpiry: zod_1.z.string().datetime().optional()
});
// ============================================================================
// Privacy and Consent
// ============================================================================
var ConsentType;
(function (ConsentType) {
    ConsentType["ENROLLMENT"] = "ENROLLMENT";
    ConsentType["VERIFICATION"] = "VERIFICATION";
    ConsentType["IDENTIFICATION"] = "IDENTIFICATION";
    ConsentType["STORAGE"] = "STORAGE";
    ConsentType["SHARING"] = "SHARING";
    ConsentType["PROCESSING"] = "PROCESSING";
    ConsentType["ANALYTICS"] = "ANALYTICS";
})(ConsentType || (exports.ConsentType = ConsentType = {}));
exports.ConsentRecordSchema = zod_1.z.object({
    consentId: zod_1.z.string().uuid(),
    personId: zod_1.z.string().uuid(),
    consentType: zod_1.z.nativeEnum(ConsentType),
    granted: zod_1.z.boolean(),
    purpose: zod_1.z.string(),
    legalBasis: zod_1.z.enum(['CONSENT', 'CONTRACT', 'LEGAL_OBLIGATION', 'VITAL_INTEREST', 'PUBLIC_INTEREST', 'LEGITIMATE_INTEREST']),
    grantedDate: zod_1.z.string().datetime(),
    expiryDate: zod_1.z.string().datetime().optional(),
    revokedDate: zod_1.z.string().datetime().optional(),
    scope: zod_1.z.object({
        modalities: zod_1.z.array(zod_1.z.nativeEnum(BiometricModality)).optional(),
        operations: zod_1.z.array(zod_1.z.string()).optional(),
        retentionPeriod: zod_1.z.number().optional()
    }).optional(),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional()
});
// ============================================================================
// Database Configuration
// ============================================================================
exports.BiometricDatabaseConfigSchema = zod_1.z.object({
    name: zod_1.z.string(),
    type: zod_1.z.enum(['PRIMARY', 'WATCHLIST', 'ARCHIVE', 'FEDERATED']),
    capacity: zod_1.z.number().int().positive(),
    currentSize: zod_1.z.number().int().nonnegative(),
    modalities: zod_1.z.array(zod_1.z.nativeEnum(BiometricModality)),
    deduplicationEnabled: zod_1.z.boolean().default(true),
    encryptionEnabled: zod_1.z.boolean().default(true),
    retentionPolicy: zod_1.z.object({
        defaultRetentionDays: zod_1.z.number().int().positive(),
        autoArchiveEnabled: zod_1.z.boolean(),
        autoPurgeEnabled: zod_1.z.boolean()
    }),
    performanceMetrics: zod_1.z.object({
        avgSearchTime: zod_1.z.number().optional(),
        avgEnrollmentTime: zod_1.z.number().optional(),
        throughput: zod_1.z.number().optional()
    }).optional()
});
// ============================================================================
// Error Types
// ============================================================================
class BiometricError extends Error {
    code;
    details;
    constructor(message, code, details) {
        super(message);
        this.code = code;
        this.details = details;
        this.name = 'BiometricError';
    }
}
exports.BiometricError = BiometricError;
class QualityError extends BiometricError {
    constructor(message, details) {
        super(message, 'QUALITY_ERROR', details);
        this.name = 'QualityError';
    }
}
exports.QualityError = QualityError;
class MatchError extends BiometricError {
    constructor(message, details) {
        super(message, 'MATCH_ERROR', details);
        this.name = 'MatchError';
    }
}
exports.MatchError = MatchError;
class EnrollmentError extends BiometricError {
    constructor(message, details) {
        super(message, 'ENROLLMENT_ERROR', details);
        this.name = 'EnrollmentError';
    }
}
exports.EnrollmentError = EnrollmentError;
class ConsentError extends BiometricError {
    constructor(message, details) {
        super(message, 'CONSENT_ERROR', details);
        this.name = 'ConsentError';
    }
}
exports.ConsentError = ConsentError;
