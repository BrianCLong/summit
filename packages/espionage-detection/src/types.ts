/**
 * Espionage Detection Types
 */

import { z } from 'zod';

export enum EspionageThreatLevel {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW'
}

// Technical surveillance detection
export const TechnicalSurveillanceIndicatorSchema = z.object({
  id: z.string().uuid(),
  timestamp: z.date(),
  surveillanceType: z.enum([
    'RF_SURVEILLANCE',
    'AUDIO_DEVICE',
    'VIDEO_DEVICE',
    'GPS_TRACKING',
    'WIFI_MONITORING',
    'CELLULAR_INTERCEPTION',
    'NETWORK_TAP',
    'KEYSTROKE_LOGGER'
  ]),
  location: z.string(),
  frequency: z.number().optional(),
  signalStrength: z.number().optional(),
  deviceSignature: z.string().optional(),
  threatLevel: z.nativeEnum(EspionageThreatLevel),
  verified: z.boolean(),
  countermeasure: z.string().optional()
});

export type TechnicalSurveillanceIndicator = z.infer<typeof TechnicalSurveillanceIndicatorSchema>;

// Physical surveillance detection
export const PhysicalSurveillanceSchema = z.object({
  id: z.string().uuid(),
  timestamp: z.date(),
  targetId: z.string(),
  location: z.string(),
  surveillanceMethod: z.enum([
    'FOOT_SURVEILLANCE',
    'VEHICLE_SURVEILLANCE',
    'FIXED_OBSERVATION',
    'MOBILE_OBSERVATION',
    'AERIAL_SURVEILLANCE',
    'ELECTRONIC_MONITORING'
  ]),
  operatives: z.number(),
  vehicles: z.array(z.string()).optional(),
  duration: z.number(),
  pattern: z.string(),
  confidence: z.number().min(0).max(1),
  counteredSuccessfully: z.boolean()
});

export type PhysicalSurveillance = z.infer<typeof PhysicalSurveillanceSchema>;

// Elicitation attempts
export const ElicitationAttemptSchema = z.object({
  id: z.string().uuid(),
  timestamp: z.date(),
  targetId: z.string(),
  elicitorProfile: z.object({
    name: z.string().optional(),
    organization: z.string().optional(),
    nationality: z.string().optional(),
    cover: z.string()
  }),
  method: z.enum([
    'CASUAL_CONVERSATION',
    'FLATTERY',
    'ASSUMED_KNOWLEDGE',
    'QUID_PRO_QUO',
    'SYMPATHY',
    'CRITICISM',
    'BRACKETING',
    'SURVEY_PRETEXT'
  ]),
  topic: z.string(),
  sensitiveInfoSought: z.array(z.string()),
  informationDisclosed: z.boolean(),
  reported: z.boolean(),
  threatLevel: z.nativeEnum(EspionageThreatLevel)
});

export type ElicitationAttempt = z.infer<typeof ElicitationAttemptSchema>;

// Social engineering attacks
export const SocialEngineeringAttackSchema = z.object({
  id: z.string().uuid(),
  timestamp: z.date(),
  targetId: z.string(),
  attackVector: z.enum([
    'PHISHING',
    'SPEAR_PHISHING',
    'PRETEXTING',
    'BAITING',
    'TAILGATING',
    'QUID_PRO_QUO',
    'IMPERSONATION',
    'VISHING',
    'SMISHING'
  ]),
  attackerProfile: z.object({
    identityUsed: z.string(),
    organization: z.string().optional(),
    contactMethod: z.string()
  }),
  objective: z.string(),
  successful: z.boolean(),
  dataCompromised: z.array(z.string()).optional(),
  mitigationApplied: z.string().optional()
});

export type SocialEngineeringAttack = z.infer<typeof SocialEngineeringAttackSchema>;

// Recruitment approach indicators
export const RecruitmentApproachSchema = z.object({
  id: z.string().uuid(),
  timestamp: z.date(),
  targetId: z.string(),
  approachMethod: z.enum([
    'DIRECT_CONTACT',
    'INTERMEDIARY',
    'ONLINE_PLATFORM',
    'PROFESSIONAL_NETWORK',
    'SOCIAL_EVENT',
    'ACADEMIC_CONFERENCE',
    'BUSINESS_MEETING'
  ]),
  recruiterProfile: z.object({
    name: z.string().optional(),
    organization: z.string().optional(),
    nationality: z.string().optional(),
    suspectedService: z.string().optional()
  }),
  incentiveOffered: z.enum([
    'MONEY',
    'CAREER_ADVANCEMENT',
    'IDEOLOGY',
    'BLACKMAIL',
    'ROMANCE',
    'REVENGE',
    'NONE_IDENTIFIED'
  ]),
  initialAsk: z.string(),
  reported: z.boolean(),
  responseAction: z.string(),
  threatLevel: z.nativeEnum(EspionageThreatLevel)
});

export type RecruitmentApproach = z.infer<typeof RecruitmentApproachSchema>;

// Covert communication detection
export const CovertCommunicationSchema = z.object({
  id: z.string().uuid(),
  timestamp: z.date(),
  subjectId: z.string(),
  communicationMethod: z.enum([
    'DEAD_DROP',
    'STEGANOGRAPHY',
    'ENCRYPTED_MESSAGING',
    'CODED_LANGUAGE',
    'BURST_TRANSMISSION',
    'NUMBERS_STATION',
    'BRUSH_PASS',
    'SIGNAL_SITE'
  ]),
  location: z.string().optional(),
  frequency: z.string().optional(),
  contentAnalysis: z.object({
    encrypted: z.boolean(),
    language: z.string(),
    suspiciousKeywords: z.array(z.string())
  }),
  participants: z.array(z.string()),
  threatLevel: z.nativeEnum(EspionageThreatLevel),
  decrypted: z.boolean(),
  actionTaken: z.string()
});

export type CovertCommunication = z.infer<typeof CovertCommunicationSchema>;

// Foreign intelligence service TTP tracking
export const ForeignIntelligenceServiceSchema = z.object({
  serviceId: z.string(),
  serviceName: z.string(),
  country: z.string(),
  primaryMission: z.array(z.string()),
  knownTTPs: z.array(z.object({
    category: z.string(),
    technique: z.string(),
    description: z.string(),
    indicators: z.array(z.string()),
    lastObserved: z.date()
  })),
  targetPriorities: z.array(z.string()),
  operationalAreas: z.array(z.string()),
  capabilities: z.object({
    technical: z.array(z.string()),
    human: z.array(z.string()),
    cyber: z.array(z.string())
  }),
  recentActivity: z.array(z.object({
    date: z.date(),
    operation: z.string(),
    targets: z.array(z.string()),
    outcome: z.string()
  }))
});

export type ForeignIntelligenceService = z.infer<typeof ForeignIntelligenceServiceSchema>;

// Intelligence collection methodology analysis
export const CollectionMethodologySchema = z.object({
  id: z.string().uuid(),
  timestamp: z.date(),
  methodology: z.enum([
    'HUMINT',
    'SIGINT',
    'IMINT',
    'MASINT',
    'OSINT',
    'TECHINT',
    'CYBINT',
    'FININT'
  ]),
  targetEntity: z.string(),
  collectionPlatform: z.string(),
  dataTypes: z.array(z.string()),
  sophistication: z.enum(['LOW', 'MEDIUM', 'HIGH', 'ADVANCED']),
  attribution: z.object({
    country: z.string().optional(),
    service: z.string().optional(),
    confidence: z.number().min(0).max(1)
  }),
  countermeasures: z.array(z.string()),
  effectiveness: z.number().min(0).max(100)
});

export type CollectionMethodology = z.infer<typeof CollectionMethodologySchema>;
