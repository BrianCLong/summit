"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CitizenWellbeingProfileSchema = exports.CohortAnalysisSchema = exports.ResourceAllocationSchema = exports.InterventionRecommendationSchema = exports.WellbeingPredictionSchema = exports.InterventionTypeSchema = exports.RiskLevelSchema = exports.WellbeingDomainSchema = exports.BehavioralDataSchema = exports.EducationalDataSchema = exports.EconomicDataSchema = exports.HealthDataSchema = void 0;
const zod_1 = require("zod");
// ============================================================================
// Data Domain Schemas
// ============================================================================
exports.HealthDataSchema = zod_1.z.object({
    citizenId: zod_1.z.string(),
    timestamp: zod_1.z.string().datetime(),
    chronicConditions: zod_1.z.array(zod_1.z.string()).default([]),
    recentHospitalizations: zod_1.z.number().default(0),
    mentalHealthScore: zod_1.z.number().min(0).max(100).optional(),
    accessToHealthcare: zod_1.z.enum(['none', 'limited', 'adequate', 'full']),
    vaccinationStatus: zod_1.z.enum(['none', 'partial', 'complete']).optional(),
    lastCheckupDate: zod_1.z.string().datetime().optional(),
    disabilityStatus: zod_1.z.boolean().default(false),
    nutritionScore: zod_1.z.number().min(0).max(100).optional(),
});
exports.EconomicDataSchema = zod_1.z.object({
    citizenId: zod_1.z.string(),
    timestamp: zod_1.z.string().datetime(),
    employmentStatus: zod_1.z.enum(['employed', 'unemployed', 'underemployed', 'retired', 'student', 'disabled']),
    incomeLevel: zod_1.z.enum(['poverty', 'low', 'middle', 'high']),
    housingStability: zod_1.z.enum(['homeless', 'unstable', 'stable', 'owned']),
    debtToIncomeRatio: zod_1.z.number().min(0).optional(),
    socialBenefitsReceived: zod_1.z.array(zod_1.z.string()).default([]),
    foodSecurityStatus: zod_1.z.enum(['insecure', 'marginal', 'secure']),
    utilityAccessScore: zod_1.z.number().min(0).max(100).optional(),
});
exports.EducationalDataSchema = zod_1.z.object({
    citizenId: zod_1.z.string(),
    timestamp: zod_1.z.string().datetime(),
    highestEducationLevel: zod_1.z.enum(['none', 'primary', 'secondary', 'vocational', 'undergraduate', 'graduate', 'doctoral']),
    currentEnrollment: zod_1.z.boolean().default(false),
    literacyLevel: zod_1.z.enum(['illiterate', 'basic', 'functional', 'proficient']),
    digitalLiteracy: zod_1.z.enum(['none', 'basic', 'intermediate', 'advanced']),
    skillsGapIndicators: zod_1.z.array(zod_1.z.string()).default([]),
    trainingParticipation: zod_1.z.number().default(0),
});
exports.BehavioralDataSchema = zod_1.z.object({
    citizenId: zod_1.z.string(),
    timestamp: zod_1.z.string().datetime(),
    serviceEngagementScore: zod_1.z.number().min(0).max(100),
    communityParticipation: zod_1.z.enum(['isolated', 'low', 'moderate', 'high']),
    socialSupportNetwork: zod_1.z.enum(['none', 'weak', 'moderate', 'strong']),
    riskBehaviors: zod_1.z.array(zod_1.z.string()).default([]),
    crisisHistoryCount: zod_1.z.number().default(0),
    complianceScore: zod_1.z.number().min(0).max(100).optional(),
    mobilityPattern: zod_1.z.enum(['sedentary', 'limited', 'moderate', 'active']).optional(),
});
// ============================================================================
// Prediction & Analysis Types
// ============================================================================
exports.WellbeingDomainSchema = zod_1.z.enum([
    'health',
    'economic',
    'educational',
    'social',
    'housing',
    'mental_health',
    'food_security',
    'employment',
]);
exports.RiskLevelSchema = zod_1.z.enum(['critical', 'high', 'moderate', 'low', 'minimal']);
exports.InterventionTypeSchema = zod_1.z.enum([
    'immediate_crisis',
    'preventive_outreach',
    'resource_allocation',
    'program_enrollment',
    'case_management',
    'community_connection',
    'skills_training',
    'health_screening',
]);
exports.WellbeingPredictionSchema = zod_1.z.object({
    citizenId: zod_1.z.string(),
    predictionId: zod_1.z.string(),
    timestamp: zod_1.z.string().datetime(),
    overallWellbeingScore: zod_1.z.number().min(0).max(100),
    domainScores: zod_1.z.record(exports.WellbeingDomainSchema, zod_1.z.number().min(0).max(100)),
    riskLevel: exports.RiskLevelSchema,
    trajectoryTrend: zod_1.z.enum(['declining', 'stable', 'improving']),
    confidenceScore: zod_1.z.number().min(0).max(1),
    predictionHorizon: zod_1.z.enum(['30_days', '90_days', '180_days', '365_days']),
    contributingFactors: zod_1.z.array(zod_1.z.object({
        factor: zod_1.z.string(),
        impact: zod_1.z.number().min(-1).max(1),
        domain: exports.WellbeingDomainSchema,
    })),
});
exports.InterventionRecommendationSchema = zod_1.z.object({
    recommendationId: zod_1.z.string(),
    citizenId: zod_1.z.string(),
    predictionId: zod_1.z.string(),
    interventionType: exports.InterventionTypeSchema,
    priority: zod_1.z.enum(['urgent', 'high', 'medium', 'low']),
    targetDomains: zod_1.z.array(exports.WellbeingDomainSchema),
    suggestedPrograms: zod_1.z.array(zod_1.z.string()),
    estimatedImpact: zod_1.z.number().min(0).max(100),
    resourceRequirements: zod_1.z.object({
        estimatedCost: zod_1.z.number().optional(),
        staffHours: zod_1.z.number().optional(),
        duration: zod_1.z.string().optional(),
    }),
    rationale: zod_1.z.string(),
    createdAt: zod_1.z.string().datetime(),
    expiresAt: zod_1.z.string().datetime().optional(),
});
exports.ResourceAllocationSchema = zod_1.z.object({
    allocationId: zod_1.z.string(),
    region: zod_1.z.string(),
    timestamp: zod_1.z.string().datetime(),
    totalBudget: zod_1.z.number(),
    allocations: zod_1.z.array(zod_1.z.object({
        domain: exports.WellbeingDomainSchema,
        amount: zod_1.z.number(),
        rationale: zod_1.z.string(),
        expectedOutcomes: zod_1.z.array(zod_1.z.string()),
    })),
    populationAtRisk: zod_1.z.number(),
    projectedImpact: zod_1.z.object({
        citizensServed: zod_1.z.number(),
        wellbeingImprovement: zod_1.z.number(),
    }),
});
exports.CohortAnalysisSchema = zod_1.z.object({
    cohortId: zod_1.z.string(),
    criteria: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()),
    populationSize: zod_1.z.number(),
    averageWellbeingScore: zod_1.z.number(),
    riskDistribution: zod_1.z.record(exports.RiskLevelSchema, zod_1.z.number()),
    topRiskFactors: zod_1.z.array(zod_1.z.object({
        factor: zod_1.z.string(),
        prevalence: zod_1.z.number(),
        averageImpact: zod_1.z.number(),
    })),
    recommendedInterventions: zod_1.z.array(zod_1.z.string()),
    projectedOutcomes: zod_1.z.object({
        withIntervention: zod_1.z.number(),
        withoutIntervention: zod_1.z.number(),
    }),
});
// ============================================================================
// Integrated Citizen Profile
// ============================================================================
exports.CitizenWellbeingProfileSchema = zod_1.z.object({
    citizenId: zod_1.z.string(),
    lastUpdated: zod_1.z.string().datetime(),
    healthData: exports.HealthDataSchema.optional(),
    economicData: exports.EconomicDataSchema.optional(),
    educationalData: exports.EducationalDataSchema.optional(),
    behavioralData: exports.BehavioralDataSchema.optional(),
    predictions: zod_1.z.array(exports.WellbeingPredictionSchema).default([]),
    activeInterventions: zod_1.z.array(exports.InterventionRecommendationSchema).default([]),
    historicalScores: zod_1.z.array(zod_1.z.object({
        timestamp: zod_1.z.string().datetime(),
        score: zod_1.z.number(),
    })).default([]),
});
