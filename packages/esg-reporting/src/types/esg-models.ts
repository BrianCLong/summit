/**
 * ESG Reporting Types
 * Core data models for Environmental, Social, and Governance metrics tracking
 */

// ============================================================================
// Enums
// ============================================================================

export enum ESGCategory {
  ENVIRONMENTAL = 'environmental',
  SOCIAL = 'social',
  GOVERNANCE = 'governance',
}

export enum ReportStatus {
  DRAFT = 'draft',
  IN_REVIEW = 'in_review',
  APPROVED = 'approved',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

export enum ReportType {
  ANNUAL = 'annual',
  QUARTERLY = 'quarterly',
  MONTHLY = 'monthly',
  AD_HOC = 'ad_hoc',
  REGULATORY = 'regulatory',
}

export enum ExportFormat {
  JSON = 'json',
  CSV = 'csv',
  PDF = 'pdf',
  EXCEL = 'excel',
}

export enum ComplianceStatus {
  COMPLIANT = 'compliant',
  PARTIALLY_COMPLIANT = 'partially_compliant',
  NON_COMPLIANT = 'non_compliant',
  NOT_APPLICABLE = 'not_applicable',
  PENDING_REVIEW = 'pending_review',
}

export enum MetricUnit {
  // Environmental
  TONNES_CO2E = 'tonnes_co2e',
  KWH = 'kwh',
  MWH = 'mwh',
  CUBIC_METERS = 'cubic_meters',
  TONNES = 'tonnes',
  KILOGRAMS = 'kilograms',
  PERCENTAGE = 'percentage',
  // Social/Governance
  COUNT = 'count',
  RATIO = 'ratio',
  HOURS = 'hours',
  CURRENCY = 'currency',
  SCORE = 'score',
}

// ============================================================================
// Environmental Metrics
// ============================================================================

export interface CarbonEmissions {
  scope1: number; // Direct emissions
  scope2: number; // Indirect emissions from energy
  scope3: number; // Other indirect emissions
  totalEmissions: number;
  intensityRatio: number; // per revenue or employee
  unit: MetricUnit.TONNES_CO2E;
  baselineYear?: number;
  reductionTarget?: number;
  reductionAchieved?: number;
}

export interface EnergyMetrics {
  totalConsumption: number;
  renewableEnergy: number;
  nonRenewableEnergy: number;
  renewablePercentage: number;
  energyIntensity: number;
  unit: MetricUnit.MWH | MetricUnit.KWH;
}

export interface WaterMetrics {
  totalWithdrawal: number;
  totalDischarge: number;
  totalConsumption: number;
  recycledWater: number;
  waterIntensity: number;
  unit: MetricUnit.CUBIC_METERS;
}

export interface WasteMetrics {
  totalWaste: number;
  hazardousWaste: number;
  nonHazardousWaste: number;
  recycledWaste: number;
  diversionRate: number;
  unit: MetricUnit.TONNES;
}

export interface EnvironmentalMetrics {
  carbonEmissions: CarbonEmissions;
  energy: EnergyMetrics;
  water: WaterMetrics;
  waste: WasteMetrics;
  biodiversityImpact?: number;
  landUse?: number;
  airQualityEmissions?: Record<string, number>;
}

// ============================================================================
// Social Metrics
// ============================================================================

export interface WorkforceDiversity {
  totalEmployees: number;
  genderDiversity: {
    male: number;
    female: number;
    nonBinary: number;
    notDisclosed: number;
  };
  ethnicDiversity?: Record<string, number>;
  ageDistribution?: {
    under30: number;
    between30And50: number;
    over50: number;
  };
  disabilityInclusion?: number;
  veteranEmployment?: number;
}

export interface LaborPractices {
  turnoverRate: number;
  voluntaryTurnoverRate: number;
  averageTenure: number;
  trainingHoursPerEmployee: number;
  trainingInvestment: number;
  collectiveBargainingCoverage: number;
  minimumNoticePeriod: number;
}

export interface HealthAndSafety {
  totalRecordableIncidentRate: number;
  lostTimeInjuryRate: number;
  fatalities: number;
  nearMisses: number;
  safetyTrainingHours: number;
  healthProgramParticipation: number;
}

export interface CommunityImpact {
  communityInvestment: number;
  volunteerHours: number;
  localHiringPercentage: number;
  supplierDiversitySpend: number;
  charitableDonations: number;
  stakeholderEngagementEvents: number;
}

export interface HumanRights {
  humanRightsTrainingCoverage: number;
  humanRightsAssessments: number;
  grievancesFiled: number;
  grievancesResolved: number;
  childLaborRiskAssessment: boolean;
  forcedLaborRiskAssessment: boolean;
}

export interface SocialMetrics {
  diversity: WorkforceDiversity;
  laborPractices: LaborPractices;
  healthAndSafety: HealthAndSafety;
  communityImpact: CommunityImpact;
  humanRights: HumanRights;
  customerSatisfactionScore?: number;
  dataPrivacyBreaches?: number;
  productSafetyIncidents?: number;
}

// ============================================================================
// Governance Metrics
// ============================================================================

export interface BoardComposition {
  totalMembers: number;
  independentMembers: number;
  femaleMembers: number;
  diverseMembers: number;
  averageTenure: number;
  averageAge: number;
  meetingsPerYear: number;
  attendanceRate: number;
}

export interface ExecutiveCompensation {
  ceoToMedianWorkerRatio: number;
  performanceBasedCompensation: number;
  longTermIncentives: number;
  clawbackPolicyInPlace: boolean;
  sayOnPaySupport: number;
}

export interface EthicsAndCompliance {
  codeOfConductCoverage: number;
  ethicsTrainingCompletion: number;
  whistleblowerCases: number;
  corruptionIncidents: number;
  antiCompetitiveIncidents: number;
  regulatoryFines: number;
  lobbyingExpenses: number;
  politicalContributions: number;
}

export interface RiskManagement {
  enterpriseRiskManagementInPlace: boolean;
  cybersecurityIncidents: number;
  dataBreaches: number;
  businessContinuityTestsPerYear: number;
  thirdPartyRiskAssessments: number;
  climateRiskAssessment: boolean;
}

export interface ShareholderRights {
  oneShareOneVote: boolean;
  proxyAccessAvailable: boolean;
  shareholderProposalsImplemented: number;
  annualMeetingParticipation: number;
}

export interface GovernanceMetrics {
  boardComposition: BoardComposition;
  executiveCompensation: ExecutiveCompensation;
  ethicsAndCompliance: EthicsAndCompliance;
  riskManagement: RiskManagement;
  shareholderRights: ShareholderRights;
  taxTransparency?: boolean;
  auditCommitteeIndependence?: number;
}

// ============================================================================
// ESG Scores and Ratings
// ============================================================================

export interface ESGScore {
  overall: number;
  environmental: number;
  social: number;
  governance: number;
  methodology: string;
  calculatedAt: Date;
  benchmarkComparison?: {
    industryAverage: number;
    percentileRank: number;
  };
}

export interface ESGRating {
  provider: string;
  rating: string;
  score?: number;
  ratingDate: Date;
  outlook?: 'positive' | 'neutral' | 'negative';
  controversyScore?: number;
}

// ============================================================================
// ESG Report
// ============================================================================

export interface ESGDataSource {
  name: string;
  type: 'manual' | 'automated' | 'third_party' | 'calculated';
  lastUpdated: Date;
  reliability: 'high' | 'medium' | 'low';
  verificationStatus: 'verified' | 'unverified' | 'pending';
}

export interface ESGMetricEntry {
  id: string;
  name: string;
  category: ESGCategory;
  subcategory: string;
  value: number;
  unit: MetricUnit;
  previousValue?: number;
  targetValue?: number;
  benchmarkValue?: number;
  variance?: number;
  trend?: 'improving' | 'stable' | 'declining';
  dataSource: ESGDataSource;
  notes?: string;
  complianceMapping?: ComplianceMapping[];
}

export interface ComplianceMapping {
  framework: string;
  requirement: string;
  status: ComplianceStatus;
  evidence?: string;
  gapAnalysis?: string;
}

export interface ESGReport {
  id: string;
  tenantId: string;
  title: string;
  description?: string;
  reportType: ReportType;
  status: ReportStatus;
  periodStart: Date;
  periodEnd: Date;
  environmental: EnvironmentalMetrics;
  social: SocialMetrics;
  governance: GovernanceMetrics;
  scores: ESGScore;
  ratings?: ESGRating[];
  metrics: ESGMetricEntry[];
  complianceFrameworks: string[];
  complianceSummary: Record<string, ComplianceStatus>;
  metadata: {
    version: string;
    generatedAt: Date;
    generatedBy: string;
    approvedBy?: string;
    approvedAt?: Date;
    publishedAt?: Date;
  };
  attachments?: {
    name: string;
    type: string;
    url: string;
  }[];
  auditTrail: AuditEntry[];
}

export interface AuditEntry {
  timestamp: Date;
  action: string;
  actor: string;
  details?: Record<string, unknown>;
}

// ============================================================================
// Report Configuration
// ============================================================================

export interface ReportSchedule {
  id: string;
  tenantId: string;
  name: string;
  reportType: ReportType;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually';
  cronExpression?: string;
  recipients: string[];
  exportFormats: ExportFormat[];
  frameworks: string[];
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReportTemplate {
  id: string;
  name: string;
  description?: string;
  sections: ReportSection[];
  frameworks: string[];
  defaultMetrics: string[];
  styling?: ReportStyling;
}

export interface ReportSection {
  id: string;
  title: string;
  category?: ESGCategory;
  metrics: string[];
  includeCharts: boolean;
  includeComparison: boolean;
  narrativeTemplate?: string;
}

export interface ReportStyling {
  primaryColor?: string;
  secondaryColor?: string;
  logoUrl?: string;
  fontFamily?: string;
  pageSize?: 'A4' | 'Letter';
}

// ============================================================================
// Input Types for API Operations
// ============================================================================

export interface CreateReportInput {
  tenantId: string;
  title: string;
  description?: string;
  reportType: ReportType;
  periodStart: Date;
  periodEnd: Date;
  frameworks?: string[];
  templateId?: string;
}

export interface UpdateReportInput {
  title?: string;
  description?: string;
  status?: ReportStatus;
  environmental?: Partial<EnvironmentalMetrics>;
  social?: Partial<SocialMetrics>;
  governance?: Partial<GovernanceMetrics>;
}

export interface ReportFilter {
  tenantId?: string;
  status?: ReportStatus[];
  reportType?: ReportType[];
  periodStart?: Date;
  periodEnd?: Date;
  frameworks?: string[];
}

export interface MetricInput {
  name: string;
  category: ESGCategory;
  subcategory: string;
  value: number;
  unit: MetricUnit;
  targetValue?: number;
  notes?: string;
  dataSourceType?: 'manual' | 'automated' | 'third_party' | 'calculated';
}
