import { z } from 'zod';

/**
 * Threat Level
 */
export enum ThreatLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

/**
 * Incident Type
 */
export enum IncidentType {
  SURVEILLANCE_DETECTED = 'SURVEILLANCE_DETECTED',
  COVER_BLOWN = 'COVER_BLOWN',
  SOURCE_COMPROMISED = 'SOURCE_COMPROMISED',
  COMMUNICATION_INTERCEPTED = 'COMMUNICATION_INTERCEPTED',
  COUNTER_INTELLIGENCE = 'COUNTER_INTELLIGENCE',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  PATTERN_ANOMALY = 'PATTERN_ANOMALY',
  OPSEC_VIOLATION = 'OPSEC_VIOLATION'
}

/**
 * Incident Status
 */
export enum IncidentStatus {
  REPORTED = 'REPORTED',
  UNDER_INVESTIGATION = 'UNDER_INVESTIGATION',
  CONFIRMED = 'CONFIRMED',
  MITIGATED = 'MITIGATED',
  FALSE_ALARM = 'FALSE_ALARM',
  CLOSED = 'CLOSED'
}

/**
 * Compromise Indicator Type
 */
export enum CompromiseIndicatorType {
  BEHAVIORAL = 'BEHAVIORAL',
  TECHNICAL = 'TECHNICAL',
  ENVIRONMENTAL = 'ENVIRONMENTAL',
  COMMUNICATION = 'COMMUNICATION',
  PHYSICAL = 'PHYSICAL'
}

/**
 * Surveillance Detection Status
 */
export enum SurveillanceDetectionStatus {
  CLEAR = 'CLEAR',
  POSSIBLE = 'POSSIBLE',
  PROBABLE = 'PROBABLE',
  CONFIRMED = 'CONFIRMED'
}

// Schemas
export const CoverStorySchema = z.object({
  id: z.string().uuid(),
  sourceId: z.string().uuid(),
  handlerId: z.string().uuid(),
  backstory: z.string(),
  employment: z.object({
    company: z.string(),
    position: z.string(),
    duration: z.string(),
    verifiable: z.boolean()
  }),
  residence: z.object({
    address: z.string(),
    duration: z.string(),
    verifiable: z.boolean()
  }),
  relationships: z.array(z.object({
    name: z.string(),
    relationship: z.string(),
    contacted: z.boolean()
  })),
  hobbies: z.array(z.string()),
  travelHistory: z.array(z.object({
    location: z.string(),
    dates: z.string(),
    purpose: z.string()
  })),
  socialMedia: z.array(z.object({
    platform: z.string(),
    profile: z.string(),
    active: z.boolean()
  })),
  lastReviewed: z.date(),
  vulnerabilities: z.array(z.string()).optional(),
  mitigations: z.array(z.string()).optional(),
  status: z.enum(['ACTIVE', 'COMPROMISED', 'UPDATING', 'RETIRED'])
});

export const SurveillanceDetectionRouteSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string(),
  startLocation: z.object({
    lat: z.number(),
    lon: z.number(),
    description: z.string()
  }),
  endLocation: z.object({
    lat: z.number(),
    lon: z.number(),
    description: z.string()
  }),
  waypoints: z.array(z.object({
    lat: z.number(),
    lon: z.number(),
    description: z.string(),
    observationPoint: z.boolean()
  })),
  duration: z.number().positive(),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']),
  detectionTechniques: z.array(z.string()),
  lastUsed: z.date().optional(),
  effectiveness: z.number().min(0).max(100).optional(),
  notes: z.string().optional()
});

export const SecurityIncidentSchema = z.object({
  id: z.string().uuid(),
  type: z.nativeEnum(IncidentType),
  severity: z.nativeEnum(ThreatLevel),
  status: z.nativeEnum(IncidentStatus),
  reportedBy: z.string().uuid(),
  reportedDate: z.date(),
  incidentDate: z.date(),
  location: z.string().optional(),
  description: z.string(),
  affectedEntities: z.array(z.object({
    entityId: z.string().uuid(),
    entityType: z.enum(['SOURCE', 'HANDLER', 'OPERATION', 'LOCATION', 'DEVICE']),
    impact: z.string()
  })),
  indicators: z.array(z.string()),
  investigation: z.object({
    assignedTo: z.string().uuid().optional(),
    findings: z.string().optional(),
    evidence: z.array(z.string()).optional(),
    recommendations: z.array(z.string()).optional()
  }).optional(),
  mitigationActions: z.array(z.object({
    action: z.string(),
    completedDate: z.date().optional(),
    responsible: z.string().uuid()
  })),
  resolved: z.boolean(),
  resolvedDate: z.date().optional(),
  lessonsLearned: z.string().optional(),
  metadata: z.record(z.unknown()).optional()
});

export const CompromiseIndicatorSchema = z.object({
  id: z.string().uuid(),
  type: z.nativeEnum(CompromiseIndicatorType),
  name: z.string(),
  description: z.string(),
  detectionMethod: z.string(),
  severity: z.nativeEnum(ThreatLevel),
  automatedDetection: z.boolean(),
  responseProtocol: z.string(),
  active: z.boolean()
});

export const ThreatAssessmentSchema = z.object({
  id: z.string().uuid(),
  entityId: z.string().uuid(),
  entityType: z.enum(['SOURCE', 'HANDLER', 'OPERATION', 'LOCATION']),
  assessmentDate: z.date(),
  threatLevel: z.nativeEnum(ThreatLevel),
  threats: z.array(z.object({
    threat: z.string(),
    likelihood: z.enum(['LOW', 'MEDIUM', 'HIGH']),
    impact: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
    mitigations: z.array(z.string())
  })),
  indicators: z.array(z.string()),
  riskScore: z.number().min(0).max(100),
  recommendations: z.array(z.string()),
  nextReviewDate: z.date(),
  assessedBy: z.string().uuid()
});

export const AccessControlRecordSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  resourceId: z.string(),
  resourceType: z.string(),
  action: z.enum(['VIEW', 'EDIT', 'DELETE', 'EXPORT', 'SHARE']),
  granted: z.boolean(),
  denialReason: z.string().optional(),
  timestamp: z.date(),
  compartment: z.string().optional(),
  needToKnow: z.boolean(),
  metadata: z.record(z.unknown()).optional()
});

export const OperationalPatternSchema = z.object({
  entityId: z.string().uuid(),
  entityType: z.enum(['SOURCE', 'HANDLER', 'OPERATION']),
  patternType: z.enum(['MEETING', 'COMMUNICATION', 'TRAVEL', 'ACCESS']),
  baselineMetrics: z.object({
    frequency: z.number(),
    timing: z.array(z.number()),
    locations: z.array(z.string()),
    duration: z.number()
  }),
  currentMetrics: z.object({
    frequency: z.number(),
    timing: z.array(z.number()),
    locations: z.array(z.string()),
    duration: z.number()
  }),
  deviationScore: z.number().min(0).max(100),
  anomaliesDetected: z.array(z.string()),
  lastAnalyzed: z.date()
});

export const CompartmentationRuleSchema = z.object({
  id: z.string().uuid(),
  compartmentName: z.string(),
  description: z.string(),
  accessCriteria: z.array(z.object({
    criterion: z.string(),
    required: z.boolean()
  })),
  authorizedPersonnel: z.array(z.string().uuid()),
  resources: z.array(z.object({
    resourceId: z.string(),
    resourceType: z.string()
  })),
  auditRequired: z.boolean(),
  active: z.boolean(),
  created: z.date(),
  lastModified: z.date()
});

export const SurveillanceReportSchema = z.object({
  id: z.string().uuid(),
  reportedBy: z.string().uuid(),
  reportDate: z.date(),
  incidentDate: z.date(),
  location: z.string(),
  coordinates: z.object({
    lat: z.number(),
    lon: z.number()
  }).optional(),
  detectionStatus: z.nativeEnum(SurveillanceDetectionStatus),
  surveillanceType: z.enum(['PHYSICAL', 'TECHNICAL', 'CYBER', 'MIXED']),
  observations: z.array(z.object({
    time: z.date(),
    description: z.string(),
    evidence: z.string().optional()
  })),
  suspectedActors: z.array(z.object({
    description: z.string(),
    affiliation: z.string().optional(),
    behavior: z.string()
  })),
  counterMeasuresTaken: z.array(z.string()),
  routeUsed: z.string().uuid().optional(),
  compromiseRisk: z.nativeEnum(ThreatLevel),
  followUpRequired: z.boolean(),
  actionsTaken: z.array(z.string())
});

// Type exports
export type CoverStory = z.infer<typeof CoverStorySchema>;
export type SurveillanceDetectionRoute = z.infer<typeof SurveillanceDetectionRouteSchema>;
export type SecurityIncident = z.infer<typeof SecurityIncidentSchema>;
export type CompromiseIndicator = z.infer<typeof CompromiseIndicatorSchema>;
export type ThreatAssessment = z.infer<typeof ThreatAssessmentSchema>;
export type AccessControlRecord = z.infer<typeof AccessControlRecordSchema>;
export type OperationalPattern = z.infer<typeof OperationalPatternSchema>;
export type CompartmentationRule = z.infer<typeof CompartmentationRuleSchema>;
export type SurveillanceReport = z.infer<typeof SurveillanceReportSchema>;
