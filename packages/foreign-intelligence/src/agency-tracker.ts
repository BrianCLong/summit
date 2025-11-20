import { z } from 'zod';
import {
  IntelligenceAgency,
  intelligenceAgencySchema,
  IntelligenceAgencyType,
} from '@intelgraph/espionage-tracking';

/**
 * Foreign Intelligence Service Tracking
 *
 * Comprehensive tracking and analysis of foreign intelligence services,
 * organizational structures, capabilities, and operational priorities.
 */

// ============================================================================
// ORGANIZATIONAL STRUCTURE
// ============================================================================

export const organizationalUnitSchema = z.object({
  id: z.string().uuid(),
  agencyId: z.string().uuid(),
  name: z.string(),
  type: z.enum([
    'HEADQUARTERS',
    'DIVISION',
    'DEPARTMENT',
    'DIRECTORATE',
    'BUREAU',
    'STATION',
    'FIELD_OFFICE',
    'REGIONAL_CENTER',
    'TECHNICAL_CENTER',
    'TRAINING_FACILITY',
  ]),
  parentUnit: z.string().uuid().optional(),
  subordinateUnits: z.array(z.string().uuid()).default([]),
  primaryMission: z.string(),
  secondaryMissions: z.array(z.string()).default([]),
  leadership: z.array(z.object({
    personId: z.string().uuid(),
    position: z.string(),
    startDate: z.string().datetime(),
    endDate: z.string().datetime().optional(),
  })).default([]),
  estimatedPersonnel: z.number().optional(),
  budget: z.object({
    amount: z.number(),
    currency: z.string(),
    fiscalYear: z.number(),
  }).optional(),
  location: z.string().optional(),
  capabilities: z.array(z.string()).default([]),
  knownOperations: z.array(z.string().uuid()).default([]),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  tenantId: z.string(),
});

export type OrganizationalUnit = z.infer<typeof organizationalUnitSchema>;

// ============================================================================
// LEADERSHIP TRACKING
// ============================================================================

export const leadershipProfileSchema = z.object({
  id: z.string().uuid(),
  personId: z.string().uuid(),
  agencyId: z.string().uuid(),
  currentPosition: z.string(),
  rank: z.string().optional(),
  biography: z.string().optional(),
  careerHistory: z.array(z.object({
    position: z.string(),
    organization: z.string(),
    startDate: z.string().datetime(),
    endDate: z.string().datetime().optional(),
    achievements: z.array(z.string()).default([]),
  })).default([]),
  education: z.array(z.object({
    institution: z.string(),
    degree: z.string(),
    fieldOfStudy: z.string(),
    graduationYear: z.number(),
  })).default([]),
  expertise: z.array(z.string()).default([]),
  languages: z.array(z.string()).default([]),
  knownAssociates: z.array(z.string().uuid()).default([]),
  publicStatements: z.array(z.object({
    date: z.string().datetime(),
    venue: z.string(),
    topic: z.string(),
    summary: z.string(),
    significance: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
  })).default([]),
  assessedPriorities: z.array(z.string()).default([]),
  leadershipStyle: z.string().optional(),
  politicalAffiliations: z.array(z.string()).default([]),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  tenantId: z.string(),
});

export type LeadershipProfile = z.infer<typeof leadershipProfileSchema>;

// ============================================================================
// OPERATIONAL PRIORITIES
// ============================================================================

export const operationalPrioritySchema = z.object({
  id: z.string().uuid(),
  agencyId: z.string().uuid(),
  priority: z.string(),
  priorityLevel: z.enum(['PRIMARY', 'SECONDARY', 'TERTIARY']),
  targetCountries: z.array(z.string()).default([]),
  targetSectors: z.array(z.string()).default([]),
  targetTechnologies: z.array(z.string()).default([]),
  rationale: z.string(),
  indicators: z.array(z.object({
    indicator: z.string(),
    confidence: z.number().min(0).max(1),
    evidence: z.array(z.string()),
  })).default([]),
  resourceAllocation: z.object({
    personnel: z.number().optional(),
    budget: z.number().optional(),
    facilities: z.array(z.string()).default([]),
  }).optional(),
  successMetrics: z.array(z.string()).default([]),
  relatedOperations: z.array(z.string().uuid()).default([]),
  validFrom: z.string().datetime(),
  validTo: z.string().datetime().optional(),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  tenantId: z.string(),
});

export type OperationalPriority = z.infer<typeof operationalPrioritySchema>;

// ============================================================================
// CAPABILITIES ASSESSMENT
// ============================================================================

export const capabilityTypeSchema = z.enum([
  'HUMINT',
  'SIGINT',
  'IMINT',
  'MASINT',
  'CYBER',
  'TECHNICAL',
  'COVERT_ACTION',
  'COUNTERINTELLIGENCE',
  'ANALYSIS',
  'TARGETING',
]);

export type CapabilityType = z.infer<typeof capabilityTypeSchema>;

export const capabilityAssessmentSchema = z.object({
  id: z.string().uuid(),
  agencyId: z.string().uuid(),
  capabilityType: capabilityTypeSchema,
  capabilityName: z.string(),
  maturityLevel: z.enum(['ADVANCED', 'DEVELOPING', 'NASCENT', 'UNKNOWN']),
  effectiveness: z.enum(['VERY_HIGH', 'HIGH', 'MODERATE', 'LOW', 'VERY_LOW']),
  scope: z.enum(['GLOBAL', 'REGIONAL', 'LIMITED', 'MINIMAL']),
  technicalSophistication: z.enum(['CUTTING_EDGE', 'ADVANCED', 'MODERATE', 'BASIC']),
  platforms: z.array(z.object({
    platform: z.string(),
    type: z.string(),
    capabilities: z.array(z.string()),
    limitations: z.array(z.string()).default([]),
  })).default([]),
  knownSystems: z.array(z.object({
    system: z.string(),
    purpose: z.string(),
    capabilities: z.array(z.string()),
    deploymentStatus: z.enum(['OPERATIONAL', 'TESTING', 'DEVELOPMENT', 'RETIRED']),
  })).default([]),
  tradecraftSignatures: z.array(z.object({
    signature: z.string(),
    description: z.string(),
    frequency: z.string(),
  })).default([]),
  knownLimitations: z.array(z.string()).default([]),
  developmentTrends: z.array(z.object({
    trend: z.string(),
    significance: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
    timeline: z.string(),
  })).default([]),
  demonstratedCapabilities: z.array(z.object({
    operation: z.string(),
    date: z.string().datetime(),
    description: z.string(),
    significance: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
  })).default([]),
  assessmentConfidence: z.enum(['HIGH', 'MEDIUM', 'LOW']),
  lastUpdated: z.string().datetime(),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  tenantId: z.string(),
});

export type CapabilityAssessment = z.infer<typeof capabilityAssessmentSchema>;

// ============================================================================
// COOPERATION AND LIAISON
// ============================================================================

export const cooperationTypeSchema = z.enum([
  'FORMAL_ALLIANCE',
  'BILATERAL_AGREEMENT',
  'MULTILATERAL_AGREEMENT',
  'INTELLIGENCE_SHARING',
  'JOINT_OPERATIONS',
  'TRAINING_EXCHANGE',
  'TECHNICAL_COOPERATION',
  'AD_HOC_COOPERATION',
  'COMPETITIVE',
  'ADVERSARIAL',
]);

export type CooperationType = z.infer<typeof cooperationTypeSchema>;

export const cooperationRelationshipSchema = z.object({
  id: z.string().uuid(),
  agency1Id: z.string().uuid(),
  agency2Id: z.string().uuid(),
  cooperationType: cooperationTypeSchema,
  formalAgreement: z.boolean().default(false),
  agreementDate: z.string().datetime().optional(),
  agreementDetails: z.string().optional(),
  scopeOfCooperation: z.array(z.string()).default([]),
  informationSharing: z.object({
    level: z.enum(['EXTENSIVE', 'SUBSTANTIAL', 'LIMITED', 'MINIMAL', 'NONE']),
    categories: z.array(z.string()).default([]),
    restrictions: z.array(z.string()).default([]),
  }).optional(),
  jointOperations: z.array(z.object({
    operationId: z.string().uuid(),
    operationType: z.string(),
    startDate: z.string().datetime(),
    endDate: z.string().datetime().optional(),
    outcome: z.string().optional(),
  })).default([]),
  liaisonOfficers: z.array(z.object({
    officerId: z.string().uuid(),
    postingAgency: z.string().uuid(),
    hostAgency: z.string().uuid(),
    startDate: z.string().datetime(),
    endDate: z.string().datetime().optional(),
  })).default([]),
  trustLevel: z.enum(['VERY_HIGH', 'HIGH', 'MEDIUM', 'LOW', 'VERY_LOW']),
  effectiveness: z.enum(['EXCELLENT', 'GOOD', 'ADEQUATE', 'POOR', 'INEFFECTIVE']),
  tensions: z.array(z.object({
    issue: z.string(),
    date: z.string().datetime(),
    resolution: z.string().optional(),
  })).default([]),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'TERMINATED', 'RENEGOTIATING']),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  tenantId: z.string(),
});

export type CooperationRelationship = z.infer<typeof cooperationRelationshipSchema>;

// ============================================================================
// HISTORICAL OPERATIONS
// ============================================================================

export const historicalOperationSchema = z.object({
  id: z.string().uuid(),
  agencyId: z.string().uuid(),
  operationName: z.string(),
  codename: z.string().optional(),
  operationType: z.string(),
  timeframe: z.object({
    startDate: z.string().datetime(),
    endDate: z.string().datetime().optional(),
  }),
  targetCountry: z.string().optional(),
  targetOrganization: z.string().optional(),
  objectives: z.array(z.string()).default([]),
  methodsUsed: z.array(z.string()).default([]),
  keyPersonnel: z.array(z.object({
    personId: z.string().uuid(),
    role: z.string(),
  })).default([]),
  outcome: z.enum(['SUCCESS', 'PARTIAL_SUCCESS', 'FAILURE', 'COMPROMISED', 'ONGOING', 'UNKNOWN']),
  impact: z.enum(['STRATEGIC', 'SIGNIFICANT', 'MODERATE', 'LIMITED', 'MINIMAL']),
  lessonsLearned: z.array(z.string()).default([]),
  tradecraftEvolution: z.array(z.object({
    technique: z.string(),
    innovation: z.string(),
    adoption: z.enum(['WIDELY_ADOPTED', 'SELECTIVELY_USED', 'EXPERIMENTAL', 'ABANDONED']),
  })).default([]),
  publicDisclosure: z.object({
    disclosed: z.boolean(),
    disclosureDate: z.string().datetime().optional(),
    disclosureSource: z.string().optional(),
    publicReaction: z.string().optional(),
  }).optional(),
  relatedOperations: z.array(z.string().uuid()).default([]),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  tenantId: z.string(),
});

export type HistoricalOperation = z.infer<typeof historicalOperationSchema>;

// ============================================================================
// DOCTRINE AND TRADECRAFT
// ============================================================================

export const doctrineSchema = z.object({
  id: z.string().uuid(),
  agencyId: z.string().uuid(),
  doctrineName: z.string(),
  category: z.enum([
    'OPERATIONAL_DOCTRINE',
    'COLLECTION_DOCTRINE',
    'COUNTERINTELLIGENCE_DOCTRINE',
    'TECHNICAL_DOCTRINE',
    'TRAINING_DOCTRINE',
    'SECURITY_DOCTRINE',
  ]),
  description: z.string(),
  keyPrinciples: z.array(z.string()).default([]),
  preferredMethods: z.array(z.string()).default([]),
  tradecraftTechniques: z.array(z.object({
    technique: z.string(),
    description: z.string(),
    usageFrequency: z.enum(['ROUTINE', 'COMMON', 'OCCASIONAL', 'RARE']),
    effectiveness: z.enum(['VERY_HIGH', 'HIGH', 'MODERATE', 'LOW']),
  })).default([]),
  evolution: z.array(z.object({
    date: z.string().datetime(),
    change: z.string(),
    driver: z.string(),
    impact: z.string(),
  })).default([]),
  comparisonWithOthers: z.array(z.object({
    otherAgencyId: z.string().uuid(),
    similarities: z.array(z.string()).default([]),
    differences: z.array(z.string()).default([]),
  })).default([]),
  strengths: z.array(z.string()).default([]),
  weaknesses: z.array(z.string()).default([]),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  tenantId: z.string(),
});

export type Doctrine = z.infer<typeof doctrineSchema>;

// ============================================================================
// AGENCY TRACKER CLASS
// ============================================================================

export interface AgencyTrackerConfig {
  enableHistoricalTracking: boolean;
  enableCapabilityAssessment: boolean;
  enableLeadershipTracking: boolean;
  enableCooperationTracking: boolean;
}

export class AgencyTracker {
  private config: AgencyTrackerConfig;

  constructor(config: Partial<AgencyTrackerConfig> = {}) {
    this.config = {
      enableHistoricalTracking: config.enableHistoricalTracking ?? true,
      enableCapabilityAssessment: config.enableCapabilityAssessment ?? true,
      enableLeadershipTracking: config.enableLeadershipTracking ?? true,
      enableCooperationTracking: config.enableCooperationTracking ?? true,
    };
  }

  /**
   * Create a comprehensive agency profile
   */
  createAgencyProfile(data: Partial<IntelligenceAgency>): IntelligenceAgency {
    return intelligenceAgencySchema.parse({
      ...data,
      id: data.id || crypto.randomUUID(),
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    });
  }

  /**
   * Assess agency capabilities
   */
  assessCapabilities(
    agencyId: string,
    assessments: Partial<CapabilityAssessment>[]
  ): CapabilityAssessment[] {
    if (!this.config.enableCapabilityAssessment) {
      throw new Error('Capability assessment is disabled');
    }

    return assessments.map(assessment =>
      capabilityAssessmentSchema.parse({
        ...assessment,
        id: assessment.id || crypto.randomUUID(),
        agencyId,
        createdAt: assessment.createdAt || new Date().toISOString(),
        updatedAt: assessment.updatedAt || new Date().toISOString(),
      })
    );
  }

  /**
   * Track organizational structure
   */
  mapOrganizationalStructure(
    agencyId: string,
    units: Partial<OrganizationalUnit>[]
  ): OrganizationalUnit[] {
    return units.map(unit =>
      organizationalUnitSchema.parse({
        ...unit,
        id: unit.id || crypto.randomUUID(),
        agencyId,
        createdAt: unit.createdAt || new Date().toISOString(),
        updatedAt: unit.updatedAt || new Date().toISOString(),
      })
    );
  }

  /**
   * Analyze cooperation relationships
   */
  analyzeCooperation(
    data: Partial<CooperationRelationship>
  ): CooperationRelationship {
    if (!this.config.enableCooperationTracking) {
      throw new Error('Cooperation tracking is disabled');
    }

    return cooperationRelationshipSchema.parse({
      ...data,
      id: data.id || crypto.randomUUID(),
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    });
  }

  /**
   * Get agency assessment summary
   */
  getAgencyAssessment(agency: IntelligenceAgency): {
    threatLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    capabilities: string[];
    priorities: string[];
    relationships: string;
  } {
    // Simplified assessment logic
    const threatLevel = this.calculateThreatLevel(agency);

    return {
      threatLevel,
      capabilities: agency.capabilities,
      priorities: agency.priorityTargets,
      relationships: `${agency.cooperationPartners.length} partners, ${agency.adversaries.length} adversaries`,
    };
  }

  private calculateThreatLevel(
    agency: IntelligenceAgency
  ): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' {
    // Simplified threat calculation based on capabilities and resources
    const capabilityScore = agency.capabilities.length;
    const resourceScore = (agency.estimatedBudget || 0) / 1000000000; // Billions

    const score = capabilityScore + resourceScore;

    if (score > 20) return 'CRITICAL';
    if (score > 10) return 'HIGH';
    if (score > 5) return 'MEDIUM';
    return 'LOW';
  }
}
