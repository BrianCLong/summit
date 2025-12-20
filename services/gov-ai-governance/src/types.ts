/**
 * Government AI Governance Types
 *
 * Open source, auditable type definitions for government AI services.
 * Licensed under Apache-2.0 for full transparency and auditability.
 */

import { z } from 'zod';

// ============================================================================
// Citizen Data Control
// ============================================================================

export const CitizenConsentSchema = z.object({
  citizenId: z.string().uuid(),
  dataCategories: z.array(z.enum([
    'personal_identity',
    'contact_information',
    'biometric',
    'financial',
    'health',
    'location',
    'behavioral',
    'communications',
    'government_records',
  ])),
  purposes: z.array(z.enum([
    'service_delivery',
    'fraud_prevention',
    'public_safety',
    'research_anonymized',
    'interagency_sharing',
    'legal_compliance',
  ])),
  consentGiven: z.boolean(),
  consentTimestamp: z.string().datetime(),
  expiresAt: z.string().datetime().optional(),
  withdrawable: z.boolean().default(true),
});

export type CitizenConsent = z.infer<typeof CitizenConsentSchema>;

export const DataAccessRequestSchema = z.object({
  requestId: z.string().uuid(),
  citizenId: z.string().uuid(),
  requestType: z.enum(['access', 'rectification', 'erasure', 'portability', 'restriction']),
  dataCategories: z.array(z.string()),
  justification: z.string().optional(),
  submittedAt: z.string().datetime(),
  status: z.enum(['pending', 'processing', 'completed', 'denied']),
  completedAt: z.string().datetime().optional(),
});

export type DataAccessRequest = z.infer<typeof DataAccessRequestSchema>;

// ============================================================================
// AI Ethics & Compliance
// ============================================================================

export const EthicalPrincipleSchema = z.enum([
  'fairness',
  'accountability',
  'transparency',
  'privacy',
  'security',
  'human_oversight',
  'non_discrimination',
  'explainability',
  'proportionality',
  'lawfulness',
]);

export type EthicalPrinciple = z.infer<typeof EthicalPrincipleSchema>;

export const AIModelRegistrationSchema = z.object({
  modelId: z.string().uuid(),
  name: z.string(),
  version: z.string(),
  purpose: z.string(),
  riskLevel: z.enum(['minimal', 'limited', 'high', 'unacceptable']),
  dataCategories: z.array(z.string()),
  ethicalReview: z.object({
    reviewedAt: z.string().datetime(),
    reviewedBy: z.string(),
    principlesAssessed: z.array(EthicalPrincipleSchema),
    findings: z.array(z.object({
      principle: EthicalPrincipleSchema,
      status: z.enum(['compliant', 'needs_mitigation', 'non_compliant']),
      notes: z.string().optional(),
    })),
    overallStatus: z.enum(['approved', 'conditional', 'rejected']),
  }),
  biasAssessment: z.object({
    assessedAt: z.string().datetime(),
    protectedAttributes: z.array(z.string()),
    disparateImpactRatios: z.record(z.number()),
    mitigationsApplied: z.array(z.string()),
  }).optional(),
  humanOversightRequired: z.boolean(),
  appealMechanismEnabled: z.boolean(),
  sourceCodeHash: z.string(),
  trainingDataLineage: z.string(),
  deploymentEnvironments: z.array(z.enum(['development', 'staging', 'production'])),
  registeredAt: z.string().datetime(),
  lastAuditedAt: z.string().datetime().optional(),
});

export type AIModelRegistration = z.infer<typeof AIModelRegistrationSchema>;

// ============================================================================
// Transparency & Audit
// ============================================================================

export const TransparencyReportSchema = z.object({
  reportId: z.string().uuid(),
  reportingPeriod: z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
  }),
  agency: z.string(),
  aiSystemsDeployed: z.number(),
  decisionsAugmented: z.number(),
  decisionsAutomated: z.number(),
  appealsReceived: z.number(),
  appealsUpheld: z.number(),
  dataAccessRequests: z.number(),
  dataAccessCompleted: z.number(),
  incidentsReported: z.number(),
  incidentsResolved: z.number(),
  biasAuditsCompleted: z.number(),
  ethicalReviewsCompleted: z.number(),
  publicConsultationsHeld: z.number(),
  generatedAt: z.string().datetime(),
  publishedAt: z.string().datetime().optional(),
});

export type TransparencyReport = z.infer<typeof TransparencyReportSchema>;

export const AuditEventSchema = z.object({
  eventId: z.string().uuid(),
  timestamp: z.string().datetime(),
  eventType: z.enum([
    'model_registered',
    'model_deployed',
    'model_retired',
    'decision_made',
    'decision_appealed',
    'decision_overridden',
    'consent_granted',
    'consent_withdrawn',
    'data_accessed',
    'data_exported',
    'data_deleted',
    'bias_detected',
    'ethical_review_completed',
    'human_review_triggered',
    'transparency_report_published',
  ]),
  actorId: z.string(),
  actorType: z.enum(['citizen', 'official', 'system', 'auditor']),
  resourceType: z.string(),
  resourceId: z.string(),
  details: z.record(z.unknown()),
  previousHash: z.string(),
  currentHash: z.string(),
});

export type AuditEvent = z.infer<typeof AuditEventSchema>;

// ============================================================================
// AI Decision Transparency
// ============================================================================

export const AIDecisionSchema = z.object({
  decisionId: z.string().uuid(),
  modelId: z.string().uuid(),
  citizenId: z.string().uuid().optional(),
  caseId: z.string().optional(),
  decisionType: z.string(),
  inputSummary: z.record(z.unknown()),
  outputSummary: z.record(z.unknown()),
  confidence: z.number().min(0).max(1),
  explanation: z.object({
    humanReadable: z.string(),
    technicalDetails: z.record(z.unknown()),
    contributingFactors: z.array(z.object({
      factor: z.string(),
      weight: z.number(),
      direction: z.enum(['positive', 'negative', 'neutral']),
    })),
  }),
  humanReviewRequired: z.boolean(),
  humanReviewStatus: z.enum(['not_required', 'pending', 'approved', 'modified', 'rejected']).optional(),
  appealable: z.boolean(),
  appealDeadline: z.string().datetime().optional(),
  madeAt: z.string().datetime(),
});

export type AIDecision = z.infer<typeof AIDecisionSchema>;

// ============================================================================
// Compliance Standards
// ============================================================================

export const ComplianceStandardSchema = z.object({
  standardId: z.string(),
  name: z.string(),
  version: z.string(),
  jurisdiction: z.string(),
  requirements: z.array(z.object({
    requirementId: z.string(),
    description: z.string(),
    mandatory: z.boolean(),
    category: z.enum([
      'transparency',
      'accountability',
      'privacy',
      'security',
      'fairness',
      'human_oversight',
      'documentation',
      'testing',
    ]),
  })),
});

export type ComplianceStandard = z.infer<typeof ComplianceStandardSchema>;

export const ComplianceAssessmentSchema = z.object({
  assessmentId: z.string().uuid(),
  modelId: z.string().uuid(),
  standardId: z.string(),
  assessedAt: z.string().datetime(),
  assessedBy: z.string(),
  results: z.array(z.object({
    requirementId: z.string(),
    status: z.enum(['met', 'partially_met', 'not_met', 'not_applicable']),
    evidence: z.string().optional(),
    remediation: z.string().optional(),
  })),
  overallCompliance: z.number().min(0).max(100),
  nextReviewDate: z.string().datetime(),
});

export type ComplianceAssessment = z.infer<typeof ComplianceAssessmentSchema>;
