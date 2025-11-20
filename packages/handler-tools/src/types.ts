import { z } from 'zod';

/**
 * Meeting Types
 */
export enum MeetingType {
  PHYSICAL = 'PHYSICAL',
  VIRTUAL = 'VIRTUAL',
  DEAD_DROP = 'DEAD_DROP',
  PHONE = 'PHONE',
  SECURE_MESSAGING = 'SECURE_MESSAGING',
  BRUSH_PASS = 'BRUSH_PASS'
}

/**
 * Meeting Status
 */
export enum MeetingStatus {
  PLANNED = 'PLANNED',
  CONFIRMED = 'CONFIRMED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
  COMPROMISED = 'COMPROMISED'
}

/**
 * Security Level
 */
export enum SecurityLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

/**
 * Handler Performance Metric Type
 */
export enum MetricType {
  SOURCE_RECRUITMENT = 'SOURCE_RECRUITMENT',
  MEETING_COMPLETION = 'MEETING_COMPLETION',
  INTELLIGENCE_QUALITY = 'INTELLIGENCE_QUALITY',
  SECURITY_COMPLIANCE = 'SECURITY_COMPLIANCE',
  SOURCE_RETENTION = 'SOURCE_RETENTION'
}

// Schemas
export const SafeLocationSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  address: z.string(),
  coordinates: z.object({
    lat: z.number(),
    lon: z.number()
  }),
  securityLevel: z.nativeEnum(SecurityLevel),
  coverType: z.enum(['RESTAURANT', 'CAFE', 'PARK', 'OFFICE', 'HOTEL', 'RESIDENCE', 'PUBLIC_SPACE', 'OTHER']),
  surveillanceDetectionRoutes: z.array(z.string()).optional(),
  emergencyExits: z.array(z.string()).optional(),
  lastSecurity Review: z.date(),
  approved: z.boolean(),
  capacity: z.number().positive(),
  notes: z.string().optional(),
  metadata: z.record(z.unknown()).optional()
});

export const MeetingPlanSchema = z.object({
  id: z.string().uuid(),
  sourceId: z.string().uuid(),
  handlerId: z.string().uuid(),
  type: z.nativeEnum(MeetingType),
  status: z.nativeEnum(MeetingStatus),
  scheduledDate: z.date(),
  duration: z.number().positive(),
  locationId: z.string().uuid().optional(),
  locationDetails: z.string().optional(),
  objectives: z.array(z.string()),
  briefingMaterials: z.array(z.string()).optional(),
  communicationPlan: z.string(),
  emergencyProtocol: z.string(),
  surveillanceDetection: z.boolean(),
  backupHandler: z.string().uuid().optional(),
  securityLevel: z.nativeEnum(SecurityLevel),
  approvedBy: z.string().uuid().optional(),
  actualStartTime: z.date().optional(),
  actualEndTime: z.date().optional(),
  outcome: z.string().optional(),
  securityIncidents: z.array(z.string()).optional(),
  created: z.date(),
  updated: z.date()
});

export const HandlerPerformanceSchema = z.object({
  handlerId: z.string().uuid(),
  period: z.object({
    start: z.date(),
    end: z.date()
  }),
  metrics: z.object({
    totalSources: z.number().min(0),
    activeSources: z.number().min(0),
    meetingsScheduled: z.number().min(0),
    meetingsCompleted: z.number().min(0),
    meetingCompletionRate: z.number().min(0).max(100),
    avgIntelligenceValue: z.number().min(0).max(10),
    sourcesRecruited: z.number().min(0),
    sourcesRetained: z.number().min(0),
    securityViolations: z.number().min(0),
    reportQualityScore: z.number().min(0).max(100),
    responseTime: z.number().min(0),
    overallScore: z.number().min(0).max(100)
  }),
  recommendations: z.array(z.string()).optional(),
  trainingNeeds: z.array(z.string()).optional()
});

export const CommunicationProtocolSchema = z.object({
  id: z.string().uuid(),
  sourceId: z.string().uuid(),
  primaryMethod: z.enum(['PHYSICAL', 'PHONE', 'ENCRYPTED_MESSAGE', 'EMAIL', 'DEAD_DROP', 'SIGNAL_APP']),
  backupMethod: z.enum(['PHYSICAL', 'PHONE', 'ENCRYPTED_MESSAGE', 'EMAIL', 'DEAD_DROP', 'SIGNAL_APP']),
  schedule: z.string(),
  authenticationCode: z.string(),
  duressCode: z.string(),
  emergencyContact: z.string(),
  encryptionKey: z.string().optional(),
  lastUsed: z.date().optional(),
  expiryDate: z.date().optional(),
  notes: z.string().optional()
});

export const AfterActionReportSchema = z.object({
  id: z.string().uuid(),
  meetingId: z.string().uuid(),
  handlerId: z.string().uuid(),
  sourceId: z.string().uuid(),
  reportDate: z.date(),
  objectives: z.array(z.object({
    objective: z.string(),
    achieved: z.boolean(),
    notes: z.string().optional()
  })),
  intelligenceGathered: z.array(z.object({
    topic: z.string(),
    information: z.string(),
    credibility: z.number().min(1).max(6),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
  })),
  sourcePerformance: z.object({
    cooperation: z.number().min(1).max(10),
    reliability: z.number().min(1).max(10),
    accessLevel: z.number().min(1).max(10),
    motivation: z.string()
  }),
  securityAssessment: z.object({
    surveillanceDetected: z.boolean(),
    securityIncidents: z.array(z.string()),
    riskLevel: z.nativeEnum(SecurityLevel),
    recommendations: z.array(z.string())
  }),
  nextSteps: z.array(z.string()),
  followUpRequired: z.boolean(),
  followUpDate: z.date().optional(),
  lessons Learned: z.array(z.string()).optional(),
  attachments: z.array(z.string()).optional()
});

export const HandlerWorkloadSchema = z.object({
  handlerId: z.string().uuid(),
  totalSources: z.number().min(0),
  activeSources: z.number().min(0),
  upcomingMeetings: z.number().min(0),
  pendingReports: z.number().min(0),
  trainingHours: z.number().min(0),
  workloadScore: z.number().min(0).max(100),
  status: z.enum(['UNDER_CAPACITY', 'OPTIMAL', 'NEAR_CAPACITY', 'OVER_CAPACITY'])
});

// Type exports
export type SafeLocation = z.infer<typeof SafeLocationSchema>;
export type MeetingPlan = z.infer<typeof MeetingPlanSchema>;
export type HandlerPerformance = z.infer<typeof HandlerPerformanceSchema>;
export type CommunicationProtocol = z.infer<typeof CommunicationProtocolSchema>;
export type AfterActionReport = z.infer<typeof AfterActionReportSchema>;
export type HandlerWorkload = z.infer<typeof HandlerWorkloadSchema>;
