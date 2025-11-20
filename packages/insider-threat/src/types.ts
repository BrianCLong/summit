/**
 * Insider Threat Detection Types
 */

import { z } from 'zod';

// Risk levels for insider threats
export enum ThreatRiskLevel {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
  INFO = 'INFO'
}

// Types of insider threat indicators
export enum ThreatIndicatorType {
  BEHAVIORAL_ANOMALY = 'BEHAVIORAL_ANOMALY',
  PRIVILEGED_ACCESS = 'PRIVILEGED_ACCESS',
  DATA_EXFILTRATION = 'DATA_EXFILTRATION',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  POLICY_VIOLATION = 'POLICY_VIOLATION',
  FINANCIAL_STRESS = 'FINANCIAL_STRESS',
  FOREIGN_CONTACT = 'FOREIGN_CONTACT',
  TRAVEL_PATTERN = 'TRAVEL_PATTERN',
  WORKPLACE_BEHAVIOR = 'WORKPLACE_BEHAVIOR',
  LOYALTY_CONCERN = 'LOYALTY_CONCERN'
}

// Behavioral anomaly detection
export const BehavioralAnomalySchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  timestamp: z.date(),
  anomalyType: z.enum([
    'ACCESS_TIME',
    'ACCESS_FREQUENCY',
    'RESOURCE_USAGE',
    'COMMUNICATION_PATTERN',
    'LOGIN_LOCATION',
    'DEVICE_CHANGE',
    'DATA_ACCESS_VOLUME',
    'DOWNLOAD_PATTERN'
  ]),
  severity: z.nativeEnum(ThreatRiskLevel),
  baselineDeviation: z.number().min(0).max(100),
  description: z.string(),
  context: z.record(z.any()),
  mlConfidence: z.number().min(0).max(1)
});

export type BehavioralAnomaly = z.infer<typeof BehavioralAnomalySchema>;

// Privileged access monitoring
export const PrivilegedAccessEventSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  timestamp: z.date(),
  accessType: z.enum([
    'ADMIN_LOGIN',
    'ROOT_ACCESS',
    'DATABASE_ACCESS',
    'CONFIG_CHANGE',
    'USER_MANAGEMENT',
    'SECURITY_SETTINGS',
    'SENSITIVE_DATA',
    'FINANCIAL_SYSTEM'
  ]),
  resource: z.string(),
  action: z.string(),
  authorized: z.boolean(),
  riskScore: z.number().min(0).max(100),
  justification: z.string().optional(),
  approver: z.string().optional()
});

export type PrivilegedAccessEvent = z.infer<typeof PrivilegedAccessEventSchema>;

// Data exfiltration detection
export const DataExfiltrationIndicatorSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  timestamp: z.date(),
  method: z.enum([
    'USB_DEVICE',
    'EMAIL',
    'CLOUD_UPLOAD',
    'FTP',
    'ENCRYPTED_CHANNEL',
    'PRINT',
    'SCREENSHOT',
    'NETWORK_TRANSFER'
  ]),
  dataVolume: z.number(),
  dataClassification: z.enum(['TOP_SECRET', 'SECRET', 'CONFIDENTIAL', 'UNCLASSIFIED']),
  destination: z.string(),
  blocked: z.boolean(),
  riskScore: z.number().min(0).max(100)
});

export type DataExfiltrationIndicator = z.infer<typeof DataExfiltrationIndicatorSchema>;

// Unauthorized access attempts
export const UnauthorizedAccessAttemptSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  timestamp: z.date(),
  targetResource: z.string(),
  attemptType: z.enum([
    'FAILED_LOGIN',
    'PRIVILEGE_ESCALATION',
    'UNAUTHORIZED_FILE',
    'RESTRICTED_AREA',
    'SYSTEM_BYPASS',
    'CREDENTIAL_MISUSE'
  ]),
  sourceIp: z.string(),
  deviceId: z.string(),
  blocked: z.boolean(),
  alertGenerated: z.boolean()
});

export type UnauthorizedAccessAttempt = z.infer<typeof UnauthorizedAccessAttemptSchema>;

// Policy violation tracking
export const PolicyViolationSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  timestamp: z.date(),
  policyId: z.string(),
  policyName: z.string(),
  violationType: z.enum([
    'DATA_HANDLING',
    'ACCEPTABLE_USE',
    'SECURITY_PROTOCOL',
    'CONFIDENTIALITY',
    'CONFLICT_OF_INTEREST',
    'REPORTING_REQUIREMENT'
  ]),
  severity: z.nativeEnum(ThreatRiskLevel),
  description: z.string(),
  remediation: z.string().optional(),
  reportedToSecurity: z.boolean()
});

export type PolicyViolation = z.infer<typeof PolicyViolationSchema>;

// Financial stress indicators
export const FinancialStressIndicatorSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  timestamp: z.date(),
  indicatorType: z.enum([
    'DEBT_LEVEL',
    'BANKRUPTCY',
    'GARNISHMENT',
    'CREDIT_ISSUES',
    'GAMBLING',
    'LIFESTYLE_CHANGE',
    'FINANCIAL_DISCLOSURE'
  ]),
  severity: z.nativeEnum(ThreatRiskLevel),
  source: z.string(),
  verified: z.boolean(),
  notes: z.string().optional()
});

export type FinancialStressIndicator = z.infer<typeof FinancialStressIndicatorSchema>;

// Foreign contact reporting
export const ForeignContactReportSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  reportDate: z.date(),
  contactDate: z.date(),
  contactName: z.string(),
  contactNationality: z.string(),
  contactType: z.enum([
    'PERSONAL',
    'PROFESSIONAL',
    'FAMILY',
    'ROMANTIC',
    'BUSINESS',
    'ACADEMIC'
  ]),
  contactFrequency: z.enum(['SINGLE', 'OCCASIONAL', 'REGULAR', 'FREQUENT']),
  natureOfRelationship: z.string(),
  securityConcern: z.boolean(),
  investigationRequired: z.boolean(),
  notes: z.string().optional()
});

export type ForeignContactReport = z.infer<typeof ForeignContactReportSchema>;

// Travel pattern analysis
export const TravelPatternSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  travelDate: z.date(),
  destination: z.string(),
  country: z.string(),
  purpose: z.enum(['BUSINESS', 'PERSONAL', 'FAMILY', 'VACATION', 'OTHER']),
  duration: z.number(),
  briefingCompleted: z.boolean(),
  debriefingCompleted: z.boolean(),
  riskAssessment: z.nativeEnum(ThreatRiskLevel),
  suspiciousPattern: z.boolean(),
  notes: z.string().optional()
});

export type TravelPattern = z.infer<typeof TravelPatternSchema>;

// Workplace behavior changes
export const WorkplaceBehaviorChangeSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  timestamp: z.date(),
  changeType: z.enum([
    'ATTITUDE',
    'PERFORMANCE',
    'PUNCTUALITY',
    'COMMUNICATION',
    'SOCIAL_INTERACTION',
    'STRESS_LEVEL',
    'ENGAGEMENT',
    'COOPERATION'
  ]),
  severity: z.nativeEnum(ThreatRiskLevel),
  description: z.string(),
  reportedBy: z.string(),
  actionTaken: z.string().optional(),
  followUpRequired: z.boolean()
});

export type WorkplaceBehaviorChange = z.infer<typeof WorkplaceBehaviorChangeSchema>;

// Loyalty and reliability assessment
export const LoyaltyAssessmentSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  assessmentDate: z.date(),
  assessmentType: z.enum([
    'INITIAL_CLEARANCE',
    'PERIODIC_REVIEW',
    'TRIGGERED_REVIEW',
    'INCIDENT_BASED'
  ]),
  overallScore: z.number().min(0).max(100),
  factors: z.object({
    allegiance: z.number().min(0).max(100),
    foreignInfluence: z.number().min(0).max(100),
    financialStability: z.number().min(0).max(100),
    substanceAbuse: z.number().min(0).max(100),
    psychologicalCondition: z.number().min(0).max(100),
    personalConduct: z.number().min(0).max(100),
    criminalConduct: z.number().min(0).max(100)
  }),
  recommendation: z.enum(['APPROVE', 'CONDITIONAL', 'DENY', 'REVOKE']),
  restrictions: z.array(z.string()).optional(),
  notes: z.string().optional()
});

export type LoyaltyAssessment = z.infer<typeof LoyaltyAssessmentSchema>;

// Comprehensive insider threat profile
export const InsiderThreatProfileSchema = z.object({
  userId: z.string(),
  lastUpdated: z.date(),
  overallRiskScore: z.number().min(0).max(100),
  riskLevel: z.nativeEnum(ThreatRiskLevel),
  activeIndicators: z.number(),
  totalIncidents: z.number(),
  indicators: z.object({
    behavioral: z.array(z.string()),
    privilegedAccess: z.array(z.string()),
    dataExfiltration: z.array(z.string()),
    unauthorizedAccess: z.array(z.string()),
    policyViolations: z.array(z.string()),
    financialStress: z.array(z.string()),
    foreignContacts: z.array(z.string()),
    travelPatterns: z.array(z.string()),
    behaviorChanges: z.array(z.string())
  }),
  clearanceStatus: z.enum(['ACTIVE', 'SUSPENDED', 'REVOKED', 'PENDING']),
  monitoringLevel: z.enum(['STANDARD', 'ENHANCED', 'INTENSIVE', 'SURVEILLANCE']),
  lastIncidentDate: z.date().optional(),
  investigationStatus: z.enum(['NONE', 'PRELIMINARY', 'ACTIVE', 'CLOSED']).optional(),
  mitigationActions: z.array(z.string()),
  recommendations: z.array(z.string())
});

export type InsiderThreatProfile = z.infer<typeof InsiderThreatProfileSchema>;
