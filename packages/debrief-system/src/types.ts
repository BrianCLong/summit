import { z } from 'zod';
import { SourceReliability, InformationCredibility } from '@intelgraph/source-database';

/**
 * Intelligence Report Types
 */
export enum ReportType {
  HUMINT = 'HUMINT',
  SPOT_REPORT = 'SPOT_REPORT',
  PERIODIC = 'PERIODIC',
  SPECIAL_INTEREST = 'SPECIAL_INTEREST',
  WARNING = 'WARNING',
  ASSESSMENT = 'ASSESSMENT'
}

/**
 * Report Classification
 */
export enum ReportClassification {
  UNCLASSIFIED = 'UNCLASSIFIED',
  CONFIDENTIAL = 'CONFIDENTIAL',
  SECRET = 'SECRET',
  TOP_SECRET = 'TOP_SECRET',
  SCI = 'SCI'
}

/**
 * Report Status
 */
export enum ReportStatus {
  DRAFT = 'DRAFT',
  PENDING_REVIEW = 'PENDING_REVIEW',
  APPROVED = 'APPROVED',
  DISSEMINATED = 'DISSEMINATED',
  ARCHIVED = 'ARCHIVED',
  REJECTED = 'REJECTED'
}

/**
 * Intelligence Priority
 */
export enum IntelligencePriority {
  ROUTINE = 'ROUTINE',
  PRIORITY = 'PRIORITY',
  IMMEDIATE = 'IMMEDIATE',
  FLASH = 'FLASH'
}

/**
 * Validation Status
 */
export enum ValidationStatus {
  PENDING = 'PENDING',
  CORROBORATED = 'CORROBORATED',
  CONTRADICTED = 'CONTRADICTED',
  UNVERIFIED = 'UNVERIFIED'
}

// Schemas
export const DebriefQuestionSchema = z.object({
  id: z.string().uuid(),
  category: z.string(),
  question: z.string(),
  required: z.boolean(),
  order: z.number().positive(),
  followUps: z.array(z.string()).optional(),
  relatedPIRs: z.array(z.string()).optional()
});

export const DebriefResponseSchema = z.object({
  questionId: z.string().uuid(),
  response: z.string(),
  timestamp: z.date(),
  audioRecordingUrl: z.string().optional(),
  videoRecordingUrl: z.string().optional(),
  transcriptionUrl: z.string().optional(),
  handlerNotes: z.string().optional(),
  followUpRequired: z.boolean()
});

export const DebriefSessionSchema = z.object({
  id: z.string().uuid(),
  sourceId: z.string().uuid(),
  handlerId: z.string().uuid(),
  meetingId: z.string().uuid().optional(),
  startTime: z.date(),
  endTime: z.date().optional(),
  questions: z.array(DebriefQuestionSchema),
  responses: z.array(DebriefResponseSchema),
  status: z.enum(['IN_PROGRESS', 'COMPLETED', 'PAUSED', 'CANCELLED']),
  recordingEnabled: z.boolean(),
  transcriptionEnabled: z.boolean(),
  metadata: z.record(z.unknown()).optional()
});

export const IntelligenceItemSchema = z.object({
  id: z.string().uuid(),
  sourceId: z.string().uuid(),
  debriefSessionId: z.string().uuid().optional(),
  topic: z.string(),
  category: z.string(),
  information: z.string(),
  context: z.string().optional(),
  sourceReliability: z.nativeEnum(SourceReliability),
  informationCredibility: z.nativeEnum(InformationCredibility),
  collectionDate: z.date(),
  reportDate: z.date(),
  priority: z.nativeEnum(IntelligencePriority),
  validationStatus: z.nativeEnum(ValidationStatus),
  corroboratingSourceIds: z.array(z.string()).optional(),
  contradictingSourceIds: z.array(z.string()).optional(),
  pirIds: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  geolocation: z.object({
    lat: z.number(),
    lon: z.number(),
    accuracy: z.number().optional()
  }).optional(),
  attachments: z.array(z.string()).optional(),
  disseminationRestrictions: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional()
});

export const IntelligenceReportSchema = z.object({
  id: z.string().uuid(),
  reportNumber: z.string(),
  type: z.nativeEnum(ReportType),
  classification: z.nativeEnum(ReportClassification),
  status: z.nativeEnum(ReportStatus),
  priority: z.nativeEnum(IntelligencePriority),
  title: z.string(),
  summary: z.string(),
  sourceIds: z.array(z.string().uuid()),
  intelligenceItems: z.array(z.string().uuid()),
  assessments: z.array(z.object({
    analyst: z.string(),
    assessment: z.string(),
    confidence: z.enum(['LOW', 'MEDIUM', 'HIGH']),
    date: z.date()
  })).optional(),
  disseminationList: z.array(z.string()),
  disseminationDate: z.date().optional(),
  feedback: z.array(z.object({
    customer: z.string(),
    rating: z.number().min(1).max(5),
    comments: z.string(),
    date: z.date()
  })).optional(),
  relatedReports: z.array(z.string()).optional(),
  authorId: z.string().uuid(),
  reviewerId: z.string().uuid().optional(),
  approverId: z.string().uuid().optional(),
  created: z.date(),
  updated: z.date(),
  metadata: z.record(z.unknown()).optional()
});

export const ReportTemplateSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  type: z.nativeEnum(ReportType),
  sections: z.array(z.object({
    title: z.string(),
    content: z.string(),
    required: z.boolean(),
    order: z.number()
  })),
  defaultClassification: z.nativeEnum(ReportClassification),
  defaultDissemination: z.array(z.string()).optional(),
  active: z.boolean()
});

export const CorroborationRecordSchema = z.object({
  id: z.string().uuid(),
  primaryItemId: z.string().uuid(),
  corroboratingItemId: z.string().uuid(),
  analystId: z.string(),
  similarity: z.number().min(0).max(100),
  notes: z.string().optional(),
  date: z.date()
});

export const FeedbackRecordSchema = z.object({
  id: z.string().uuid(),
  reportId: z.string().uuid(),
  customerId: z.string(),
  customerName: z.string(),
  timeliness: z.number().min(1).max(5),
  relevance: z.number().min(1).max(5),
  accuracy: z.number().min(1).max(5),
  usefulness: z.number().min(1).max(5),
  overallRating: z.number().min(1).max(5),
  comments: z.string().optional(),
  actionTaken: z.string().optional(),
  date: z.date()
});

// Type exports
export type DebriefQuestion = z.infer<typeof DebriefQuestionSchema>;
export type DebriefResponse = z.infer<typeof DebriefResponseSchema>;
export type DebriefSession = z.infer<typeof DebriefSessionSchema>;
export type IntelligenceItem = z.infer<typeof IntelligenceItemSchema>;
export type IntelligenceReport = z.infer<typeof IntelligenceReportSchema>;
export type ReportTemplate = z.infer<typeof ReportTemplateSchema>;
export type CorroborationRecord = z.infer<typeof CorroborationRecordSchema>;
export type FeedbackRecord = z.infer<typeof FeedbackRecordSchema>;
