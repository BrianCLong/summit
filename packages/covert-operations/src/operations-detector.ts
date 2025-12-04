import { z } from 'zod';
import {
  EspionageOperation,
  espionageOperationSchema,
  OperationType,
  OperationStatus,
} from '@intelgraph/espionage-tracking';

/**
 * Covert Operations Detection and Tracking
 *
 * Detection, tracking, and analysis of covert operations including
 * influence operations, political interference, and sabotage activities.
 */

// ============================================================================
// INFLUENCE OPERATIONS
// ============================================================================

export const influenceOperationSchema = z.object({
  id: z.string().uuid(),
  operationName: z.string(),
  sponsoringAgency: z.string().uuid(),
  targetCountry: z.string(),
  targetAudience: z.array(z.string()).default([]),
  objectives: z.array(z.string()).default([]),
  narratives: z.array(z.object({
    narrative: z.string(),
    themes: z.array(z.string()),
    targetDemographic: z.string(),
    disseminationChannels: z.array(z.string()),
    reach: z.enum(['MASS', 'TARGETED', 'NICHE', 'LIMITED']),
  })).default([]),
  tactics: z.array(z.object({
    tactic: z.string(),
    description: z.string(),
    effectiveness: z.enum(['VERY_HIGH', 'HIGH', 'MODERATE', 'LOW', 'MINIMAL']),
    detectability: z.enum(['OBVIOUS', 'DETECTABLE', 'SUBTLE', 'COVERT']),
  })).default([]),
  platforms: z.array(z.object({
    platform: z.string(),
    platformType: z.enum(['SOCIAL_MEDIA', 'TRADITIONAL_MEDIA', 'WEBSITE', 'FORUM', 'MESSAGING', 'OTHER']),
    accounts: z.number(),
    followers: z.number().optional(),
    activity: z.enum(['VERY_HIGH', 'HIGH', 'MODERATE', 'LOW']),
  })).default([]),
  agentsOfInfluence: z.array(z.object({
    agentId: z.string().uuid(),
    role: z.string(),
    platform: z.string(),
    reach: z.number().optional(),
    credibility: z.enum(['HIGH', 'MEDIUM', 'LOW']),
  })).default([]),
  impact: z.object({
    reach: z.number().optional(),
    engagement: z.number().optional(),
    attitudeChange: z.enum(['SIGNIFICANT', 'MODERATE', 'MINIMAL', 'NONE', 'UNKNOWN']),
    behaviorChange: z.enum(['SIGNIFICANT', 'MODERATE', 'MINIMAL', 'NONE', 'UNKNOWN']),
  }).optional(),
  countermeasures: z.array(z.object({
    countermeasure: z.string(),
    implementedBy: z.string(),
    effectiveness: z.enum(['EFFECTIVE', 'PARTIALLY_EFFECTIVE', 'INEFFECTIVE']),
  })).default([]),
  status: z.enum(['ACTIVE', 'ONGOING', 'PAUSED', 'COMPLETED', 'EXPOSED', 'TERMINATED']),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  tenantId: z.string(),
});

export type InfluenceOperation = z.infer<typeof influenceOperationSchema>;

// ============================================================================
// POLITICAL INTERFERENCE
// ============================================================================

export const politicalInterferenceSchema = z.object({
  id: z.string().uuid(),
  operationName: z.string(),
  sponsoringAgency: z.string().uuid(),
  targetCountry: z.string(),
  interferenceType: z.enum([
    'ELECTION_INTERFERENCE',
    'POLITICAL_PARTY_SUPPORT',
    'DISINFORMATION_CAMPAIGN',
    'POLITICAL_VIOLENCE',
    'CORRUPTION',
    'BLACKMAIL',
    'FUNDING_MANIPULATION',
    'MEDIA_MANIPULATION',
    'CYBER_OPERATIONS',
    'HACK_AND_LEAK',
  ]),
  targets: z.array(z.object({
    targetType: z.enum(['CANDIDATE', 'PARTY', 'OFFICIAL', 'INSTITUTION', 'PROCESS']),
    targetName: z.string(),
    targetedOutcome: z.string(),
  })).default([]),
  methods: z.array(z.object({
    method: z.string(),
    description: z.string(),
    scale: z.enum(['LARGE', 'MEDIUM', 'SMALL']),
    sophistication: z.enum(['ADVANCED', 'MODERATE', 'BASIC']),
  })).default([]),
  timeline: z.object({
    startDate: z.string().datetime(),
    peakActivity: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  }),
  resources: z.object({
    estimatedBudget: z.number().optional(),
    personnel: z.number().optional(),
    technicalAssets: z.array(z.string()).default([]),
  }).optional(),
  observedActivities: z.array(z.object({
    date: z.string().datetime(),
    activity: z.string(),
    evidence: z.array(z.string()),
    significance: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
  })).default([]),
  impact: z.object({
    achieved: z.boolean(),
    measuredImpact: z.string(),
    longTermEffects: z.array(z.string()).default([]),
  }).optional(),
  attribution: z.object({
    confidence: z.enum(['HIGH', 'MEDIUM', 'LOW']),
    indicators: z.array(z.string()),
    publicAttribution: z.boolean(),
  }).optional(),
  response: z.array(z.object({
    respondingEntity: z.string(),
    responseType: z.string(),
    effectiveness: z.enum(['EFFECTIVE', 'PARTIALLY_EFFECTIVE', 'INEFFECTIVE']),
  })).default([]),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  tenantId: z.string(),
});

export type PoliticalInterference = z.infer<typeof politicalInterferenceSchema>;

// ============================================================================
// SABOTAGE OPERATIONS
// ============================================================================

export const sabotageOperationSchema = z.object({
  id: z.string().uuid(),
  operationName: z.string(),
  sponsoringAgency: z.string().uuid(),
  sabotageType: z.enum([
    'INFRASTRUCTURE',
    'INDUSTRIAL',
    'MILITARY',
    'CYBER',
    'ECONOMIC',
    'SOCIAL',
    'ENVIRONMENTAL',
  ]),
  targets: z.array(z.object({
    targetType: z.string(),
    targetName: z.string(),
    location: z.string(),
    criticalityLevel: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
  })).default([]),
  plannedImpact: z.object({
    immediate: z.array(z.string()),
    shortTerm: z.array(z.string()),
    longTerm: z.array(z.string()),
  }),
  methods: z.array(z.object({
    method: z.string(),
    description: z.string(),
    detectability: z.enum(['OBVIOUS', 'DETECTABLE', 'SUBTLE', 'INVISIBLE']),
    reversibility: z.enum(['IRREVERSIBLE', 'DIFFICULT', 'MODERATE', 'EASY']),
  })).default([]),
  executionPlan: z.object({
    phases: z.array(z.object({
      phase: z.string(),
      duration: z.string(),
      milestones: z.array(z.string()),
    })),
    timeline: z.string(),
    contingencies: z.array(z.string()).default([]),
  }).optional(),
  personnel: z.array(z.object({
    officerId: z.string().uuid(),
    role: z.string(),
    expertise: z.array(z.string()),
  })).default([]),
  status: z.enum([
    'PLANNING',
    'RECONNAISSANCE',
    'PREPARATION',
    'EXECUTION',
    'COMPLETED',
    'FAILED',
    'ABORTED',
    'DETECTED',
  ]),
  detectionRisk: z.enum(['VERY_HIGH', 'HIGH', 'MEDIUM', 'LOW', 'MINIMAL']),
  actualImpact: z.object({
    damage: z.string(),
    casualties: z.number().optional(),
    economicImpact: z.number().optional(),
    durationOfEffect: z.string(),
    attribution: z.boolean(),
  }).optional(),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  tenantId: z.string(),
});

export type SabotageOperation = z.infer<typeof sabotageOperationSchema>;

// ============================================================================
// PROXY OPERATIONS
// ============================================================================

export const proxyOperationSchema = z.object({
  id: z.string().uuid(),
  operationName: z.string(),
  sponsoringAgency: z.string().uuid(),
  proxyForce: z.object({
    name: z.string(),
    type: z.enum([
      'MILITARY',
      'PARAMILITARY',
      'INSURGENT',
      'TERRORIST',
      'CRIMINAL',
      'POLITICAL',
      'CYBER',
    ]),
    size: z.number().optional(),
    location: z.string(),
    leadership: z.array(z.string()),
  }),
  support: z.object({
    financial: z.object({
      amount: z.number(),
      currency: z.string(),
      frequency: z.string(),
    }).optional(),
    military: z.array(z.object({
      type: z.enum(['WEAPONS', 'AMMUNITION', 'EQUIPMENT', 'VEHICLES', 'TECHNOLOGY']),
      description: z.string(),
      quantity: z.number().optional(),
    })).default([]),
    training: z.array(z.object({
      trainingType: z.string(),
      duration: z.string(),
      location: z.string(),
      personnel: z.number(),
    })).default([]),
    intelligence: z.array(z.object({
      intelligenceType: z.string(),
      frequency: z.string(),
      value: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
    })).default([]),
    advisory: z.array(z.object({
      advisorCount: z.number(),
      role: z.string(),
      embedded: z.boolean(),
    })).default([]),
  }),
  objectives: z.array(z.string()).default([]),
  operations: z.array(z.object({
    date: z.string().datetime(),
    operationType: z.string(),
    target: z.string(),
    outcome: z.string(),
  })).default([]),
  effectiveness: z.enum(['VERY_HIGH', 'HIGH', 'MODERATE', 'LOW', 'MINIMAL']),
  deniability: z.enum(['COMPLETE', 'PLAUSIBLE', 'WEAK', 'NONE']),
  risks: z.array(z.object({
    risk: z.string(),
    severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
    mitigation: z.string().optional(),
  })).default([]),
  status: z.enum(['ACTIVE', 'ONGOING', 'PAUSED', 'TERMINATED', 'EXPOSED']),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  tenantId: z.string(),
});

export type ProxyOperation = z.infer<typeof proxyOperationSchema>;

// ============================================================================
// OPERATIONS DETECTOR CLASS
// ============================================================================

export interface OperationsDetectorConfig {
  enableInfluenceDetection: boolean;
  enableInterferenceDetection: boolean;
  enableSabotageDetection: boolean;
  enableProxyDetection: boolean;
  confidenceThreshold: number;
}

export class OperationsDetector {
  private config: OperationsDetectorConfig;

  constructor(config: Partial<OperationsDetectorConfig> = {}) {
    this.config = {
      enableInfluenceDetection: config.enableInfluenceDetection ?? true,
      enableInterferenceDetection: config.enableInterferenceDetection ?? true,
      enableSabotageDetection: config.enableSabotageDetection ?? true,
      enableProxyDetection: config.enableProxyDetection ?? true,
      confidenceThreshold: config.confidenceThreshold ?? 0.7,
    };
  }

  /**
   * Detect influence operation indicators
   */
  detectInfluenceOperation(
    data: Partial<InfluenceOperation>
  ): InfluenceOperation {
    if (!this.config.enableInfluenceDetection) {
      throw new Error('Influence operation detection is disabled');
    }

    return influenceOperationSchema.parse({
      ...data,
      id: data.id || crypto.randomUUID(),
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    });
  }

  /**
   * Analyze political interference
   */
  analyzePoliticalInterference(
    data: Partial<PoliticalInterference>
  ): PoliticalInterference {
    if (!this.config.enableInterferenceDetection) {
      throw new Error('Political interference detection is disabled');
    }

    return politicalInterferenceSchema.parse({
      ...data,
      id: data.id || crypto.randomUUID(),
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    });
  }

  /**
   * Track sabotage operation
   */
  trackSabotageOperation(
    data: Partial<SabotageOperation>
  ): SabotageOperation {
    if (!this.config.enableSabotageDetection) {
      throw new Error('Sabotage operation detection is disabled');
    }

    return sabotageOperationSchema.parse({
      ...data,
      id: data.id || crypto.randomUUID(),
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    });
  }

  /**
   * Monitor proxy operations
   */
  monitorProxyOperation(
    data: Partial<ProxyOperation>
  ): ProxyOperation {
    if (!this.config.enableProxyDetection) {
      throw new Error('Proxy operation detection is disabled');
    }

    return proxyOperationSchema.parse({
      ...data,
      id: data.id || crypto.randomUUID(),
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    });
  }

  /**
   * Assess operation threat level
   */
  assessThreatLevel(operation: {
    sophistication?: string;
    scale?: string;
    impact?: any;
  }): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' {
    // Simplified threat assessment
    const sophisticationScore = operation.sophistication === 'ADVANCED' ? 3 :
                                operation.sophistication === 'MODERATE' ? 2 : 1;
    const scaleScore = operation.scale === 'LARGE' ? 3 :
                      operation.scale === 'MEDIUM' ? 2 : 1;

    const totalScore = sophisticationScore + scaleScore;

    if (totalScore >= 5) return 'CRITICAL';
    if (totalScore >= 4) return 'HIGH';
    if (totalScore >= 3) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Generate operation indicators
   */
  generateIndicators(operation: InfluenceOperation | PoliticalInterference | SabotageOperation): Array<{
    indicator: string;
    type: string;
    confidence: number;
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  }> {
    const indicators: Array<{
      indicator: string;
      type: string;
      confidence: number;
      severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    }> = [];

    // Add basic indicators
    indicators.push({
      indicator: `Operation detected: ${operation.operationName}`,
      type: 'OPERATION_DETECTION',
      confidence: 0.85,
      severity: 'HIGH',
    });

    return indicators;
  }
}
