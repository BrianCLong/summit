"use strict";
/**
 * ESG Validators using Zod
 * Input validation schemas for ESG reporting operations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportScheduleInputSchema = exports.MetricInputSchema = exports.ReportFilterSchema = exports.UpdateReportInputSchema = exports.CreateReportInputSchema = exports.ESGScoreSchema = exports.GovernanceMetricsSchema = exports.ShareholderRightsSchema = exports.RiskManagementSchema = exports.EthicsAndComplianceSchema = exports.ExecutiveCompensationSchema = exports.BoardCompositionSchema = exports.SocialMetricsSchema = exports.HumanRightsSchema = exports.CommunityImpactSchema = exports.HealthAndSafetySchema = exports.LaborPracticesSchema = exports.WorkforceDiversitySchema = exports.EnvironmentalMetricsSchema = exports.WasteMetricsSchema = exports.WaterMetricsSchema = exports.EnergyMetricsSchema = exports.CarbonEmissionsSchema = exports.MetricUnitSchema = exports.ComplianceStatusSchema = exports.ExportFormatSchema = exports.ReportTypeSchema = exports.ReportStatusSchema = exports.ESGCategorySchema = void 0;
exports.validateCreateReportInput = validateCreateReportInput;
exports.validateUpdateReportInput = validateUpdateReportInput;
exports.validateMetricInput = validateMetricInput;
exports.validateReportScheduleInput = validateReportScheduleInput;
exports.validateEnvironmentalMetrics = validateEnvironmentalMetrics;
exports.validateSocialMetrics = validateSocialMetrics;
exports.validateGovernanceMetrics = validateGovernanceMetrics;
const zod_1 = require("zod");
// ============================================================================
// Enums as Zod Schemas
// ============================================================================
exports.ESGCategorySchema = zod_1.z.enum([
    'environmental',
    'social',
    'governance',
]);
exports.ReportStatusSchema = zod_1.z.enum([
    'draft',
    'in_review',
    'approved',
    'published',
    'archived',
]);
exports.ReportTypeSchema = zod_1.z.enum([
    'annual',
    'quarterly',
    'monthly',
    'ad_hoc',
    'regulatory',
]);
exports.ExportFormatSchema = zod_1.z.enum(['json', 'csv', 'pdf', 'excel']);
exports.ComplianceStatusSchema = zod_1.z.enum([
    'compliant',
    'partially_compliant',
    'non_compliant',
    'not_applicable',
    'pending_review',
]);
exports.MetricUnitSchema = zod_1.z.enum([
    'tonnes_co2e',
    'kwh',
    'mwh',
    'cubic_meters',
    'tonnes',
    'kilograms',
    'percentage',
    'count',
    'ratio',
    'hours',
    'currency',
    'score',
]);
// ============================================================================
// Environmental Metrics Schemas
// ============================================================================
exports.CarbonEmissionsSchema = zod_1.z.object({
    scope1: zod_1.z.number().min(0, 'Scope 1 emissions cannot be negative'),
    scope2: zod_1.z.number().min(0, 'Scope 2 emissions cannot be negative'),
    scope3: zod_1.z.number().min(0, 'Scope 3 emissions cannot be negative'),
    totalEmissions: zod_1.z.number().min(0),
    intensityRatio: zod_1.z.number().min(0),
    unit: zod_1.z.literal('tonnes_co2e'),
    baselineYear: zod_1.z.number().int().min(1990).max(2100).optional(),
    reductionTarget: zod_1.z.number().min(0).max(100).optional(),
    reductionAchieved: zod_1.z.number().optional(),
});
exports.EnergyMetricsSchema = zod_1.z.object({
    totalConsumption: zod_1.z.number().min(0),
    renewableEnergy: zod_1.z.number().min(0),
    nonRenewableEnergy: zod_1.z.number().min(0),
    renewablePercentage: zod_1.z.number().min(0).max(100),
    energyIntensity: zod_1.z.number().min(0),
    unit: zod_1.z.enum(['mwh', 'kwh']),
});
exports.WaterMetricsSchema = zod_1.z.object({
    totalWithdrawal: zod_1.z.number().min(0),
    totalDischarge: zod_1.z.number().min(0),
    totalConsumption: zod_1.z.number().min(0),
    recycledWater: zod_1.z.number().min(0),
    waterIntensity: zod_1.z.number().min(0),
    unit: zod_1.z.literal('cubic_meters'),
});
exports.WasteMetricsSchema = zod_1.z.object({
    totalWaste: zod_1.z.number().min(0),
    hazardousWaste: zod_1.z.number().min(0),
    nonHazardousWaste: zod_1.z.number().min(0),
    recycledWaste: zod_1.z.number().min(0),
    diversionRate: zod_1.z.number().min(0).max(100),
    unit: zod_1.z.literal('tonnes'),
});
exports.EnvironmentalMetricsSchema = zod_1.z.object({
    carbonEmissions: exports.CarbonEmissionsSchema,
    energy: exports.EnergyMetricsSchema,
    water: exports.WaterMetricsSchema,
    waste: exports.WasteMetricsSchema,
    biodiversityImpact: zod_1.z.number().optional(),
    landUse: zod_1.z.number().optional(),
    airQualityEmissions: zod_1.z.record(zod_1.z.number()).optional(),
});
// ============================================================================
// Social Metrics Schemas
// ============================================================================
exports.WorkforceDiversitySchema = zod_1.z.object({
    totalEmployees: zod_1.z.number().int().min(0),
    genderDiversity: zod_1.z.object({
        male: zod_1.z.number().int().min(0),
        female: zod_1.z.number().int().min(0),
        nonBinary: zod_1.z.number().int().min(0),
        notDisclosed: zod_1.z.number().int().min(0),
    }),
    ethnicDiversity: zod_1.z.record(zod_1.z.number()).optional(),
    ageDistribution: zod_1.z
        .object({
        under30: zod_1.z.number().int().min(0),
        between30And50: zod_1.z.number().int().min(0),
        over50: zod_1.z.number().int().min(0),
    })
        .optional(),
    disabilityInclusion: zod_1.z.number().min(0).max(100).optional(),
    veteranEmployment: zod_1.z.number().min(0).max(100).optional(),
});
exports.LaborPracticesSchema = zod_1.z.object({
    turnoverRate: zod_1.z.number().min(0).max(100),
    voluntaryTurnoverRate: zod_1.z.number().min(0).max(100),
    averageTenure: zod_1.z.number().min(0),
    trainingHoursPerEmployee: zod_1.z.number().min(0),
    trainingInvestment: zod_1.z.number().min(0),
    collectiveBargainingCoverage: zod_1.z.number().min(0).max(100),
    minimumNoticePeriod: zod_1.z.number().int().min(0),
});
exports.HealthAndSafetySchema = zod_1.z.object({
    totalRecordableIncidentRate: zod_1.z.number().min(0),
    lostTimeInjuryRate: zod_1.z.number().min(0),
    fatalities: zod_1.z.number().int().min(0),
    nearMisses: zod_1.z.number().int().min(0),
    safetyTrainingHours: zod_1.z.number().min(0),
    healthProgramParticipation: zod_1.z.number().min(0).max(100),
});
exports.CommunityImpactSchema = zod_1.z.object({
    communityInvestment: zod_1.z.number().min(0),
    volunteerHours: zod_1.z.number().min(0),
    localHiringPercentage: zod_1.z.number().min(0).max(100),
    supplierDiversitySpend: zod_1.z.number().min(0),
    charitableDonations: zod_1.z.number().min(0),
    stakeholderEngagementEvents: zod_1.z.number().int().min(0),
});
exports.HumanRightsSchema = zod_1.z.object({
    humanRightsTrainingCoverage: zod_1.z.number().min(0).max(100),
    humanRightsAssessments: zod_1.z.number().int().min(0),
    grievancesFiled: zod_1.z.number().int().min(0),
    grievancesResolved: zod_1.z.number().int().min(0),
    childLaborRiskAssessment: zod_1.z.boolean(),
    forcedLaborRiskAssessment: zod_1.z.boolean(),
});
exports.SocialMetricsSchema = zod_1.z.object({
    diversity: exports.WorkforceDiversitySchema,
    laborPractices: exports.LaborPracticesSchema,
    healthAndSafety: exports.HealthAndSafetySchema,
    communityImpact: exports.CommunityImpactSchema,
    humanRights: exports.HumanRightsSchema,
    customerSatisfactionScore: zod_1.z.number().min(0).max(100).optional(),
    dataPrivacyBreaches: zod_1.z.number().int().min(0).optional(),
    productSafetyIncidents: zod_1.z.number().int().min(0).optional(),
});
// ============================================================================
// Governance Metrics Schemas
// ============================================================================
exports.BoardCompositionSchema = zod_1.z.object({
    totalMembers: zod_1.z.number().int().min(1),
    independentMembers: zod_1.z.number().int().min(0),
    femaleMembers: zod_1.z.number().int().min(0),
    diverseMembers: zod_1.z.number().int().min(0),
    averageTenure: zod_1.z.number().min(0),
    averageAge: zod_1.z.number().min(18).max(100),
    meetingsPerYear: zod_1.z.number().int().min(0),
    attendanceRate: zod_1.z.number().min(0).max(100),
});
exports.ExecutiveCompensationSchema = zod_1.z.object({
    ceoToMedianWorkerRatio: zod_1.z.number().min(0),
    performanceBasedCompensation: zod_1.z.number().min(0).max(100),
    longTermIncentives: zod_1.z.number().min(0).max(100),
    clawbackPolicyInPlace: zod_1.z.boolean(),
    sayOnPaySupport: zod_1.z.number().min(0).max(100),
});
exports.EthicsAndComplianceSchema = zod_1.z.object({
    codeOfConductCoverage: zod_1.z.number().min(0).max(100),
    ethicsTrainingCompletion: zod_1.z.number().min(0).max(100),
    whistleblowerCases: zod_1.z.number().int().min(0),
    corruptionIncidents: zod_1.z.number().int().min(0),
    antiCompetitiveIncidents: zod_1.z.number().int().min(0),
    regulatoryFines: zod_1.z.number().min(0),
    lobbyingExpenses: zod_1.z.number().min(0),
    politicalContributions: zod_1.z.number().min(0),
});
exports.RiskManagementSchema = zod_1.z.object({
    enterpriseRiskManagementInPlace: zod_1.z.boolean(),
    cybersecurityIncidents: zod_1.z.number().int().min(0),
    dataBreaches: zod_1.z.number().int().min(0),
    businessContinuityTestsPerYear: zod_1.z.number().int().min(0),
    thirdPartyRiskAssessments: zod_1.z.number().int().min(0),
    climateRiskAssessment: zod_1.z.boolean(),
});
exports.ShareholderRightsSchema = zod_1.z.object({
    oneShareOneVote: zod_1.z.boolean(),
    proxyAccessAvailable: zod_1.z.boolean(),
    shareholderProposalsImplemented: zod_1.z.number().int().min(0),
    annualMeetingParticipation: zod_1.z.number().min(0).max(100),
});
exports.GovernanceMetricsSchema = zod_1.z.object({
    boardComposition: exports.BoardCompositionSchema,
    executiveCompensation: exports.ExecutiveCompensationSchema,
    ethicsAndCompliance: exports.EthicsAndComplianceSchema,
    riskManagement: exports.RiskManagementSchema,
    shareholderRights: exports.ShareholderRightsSchema,
    taxTransparency: zod_1.z.boolean().optional(),
    auditCommitteeIndependence: zod_1.z.number().min(0).max(100).optional(),
});
// ============================================================================
// Report Schemas
// ============================================================================
exports.ESGScoreSchema = zod_1.z.object({
    overall: zod_1.z.number().min(0).max(100),
    environmental: zod_1.z.number().min(0).max(100),
    social: zod_1.z.number().min(0).max(100),
    governance: zod_1.z.number().min(0).max(100),
    methodology: zod_1.z.string().min(1),
    calculatedAt: zod_1.z.coerce.date(),
    benchmarkComparison: zod_1.z
        .object({
        industryAverage: zod_1.z.number().min(0).max(100),
        percentileRank: zod_1.z.number().min(0).max(100),
    })
        .optional(),
});
exports.CreateReportInputSchema = zod_1.z.object({
    tenantId: zod_1.z.string().min(1, 'Tenant ID is required'),
    title: zod_1.z.string().min(1, 'Title is required').max(500),
    description: zod_1.z.string().max(2000).optional(),
    reportType: exports.ReportTypeSchema,
    periodStart: zod_1.z.coerce.date(),
    periodEnd: zod_1.z.coerce.date(),
    frameworks: zod_1.z.array(zod_1.z.string()).optional(),
    templateId: zod_1.z.string().uuid().optional(),
});
exports.UpdateReportInputSchema = zod_1.z.object({
    title: zod_1.z.string().min(1).max(500).optional(),
    description: zod_1.z.string().max(2000).optional(),
    status: exports.ReportStatusSchema.optional(),
    environmental: exports.EnvironmentalMetricsSchema.partial().optional(),
    social: exports.SocialMetricsSchema.partial().optional(),
    governance: exports.GovernanceMetricsSchema.partial().optional(),
});
exports.ReportFilterSchema = zod_1.z.object({
    tenantId: zod_1.z.string().optional(),
    status: zod_1.z.array(exports.ReportStatusSchema).optional(),
    reportType: zod_1.z.array(exports.ReportTypeSchema).optional(),
    periodStart: zod_1.z.coerce.date().optional(),
    periodEnd: zod_1.z.coerce.date().optional(),
    frameworks: zod_1.z.array(zod_1.z.string()).optional(),
});
exports.MetricInputSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(255),
    category: exports.ESGCategorySchema,
    subcategory: zod_1.z.string().min(1).max(100),
    value: zod_1.z.number(),
    unit: exports.MetricUnitSchema,
    targetValue: zod_1.z.number().optional(),
    notes: zod_1.z.string().max(1000).optional(),
    dataSourceType: zod_1.z
        .enum(['manual', 'automated', 'third_party', 'calculated'])
        .optional(),
});
exports.ReportScheduleInputSchema = zod_1.z.object({
    tenantId: zod_1.z.string().min(1),
    name: zod_1.z.string().min(1).max(255),
    reportType: exports.ReportTypeSchema,
    frequency: zod_1.z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'annually']),
    cronExpression: zod_1.z.string().optional(),
    recipients: zod_1.z.array(zod_1.z.string().email()).min(1),
    exportFormats: zod_1.z.array(exports.ExportFormatSchema).min(1),
    frameworks: zod_1.z.array(zod_1.z.string()).optional(),
    enabled: zod_1.z.boolean().default(true),
});
// ============================================================================
// Validation Helper Functions
// ============================================================================
function validateCreateReportInput(input) {
    return exports.CreateReportInputSchema.parse(input);
}
function validateUpdateReportInput(input) {
    return exports.UpdateReportInputSchema.parse(input);
}
function validateMetricInput(input) {
    return exports.MetricInputSchema.parse(input);
}
function validateReportScheduleInput(input) {
    return exports.ReportScheduleInputSchema.parse(input);
}
function validateEnvironmentalMetrics(input) {
    return exports.EnvironmentalMetricsSchema.parse(input);
}
function validateSocialMetrics(input) {
    return exports.SocialMetricsSchema.parse(input);
}
function validateGovernanceMetrics(input) {
    return exports.GovernanceMetricsSchema.parse(input);
}
