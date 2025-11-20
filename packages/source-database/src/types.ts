import { z } from 'zod';

/**
 * Source Classification Levels
 */
export enum SourceClassification {
  CONFIDENTIAL = 'CONFIDENTIAL',
  SECRET = 'SECRET',
  TOP_SECRET = 'TOP_SECRET',
  COMPARTMENTED = 'COMPARTMENTED'
}

/**
 * Source Reliability Ratings (NATO Standard)
 */
export enum SourceReliability {
  A = 'A', // Completely reliable
  B = 'B', // Usually reliable
  C = 'C', // Fairly reliable
  D = 'D', // Not usually reliable
  E = 'E', // Unreliable
  F = 'F'  // Reliability cannot be judged
}

/**
 * Information Credibility Ratings
 */
export enum InformationCredibility {
  ONE = '1',   // Confirmed by other sources
  TWO = '2',   // Probably true
  THREE = '3', // Possibly true
  FOUR = '4',  // Doubtful
  FIVE = '5',  // Improbable
  SIX = '6'    // Truth cannot be judged
}

/**
 * Source Status
 */
export enum SourceStatus {
  PROSPECT = 'PROSPECT',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  TERMINATED = 'TERMINATED',
  COMPROMISED = 'COMPROMISED',
  DECEASED = 'DECEASED'
}

/**
 * Source Motivation Types
 */
export enum SourceMotivation {
  FINANCIAL = 'FINANCIAL',
  IDEOLOGICAL = 'IDEOLOGICAL',
  COERCION = 'COERCION',
  EGO = 'EGO',
  REVENGE = 'REVENGE',
  PATRIOTIC = 'PATRIOTIC',
  MIXED = 'MIXED',
  UNKNOWN = 'UNKNOWN'
}

/**
 * Access Level Assessment
 */
export enum AccessLevel {
  DIRECT = 'DIRECT',
  INDIRECT = 'INDIRECT',
  SECONDHAND = 'SECONDHAND',
  RUMOR = 'RUMOR'
}

/**
 * Vetting Status
 */
export enum VettingStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  PASSED = 'PASSED',
  FAILED = 'FAILED',
  DEFERRED = 'DEFERRED'
}

/**
 * Polygraph Result
 */
export enum PolygraphResult {
  PASSED = 'PASSED',
  FAILED = 'FAILED',
  INCONCLUSIVE = 'INCONCLUSIVE',
  NOT_ADMINISTERED = 'NOT_ADMINISTERED'
}

// Zod Schemas for validation
export const SourceContactSchema = z.object({
  id: z.string().uuid(),
  sourceId: z.string().uuid(),
  handlerId: z.string().uuid(),
  contactDate: z.date(),
  location: z.string(),
  duration: z.number().positive(),
  meetingType: z.enum(['PHYSICAL', 'VIRTUAL', 'DEAD_DROP', 'SIGNAL']),
  summary: z.string(),
  intelligenceValue: z.number().min(1).max(10),
  securityIncidents: z.array(z.string()).optional(),
  nextContactDate: z.date().optional(),
  metadata: z.record(z.unknown()).optional()
});

export const SourceProfileSchema = z.object({
  id: z.string().uuid(),
  codename: z.string(),
  realName: z.string().optional(),
  classification: z.nativeEnum(SourceClassification),
  reliability: z.nativeEnum(SourceReliability),
  status: z.nativeEnum(SourceStatus),
  dateRecruited: z.date(),
  recruitedBy: z.string().uuid(),
  primaryHandler: z.string().uuid(),
  backupHandler: z.string().uuid().optional(),
  motivation: z.nativeEnum(SourceMotivation),
  motivationDetails: z.string().optional(),
  accessLevel: z.nativeEnum(AccessLevel),
  accessDescription: z.string(),
  coverStory: z.string(),
  communicationProtocol: z.string(),
  emergencyContact: z.string(),
  vettingStatus: z.nativeEnum(VettingStatus),
  vettingDate: z.date().optional(),
  polygraphResult: z.nativeEnum(PolygraphResult).optional(),
  polygraphDate: z.date().optional(),
  riskScore: z.number().min(0).max(100),
  totalCompensation: z.number().min(0),
  lastContactDate: z.date().optional(),
  totalContacts: z.number().min(0).default(0),
  totalReports: z.number().min(0).default(0),
  productivityScore: z.number().min(0).max(100),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  created: z.date(),
  updated: z.date()
});

export const SourceNetworkSchema = z.object({
  id: z.string().uuid(),
  sourceId: z.string().uuid(),
  relatedSourceId: z.string().uuid(),
  relationshipType: z.enum([
    'KNOWS',
    'FAMILY',
    'COLLEAGUE',
    'SUPERVISOR',
    'SUBORDINATE',
    'FRIEND',
    'ENEMY',
    'COMPETITOR',
    'UNKNOWN'
  ]),
  relationshipStrength: z.number().min(0).max(10),
  bidirectional: z.boolean(),
  discoveredDate: z.date(),
  verified: z.boolean(),
  notes: z.string().optional()
});

export const CompensationRecordSchema = z.object({
  id: z.string().uuid(),
  sourceId: z.string().uuid(),
  amount: z.number().positive(),
  currency: z.string(),
  paymentType: z.enum(['CASH', 'CRYPTO', 'BANK_TRANSFER', 'GIFT', 'OTHER']),
  paymentDate: z.date(),
  authorizedBy: z.string().uuid(),
  purpose: z.string(),
  receiptNumber: z.string().optional(),
  notes: z.string().optional()
});

export const VettingRecordSchema = z.object({
  id: z.string().uuid(),
  sourceId: z.string().uuid(),
  vettingType: z.enum([
    'BACKGROUND_CHECK',
    'POLYGRAPH',
    'REFERENCE_CHECK',
    'FINANCIAL_REVIEW',
    'SECURITY_INTERVIEW',
    'PSYCHOLOGICAL_EVALUATION'
  ]),
  conductor: z.string(),
  date: z.date(),
  result: z.nativeEnum(VettingStatus),
  findings: z.string(),
  recommendations: z.string(),
  nextReviewDate: z.date().optional()
});

// Type exports
export type SourceContact = z.infer<typeof SourceContactSchema>;
export type SourceProfile = z.infer<typeof SourceProfileSchema>;
export type SourceNetwork = z.infer<typeof SourceNetworkSchema>;
export type CompensationRecord = z.infer<typeof CompensationRecordSchema>;
export type VettingRecord = z.infer<typeof VettingRecordSchema>;
