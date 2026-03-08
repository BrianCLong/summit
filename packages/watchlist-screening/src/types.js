"use strict";
/**
 * Watchlist Screening Types
 *
 * Types for real-time watchlist matching, risk scoring, alert generation,
 * and encounter tracking.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TravelPatternSchema = exports.ScreeningAuditEventSchema = exports.ThresholdConfigSchema = exports.FalsePositiveRecordSchema = exports.RiskAssessmentSchema = exports.RiskFactorSchema = exports.EncounterHistorySchema = exports.EncounterSchema = exports.AlertSchema = exports.ScreeningResultSchema = exports.ScreeningMatchSchema = exports.ScreeningRequestSchema = exports.WatchlistEntrySchema = exports.WatchlistSchema = exports.WatchlistCategory = void 0;
const zod_1 = require("zod");
const biometrics_1 = require("@intelgraph/biometrics");
// ============================================================================
// Watchlist Definition
// ============================================================================
var WatchlistCategory;
(function (WatchlistCategory) {
    WatchlistCategory["TERRORISM"] = "TERRORISM";
    WatchlistCategory["ORGANIZED_CRIME"] = "ORGANIZED_CRIME";
    WatchlistCategory["WANTED"] = "WANTED";
    WatchlistCategory["MISSING_PERSON"] = "MISSING_PERSON";
    WatchlistCategory["PERSON_OF_INTEREST"] = "PERSON_OF_INTEREST";
    WatchlistCategory["DENIED_ENTRY"] = "DENIED_ENTRY";
    WatchlistCategory["SANCTIONS"] = "SANCTIONS";
    WatchlistCategory["PEP"] = "PEP";
    WatchlistCategory["ADVERSE_MEDIA"] = "ADVERSE_MEDIA";
    WatchlistCategory["CUSTOM"] = "CUSTOM";
})(WatchlistCategory || (exports.WatchlistCategory = WatchlistCategory = {}));
exports.WatchlistSchema = zod_1.z.object({
    watchlistId: zod_1.z.string().uuid(),
    name: zod_1.z.string(),
    description: zod_1.z.string().optional(),
    category: zod_1.z.nativeEnum(WatchlistCategory),
    priority: zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
    source: zod_1.z.object({
        name: zod_1.z.string(),
        type: zod_1.z.enum(['GOVERNMENT', 'INTERNATIONAL', 'LAW_ENFORCEMENT', 'COMMERCIAL', 'INTERNAL']),
        authority: zod_1.z.string().optional(),
        url: zod_1.z.string().optional()
    }),
    active: zod_1.z.boolean(),
    autoUpdate: zod_1.z.boolean(),
    lastUpdated: zod_1.z.string().datetime(),
    entryCount: zod_1.z.number().int().nonnegative(),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional()
});
// ============================================================================
// Watchlist Entry
// ============================================================================
exports.WatchlistEntrySchema = zod_1.z.object({
    entryId: zod_1.z.string().uuid(),
    watchlistId: zod_1.z.string().uuid(),
    personData: zod_1.z.object({
        names: zod_1.z.array(zod_1.z.object({
            fullName: zod_1.z.string(),
            firstName: zod_1.z.string().optional(),
            lastName: zod_1.z.string().optional(),
            middleName: zod_1.z.string().optional(),
            type: zod_1.z.enum(['PRIMARY', 'ALIAS', 'MAIDEN', 'NICKNAME', 'PSEUDONYM']),
            script: zod_1.z.string().optional() // Latin, Cyrillic, Arabic, etc.
        })),
        dateOfBirth: zod_1.z.array(zod_1.z.object({
            date: zod_1.z.string(),
            type: zod_1.z.enum(['EXACT', 'APPROXIMATE', 'YEAR_ONLY'])
        })).optional(),
        placeOfBirth: zod_1.z.array(zod_1.z.string()).optional(),
        nationality: zod_1.z.array(zod_1.z.string()).optional(),
        addresses: zod_1.z.array(zod_1.z.string()).optional(),
        identificationDocuments: zod_1.z.array(zod_1.z.object({
            type: zod_1.z.string(),
            number: zod_1.z.string(),
            issuingCountry: zod_1.z.string().optional()
        })).optional(),
        physicalDescription: zod_1.z.object({
            gender: zod_1.z.string().optional(),
            height: zod_1.z.number().optional(),
            weight: zod_1.z.number().optional(),
            eyeColor: zod_1.z.string().optional(),
            hairColor: zod_1.z.string().optional(),
            distinguishingMarks: zod_1.z.array(zod_1.z.string()).optional()
        }).optional()
    }),
    biometricData: zod_1.z.object({
        hasPhoto: zod_1.z.boolean(),
        hasFingerprints: zod_1.z.boolean(),
        hasIris: zod_1.z.boolean(),
        biometricIds: zod_1.z.array(zod_1.z.string()).optional()
    }).optional(),
    listingReason: zod_1.z.string(),
    offenses: zod_1.z.array(zod_1.z.string()).optional(),
    warrants: zod_1.z.array(zod_1.z.object({
        issuingAuthority: zod_1.z.string(),
        issueDate: zod_1.z.string(),
        charges: zod_1.z.array(zod_1.z.string())
    })).optional(),
    riskLevel: zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
    status: zod_1.z.enum(['ACTIVE', 'INACTIVE', 'REMOVED', 'UNDER_REVIEW']),
    addedDate: zod_1.z.string().datetime(),
    expiryDate: zod_1.z.string().datetime().optional(),
    notes: zod_1.z.string().optional(),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional()
});
// ============================================================================
// Screening Request
// ============================================================================
exports.ScreeningRequestSchema = zod_1.z.object({
    requestId: zod_1.z.string().uuid(),
    requestType: zod_1.z.enum(['ENROLLMENT', 'VERIFICATION', 'IDENTIFICATION', 'BULK', 'CONTINUOUS']),
    priority: zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
    subject: zod_1.z.object({
        identityId: zod_1.z.string().uuid().optional(),
        biographicData: zod_1.z.record(zod_1.z.unknown()).optional(),
        biometricData: zod_1.z.object({
            modality: zod_1.z.nativeEnum(biometrics_1.BiometricModality),
            templateId: zod_1.z.string().uuid()
        }).array().optional(),
        documentData: zod_1.z.record(zod_1.z.unknown()).optional()
    }),
    watchlists: zod_1.z.array(zod_1.z.string().uuid()).optional(), // Specific watchlists to screen against
    thresholds: zod_1.z.object({
        biometric: zod_1.z.number().min(0).max(100).optional(),
        biographic: zod_1.z.number().min(0).max(100).optional(),
        overall: zod_1.z.number().min(0).max(100).optional()
    }).optional(),
    options: zod_1.z.object({
        fuzzyMatching: zod_1.z.boolean().optional(),
        phoneticMatching: zod_1.z.boolean().optional(),
        transliteration: zod_1.z.boolean().optional(),
        maxResults: zod_1.z.number().int().positive().optional(),
        includeInactive: zod_1.z.boolean().optional()
    }).optional(),
    context: zod_1.z.object({
        location: zod_1.z.string().optional(),
        timestamp: zod_1.z.string().datetime(),
        operator: zod_1.z.string().optional(),
        purpose: zod_1.z.string().optional()
    })
});
// ============================================================================
// Screening Match
// ============================================================================
exports.ScreeningMatchSchema = zod_1.z.object({
    matchId: zod_1.z.string().uuid(),
    watchlistEntry: exports.WatchlistEntrySchema,
    matchScore: zod_1.z.number().min(0).max(100),
    confidence: zod_1.z.number().min(0).max(1),
    matchType: zod_1.z.enum(['BIOMETRIC', 'BIOGRAPHIC', 'DOCUMENT', 'COMBINED']),
    matchDetails: zod_1.z.object({
        biometricMatches: zod_1.z.array(zod_1.z.object({
            modality: zod_1.z.nativeEnum(biometrics_1.BiometricModality),
            score: zod_1.z.number().min(0).max(100),
            confidence: zod_1.z.number().min(0).max(1)
        })).optional(),
        biographicMatches: zod_1.z.array(zod_1.z.object({
            field: zod_1.z.string(),
            queryValue: zod_1.z.string(),
            matchValue: zod_1.z.string(),
            similarity: zod_1.z.number().min(0).max(1),
            matchType: zod_1.z.enum(['EXACT', 'FUZZY', 'PHONETIC', 'PARTIAL'])
        })).optional(),
        documentMatches: zod_1.z.array(zod_1.z.object({
            documentType: zod_1.z.string(),
            documentNumber: zod_1.z.string(),
            matchType: zod_1.z.enum(['EXACT', 'SIMILAR'])
        })).optional()
    }),
    falsePositiveLikelihood: zod_1.z.number().min(0).max(1).optional(),
    requiresManualReview: zod_1.z.boolean()
});
// ============================================================================
// Screening Result
// ============================================================================
exports.ScreeningResultSchema = zod_1.z.object({
    resultId: zod_1.z.string().uuid(),
    requestId: zod_1.z.string().uuid(),
    status: zod_1.z.enum(['NO_MATCH', 'POTENTIAL_MATCH', 'HIGH_CONFIDENCE_MATCH', 'CONFIRMED_MATCH']),
    matches: zod_1.z.array(exports.ScreeningMatchSchema),
    riskScore: zod_1.z.number().min(0).max(100),
    riskLevel: zod_1.z.enum(['NONE', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
    recommendation: zod_1.z.enum(['CLEAR', 'SECONDARY_SCREENING', 'DENY', 'MANUAL_REVIEW']),
    alerts: zod_1.z.array(zod_1.z.object({
        alertId: zod_1.z.string().uuid(),
        severity: zod_1.z.enum(['INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
        message: zod_1.z.string(),
        watchlistId: zod_1.z.string().uuid(),
        entryId: zod_1.z.string().uuid(),
        requiresAction: zod_1.z.boolean()
    })).optional(),
    processingTime: zod_1.z.number(),
    timestamp: zod_1.z.string().datetime(),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional()
});
// ============================================================================
// Alert Management
// ============================================================================
exports.AlertSchema = zod_1.z.object({
    alertId: zod_1.z.string().uuid(),
    screeningResultId: zod_1.z.string().uuid(),
    alertType: zod_1.z.enum(['WATCHLIST_HIT', 'RISK_THRESHOLD', 'POLICY_VIOLATION', 'SYSTEM_ERROR']),
    severity: zod_1.z.enum(['INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
    status: zod_1.z.enum(['NEW', 'ACKNOWLEDGED', 'INVESTIGATING', 'RESOLVED', 'FALSE_POSITIVE', 'TRUE_POSITIVE']),
    subject: zod_1.z.object({
        identityId: zod_1.z.string().uuid().optional(),
        name: zod_1.z.string().optional(),
        documentNumber: zod_1.z.string().optional()
    }),
    matchDetails: exports.ScreeningMatchSchema.optional(),
    assignedTo: zod_1.z.string().optional(),
    priority: zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
    resolvedAt: zod_1.z.string().datetime().optional(),
    resolution: zod_1.z.object({
        outcome: zod_1.z.string(),
        notes: zod_1.z.string(),
        resolvedBy: zod_1.z.string()
    }).optional(),
    escalated: zod_1.z.boolean(),
    notifications: zod_1.z.array(zod_1.z.object({
        recipient: zod_1.z.string(),
        method: zod_1.z.enum(['EMAIL', 'SMS', 'PUSH', 'SYSTEM']),
        sentAt: zod_1.z.string().datetime(),
        delivered: zod_1.z.boolean()
    })).optional(),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional()
});
// ============================================================================
// Encounter History
// ============================================================================
exports.EncounterSchema = zod_1.z.object({
    encounterId: zod_1.z.string().uuid(),
    identityId: zod_1.z.string().uuid(),
    screeningResultId: zod_1.z.string().uuid(),
    encounterType: zod_1.z.enum([
        'BORDER_CROSSING',
        'AIRPORT_SCREENING',
        'PORT_SCREENING',
        'VISA_APPLICATION',
        'BACKGROUND_CHECK',
        'LAW_ENFORCEMENT',
        'FACILITY_ACCESS',
        'OTHER'
    ]),
    location: zod_1.z.object({
        facilityId: zod_1.z.string().optional(),
        facilityName: zod_1.z.string(),
        country: zod_1.z.string(),
        coordinates: zod_1.z.object({
            latitude: zod_1.z.number(),
            longitude: zod_1.z.number()
        }).optional()
    }),
    timestamp: zod_1.z.string().datetime(),
    outcome: zod_1.z.enum(['CLEARED', 'SECONDARY_SCREENING', 'DENIED', 'DETAINED', 'REFERRED']),
    watchlistHits: zod_1.z.array(zod_1.z.object({
        watchlistId: zod_1.z.string().uuid(),
        entryId: zod_1.z.string().uuid(),
        matchScore: zod_1.z.number()
    })).optional(),
    biometricCapture: zod_1.z.object({
        modalities: zod_1.z.array(zod_1.z.nativeEnum(biometrics_1.BiometricModality)),
        quality: zod_1.z.number().min(0).max(100)
    }).optional(),
    officer: zod_1.z.object({
        id: zod_1.z.string(),
        name: zod_1.z.string().optional()
    }).optional(),
    notes: zod_1.z.string().optional(),
    relatedEncounters: zod_1.z.array(zod_1.z.string().uuid()).optional(),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional()
});
exports.EncounterHistorySchema = zod_1.z.object({
    identityId: zod_1.z.string().uuid(),
    encounters: zod_1.z.array(exports.EncounterSchema),
    summary: zod_1.z.object({
        totalEncounters: zod_1.z.number().int().nonnegative(),
        firstEncounter: zod_1.z.string().datetime().optional(),
        lastEncounter: zod_1.z.string().datetime().optional(),
        encountersByType: zod_1.z.record(zod_1.z.number()),
        encountersByLocation: zod_1.z.record(zod_1.z.number()),
        encountersByOutcome: zod_1.z.record(zod_1.z.number()),
        watchlistHitCount: zod_1.z.number().int().nonnegative()
    }),
    patterns: zod_1.z.object({
        travelFrequency: zod_1.z.string().optional(),
        commonRoutes: zod_1.z.array(zod_1.z.string()).optional(),
        seasonality: zod_1.z.record(zod_1.z.number()).optional(),
        anomalies: zod_1.z.array(zod_1.z.object({
            type: zod_1.z.string(),
            description: zod_1.z.string(),
            timestamp: zod_1.z.string().datetime()
        })).optional()
    }).optional()
});
// ============================================================================
// Risk Scoring
// ============================================================================
exports.RiskFactorSchema = zod_1.z.object({
    factor: zod_1.z.string(),
    category: zod_1.z.enum([
        'WATCHLIST',
        'BIOGRAPHICAL',
        'BEHAVIORAL',
        'TRAVEL_PATTERN',
        'ASSOCIATION',
        'DOCUMENT',
        'HISTORICAL'
    ]),
    score: zod_1.z.number().min(0).max(100),
    weight: zod_1.z.number().min(0).max(1),
    confidence: zod_1.z.number().min(0).max(1),
    evidence: zod_1.z.array(zod_1.z.string()).optional()
});
exports.RiskAssessmentSchema = zod_1.z.object({
    assessmentId: zod_1.z.string().uuid(),
    identityId: zod_1.z.string().uuid(),
    overallRiskScore: zod_1.z.number().min(0).max(100),
    riskLevel: zod_1.z.enum(['NONE', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
    riskFactors: zod_1.z.array(exports.RiskFactorSchema),
    mitigatingFactors: zod_1.z.array(zod_1.z.object({
        factor: zod_1.z.string(),
        impact: zod_1.z.number().min(-100).max(0),
        description: zod_1.z.string()
    })).optional(),
    recommendation: zod_1.z.string(),
    validUntil: zod_1.z.string().datetime().optional(),
    assessmentDate: zod_1.z.string().datetime(),
    assessedBy: zod_1.z.string().optional(),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional()
});
// ============================================================================
// False Positive Management
// ============================================================================
exports.FalsePositiveRecordSchema = zod_1.z.object({
    recordId: zod_1.z.string().uuid(),
    matchId: zod_1.z.string().uuid(),
    screeningResultId: zod_1.z.string().uuid(),
    reportedBy: zod_1.z.string(),
    reportedAt: zod_1.z.string().datetime(),
    reason: zod_1.z.string(),
    evidence: zod_1.z.array(zod_1.z.object({
        type: zod_1.z.string(),
        description: zod_1.z.string(),
        attachment: zod_1.z.string().optional()
    })).optional(),
    verified: zod_1.z.boolean(),
    verifiedBy: zod_1.z.string().optional(),
    verifiedAt: zod_1.z.string().datetime().optional(),
    action: zod_1.z.enum([
        'WHITELIST',
        'ADJUST_THRESHOLD',
        'UPDATE_WATCHLIST',
        'NO_ACTION',
        'ESCALATE'
    ]),
    actionTaken: zod_1.z.boolean(),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional()
});
// ============================================================================
// Threshold Management
// ============================================================================
exports.ThresholdConfigSchema = zod_1.z.object({
    configId: zod_1.z.string().uuid(),
    name: zod_1.z.string(),
    scope: zod_1.z.enum(['GLOBAL', 'WATCHLIST', 'LOCATION', 'CUSTOM']),
    scopeId: zod_1.z.string().optional(), // Watchlist ID, location ID, etc.
    thresholds: zod_1.z.object({
        biometric: zod_1.z.object({
            accept: zod_1.z.number().min(0).max(100),
            review: zod_1.z.number().min(0).max(100),
            reject: zod_1.z.number().min(0).max(100)
        }).optional(),
        biographic: zod_1.z.object({
            accept: zod_1.z.number().min(0).max(100),
            review: zod_1.z.number().min(0).max(100),
            reject: zod_1.z.number().min(0).max(100)
        }).optional(),
        combined: zod_1.z.object({
            accept: zod_1.z.number().min(0).max(100),
            review: zod_1.z.number().min(0).max(100),
            reject: zod_1.z.number().min(0).max(100)
        }).optional(),
        risk: zod_1.z.object({
            low: zod_1.z.number().min(0).max(100),
            medium: zod_1.z.number().min(0).max(100),
            high: zod_1.z.number().min(0).max(100)
        }).optional()
    }),
    active: zod_1.z.boolean(),
    effectiveFrom: zod_1.z.string().datetime(),
    effectiveTo: zod_1.z.string().datetime().optional(),
    createdBy: zod_1.z.string(),
    lastModified: zod_1.z.string().datetime(),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional()
});
// ============================================================================
// Audit Trail
// ============================================================================
exports.ScreeningAuditEventSchema = zod_1.z.object({
    eventId: zod_1.z.string().uuid(),
    eventType: zod_1.z.enum([
        'SCREENING_INITIATED',
        'MATCH_DETECTED',
        'ALERT_GENERATED',
        'MANUAL_REVIEW',
        'DECISION_MADE',
        'THRESHOLD_CHANGED',
        'WATCHLIST_UPDATED',
        'DATA_ACCESSED'
    ]),
    screeningResultId: zod_1.z.string().uuid().optional(),
    identityId: zod_1.z.string().uuid().optional(),
    userId: zod_1.z.string(),
    userName: zod_1.z.string().optional(),
    userRole: zod_1.z.string(),
    action: zod_1.z.string(),
    details: zod_1.z.record(zod_1.z.unknown()),
    outcome: zod_1.z.string().optional(),
    ipAddress: zod_1.z.string().optional(),
    location: zod_1.z.string().optional(),
    timestamp: zod_1.z.string().datetime(),
    retentionExpiry: zod_1.z.string().datetime().optional()
});
// ============================================================================
// Travel Pattern Analysis
// ============================================================================
exports.TravelPatternSchema = zod_1.z.object({
    patternId: zod_1.z.string().uuid(),
    identityId: zod_1.z.string().uuid(),
    movements: zod_1.z.array(zod_1.z.object({
        from: zod_1.z.object({
            country: zod_1.z.string(),
            location: zod_1.z.string().optional()
        }),
        to: zod_1.z.object({
            country: zod_1.z.string(),
            location: zod_1.z.string().optional()
        }),
        date: zod_1.z.string().datetime(),
        purpose: zod_1.z.string().optional(),
        duration: zod_1.z.number().optional() // days
    })),
    analysis: zod_1.z.object({
        frequentDestinations: zod_1.z.array(zod_1.z.object({
            country: zod_1.z.string(),
            count: zod_1.z.number().int(),
            lastVisit: zod_1.z.string().datetime()
        })),
        travelFrequency: zod_1.z.object({
            averageTripsPerYear: zod_1.z.number(),
            lastTripDate: zod_1.z.string().datetime().optional()
        }),
        unusualPatterns: zod_1.z.array(zod_1.z.object({
            type: zod_1.z.enum(['FREQUENCY', 'DESTINATION', 'TIMING', 'ROUTE']),
            description: zod_1.z.string(),
            significance: zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH'])
        })).optional(),
        riskIndicators: zod_1.z.array(zod_1.z.string()).optional()
    }),
    metadata: zod_1.z.object({
        lastUpdated: zod_1.z.string().datetime(),
        dataCompleteness: zod_1.z.number().min(0).max(1)
    })
});
