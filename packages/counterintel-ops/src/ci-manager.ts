import { z } from 'zod';
import {
  CounterIntelOperation,
  counterIntelOperationSchema,
  CounterIntelOperationType,
} from '@intelgraph/espionage-tracking';

/**
 * Counterintelligence Operations Management
 *
 * Advanced counterintelligence operations including penetration detection,
 * double agent management, deception operations, and insider threat hunting.
 */

// ============================================================================
// PENETRATION DETECTION
// ============================================================================

export const penetrationIndicatorSchema = z.object({
  id: z.string().uuid(),
  indicatorType: z.enum([
    'UNAUTHORIZED_ACCESS',
    'DATA_EXFILTRATION',
    'ANOMALOUS_BEHAVIOR',
    'COMMUNICATION_ANOMALY',
    'TRAVEL_PATTERN',
    'FINANCIAL_IRREGULARITY',
    'RELATIONSHIP_CONCERN',
    'PSYCHOLOGICAL_INDICATOR',
    'TECHNICAL_INDICATOR',
  ]),
  description: z.string(),
  observedAt: z.string().datetime(),
  suspectedIndividual: z.string().uuid().optional(),
  severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
  confidence: z.number().min(0).max(1),
  evidence: z.array(z.object({
    type: z.string(),
    description: z.string(),
    source: z.string(),
    timestamp: z.string().datetime(),
    classification: z.string(),
  })).default([]),
  relatedIndicators: z.array(z.string().uuid()).default([]),
  investigationStatus: z.enum([
    'NEW',
    'UNDER_REVIEW',
    'INVESTIGATING',
    'CONFIRMED_PENETRATION',
    'FALSE_POSITIVE',
    'RESOLVED',
  ]),
  investigationNotes: z.array(z.object({
    date: z.string().datetime(),
    investigator: z.string().uuid(),
    note: z.string(),
  })).default([]),
  mitigationActions: z.array(z.object({
    action: z.string(),
    status: z.enum(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
    completedAt: z.string().datetime().optional(),
  })).default([]),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  tenantId: z.string(),
});

export type PenetrationIndicator = z.infer<typeof penetrationIndicatorSchema>;

// ============================================================================
// DOUBLE AGENT OPERATIONS
// ============================================================================

export const doubleAgentSchema = z.object({
  id: z.string().uuid(),
  agentId: z.string().uuid(),
  codename: z.string(),
  targetAgency: z.string().uuid(),
  targetHandler: z.string().uuid().optional(),
  ourHandler: z.string().uuid(),
  recruitmentDate: z.string().datetime(),
  recruitmentMethod: z.string(),
  controlLevel: z.enum([
    'FULL_CONTROL',
    'SUBSTANTIAL_CONTROL',
    'PARTIAL_CONTROL',
    'LIMITED_CONTROL',
    'UNCERTAIN',
  ]),
  motivation: z.array(z.string()).default([]),
  reliability: z.enum(['VERY_HIGH', 'HIGH', 'MEDIUM', 'LOW', 'UNRELIABLE']),
  productionValue: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'MINIMAL']),
  intelligence: z.array(z.object({
    date: z.string().datetime(),
    intelligenceType: z.string(),
    summary: z.string(),
    value: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
    verified: z.boolean(),
  })).default([]),
  deceptionOperations: z.array(z.object({
    operationId: z.string().uuid(),
    objective: z.string(),
    materialPassed: z.string(),
    targetReaction: z.string().optional(),
    effectiveness: z.enum(['VERY_EFFECTIVE', 'EFFECTIVE', 'PARTIALLY_EFFECTIVE', 'INEFFECTIVE', 'UNKNOWN']),
  })).default([]),
  communications: z.array(z.object({
    date: z.string().datetime(),
    method: z.string(),
    direction: z.enum(['TO_TARGET', 'FROM_TARGET']),
    summary: z.string(),
    significance: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
  })).default([]),
  risks: z.array(z.object({
    risk: z.string(),
    severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
    mitigation: z.string(),
    status: z.enum(['ACTIVE', 'MITIGATED', 'ACCEPTED']),
  })).default([]),
  status: z.enum(['ACTIVE', 'INACTIVE', 'COMPROMISED', 'TERMINATED', 'DEFECTED']),
  terminationDate: z.string().datetime().optional(),
  terminationReason: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  tenantId: z.string(),
});

export type DoubleAgent = z.infer<typeof doubleAgentSchema>;

// ============================================================================
// DECEPTION OPERATIONS
// ============================================================================

export const deceptionOperationSchema = z.object({
  id: z.string().uuid(),
  operationName: z.string(),
  codename: z.string(),
  targetAgency: z.string().uuid(),
  objective: z.string(),
  targetBelief: z.string(), // What we want them to believe
  actualSituation: z.string(), // The truth we're hiding
  deceptionTheme: z.string(),
  channels: z.array(z.object({
    channelType: z.enum([
      'DOUBLE_AGENT',
      'CONTROLLED_SOURCE',
      'TECHNICAL_MEANS',
      'OPEN_SOURCE',
      'DIPLOMATIC',
      'MILITARY_DISPLAY',
      'CYBER',
    ]),
    channelId: z.string().uuid().optional(),
    credibility: z.enum(['HIGH', 'MEDIUM', 'LOW']),
    usage: z.enum(['PRIMARY', 'SUPPORTING', 'BACKUP']),
  })).default([]),
  deceptionMaterial: z.array(z.object({
    materialType: z.string(),
    content: z.string(),
    passedVia: z.string(),
    passedOn: z.string().datetime(),
    targetReaction: z.string().optional(),
  })).default([]),
  indicators: z.array(z.object({
    indicator: z.string(),
    purpose: z.string(),
    delivered: z.boolean(),
    observed: z.boolean(),
  })).default([]),
  measureOfEffectiveness: z.array(z.object({
    measure: z.string(),
    targetValue: z.string(),
    actualValue: z.string().optional(),
    achieved: z.boolean(),
  })).default([]),
  targetAssessment: z.object({
    believedDeception: z.boolean().optional(),
    confidenceLevel: z.enum(['HIGH', 'MEDIUM', 'LOW', 'UNKNOWN']),
    targetActions: z.array(z.string()),
    indicatorOfSuccess: z.array(z.string()),
  }).optional(),
  risks: z.array(z.object({
    risk: z.string(),
    probability: z.enum(['HIGH', 'MEDIUM', 'LOW']),
    impact: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
    mitigation: z.string(),
  })).default([]),
  status: z.enum(['PLANNING', 'ACTIVE', 'ONGOING', 'SUCCESSFUL', 'FAILED', 'COMPROMISED', 'TERMINATED']),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  tenantId: z.string(),
});

export type DeceptionOperation = z.infer<typeof deceptionOperationSchema>;

// ============================================================================
// INSIDER THREAT HUNTING
// ============================================================================

export const insiderThreatProfileSchema = z.object({
  id: z.string().uuid(),
  subjectId: z.string().uuid(),
  subjectName: z.string(),
  organization: z.string(),
  position: z.string(),
  clearanceLevel: z.string(),
  accessLevel: z.string(),
  threatLevel: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'MINIMAL']),
  threatCategory: z.enum([
    'ESPIONAGE',
    'SABOTAGE',
    'UNAUTHORIZED_DISCLOSURE',
    'THEFT',
    'VIOLENCE',
    'FRAUD',
    'UNKNOWN',
  ]),
  riskFactors: z.array(z.object({
    factor: z.string(),
    category: z.enum([
      'PERSONAL',
      'PROFESSIONAL',
      'FINANCIAL',
      'BEHAVIORAL',
      'TECHNICAL',
      'FOREIGN_CONTACT',
    ]),
    severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
    firstObserved: z.string().datetime(),
    current: z.boolean(),
  })).default([]),
  indicators: z.array(z.object({
    indicatorType: z.string(),
    description: z.string(),
    observedAt: z.string().datetime(),
    confidence: z.number().min(0).max(1),
    significance: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
  })).default([]),
  behavioralAnalysis: z.object({
    baselineBehavior: z.string(),
    deviations: z.array(z.string()),
    stressIndicators: z.array(z.string()),
    motivationalFactors: z.array(z.string()),
  }).optional(),
  technicalAnalysis: z.object({
    dataAccessPatterns: z.array(z.string()),
    unusualAccess: z.array(z.string()),
    exfiltrationAttempts: z.number(),
    securityViolations: z.array(z.string()),
  }).optional(),
  foreignContacts: z.array(z.object({
    contactId: z.string().uuid(),
    relationship: z.string(),
    country: z.string(),
    suspicionLevel: z.enum(['HIGH', 'MEDIUM', 'LOW', 'NONE']),
    reported: z.boolean(),
  })).default([]),
  investigation: z.object({
    status: z.enum([
      'MONITORING',
      'PRELIMINARY_INQUIRY',
      'FULL_INVESTIGATION',
      'CLEARED',
      'CONFIRMED_THREAT',
    ]),
    startDate: z.string().datetime(),
    investigators: z.array(z.string().uuid()),
    findings: z.array(z.string()),
  }).optional(),
  mitigationActions: z.array(z.object({
    action: z.string(),
    actionType: z.enum([
      'ACCESS_RESTRICTION',
      'ENHANCED_MONITORING',
      'INTERVIEW',
      'POLYGRAPH',
      'TERMINATION',
      'PROSECUTION',
    ]),
    implementedAt: z.string().datetime(),
    effectiveness: z.enum(['EFFECTIVE', 'PARTIALLY_EFFECTIVE', 'INEFFECTIVE', 'UNKNOWN']),
  })).default([]),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  tenantId: z.string(),
});

export type InsiderThreatProfile = z.infer<typeof insiderThreatProfileSchema>;

// ============================================================================
// DEFECTOR VETTING
// ============================================================================

export const defectorVettingSchema = z.object({
  id: z.string().uuid(),
  defectorId: z.string().uuid(),
  defectorName: z.string().optional(),
  codename: z.string(),
  formerAgency: z.string().uuid(),
  formerPosition: z.string(),
  defectionDate: z.string().datetime(),
  defectionLocation: z.string(),
  defectionCircumstances: z.string(),
  motivation: z.array(z.string()).default([]),
  vettingStatus: z.enum([
    'INITIAL_SCREENING',
    'DETAILED_VETTING',
    'POLYGRAPH',
    'FIELD_INVESTIGATION',
    'APPROVED',
    'REJECTED',
    'SUSPECTED_DANGLE',
  ]),
  credibilityAssessment: z.enum(['VERY_HIGH', 'HIGH', 'MEDIUM', 'LOW', 'VERY_LOW']),
  intelligenceValue: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'MINIMAL']),
  providedIntelligence: z.array(z.object({
    date: z.string().datetime(),
    category: z.string(),
    summary: z.string(),
    verified: z.boolean().optional(),
    value: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
  })).default([]),
  verificationResults: z.array(z.object({
    claim: z.string(),
    verificationMethod: z.string(),
    result: z.enum(['VERIFIED', 'PARTIALLY_VERIFIED', 'UNVERIFIED', 'CONTRADICTED']),
    confidence: z.enum(['HIGH', 'MEDIUM', 'LOW']),
  })).default([]),
  inconsistencies: z.array(z.object({
    inconsistency: z.string(),
    severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
    explanation: z.string().optional(),
    resolved: z.boolean(),
  })).default([]),
  polygraphResults: z.array(z.object({
    date: z.string().datetime(),
    examiner: z.string(),
    result: z.enum(['NO_DECEPTION', 'DECEPTION_INDICATED', 'INCONCLUSIVE']),
    issuesIdentified: z.array(z.string()),
  })).default([]),
  dangleIndicators: z.array(z.object({
    indicator: z.string(),
    significance: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
    assessment: z.string(),
  })).default([]),
  recommendation: z.enum([
    'ACCEPT_AND_USE',
    'ACCEPT_WITH_RESTRICTIONS',
    'CONTINUE_VETTING',
    'REJECT',
    'POSSIBLE_DANGLE',
  ]).optional(),
  handlingPlan: z.object({
    resettlement: z.boolean(),
    debriefingSchedule: z.string(),
    securityMeasures: z.array(z.string()),
    publicDisclosure: z.boolean(),
  }).optional(),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  tenantId: z.string(),
});

export type DefectorVetting = z.infer<typeof defectorVettingSchema>;

// ============================================================================
// CI MANAGER CLASS
// ============================================================================

export interface CIManagerConfig {
  enablePenetrationDetection: boolean;
  enableDoubleAgentOps: boolean;
  enableDeceptionOps: boolean;
  enableInsiderThreat: boolean;
  enableDefectorVetting: boolean;
  automatedAlerts: boolean;
}

export class CIManager {
  private config: CIManagerConfig;

  constructor(config: Partial<CIManagerConfig> = {}) {
    this.config = {
      enablePenetrationDetection: config.enablePenetrationDetection ?? true,
      enableDoubleAgentOps: config.enableDoubleAgentOps ?? true,
      enableDeceptionOps: config.enableDeceptionOps ?? true,
      enableInsiderThreat: config.enableInsiderThreat ?? true,
      enableDefectorVetting: config.enableDefectorVetting ?? true,
      automatedAlerts: config.automatedAlerts ?? true,
    };
  }

  /**
   * Create penetration indicator
   */
  createPenetrationIndicator(
    data: Partial<PenetrationIndicator>
  ): PenetrationIndicator {
    if (!this.config.enablePenetrationDetection) {
      throw new Error('Penetration detection is disabled');
    }

    return penetrationIndicatorSchema.parse({
      ...data,
      id: data.id || crypto.randomUUID(),
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    });
  }

  /**
   * Register double agent
   */
  registerDoubleAgent(data: Partial<DoubleAgent>): DoubleAgent {
    if (!this.config.enableDoubleAgentOps) {
      throw new Error('Double agent operations are disabled');
    }

    return doubleAgentSchema.parse({
      ...data,
      id: data.id || crypto.randomUUID(),
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    });
  }

  /**
   * Create deception operation
   */
  createDeceptionOperation(
    data: Partial<DeceptionOperation>
  ): DeceptionOperation {
    if (!this.config.enableDeceptionOps) {
      throw new Error('Deception operations are disabled');
    }

    return deceptionOperationSchema.parse({
      ...data,
      id: data.id || crypto.randomUUID(),
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    });
  }

  /**
   * Create insider threat profile
   */
  createInsiderThreatProfile(
    data: Partial<InsiderThreatProfile>
  ): InsiderThreatProfile {
    if (!this.config.enableInsiderThreat) {
      throw new Error('Insider threat hunting is disabled');
    }

    return insiderThreatProfileSchema.parse({
      ...data,
      id: data.id || crypto.randomUUID(),
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    });
  }

  /**
   * Create defector vetting record
   */
  createDefectorVetting(
    data: Partial<DefectorVetting>
  ): DefectorVetting {
    if (!this.config.enableDefectorVetting) {
      throw new Error('Defector vetting is disabled');
    }

    return defectorVettingSchema.parse({
      ...data,
      id: data.id || crypto.randomUUID(),
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    });
  }

  /**
   * Assess overall CI posture
   */
  assessCIPosture(data: {
    penetrationIndicators: number;
    activeDoubleAgents: number;
    insiderThreats: number;
    recentCompromises: number;
  }): {
    posture: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'CRITICAL';
    risks: string[];
    recommendations: string[];
  } {
    let posture: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'CRITICAL';
    const risks: string[] = [];
    const recommendations: string[] = [];

    if (data.recentCompromises > 2 || data.insiderThreats > 5) {
      posture = 'CRITICAL';
      risks.push('Multiple compromises detected');
      recommendations.push('Immediate security review required');
      recommendations.push('Enhanced vetting procedures');
    } else if (data.penetrationIndicators > 10 || data.insiderThreats > 2) {
      posture = 'POOR';
      risks.push('Elevated threat indicators');
      recommendations.push('Increase monitoring');
      recommendations.push('Review access controls');
    } else if (data.penetrationIndicators > 5) {
      posture = 'FAIR';
      risks.push('Some concerning indicators');
      recommendations.push('Continue monitoring');
    } else if (data.activeDoubleAgents > 3) {
      posture = 'GOOD';
      recommendations.push('Maintain current posture');
    } else {
      posture = 'EXCELLENT';
      recommendations.push('Continue excellent work');
    }

    return { posture, risks, recommendations };
  }

  /**
   * Generate CI alerts
   */
  generateAlerts(indicators: PenetrationIndicator[]): Array<{
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    message: string;
    actionRequired: string;
  }> {
    if (!this.config.automatedAlerts) {
      return [];
    }

    return indicators
      .filter(ind => ind.severity === 'CRITICAL' || ind.severity === 'HIGH')
      .map(ind => ({
        severity: ind.severity,
        message: `${ind.indicatorType}: ${ind.description}`,
        actionRequired: 'Immediate investigation required',
      }));
  }
}
