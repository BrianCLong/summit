/**
 * Watchlist Screening Types
 *
 * Types for real-time watchlist matching, risk scoring, alert generation,
 * and encounter tracking.
 */

import { z } from 'zod';
import { BiometricModality } from '@intelgraph/biometrics';

// ============================================================================
// Watchlist Definition
// ============================================================================

export enum WatchlistCategory {
  TERRORISM = 'TERRORISM',
  ORGANIZED_CRIME = 'ORGANIZED_CRIME',
  WANTED = 'WANTED',
  MISSING_PERSON = 'MISSING_PERSON',
  PERSON_OF_INTEREST = 'PERSON_OF_INTEREST',
  DENIED_ENTRY = 'DENIED_ENTRY',
  SANCTIONS = 'SANCTIONS',
  PEP = 'PEP', // Politically Exposed Person
  ADVERSE_MEDIA = 'ADVERSE_MEDIA',
  CUSTOM = 'CUSTOM'
}

export const WatchlistSchema = z.object({
  watchlistId: z.string().uuid(),
  name: z.string(),
  description: z.string().optional(),
  category: z.nativeEnum(WatchlistCategory),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  source: z.object({
    name: z.string(),
    type: z.enum(['GOVERNMENT', 'INTERNATIONAL', 'LAW_ENFORCEMENT', 'COMMERCIAL', 'INTERNAL']),
    authority: z.string().optional(),
    url: z.string().optional()
  }),
  active: z.boolean(),
  autoUpdate: z.boolean(),
  lastUpdated: z.string().datetime(),
  entryCount: z.number().int().nonnegative(),
  metadata: z.record(z.unknown()).optional()
});

export type Watchlist = z.infer<typeof WatchlistSchema>;

// ============================================================================
// Watchlist Entry
// ============================================================================

export const WatchlistEntrySchema = z.object({
  entryId: z.string().uuid(),
  watchlistId: z.string().uuid(),
  personData: z.object({
    names: z.array(z.object({
      fullName: z.string(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      middleName: z.string().optional(),
      type: z.enum(['PRIMARY', 'ALIAS', 'MAIDEN', 'NICKNAME', 'PSEUDONYM']),
      script: z.string().optional() // Latin, Cyrillic, Arabic, etc.
    })),
    dateOfBirth: z.array(z.object({
      date: z.string(),
      type: z.enum(['EXACT', 'APPROXIMATE', 'YEAR_ONLY']
    })).optional(),
    placeOfBirth: z.array(z.string()).optional(),
    nationality: z.array(z.string()).optional(),
    addresses: z.array(z.string()).optional(),
    identificationDocuments: z.array(z.object({
      type: z.string(),
      number: z.string(),
      issuingCountry: z.string().optional()
    })).optional(),
    physicalDescription: z.object({
      gender: z.string().optional(),
      height: z.number().optional(),
      weight: z.number().optional(),
      eyeColor: z.string().optional(),
      hairColor: z.string().optional(),
      distinguishingMarks: z.array(z.string()).optional()
    }).optional()
  }),
  biometricData: z.object({
    hasPhoto: z.boolean(),
    hasFingerprints: z.boolean(),
    hasIris: z.boolean(),
    biometricIds: z.array(z.string()).optional()
  }).optional(),
  listingReason: z.string(),
  offenses: z.array(z.string()).optional(),
  warrants: z.array(z.object({
    issuingAuthority: z.string(),
    issueDate: z.string(),
    charges: z.array(z.string())
  })).optional(),
  riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  status: z.enum(['ACTIVE', 'INACTIVE', 'REMOVED', 'UNDER_REVIEW']),
  addedDate: z.string().datetime(),
  expiryDate: z.string().datetime().optional(),
  notes: z.string().optional(),
  metadata: z.record(z.unknown()).optional()
});

export type WatchlistEntry = z.infer<typeof WatchlistEntrySchema>;

// ============================================================================
// Screening Request
// ============================================================================

export const ScreeningRequestSchema = z.object({
  requestId: z.string().uuid(),
  requestType: z.enum(['ENROLLMENT', 'VERIFICATION', 'IDENTIFICATION', 'BULK', 'CONTINUOUS']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  subject: z.object({
    identityId: z.string().uuid().optional(),
    biographicData: z.record(z.unknown()).optional(),
    biometricData: z.object({
      modality: z.nativeEnum(BiometricModality),
      templateId: z.string().uuid()
    }).array().optional(),
    documentData: z.record(z.unknown()).optional()
  }),
  watchlists: z.array(z.string().uuid()).optional(), // Specific watchlists to screen against
  thresholds: z.object({
    biometric: z.number().min(0).max(100).optional(),
    biographic: z.number().min(0).max(100).optional(),
    overall: z.number().min(0).max(100).optional()
  }).optional(),
  options: z.object({
    fuzzyMatching: z.boolean().optional(),
    phoneticMatching: z.boolean().optional(),
    transliteration: z.boolean().optional(),
    maxResults: z.number().int().positive().optional(),
    includeInactive: z.boolean().optional()
  }).optional(),
  context: z.object({
    location: z.string().optional(),
    timestamp: z.string().datetime(),
    operator: z.string().optional(),
    purpose: z.string().optional()
  })
});

export type ScreeningRequest = z.infer<typeof ScreeningRequestSchema>;

// ============================================================================
// Screening Match
// ============================================================================

export const ScreeningMatchSchema = z.object({
  matchId: z.string().uuid(),
  watchlistEntry: WatchlistEntrySchema,
  matchScore: z.number().min(0).max(100),
  confidence: z.number().min(0).max(1),
  matchType: z.enum(['BIOMETRIC', 'BIOGRAPHIC', 'DOCUMENT', 'COMBINED']),
  matchDetails: z.object({
    biometricMatches: z.array(z.object({
      modality: z.nativeEnum(BiometricModality),
      score: z.number().min(0).max(100),
      confidence: z.number().min(0).max(1)
    })).optional(),
    biographicMatches: z.array(z.object({
      field: z.string(),
      queryValue: z.string(),
      matchValue: z.string(),
      similarity: z.number().min(0).max(1),
      matchType: z.enum(['EXACT', 'FUZZY', 'PHONETIC', 'PARTIAL'])
    })).optional(),
    documentMatches: z.array(z.object({
      documentType: z.string(),
      documentNumber: z.string(),
      matchType: z.enum(['EXACT', 'SIMILAR'])
    })).optional()
  }),
  falsePositiveLikelihood: z.number().min(0).max(1).optional(),
  requiresManualReview: z.boolean()
});

export type ScreeningMatch = z.infer<typeof ScreeningMatchSchema>;

// ============================================================================
// Screening Result
// ============================================================================

export const ScreeningResultSchema = z.object({
  resultId: z.string().uuid(),
  requestId: z.string().uuid(),
  status: z.enum(['NO_MATCH', 'POTENTIAL_MATCH', 'HIGH_CONFIDENCE_MATCH', 'CONFIRMED_MATCH']),
  matches: z.array(ScreeningMatchSchema),
  riskScore: z.number().min(0).max(100),
  riskLevel: z.enum(['NONE', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  recommendation: z.enum(['CLEAR', 'SECONDARY_SCREENING', 'DENY', 'MANUAL_REVIEW']),
  alerts: z.array(z.object({
    alertId: z.string().uuid(),
    severity: z.enum(['INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
    message: z.string(),
    watchlistId: z.string().uuid(),
    entryId: z.string().uuid(),
    requiresAction: z.boolean()
  })).optional(),
  processingTime: z.number(),
  timestamp: z.string().datetime(),
  metadata: z.record(z.unknown()).optional()
});

export type ScreeningResult = z.infer<typeof ScreeningResultSchema>;

// ============================================================================
// Alert Management
// ============================================================================

export const AlertSchema = z.object({
  alertId: z.string().uuid(),
  screeningResultId: z.string().uuid(),
  alertType: z.enum(['WATCHLIST_HIT', 'RISK_THRESHOLD', 'POLICY_VIOLATION', 'SYSTEM_ERROR']),
  severity: z.enum(['INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  status: z.enum(['NEW', 'ACKNOWLEDGED', 'INVESTIGATING', 'RESOLVED', 'FALSE_POSITIVE', 'TRUE_POSITIVE']),
  subject: z.object({
    identityId: z.string().uuid().optional(),
    name: z.string().optional(),
    documentNumber: z.string().optional()
  }),
  matchDetails: ScreeningMatchSchema.optional(),
  assignedTo: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  resolvedAt: z.string().datetime().optional(),
  resolution: z.object({
    outcome: z.string(),
    notes: z.string(),
    resolvedBy: z.string()
  }).optional(),
  escalated: z.boolean(),
  notifications: z.array(z.object({
    recipient: z.string(),
    method: z.enum(['EMAIL', 'SMS', 'PUSH', 'SYSTEM']),
    sentAt: z.string().datetime(),
    delivered: z.boolean()
  })).optional(),
  metadata: z.record(z.unknown()).optional()
});

export type Alert = z.infer<typeof AlertSchema>;

// ============================================================================
// Encounter History
// ============================================================================

export const EncounterSchema = z.object({
  encounterId: z.string().uuid(),
  identityId: z.string().uuid(),
  screeningResultId: z.string().uuid(),
  encounterType: z.enum([
    'BORDER_CROSSING',
    'AIRPORT_SCREENING',
    'PORT_SCREENING',
    'VISA_APPLICATION',
    'BACKGROUND_CHECK',
    'LAW_ENFORCEMENT',
    'FACILITY_ACCESS',
    'OTHER'
  ]),
  location: z.object({
    facilityId: z.string().optional(),
    facilityName: z.string(),
    country: z.string(),
    coordinates: z.object({
      latitude: z.number(),
      longitude: z.number()
    }).optional()
  }),
  timestamp: z.string().datetime(),
  outcome: z.enum(['CLEARED', 'SECONDARY_SCREENING', 'DENIED', 'DETAINED', 'REFERRED']),
  watchlistHits: z.array(z.object({
    watchlistId: z.string().uuid(),
    entryId: z.string().uuid(),
    matchScore: z.number()
  })).optional(),
  biometricCapture: z.object({
    modalities: z.array(z.nativeEnum(BiometricModality)),
    quality: z.number().min(0).max(100)
  }).optional(),
  officer: z.object({
    id: z.string(),
    name: z.string().optional()
  }).optional(),
  notes: z.string().optional(),
  relatedEncounters: z.array(z.string().uuid()).optional(),
  metadata: z.record(z.unknown()).optional()
});

export type Encounter = z.infer<typeof EncounterSchema>;

export const EncounterHistorySchema = z.object({
  identityId: z.string().uuid(),
  encounters: z.array(EncounterSchema),
  summary: z.object({
    totalEncounters: z.number().int().nonnegative(),
    firstEncounter: z.string().datetime().optional(),
    lastEncounter: z.string().datetime().optional(),
    encountersByType: z.record(z.number()),
    encountersByLocation: z.record(z.number()),
    encountersByOutcome: z.record(z.number()),
    watchlistHitCount: z.number().int().nonnegative()
  }),
  patterns: z.object({
    travelFrequency: z.string().optional(),
    commonRoutes: z.array(z.string()).optional(),
    seasonality: z.record(z.number()).optional(),
    anomalies: z.array(z.object({
      type: z.string(),
      description: z.string(),
      timestamp: z.string().datetime()
    })).optional()
  }).optional()
});

export type EncounterHistory = z.infer<typeof EncounterHistorySchema>;

// ============================================================================
// Risk Scoring
// ============================================================================

export const RiskFactorSchema = z.object({
  factor: z.string(),
  category: z.enum([
    'WATCHLIST',
    'BIOGRAPHICAL',
    'BEHAVIORAL',
    'TRAVEL_PATTERN',
    'ASSOCIATION',
    'DOCUMENT',
    'HISTORICAL'
  ]),
  score: z.number().min(0).max(100),
  weight: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
  evidence: z.array(z.string()).optional()
});

export type RiskFactor = z.infer<typeof RiskFactorSchema>;

export const RiskAssessmentSchema = z.object({
  assessmentId: z.string().uuid(),
  identityId: z.string().uuid(),
  overallRiskScore: z.number().min(0).max(100),
  riskLevel: z.enum(['NONE', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  riskFactors: z.array(RiskFactorSchema),
  mitigatingFactors: z.array(z.object({
    factor: z.string(),
    impact: z.number().min(-100).max(0),
    description: z.string()
  })).optional(),
  recommendation: z.string(),
  validUntil: z.string().datetime().optional(),
  assessmentDate: z.string().datetime(),
  assessedBy: z.string().optional(),
  metadata: z.record(z.unknown()).optional()
});

export type RiskAssessment = z.infer<typeof RiskAssessmentSchema>;

// ============================================================================
// False Positive Management
// ============================================================================

export const FalsePositiveRecordSchema = z.object({
  recordId: z.string().uuid(),
  matchId: z.string().uuid(),
  screeningResultId: z.string().uuid(),
  reportedBy: z.string(),
  reportedAt: z.string().datetime(),
  reason: z.string(),
  evidence: z.array(z.object({
    type: z.string(),
    description: z.string(),
    attachment: z.string().optional()
  })).optional(),
  verified: z.boolean(),
  verifiedBy: z.string().optional(),
  verifiedAt: z.string().datetime().optional(),
  action: z.enum([
    'WHITELIST',
    'ADJUST_THRESHOLD',
    'UPDATE_WATCHLIST',
    'NO_ACTION',
    'ESCALATE'
  ]),
  actionTaken: z.boolean(),
  metadata: z.record(z.unknown()).optional()
});

export type FalsePositiveRecord = z.infer<typeof FalsePositiveRecordSchema>;

// ============================================================================
// Threshold Management
// ============================================================================

export const ThresholdConfigSchema = z.object({
  configId: z.string().uuid(),
  name: z.string(),
  scope: z.enum(['GLOBAL', 'WATCHLIST', 'LOCATION', 'CUSTOM']),
  scopeId: z.string().optional(), // Watchlist ID, location ID, etc.
  thresholds: z.object({
    biometric: z.object({
      accept: z.number().min(0).max(100),
      review: z.number().min(0).max(100),
      reject: z.number().min(0).max(100)
    }).optional(),
    biographic: z.object({
      accept: z.number().min(0).max(100),
      review: z.number().min(0).max(100),
      reject: z.number().min(0).max(100)
    }).optional(),
    combined: z.object({
      accept: z.number().min(0).max(100),
      review: z.number().min(0).max(100),
      reject: z.number().min(0).max(100)
    }).optional(),
    risk: z.object({
      low: z.number().min(0).max(100),
      medium: z.number().min(0).max(100),
      high: z.number().min(0).max(100)
    }).optional()
  }),
  active: z.boolean(),
  effectiveFrom: z.string().datetime(),
  effectiveTo: z.string().datetime().optional(),
  createdBy: z.string(),
  lastModified: z.string().datetime(),
  metadata: z.record(z.unknown()).optional()
});

export type ThresholdConfig = z.infer<typeof ThresholdConfigSchema>;

// ============================================================================
// Audit Trail
// ============================================================================

export const ScreeningAuditEventSchema = z.object({
  eventId: z.string().uuid(),
  eventType: z.enum([
    'SCREENING_INITIATED',
    'MATCH_DETECTED',
    'ALERT_GENERATED',
    'MANUAL_REVIEW',
    'DECISION_MADE',
    'THRESHOLD_CHANGED',
    'WATCHLIST_UPDATED',
    'DATA_ACCESSED'
  ]),
  screeningResultId: z.string().uuid().optional(),
  identityId: z.string().uuid().optional(),
  userId: z.string(),
  userName: z.string().optional(),
  userRole: z.string(),
  action: z.string(),
  details: z.record(z.unknown()),
  outcome: z.string().optional(),
  ipAddress: z.string().optional(),
  location: z.string().optional(),
  timestamp: z.string().datetime(),
  retentionExpiry: z.string().datetime().optional()
});

export type ScreeningAuditEvent = z.infer<typeof ScreeningAuditEventSchema>;

// ============================================================================
// Travel Pattern Analysis
// ============================================================================

export const TravelPatternSchema = z.object({
  patternId: z.string().uuid(),
  identityId: z.string().uuid(),
  movements: z.array(z.object({
    from: z.object({
      country: z.string(),
      location: z.string().optional()
    }),
    to: z.object({
      country: z.string(),
      location: z.string().optional()
    }),
    date: z.string().datetime(),
    purpose: z.string().optional(),
    duration: z.number().optional() // days
  })),
  analysis: z.object({
    frequentDestinations: z.array(z.object({
      country: z.string(),
      count: z.number().int(),
      lastVisit: z.string().datetime()
    })),
    travelFrequency: z.object({
      averageTripsPerYear: z.number(),
      lastTripDate: z.string().datetime().optional()
    }),
    unusualPatterns: z.array(z.object({
      type: z.enum(['FREQUENCY', 'DESTINATION', 'TIMING', 'ROUTE']),
      description: z.string(),
      significance: z.enum(['LOW', 'MEDIUM', 'HIGH'])
    })).optional(),
    riskIndicators: z.array(z.string()).optional()
  }),
  metadata: z.object({
    lastUpdated: z.string().datetime(),
    dataCompleteness: z.number().min(0).max(1)
  })
});

export type TravelPattern = z.infer<typeof TravelPatternSchema>;
