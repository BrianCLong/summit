import { z } from 'zod';

// ============================================================================
// Data Domain Schemas
// ============================================================================

export const HealthDataSchema = z.object({
  citizenId: z.string(),
  timestamp: z.string().datetime(),
  chronicConditions: z.array(z.string()).default([]),
  recentHospitalizations: z.number().default(0),
  mentalHealthScore: z.number().min(0).max(100).optional(),
  accessToHealthcare: z.enum(['none', 'limited', 'adequate', 'full']),
  vaccinationStatus: z.enum(['none', 'partial', 'complete']).optional(),
  lastCheckupDate: z.string().datetime().optional(),
  disabilityStatus: z.boolean().default(false),
  nutritionScore: z.number().min(0).max(100).optional(),
});

export const EconomicDataSchema = z.object({
  citizenId: z.string(),
  timestamp: z.string().datetime(),
  employmentStatus: z.enum(['employed', 'unemployed', 'underemployed', 'retired', 'student', 'disabled']),
  incomeLevel: z.enum(['poverty', 'low', 'middle', 'high']),
  housingStability: z.enum(['homeless', 'unstable', 'stable', 'owned']),
  debtToIncomeRatio: z.number().min(0).optional(),
  socialBenefitsReceived: z.array(z.string()).default([]),
  foodSecurityStatus: z.enum(['insecure', 'marginal', 'secure']),
  utilityAccessScore: z.number().min(0).max(100).optional(),
});

export const EducationalDataSchema = z.object({
  citizenId: z.string(),
  timestamp: z.string().datetime(),
  highestEducationLevel: z.enum(['none', 'primary', 'secondary', 'vocational', 'undergraduate', 'graduate', 'doctoral']),
  currentEnrollment: z.boolean().default(false),
  literacyLevel: z.enum(['illiterate', 'basic', 'functional', 'proficient']),
  digitalLiteracy: z.enum(['none', 'basic', 'intermediate', 'advanced']),
  skillsGapIndicators: z.array(z.string()).default([]),
  trainingParticipation: z.number().default(0),
});

export const BehavioralDataSchema = z.object({
  citizenId: z.string(),
  timestamp: z.string().datetime(),
  serviceEngagementScore: z.number().min(0).max(100),
  communityParticipation: z.enum(['isolated', 'low', 'moderate', 'high']),
  socialSupportNetwork: z.enum(['none', 'weak', 'moderate', 'strong']),
  riskBehaviors: z.array(z.string()).default([]),
  crisisHistoryCount: z.number().default(0),
  complianceScore: z.number().min(0).max(100).optional(),
  mobilityPattern: z.enum(['sedentary', 'limited', 'moderate', 'active']).optional(),
});

// ============================================================================
// Prediction & Analysis Types
// ============================================================================

export const WellbeingDomainSchema = z.enum([
  'health',
  'economic',
  'educational',
  'social',
  'housing',
  'mental_health',
  'food_security',
  'employment',
]);

export const RiskLevelSchema = z.enum(['critical', 'high', 'moderate', 'low', 'minimal']);

export const InterventionTypeSchema = z.enum([
  'immediate_crisis',
  'preventive_outreach',
  'resource_allocation',
  'program_enrollment',
  'case_management',
  'community_connection',
  'skills_training',
  'health_screening',
]);

export const WellbeingPredictionSchema = z.object({
  citizenId: z.string(),
  predictionId: z.string(),
  timestamp: z.string().datetime(),
  overallWellbeingScore: z.number().min(0).max(100),
  domainScores: z.record(WellbeingDomainSchema, z.number().min(0).max(100)),
  riskLevel: RiskLevelSchema,
  trajectoryTrend: z.enum(['declining', 'stable', 'improving']),
  confidenceScore: z.number().min(0).max(1),
  predictionHorizon: z.enum(['30_days', '90_days', '180_days', '365_days']),
  contributingFactors: z.array(z.object({
    factor: z.string(),
    impact: z.number().min(-1).max(1),
    domain: WellbeingDomainSchema,
  })),
});

export const InterventionRecommendationSchema = z.object({
  recommendationId: z.string(),
  citizenId: z.string(),
  predictionId: z.string(),
  interventionType: InterventionTypeSchema,
  priority: z.enum(['urgent', 'high', 'medium', 'low']),
  targetDomains: z.array(WellbeingDomainSchema),
  suggestedPrograms: z.array(z.string()),
  estimatedImpact: z.number().min(0).max(100),
  resourceRequirements: z.object({
    estimatedCost: z.number().optional(),
    staffHours: z.number().optional(),
    duration: z.string().optional(),
  }),
  rationale: z.string(),
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime().optional(),
});

export const ResourceAllocationSchema = z.object({
  allocationId: z.string(),
  region: z.string(),
  timestamp: z.string().datetime(),
  totalBudget: z.number(),
  allocations: z.array(z.object({
    domain: WellbeingDomainSchema,
    amount: z.number(),
    rationale: z.string(),
    expectedOutcomes: z.array(z.string()),
  })),
  populationAtRisk: z.number(),
  projectedImpact: z.object({
    citizensServed: z.number(),
    wellbeingImprovement: z.number(),
  }),
});

export const CohortAnalysisSchema = z.object({
  cohortId: z.string(),
  criteria: z.record(z.string(), z.unknown()),
  populationSize: z.number(),
  averageWellbeingScore: z.number(),
  riskDistribution: z.record(RiskLevelSchema, z.number()),
  topRiskFactors: z.array(z.object({
    factor: z.string(),
    prevalence: z.number(),
    averageImpact: z.number(),
  })),
  recommendedInterventions: z.array(z.string()),
  projectedOutcomes: z.object({
    withIntervention: z.number(),
    withoutIntervention: z.number(),
  }),
});

// ============================================================================
// Type Exports
// ============================================================================

export type HealthData = z.infer<typeof HealthDataSchema>;
export type EconomicData = z.infer<typeof EconomicDataSchema>;
export type EducationalData = z.infer<typeof EducationalDataSchema>;
export type BehavioralData = z.infer<typeof BehavioralDataSchema>;
export type WellbeingDomain = z.infer<typeof WellbeingDomainSchema>;
export type RiskLevel = z.infer<typeof RiskLevelSchema>;
export type InterventionType = z.infer<typeof InterventionTypeSchema>;
export type WellbeingPrediction = z.infer<typeof WellbeingPredictionSchema>;
export type InterventionRecommendation = z.infer<typeof InterventionRecommendationSchema>;
export type ResourceAllocation = z.infer<typeof ResourceAllocationSchema>;
export type CohortAnalysis = z.infer<typeof CohortAnalysisSchema>;

// ============================================================================
// Integrated Citizen Profile
// ============================================================================

export const CitizenWellbeingProfileSchema = z.object({
  citizenId: z.string(),
  lastUpdated: z.string().datetime(),
  healthData: HealthDataSchema.optional(),
  economicData: EconomicDataSchema.optional(),
  educationalData: EducationalDataSchema.optional(),
  behavioralData: BehavioralDataSchema.optional(),
  predictions: z.array(WellbeingPredictionSchema).default([]),
  activeInterventions: z.array(InterventionRecommendationSchema).default([]),
  historicalScores: z.array(z.object({
    timestamp: z.string().datetime(),
    score: z.number(),
  })).default([]),
});

export type CitizenWellbeingProfile = z.infer<typeof CitizenWellbeingProfileSchema>;
