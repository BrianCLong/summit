/**
 * Identity Resolution Types
 *
 * Types for cross-source identity matching, multi-modal fusion,
 * entity disambiguation, and identity intelligence.
 */

import { z } from 'zod';
import { BiometricModality } from '@intelgraph/biometrics';

// ============================================================================
// Identity Record
// ============================================================================

export const IdentityRecordSchema = z.object({
  identityId: z.string().uuid(),
  type: z.enum(['PERSON', 'ALIAS', 'PSEUDONYM', 'SYNTHETIC']),
  biographicData: z.object({
    fullName: z.string().optional(),
    firstName: z.string().optional(),
    middleName: z.string().optional(),
    lastName: z.string().optional(),
    aliases: z.array(z.string()).optional(),
    dateOfBirth: z.string().optional(),
    placeOfBirth: z.string().optional(),
    nationality: z.array(z.string()).optional(),
    gender: z.string().optional(),
    height: z.number().optional(),
    weight: z.number().optional(),
    eyeColor: z.string().optional(),
    hairColor: z.string().optional(),
    distinguishingMarks: z.array(z.string()).optional()
  }).optional(),
  biometricData: z.object({
    modalities: z.array(z.nativeEnum(BiometricModality)),
    templateIds: z.array(z.string().uuid()),
    qualityScore: z.number().min(0).max(100).optional()
  }).optional(),
  documentData: z.object({
    passports: z.array(z.string()).optional(),
    nationalIds: z.array(z.string()).optional(),
    driverLicenses: z.array(z.string()).optional(),
    visas: z.array(z.string()).optional()
  }).optional(),
  digitalData: z.object({
    emails: z.array(z.string()).optional(),
    phones: z.array(z.string()).optional(),
    socialMediaProfiles: z.array(z.object({
      platform: z.string(),
      username: z.string(),
      url: z.string().optional(),
      verified: z.boolean().optional()
    })).optional(),
    ipAddresses: z.array(z.string()).optional(),
    deviceIds: z.array(z.string()).optional()
  }).optional(),
  locationData: z.object({
    addresses: z.array(z.object({
      type: z.enum(['HOME', 'WORK', 'TEMPORARY', 'UNKNOWN']),
      address: z.string(),
      city: z.string().optional(),
      state: z.string().optional(),
      country: z.string(),
      postalCode: z.string().optional(),
      coordinates: z.object({
        latitude: z.number(),
        longitude: z.number()
      }).optional()
    })).optional(),
    knownLocations: z.array(z.string()).optional()
  }).optional(),
  metadata: z.object({
    sources: z.array(z.string()),
    confidence: z.number().min(0).max(1),
    createdDate: z.string().datetime(),
    lastUpdated: z.string().datetime(),
    verificationStatus: z.enum(['VERIFIED', 'UNVERIFIED', 'DISPUTED', 'SUSPECTED']),
    reliability: z.number().min(0).max(100).optional()
  })
});

export type IdentityRecord = z.infer<typeof IdentityRecordSchema>;

// ============================================================================
// Identity Fusion
// ============================================================================

export const FusionStrategySchema = z.enum([
  'SCORE_LEVEL',
  'FEATURE_LEVEL',
  'DECISION_LEVEL',
  'RANK_LEVEL',
  'HYBRID'
]);

export type FusionStrategy = z.infer<typeof FusionStrategySchema>;

export const ModalityWeightSchema = z.object({
  modality: z.nativeEnum(BiometricModality),
  weight: z.number().min(0).max(1),
  reliability: z.number().min(0).max(1).optional(),
  quality: z.number().min(0).max(100).optional()
});

export type ModalityWeight = z.infer<typeof ModalityWeightSchema>;

export const FusionResultSchema = z.object({
  fusionId: z.string().uuid(),
  strategy: FusionStrategySchema,
  identityId: z.string().uuid(),
  modalityScores: z.array(z.object({
    modality: z.nativeEnum(BiometricModality),
    score: z.number().min(0).max(100),
    confidence: z.number().min(0).max(1),
    weight: z.number().min(0).max(1)
  })),
  fusedScore: z.number().min(0).max(100),
  fusedConfidence: z.number().min(0).max(1),
  isMatch: z.boolean(),
  threshold: z.number(),
  modalityWeights: z.array(ModalityWeightSchema),
  metadata: z.object({
    processingTime: z.number(),
    algorithmVersion: z.string(),
    timestamp: z.string().datetime()
  })
});

export type FusionResult = z.infer<typeof FusionResultSchema>;

// ============================================================================
// Cross-Source Matching
// ============================================================================

export const SourceRecordSchema = z.object({
  sourceId: z.string(),
  sourceName: z.string(),
  sourceType: z.enum([
    'BIOMETRIC_DATABASE',
    'DOCUMENT_DATABASE',
    'SOCIAL_MEDIA',
    'PUBLIC_RECORDS',
    'LAW_ENFORCEMENT',
    'COMMERCIAL',
    'GOVERNMENT',
    'PROPRIETARY'
  ]),
  recordId: z.string(),
  data: z.record(z.unknown()),
  confidence: z.number().min(0).max(1),
  timestamp: z.string().datetime(),
  reliability: z.number().min(0).max(100).optional()
});

export type SourceRecord = z.infer<typeof SourceRecordSchema>;

export const CrossSourceMatchSchema = z.object({
  matchId: z.string().uuid(),
  targetIdentity: IdentityRecordSchema,
  sourceMatches: z.array(z.object({
    source: SourceRecordSchema,
    matchScore: z.number().min(0).max(100),
    confidence: z.number().min(0).max(1),
    matchedFields: z.array(z.string()),
    conflictingFields: z.array(z.object({
      field: z.string(),
      targetValue: z.unknown(),
      sourceValue: z.unknown(),
      resolved: z.boolean(),
      resolution: z.unknown().optional()
    })).optional()
  })),
  consolidatedIdentity: IdentityRecordSchema,
  confidence: z.number().min(0).max(1),
  metadata: z.object({
    matchingStrategy: z.string(),
    processingTime: z.number(),
    timestamp: z.string().datetime()
  })
});

export type CrossSourceMatch = z.infer<typeof CrossSourceMatchSchema>;

// ============================================================================
// Alias Detection and Clustering
// ============================================================================

export const AliasRelationshipSchema = z.object({
  relationshipId: z.string().uuid(),
  primaryIdentity: z.string().uuid(),
  aliasIdentity: z.string().uuid(),
  relationshipType: z.enum([
    'CONFIRMED_ALIAS',
    'SUSPECTED_ALIAS',
    'PSEUDONYM',
    'MAIDEN_NAME',
    'NICKNAME',
    'LEGAL_NAME_CHANGE',
    'STAGE_NAME',
    'ONLINE_HANDLE'
  ]),
  confidence: z.number().min(0).max(1),
  evidence: z.array(z.object({
    type: z.string(),
    description: z.string(),
    strength: z.number().min(0).max(1),
    source: z.string()
  })),
  dateEstablished: z.string().datetime(),
  status: z.enum(['ACTIVE', 'HISTORICAL', 'DISPUTED', 'INVALIDATED'])
});

export type AliasRelationship = z.infer<typeof AliasRelationshipSchema>;

export const IdentityClusterSchema = z.object({
  clusterId: z.string().uuid(),
  primaryIdentity: z.string().uuid(),
  relatedIdentities: z.array(z.string().uuid()),
  relationships: z.array(AliasRelationshipSchema),
  cohesion: z.number().min(0).max(1),
  metadata: z.object({
    clusterSize: z.number().int().positive(),
    confidence: z.number().min(0).max(1),
    createdDate: z.string().datetime(),
    lastUpdated: z.string().datetime()
  })
});

export type IdentityCluster = z.infer<typeof IdentityClusterSchema>;

// ============================================================================
// Entity Disambiguation
// ============================================================================

export const DisambiguationCriteriaSchema = z.object({
  biographic: z.object({
    name: z.number().min(0).max(1).optional(),
    dateOfBirth: z.number().min(0).max(1).optional(),
    nationality: z.number().min(0).max(1).optional(),
    location: z.number().min(0).max(1).optional()
  }).optional(),
  biometric: z.object({
    face: z.number().min(0).max(1).optional(),
    fingerprint: z.number().min(0).max(1).optional(),
    iris: z.number().min(0).max(1).optional(),
    other: z.record(z.number()).optional()
  }).optional(),
  contextual: z.object({
    temporal: z.number().min(0).max(1).optional(),
    spatial: z.number().min(0).max(1).optional(),
    behavioral: z.number().min(0).max(1).optional(),
    relational: z.number().min(0).max(1).optional()
  }).optional()
});

export type DisambiguationCriteria = z.infer<typeof DisambiguationCriteriaSchema>;

export const DisambiguationResultSchema = z.object({
  disambiguationId: z.string().uuid(),
  query: z.object({
    type: z.string(),
    data: z.record(z.unknown())
  }),
  candidates: z.array(z.object({
    identityId: z.string().uuid(),
    identity: IdentityRecordSchema,
    score: z.number().min(0).max(100),
    confidence: z.number().min(0).max(1),
    criteriaScores: DisambiguationCriteriaSchema
  })),
  resolvedIdentity: z.string().uuid().optional(),
  ambiguous: z.boolean(),
  ambiguityScore: z.number().min(0).max(1),
  metadata: z.object({
    processingTime: z.number(),
    timestamp: z.string().datetime()
  })
});

export type DisambiguationResult = z.infer<typeof DisambiguationResultSchema>;

// ============================================================================
// Document-to-Person Matching
// ============================================================================

export const DocumentPersonMatchSchema = z.object({
  matchId: z.string().uuid(),
  documentId: z.string().uuid(),
  documentType: z.string(),
  documentData: z.object({
    biographicData: z.record(z.unknown()).optional(),
    biometricData: z.record(z.unknown()).optional(),
    documentImage: z.string().optional()
  }),
  personId: z.string().uuid(),
  matchScore: z.number().min(0).max(100),
  confidence: z.number().min(0).max(1),
  matchedFields: z.array(z.object({
    field: z.string(),
    documentValue: z.unknown(),
    personValue: z.unknown(),
    similarity: z.number().min(0).max(1)
  })),
  discrepancies: z.array(z.object({
    field: z.string(),
    documentValue: z.unknown(),
    personValue: z.unknown(),
    severity: z.enum(['LOW', 'MEDIUM', 'HIGH'])
  })).optional(),
  verified: z.boolean(),
  metadata: z.object({
    verificationMethod: z.string(),
    timestamp: z.string().datetime()
  })
});

export type DocumentPersonMatch = z.infer<typeof DocumentPersonMatchSchema>;

// ============================================================================
// Social Media Profile Linking
// ============================================================================

export const SocialMediaProfileSchema = z.object({
  profileId: z.string().uuid(),
  platform: z.string(),
  username: z.string(),
  displayName: z.string().optional(),
  bio: z.string().optional(),
  profileImage: z.string().optional(),
  verified: z.boolean(),
  followersCount: z.number().int().nonnegative().optional(),
  followingCount: z.number().int().nonnegative().optional(),
  postsCount: z.number().int().nonnegative().optional(),
  createdDate: z.string().datetime().optional(),
  lastActive: z.string().datetime().optional(),
  location: z.string().optional(),
  website: z.string().optional(),
  metadata: z.record(z.unknown()).optional()
});

export type SocialMediaProfile = z.infer<typeof SocialMediaProfileSchema>;

export const ProfileLinkageSchema = z.object({
  linkageId: z.string().uuid(),
  identityId: z.string().uuid(),
  profiles: z.array(SocialMediaProfileSchema),
  linkageEvidence: z.array(z.object({
    type: z.enum([
      'USERNAME_SIMILARITY',
      'PHOTO_MATCH',
      'SHARED_CONTENT',
      'NETWORK_OVERLAP',
      'TEMPORAL_CORRELATION',
      'BIOGRAPHICAL_MATCH',
      'BEHAVIORAL_SIMILARITY'
    ]),
    strength: z.number().min(0).max(1),
    details: z.record(z.unknown()).optional()
  })),
  confidence: z.number().min(0).max(1),
  networkGraph: z.object({
    nodes: z.array(z.string()),
    edges: z.array(z.object({
      source: z.string(),
      target: z.string(),
      weight: z.number()
    }))
  }).optional(),
  metadata: z.object({
    analysisDate: z.string().datetime(),
    lastUpdate: z.string().datetime()
  })
});

export type ProfileLinkage = z.infer<typeof ProfileLinkageSchema>;

// ============================================================================
// Probabilistic Identity Graph
// ============================================================================

export const IdentityNodeSchema = z.object({
  nodeId: z.string().uuid(),
  identityId: z.string().uuid(),
  nodeType: z.enum(['PERSON', 'ALIAS', 'DOCUMENT', 'PROFILE', 'ATTRIBUTE']),
  data: z.record(z.unknown()),
  confidence: z.number().min(0).max(1)
});

export type IdentityNode = z.infer<typeof IdentityNodeSchema>;

export const IdentityEdgeSchema = z.object({
  edgeId: z.string().uuid(),
  sourceNode: z.string().uuid(),
  targetNode: z.string().uuid(),
  edgeType: z.enum([
    'SAME_AS',
    'ALIAS_OF',
    'RELATED_TO',
    'OWNS',
    'ASSOCIATED_WITH',
    'SIMILAR_TO',
    'LINKED_TO'
  ]),
  strength: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
  evidence: z.array(z.object({
    type: z.string(),
    source: z.string(),
    timestamp: z.string().datetime()
  })),
  metadata: z.record(z.unknown()).optional()
});

export type IdentityEdge = z.infer<typeof IdentityEdgeSchema>;

export const IdentityGraphSchema = z.object({
  graphId: z.string().uuid(),
  nodes: z.array(IdentityNodeSchema),
  edges: z.array(IdentityEdgeSchema),
  metadata: z.object({
    nodeCount: z.number().int().nonnegative(),
    edgeCount: z.number().int().nonnegative(),
    density: z.number().min(0).max(1),
    createdDate: z.string().datetime(),
    lastUpdated: z.string().datetime()
  })
});

export type IdentityGraph = z.infer<typeof IdentityGraphSchema>;

// ============================================================================
// Attribution Analysis
// ============================================================================

export const AttributionRecordSchema = z.object({
  attributionId: z.string().uuid(),
  identityId: z.string().uuid(),
  digitalFootprint: z.object({
    ipAddresses: z.array(z.object({
      ip: z.string(),
      firstSeen: z.string().datetime(),
      lastSeen: z.string().datetime(),
      frequency: z.number().int(),
      locations: z.array(z.string()).optional()
    })).optional(),
    deviceFingerprints: z.array(z.object({
      fingerprintId: z.string(),
      deviceType: z.string(),
      os: z.string().optional(),
      browser: z.string().optional(),
      firstSeen: z.string().datetime(),
      lastSeen: z.string().datetime()
    })).optional(),
    userAgents: z.array(z.string()).optional(),
    cookies: z.array(z.string()).optional()
  }),
  temporalPatterns: z.object({
    activeHours: z.array(z.number().int().min(0).max(23)),
    timezone: z.string().optional(),
    activityPattern: z.record(z.number())
  }).optional(),
  geolocation: z.object({
    primaryLocations: z.array(z.object({
      latitude: z.number(),
      longitude: z.number(),
      accuracy: z.number().optional(),
      frequency: z.number().int()
    })),
    travelPattern: z.array(z.object({
      from: z.string(),
      to: z.string(),
      timestamp: z.string().datetime()
    })).optional()
  }).optional(),
  confidence: z.number().min(0).max(1),
  metadata: z.object({
    sources: z.array(z.string()),
    analysisDate: z.string().datetime()
  })
});

export type AttributionRecord = z.infer<typeof AttributionRecordSchema>;

// ============================================================================
// Confidence Scoring
// ============================================================================

export const ConfidenceFactorsSchema = z.object({
  biometricQuality: z.number().min(0).max(1).optional(),
  sourceReliability: z.number().min(0).max(1).optional(),
  dataCompleteness: z.number().min(0).max(1).optional(),
  temporalConsistency: z.number().min(0).max(1).optional(),
  spatialConsistency: z.number().min(0).max(1).optional(),
  crossValidation: z.number().min(0).max(1).optional(),
  evidenceStrength: z.number().min(0).max(1).optional()
});

export type ConfidenceFactors = z.infer<typeof ConfidenceFactorsSchema>;

export const ConfidenceScoreSchema = z.object({
  overall: z.number().min(0).max(1),
  factors: ConfidenceFactorsSchema,
  calculation: z.object({
    method: z.enum(['WEIGHTED_AVERAGE', 'BAYESIAN', 'FUZZY_LOGIC', 'ENSEMBLE']),
    weights: z.record(z.number()).optional()
  }),
  interpretation: z.enum(['VERY_LOW', 'LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH']),
  timestamp: z.string().datetime()
});

export type ConfidenceScore = z.infer<typeof ConfidenceScoreSchema>;
