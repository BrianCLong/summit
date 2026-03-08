"use strict";
/**
 * Identity Resolution Types
 *
 * Types for cross-source identity matching, multi-modal fusion,
 * entity disambiguation, and identity intelligence.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfidenceScoreSchema = exports.ConfidenceFactorsSchema = exports.AttributionRecordSchema = exports.IdentityGraphSchema = exports.IdentityEdgeSchema = exports.IdentityNodeSchema = exports.ProfileLinkageSchema = exports.SocialMediaProfileSchema = exports.DocumentPersonMatchSchema = exports.DisambiguationResultSchema = exports.DisambiguationCriteriaSchema = exports.IdentityClusterSchema = exports.AliasRelationshipSchema = exports.CrossSourceMatchSchema = exports.SourceRecordSchema = exports.FusionResultSchema = exports.ModalityWeightSchema = exports.FusionStrategySchema = exports.IdentityRecordSchema = void 0;
const zod_1 = require("zod");
const biometrics_1 = require("@intelgraph/biometrics");
// ============================================================================
// Identity Record
// ============================================================================
exports.IdentityRecordSchema = zod_1.z.object({
    identityId: zod_1.z.string().uuid(),
    type: zod_1.z.enum(['PERSON', 'ALIAS', 'PSEUDONYM', 'SYNTHETIC']),
    biographicData: zod_1.z.object({
        fullName: zod_1.z.string().optional(),
        firstName: zod_1.z.string().optional(),
        middleName: zod_1.z.string().optional(),
        lastName: zod_1.z.string().optional(),
        aliases: zod_1.z.array(zod_1.z.string()).optional(),
        dateOfBirth: zod_1.z.string().optional(),
        placeOfBirth: zod_1.z.string().optional(),
        nationality: zod_1.z.array(zod_1.z.string()).optional(),
        gender: zod_1.z.string().optional(),
        height: zod_1.z.number().optional(),
        weight: zod_1.z.number().optional(),
        eyeColor: zod_1.z.string().optional(),
        hairColor: zod_1.z.string().optional(),
        distinguishingMarks: zod_1.z.array(zod_1.z.string()).optional()
    }).optional(),
    biometricData: zod_1.z.object({
        modalities: zod_1.z.array(zod_1.z.nativeEnum(biometrics_1.BiometricModality)),
        templateIds: zod_1.z.array(zod_1.z.string().uuid()),
        qualityScore: zod_1.z.number().min(0).max(100).optional()
    }).optional(),
    documentData: zod_1.z.object({
        passports: zod_1.z.array(zod_1.z.string()).optional(),
        nationalIds: zod_1.z.array(zod_1.z.string()).optional(),
        driverLicenses: zod_1.z.array(zod_1.z.string()).optional(),
        visas: zod_1.z.array(zod_1.z.string()).optional()
    }).optional(),
    digitalData: zod_1.z.object({
        emails: zod_1.z.array(zod_1.z.string()).optional(),
        phones: zod_1.z.array(zod_1.z.string()).optional(),
        socialMediaProfiles: zod_1.z.array(zod_1.z.object({
            platform: zod_1.z.string(),
            username: zod_1.z.string(),
            url: zod_1.z.string().optional(),
            verified: zod_1.z.boolean().optional()
        })).optional(),
        ipAddresses: zod_1.z.array(zod_1.z.string()).optional(),
        deviceIds: zod_1.z.array(zod_1.z.string()).optional()
    }).optional(),
    locationData: zod_1.z.object({
        addresses: zod_1.z.array(zod_1.z.object({
            type: zod_1.z.enum(['HOME', 'WORK', 'TEMPORARY', 'UNKNOWN']),
            address: zod_1.z.string(),
            city: zod_1.z.string().optional(),
            state: zod_1.z.string().optional(),
            country: zod_1.z.string(),
            postalCode: zod_1.z.string().optional(),
            coordinates: zod_1.z.object({
                latitude: zod_1.z.number(),
                longitude: zod_1.z.number()
            }).optional()
        })).optional(),
        knownLocations: zod_1.z.array(zod_1.z.string()).optional()
    }).optional(),
    metadata: zod_1.z.object({
        sources: zod_1.z.array(zod_1.z.string()),
        confidence: zod_1.z.number().min(0).max(1),
        createdDate: zod_1.z.string().datetime(),
        lastUpdated: zod_1.z.string().datetime(),
        verificationStatus: zod_1.z.enum(['VERIFIED', 'UNVERIFIED', 'DISPUTED', 'SUSPECTED']),
        reliability: zod_1.z.number().min(0).max(100).optional()
    })
});
// ============================================================================
// Identity Fusion
// ============================================================================
exports.FusionStrategySchema = zod_1.z.enum([
    'SCORE_LEVEL',
    'FEATURE_LEVEL',
    'DECISION_LEVEL',
    'RANK_LEVEL',
    'HYBRID'
]);
exports.ModalityWeightSchema = zod_1.z.object({
    modality: zod_1.z.nativeEnum(biometrics_1.BiometricModality),
    weight: zod_1.z.number().min(0).max(1),
    reliability: zod_1.z.number().min(0).max(1).optional(),
    quality: zod_1.z.number().min(0).max(100).optional()
});
exports.FusionResultSchema = zod_1.z.object({
    fusionId: zod_1.z.string().uuid(),
    strategy: exports.FusionStrategySchema,
    identityId: zod_1.z.string().uuid(),
    modalityScores: zod_1.z.array(zod_1.z.object({
        modality: zod_1.z.nativeEnum(biometrics_1.BiometricModality),
        score: zod_1.z.number().min(0).max(100),
        confidence: zod_1.z.number().min(0).max(1),
        weight: zod_1.z.number().min(0).max(1)
    })),
    fusedScore: zod_1.z.number().min(0).max(100),
    fusedConfidence: zod_1.z.number().min(0).max(1),
    isMatch: zod_1.z.boolean(),
    threshold: zod_1.z.number(),
    modalityWeights: zod_1.z.array(exports.ModalityWeightSchema),
    metadata: zod_1.z.object({
        processingTime: zod_1.z.number(),
        algorithmVersion: zod_1.z.string(),
        timestamp: zod_1.z.string().datetime()
    })
});
// ============================================================================
// Cross-Source Matching
// ============================================================================
exports.SourceRecordSchema = zod_1.z.object({
    sourceId: zod_1.z.string(),
    sourceName: zod_1.z.string(),
    sourceType: zod_1.z.enum([
        'BIOMETRIC_DATABASE',
        'DOCUMENT_DATABASE',
        'SOCIAL_MEDIA',
        'PUBLIC_RECORDS',
        'LAW_ENFORCEMENT',
        'COMMERCIAL',
        'GOVERNMENT',
        'PROPRIETARY'
    ]),
    recordId: zod_1.z.string(),
    data: zod_1.z.record(zod_1.z.unknown()),
    confidence: zod_1.z.number().min(0).max(1),
    timestamp: zod_1.z.string().datetime(),
    reliability: zod_1.z.number().min(0).max(100).optional()
});
exports.CrossSourceMatchSchema = zod_1.z.object({
    matchId: zod_1.z.string().uuid(),
    targetIdentity: exports.IdentityRecordSchema,
    sourceMatches: zod_1.z.array(zod_1.z.object({
        source: exports.SourceRecordSchema,
        matchScore: zod_1.z.number().min(0).max(100),
        confidence: zod_1.z.number().min(0).max(1),
        matchedFields: zod_1.z.array(zod_1.z.string()),
        conflictingFields: zod_1.z.array(zod_1.z.object({
            field: zod_1.z.string(),
            targetValue: zod_1.z.unknown(),
            sourceValue: zod_1.z.unknown(),
            resolved: zod_1.z.boolean(),
            resolution: zod_1.z.unknown().optional()
        })).optional()
    })),
    consolidatedIdentity: exports.IdentityRecordSchema,
    confidence: zod_1.z.number().min(0).max(1),
    metadata: zod_1.z.object({
        matchingStrategy: zod_1.z.string(),
        processingTime: zod_1.z.number(),
        timestamp: zod_1.z.string().datetime()
    })
});
// ============================================================================
// Alias Detection and Clustering
// ============================================================================
exports.AliasRelationshipSchema = zod_1.z.object({
    relationshipId: zod_1.z.string().uuid(),
    primaryIdentity: zod_1.z.string().uuid(),
    aliasIdentity: zod_1.z.string().uuid(),
    relationshipType: zod_1.z.enum([
        'CONFIRMED_ALIAS',
        'SUSPECTED_ALIAS',
        'PSEUDONYM',
        'MAIDEN_NAME',
        'NICKNAME',
        'LEGAL_NAME_CHANGE',
        'STAGE_NAME',
        'ONLINE_HANDLE'
    ]),
    confidence: zod_1.z.number().min(0).max(1),
    evidence: zod_1.z.array(zod_1.z.object({
        type: zod_1.z.string(),
        description: zod_1.z.string(),
        strength: zod_1.z.number().min(0).max(1),
        source: zod_1.z.string()
    })),
    dateEstablished: zod_1.z.string().datetime(),
    status: zod_1.z.enum(['ACTIVE', 'HISTORICAL', 'DISPUTED', 'INVALIDATED'])
});
exports.IdentityClusterSchema = zod_1.z.object({
    clusterId: zod_1.z.string().uuid(),
    primaryIdentity: zod_1.z.string().uuid(),
    relatedIdentities: zod_1.z.array(zod_1.z.string().uuid()),
    relationships: zod_1.z.array(exports.AliasRelationshipSchema),
    cohesion: zod_1.z.number().min(0).max(1),
    metadata: zod_1.z.object({
        clusterSize: zod_1.z.number().int().positive(),
        confidence: zod_1.z.number().min(0).max(1),
        createdDate: zod_1.z.string().datetime(),
        lastUpdated: zod_1.z.string().datetime()
    })
});
// ============================================================================
// Entity Disambiguation
// ============================================================================
exports.DisambiguationCriteriaSchema = zod_1.z.object({
    biographic: zod_1.z.object({
        name: zod_1.z.number().min(0).max(1).optional(),
        dateOfBirth: zod_1.z.number().min(0).max(1).optional(),
        nationality: zod_1.z.number().min(0).max(1).optional(),
        location: zod_1.z.number().min(0).max(1).optional()
    }).optional(),
    biometric: zod_1.z.object({
        face: zod_1.z.number().min(0).max(1).optional(),
        fingerprint: zod_1.z.number().min(0).max(1).optional(),
        iris: zod_1.z.number().min(0).max(1).optional(),
        other: zod_1.z.record(zod_1.z.number()).optional()
    }).optional(),
    contextual: zod_1.z.object({
        temporal: zod_1.z.number().min(0).max(1).optional(),
        spatial: zod_1.z.number().min(0).max(1).optional(),
        behavioral: zod_1.z.number().min(0).max(1).optional(),
        relational: zod_1.z.number().min(0).max(1).optional()
    }).optional()
});
exports.DisambiguationResultSchema = zod_1.z.object({
    disambiguationId: zod_1.z.string().uuid(),
    query: zod_1.z.object({
        type: zod_1.z.string(),
        data: zod_1.z.record(zod_1.z.unknown())
    }),
    candidates: zod_1.z.array(zod_1.z.object({
        identityId: zod_1.z.string().uuid(),
        identity: exports.IdentityRecordSchema,
        score: zod_1.z.number().min(0).max(100),
        confidence: zod_1.z.number().min(0).max(1),
        criteriaScores: exports.DisambiguationCriteriaSchema
    })),
    resolvedIdentity: zod_1.z.string().uuid().optional(),
    ambiguous: zod_1.z.boolean(),
    ambiguityScore: zod_1.z.number().min(0).max(1),
    metadata: zod_1.z.object({
        processingTime: zod_1.z.number(),
        timestamp: zod_1.z.string().datetime()
    })
});
// ============================================================================
// Document-to-Person Matching
// ============================================================================
exports.DocumentPersonMatchSchema = zod_1.z.object({
    matchId: zod_1.z.string().uuid(),
    documentId: zod_1.z.string().uuid(),
    documentType: zod_1.z.string(),
    documentData: zod_1.z.object({
        biographicData: zod_1.z.record(zod_1.z.unknown()).optional(),
        biometricData: zod_1.z.record(zod_1.z.unknown()).optional(),
        documentImage: zod_1.z.string().optional()
    }),
    personId: zod_1.z.string().uuid(),
    matchScore: zod_1.z.number().min(0).max(100),
    confidence: zod_1.z.number().min(0).max(1),
    matchedFields: zod_1.z.array(zod_1.z.object({
        field: zod_1.z.string(),
        documentValue: zod_1.z.unknown(),
        personValue: zod_1.z.unknown(),
        similarity: zod_1.z.number().min(0).max(1)
    })),
    discrepancies: zod_1.z.array(zod_1.z.object({
        field: zod_1.z.string(),
        documentValue: zod_1.z.unknown(),
        personValue: zod_1.z.unknown(),
        severity: zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH'])
    })).optional(),
    verified: zod_1.z.boolean(),
    metadata: zod_1.z.object({
        verificationMethod: zod_1.z.string(),
        timestamp: zod_1.z.string().datetime()
    })
});
// ============================================================================
// Social Media Profile Linking
// ============================================================================
exports.SocialMediaProfileSchema = zod_1.z.object({
    profileId: zod_1.z.string().uuid(),
    platform: zod_1.z.string(),
    username: zod_1.z.string(),
    displayName: zod_1.z.string().optional(),
    bio: zod_1.z.string().optional(),
    profileImage: zod_1.z.string().optional(),
    verified: zod_1.z.boolean(),
    followersCount: zod_1.z.number().int().nonnegative().optional(),
    followingCount: zod_1.z.number().int().nonnegative().optional(),
    postsCount: zod_1.z.number().int().nonnegative().optional(),
    createdDate: zod_1.z.string().datetime().optional(),
    lastActive: zod_1.z.string().datetime().optional(),
    location: zod_1.z.string().optional(),
    website: zod_1.z.string().optional(),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional()
});
exports.ProfileLinkageSchema = zod_1.z.object({
    linkageId: zod_1.z.string().uuid(),
    identityId: zod_1.z.string().uuid(),
    profiles: zod_1.z.array(exports.SocialMediaProfileSchema),
    linkageEvidence: zod_1.z.array(zod_1.z.object({
        type: zod_1.z.enum([
            'USERNAME_SIMILARITY',
            'PHOTO_MATCH',
            'SHARED_CONTENT',
            'NETWORK_OVERLAP',
            'TEMPORAL_CORRELATION',
            'BIOGRAPHICAL_MATCH',
            'BEHAVIORAL_SIMILARITY'
        ]),
        strength: zod_1.z.number().min(0).max(1),
        details: zod_1.z.record(zod_1.z.unknown()).optional()
    })),
    confidence: zod_1.z.number().min(0).max(1),
    networkGraph: zod_1.z.object({
        nodes: zod_1.z.array(zod_1.z.string()),
        edges: zod_1.z.array(zod_1.z.object({
            source: zod_1.z.string(),
            target: zod_1.z.string(),
            weight: zod_1.z.number()
        }))
    }).optional(),
    metadata: zod_1.z.object({
        analysisDate: zod_1.z.string().datetime(),
        lastUpdate: zod_1.z.string().datetime()
    })
});
// ============================================================================
// Probabilistic Identity Graph
// ============================================================================
exports.IdentityNodeSchema = zod_1.z.object({
    nodeId: zod_1.z.string().uuid(),
    identityId: zod_1.z.string().uuid(),
    nodeType: zod_1.z.enum(['PERSON', 'ALIAS', 'DOCUMENT', 'PROFILE', 'ATTRIBUTE']),
    data: zod_1.z.record(zod_1.z.unknown()),
    confidence: zod_1.z.number().min(0).max(1)
});
exports.IdentityEdgeSchema = zod_1.z.object({
    edgeId: zod_1.z.string().uuid(),
    sourceNode: zod_1.z.string().uuid(),
    targetNode: zod_1.z.string().uuid(),
    edgeType: zod_1.z.enum([
        'SAME_AS',
        'ALIAS_OF',
        'RELATED_TO',
        'OWNS',
        'ASSOCIATED_WITH',
        'SIMILAR_TO',
        'LINKED_TO'
    ]),
    strength: zod_1.z.number().min(0).max(1),
    confidence: zod_1.z.number().min(0).max(1),
    evidence: zod_1.z.array(zod_1.z.object({
        type: zod_1.z.string(),
        source: zod_1.z.string(),
        timestamp: zod_1.z.string().datetime()
    })),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional()
});
exports.IdentityGraphSchema = zod_1.z.object({
    graphId: zod_1.z.string().uuid(),
    nodes: zod_1.z.array(exports.IdentityNodeSchema),
    edges: zod_1.z.array(exports.IdentityEdgeSchema),
    metadata: zod_1.z.object({
        nodeCount: zod_1.z.number().int().nonnegative(),
        edgeCount: zod_1.z.number().int().nonnegative(),
        density: zod_1.z.number().min(0).max(1),
        createdDate: zod_1.z.string().datetime(),
        lastUpdated: zod_1.z.string().datetime()
    })
});
// ============================================================================
// Attribution Analysis
// ============================================================================
exports.AttributionRecordSchema = zod_1.z.object({
    attributionId: zod_1.z.string().uuid(),
    identityId: zod_1.z.string().uuid(),
    digitalFootprint: zod_1.z.object({
        ipAddresses: zod_1.z.array(zod_1.z.object({
            ip: zod_1.z.string(),
            firstSeen: zod_1.z.string().datetime(),
            lastSeen: zod_1.z.string().datetime(),
            frequency: zod_1.z.number().int(),
            locations: zod_1.z.array(zod_1.z.string()).optional()
        })).optional(),
        deviceFingerprints: zod_1.z.array(zod_1.z.object({
            fingerprintId: zod_1.z.string(),
            deviceType: zod_1.z.string(),
            os: zod_1.z.string().optional(),
            browser: zod_1.z.string().optional(),
            firstSeen: zod_1.z.string().datetime(),
            lastSeen: zod_1.z.string().datetime()
        })).optional(),
        userAgents: zod_1.z.array(zod_1.z.string()).optional(),
        cookies: zod_1.z.array(zod_1.z.string()).optional()
    }),
    temporalPatterns: zod_1.z.object({
        activeHours: zod_1.z.array(zod_1.z.number().int().min(0).max(23)),
        timezone: zod_1.z.string().optional(),
        activityPattern: zod_1.z.record(zod_1.z.number())
    }).optional(),
    geolocation: zod_1.z.object({
        primaryLocations: zod_1.z.array(zod_1.z.object({
            latitude: zod_1.z.number(),
            longitude: zod_1.z.number(),
            accuracy: zod_1.z.number().optional(),
            frequency: zod_1.z.number().int()
        })),
        travelPattern: zod_1.z.array(zod_1.z.object({
            from: zod_1.z.string(),
            to: zod_1.z.string(),
            timestamp: zod_1.z.string().datetime()
        })).optional()
    }).optional(),
    confidence: zod_1.z.number().min(0).max(1),
    metadata: zod_1.z.object({
        sources: zod_1.z.array(zod_1.z.string()),
        analysisDate: zod_1.z.string().datetime()
    })
});
// ============================================================================
// Confidence Scoring
// ============================================================================
exports.ConfidenceFactorsSchema = zod_1.z.object({
    biometricQuality: zod_1.z.number().min(0).max(1).optional(),
    sourceReliability: zod_1.z.number().min(0).max(1).optional(),
    dataCompleteness: zod_1.z.number().min(0).max(1).optional(),
    temporalConsistency: zod_1.z.number().min(0).max(1).optional(),
    spatialConsistency: zod_1.z.number().min(0).max(1).optional(),
    crossValidation: zod_1.z.number().min(0).max(1).optional(),
    evidenceStrength: zod_1.z.number().min(0).max(1).optional()
});
exports.ConfidenceScoreSchema = zod_1.z.object({
    overall: zod_1.z.number().min(0).max(1),
    factors: exports.ConfidenceFactorsSchema,
    calculation: zod_1.z.object({
        method: zod_1.z.enum(['WEIGHTED_AVERAGE', 'BAYESIAN', 'FUZZY_LOGIC', 'ENSEMBLE']),
        weights: zod_1.z.record(zod_1.z.number()).optional()
    }),
    interpretation: zod_1.z.enum(['VERY_LOW', 'LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH']),
    timestamp: zod_1.z.string().datetime()
});
