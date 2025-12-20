/**
 * ESG Validators using Zod
 * Input validation schemas for ESG reporting operations
 */

import { z } from 'zod';

// ============================================================================
// Enums as Zod Schemas
// ============================================================================

export const ESGCategorySchema = z.enum([
  'environmental',
  'social',
  'governance',
]);

export const ReportStatusSchema = z.enum([
  'draft',
  'in_review',
  'approved',
  'published',
  'archived',
]);

export const ReportTypeSchema = z.enum([
  'annual',
  'quarterly',
  'monthly',
  'ad_hoc',
  'regulatory',
]);

export const ExportFormatSchema = z.enum(['json', 'csv', 'pdf', 'excel']);

export const ComplianceStatusSchema = z.enum([
  'compliant',
  'partially_compliant',
  'non_compliant',
  'not_applicable',
  'pending_review',
]);

export const MetricUnitSchema = z.enum([
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

export const CarbonEmissionsSchema = z.object({
  scope1: z.number().min(0, 'Scope 1 emissions cannot be negative'),
  scope2: z.number().min(0, 'Scope 2 emissions cannot be negative'),
  scope3: z.number().min(0, 'Scope 3 emissions cannot be negative'),
  totalEmissions: z.number().min(0),
  intensityRatio: z.number().min(0),
  unit: z.literal('tonnes_co2e'),
  baselineYear: z.number().int().min(1990).max(2100).optional(),
  reductionTarget: z.number().min(0).max(100).optional(),
  reductionAchieved: z.number().optional(),
});

export const EnergyMetricsSchema = z.object({
  totalConsumption: z.number().min(0),
  renewableEnergy: z.number().min(0),
  nonRenewableEnergy: z.number().min(0),
  renewablePercentage: z.number().min(0).max(100),
  energyIntensity: z.number().min(0),
  unit: z.enum(['mwh', 'kwh']),
});

export const WaterMetricsSchema = z.object({
  totalWithdrawal: z.number().min(0),
  totalDischarge: z.number().min(0),
  totalConsumption: z.number().min(0),
  recycledWater: z.number().min(0),
  waterIntensity: z.number().min(0),
  unit: z.literal('cubic_meters'),
});

export const WasteMetricsSchema = z.object({
  totalWaste: z.number().min(0),
  hazardousWaste: z.number().min(0),
  nonHazardousWaste: z.number().min(0),
  recycledWaste: z.number().min(0),
  diversionRate: z.number().min(0).max(100),
  unit: z.literal('tonnes'),
});

export const EnvironmentalMetricsSchema = z.object({
  carbonEmissions: CarbonEmissionsSchema,
  energy: EnergyMetricsSchema,
  water: WaterMetricsSchema,
  waste: WasteMetricsSchema,
  biodiversityImpact: z.number().optional(),
  landUse: z.number().optional(),
  airQualityEmissions: z.record(z.number()).optional(),
});

// ============================================================================
// Social Metrics Schemas
// ============================================================================

export const WorkforceDiversitySchema = z.object({
  totalEmployees: z.number().int().min(0),
  genderDiversity: z.object({
    male: z.number().int().min(0),
    female: z.number().int().min(0),
    nonBinary: z.number().int().min(0),
    notDisclosed: z.number().int().min(0),
  }),
  ethnicDiversity: z.record(z.number()).optional(),
  ageDistribution: z
    .object({
      under30: z.number().int().min(0),
      between30And50: z.number().int().min(0),
      over50: z.number().int().min(0),
    })
    .optional(),
  disabilityInclusion: z.number().min(0).max(100).optional(),
  veteranEmployment: z.number().min(0).max(100).optional(),
});

export const LaborPracticesSchema = z.object({
  turnoverRate: z.number().min(0).max(100),
  voluntaryTurnoverRate: z.number().min(0).max(100),
  averageTenure: z.number().min(0),
  trainingHoursPerEmployee: z.number().min(0),
  trainingInvestment: z.number().min(0),
  collectiveBargainingCoverage: z.number().min(0).max(100),
  minimumNoticePeriod: z.number().int().min(0),
});

export const HealthAndSafetySchema = z.object({
  totalRecordableIncidentRate: z.number().min(0),
  lostTimeInjuryRate: z.number().min(0),
  fatalities: z.number().int().min(0),
  nearMisses: z.number().int().min(0),
  safetyTrainingHours: z.number().min(0),
  healthProgramParticipation: z.number().min(0).max(100),
});

export const CommunityImpactSchema = z.object({
  communityInvestment: z.number().min(0),
  volunteerHours: z.number().min(0),
  localHiringPercentage: z.number().min(0).max(100),
  supplierDiversitySpend: z.number().min(0),
  charitableDonations: z.number().min(0),
  stakeholderEngagementEvents: z.number().int().min(0),
});

export const HumanRightsSchema = z.object({
  humanRightsTrainingCoverage: z.number().min(0).max(100),
  humanRightsAssessments: z.number().int().min(0),
  grievancesFiled: z.number().int().min(0),
  grievancesResolved: z.number().int().min(0),
  childLaborRiskAssessment: z.boolean(),
  forcedLaborRiskAssessment: z.boolean(),
});

export const SocialMetricsSchema = z.object({
  diversity: WorkforceDiversitySchema,
  laborPractices: LaborPracticesSchema,
  healthAndSafety: HealthAndSafetySchema,
  communityImpact: CommunityImpactSchema,
  humanRights: HumanRightsSchema,
  customerSatisfactionScore: z.number().min(0).max(100).optional(),
  dataPrivacyBreaches: z.number().int().min(0).optional(),
  productSafetyIncidents: z.number().int().min(0).optional(),
});

// ============================================================================
// Governance Metrics Schemas
// ============================================================================

export const BoardCompositionSchema = z.object({
  totalMembers: z.number().int().min(1),
  independentMembers: z.number().int().min(0),
  femaleMembers: z.number().int().min(0),
  diverseMembers: z.number().int().min(0),
  averageTenure: z.number().min(0),
  averageAge: z.number().min(18).max(100),
  meetingsPerYear: z.number().int().min(0),
  attendanceRate: z.number().min(0).max(100),
});

export const ExecutiveCompensationSchema = z.object({
  ceoToMedianWorkerRatio: z.number().min(0),
  performanceBasedCompensation: z.number().min(0).max(100),
  longTermIncentives: z.number().min(0).max(100),
  clawbackPolicyInPlace: z.boolean(),
  sayOnPaySupport: z.number().min(0).max(100),
});

export const EthicsAndComplianceSchema = z.object({
  codeOfConductCoverage: z.number().min(0).max(100),
  ethicsTrainingCompletion: z.number().min(0).max(100),
  whistleblowerCases: z.number().int().min(0),
  corruptionIncidents: z.number().int().min(0),
  antiCompetitiveIncidents: z.number().int().min(0),
  regulatoryFines: z.number().min(0),
  lobbyingExpenses: z.number().min(0),
  politicalContributions: z.number().min(0),
});

export const RiskManagementSchema = z.object({
  enterpriseRiskManagementInPlace: z.boolean(),
  cybersecurityIncidents: z.number().int().min(0),
  dataBreaches: z.number().int().min(0),
  businessContinuityTestsPerYear: z.number().int().min(0),
  thirdPartyRiskAssessments: z.number().int().min(0),
  climateRiskAssessment: z.boolean(),
});

export const ShareholderRightsSchema = z.object({
  oneShareOneVote: z.boolean(),
  proxyAccessAvailable: z.boolean(),
  shareholderProposalsImplemented: z.number().int().min(0),
  annualMeetingParticipation: z.number().min(0).max(100),
});

export const GovernanceMetricsSchema = z.object({
  boardComposition: BoardCompositionSchema,
  executiveCompensation: ExecutiveCompensationSchema,
  ethicsAndCompliance: EthicsAndComplianceSchema,
  riskManagement: RiskManagementSchema,
  shareholderRights: ShareholderRightsSchema,
  taxTransparency: z.boolean().optional(),
  auditCommitteeIndependence: z.number().min(0).max(100).optional(),
});

// ============================================================================
// Report Schemas
// ============================================================================

export const ESGScoreSchema = z.object({
  overall: z.number().min(0).max(100),
  environmental: z.number().min(0).max(100),
  social: z.number().min(0).max(100),
  governance: z.number().min(0).max(100),
  methodology: z.string().min(1),
  calculatedAt: z.coerce.date(),
  benchmarkComparison: z
    .object({
      industryAverage: z.number().min(0).max(100),
      percentileRank: z.number().min(0).max(100),
    })
    .optional(),
});

export const CreateReportInputSchema = z.object({
  tenantId: z.string().min(1, 'Tenant ID is required'),
  title: z.string().min(1, 'Title is required').max(500),
  description: z.string().max(2000).optional(),
  reportType: ReportTypeSchema,
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
  frameworks: z.array(z.string()).optional(),
  templateId: z.string().uuid().optional(),
});

export const UpdateReportInputSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(2000).optional(),
  status: ReportStatusSchema.optional(),
  environmental: EnvironmentalMetricsSchema.partial().optional(),
  social: SocialMetricsSchema.partial().optional(),
  governance: GovernanceMetricsSchema.partial().optional(),
});

export const ReportFilterSchema = z.object({
  tenantId: z.string().optional(),
  status: z.array(ReportStatusSchema).optional(),
  reportType: z.array(ReportTypeSchema).optional(),
  periodStart: z.coerce.date().optional(),
  periodEnd: z.coerce.date().optional(),
  frameworks: z.array(z.string()).optional(),
});

export const MetricInputSchema = z.object({
  name: z.string().min(1).max(255),
  category: ESGCategorySchema,
  subcategory: z.string().min(1).max(100),
  value: z.number(),
  unit: MetricUnitSchema,
  targetValue: z.number().optional(),
  notes: z.string().max(1000).optional(),
  dataSourceType: z
    .enum(['manual', 'automated', 'third_party', 'calculated'])
    .optional(),
});

export const ReportScheduleInputSchema = z.object({
  tenantId: z.string().min(1),
  name: z.string().min(1).max(255),
  reportType: ReportTypeSchema,
  frequency: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'annually']),
  cronExpression: z.string().optional(),
  recipients: z.array(z.string().email()).min(1),
  exportFormats: z.array(ExportFormatSchema).min(1),
  frameworks: z.array(z.string()).optional(),
  enabled: z.boolean().default(true),
});

// ============================================================================
// Validation Helper Functions
// ============================================================================

export function validateCreateReportInput(
  input: unknown,
): z.infer<typeof CreateReportInputSchema> {
  return CreateReportInputSchema.parse(input);
}

export function validateUpdateReportInput(
  input: unknown,
): z.infer<typeof UpdateReportInputSchema> {
  return UpdateReportInputSchema.parse(input);
}

export function validateMetricInput(
  input: unknown,
): z.infer<typeof MetricInputSchema> {
  return MetricInputSchema.parse(input);
}

export function validateReportScheduleInput(
  input: unknown,
): z.infer<typeof ReportScheduleInputSchema> {
  return ReportScheduleInputSchema.parse(input);
}

export function validateEnvironmentalMetrics(
  input: unknown,
): z.infer<typeof EnvironmentalMetricsSchema> {
  return EnvironmentalMetricsSchema.parse(input);
}

export function validateSocialMetrics(
  input: unknown,
): z.infer<typeof SocialMetricsSchema> {
  return SocialMetricsSchema.parse(input);
}

export function validateGovernanceMetrics(
  input: unknown,
): z.infer<typeof GovernanceMetricsSchema> {
  return GovernanceMetricsSchema.parse(input);
}

// Type inference helpers
export type CreateReportInput = z.infer<typeof CreateReportInputSchema>;
export type UpdateReportInput = z.infer<typeof UpdateReportInputSchema>;
export type MetricInput = z.infer<typeof MetricInputSchema>;
export type ReportScheduleInput = z.infer<typeof ReportScheduleInputSchema>;
