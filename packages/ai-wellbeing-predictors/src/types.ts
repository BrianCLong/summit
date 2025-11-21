// ============================================================================
// Data Domain Types
// ============================================================================

export interface HealthData {
  citizenId: string;
  timestamp: string;
  chronicConditions: string[];
  recentHospitalizations: number;
  mentalHealthScore?: number;
  accessToHealthcare: 'none' | 'limited' | 'adequate' | 'full';
  vaccinationStatus?: 'none' | 'partial' | 'complete';
  lastCheckupDate?: string;
  disabilityStatus: boolean;
  nutritionScore?: number;
}

export interface EconomicData {
  citizenId: string;
  timestamp: string;
  employmentStatus: 'employed' | 'unemployed' | 'underemployed' | 'retired' | 'student' | 'disabled';
  incomeLevel: 'poverty' | 'low' | 'middle' | 'high';
  housingStability: 'homeless' | 'unstable' | 'stable' | 'owned';
  debtToIncomeRatio?: number;
  socialBenefitsReceived: string[];
  foodSecurityStatus: 'insecure' | 'marginal' | 'secure';
  utilityAccessScore?: number;
}

export interface EducationalData {
  citizenId: string;
  timestamp: string;
  highestEducationLevel: 'none' | 'primary' | 'secondary' | 'vocational' | 'undergraduate' | 'graduate' | 'doctoral';
  currentEnrollment: boolean;
  literacyLevel: 'illiterate' | 'basic' | 'functional' | 'proficient';
  digitalLiteracy: 'none' | 'basic' | 'intermediate' | 'advanced';
  skillsGapIndicators: string[];
  trainingParticipation: number;
}

export interface BehavioralData {
  citizenId: string;
  timestamp: string;
  serviceEngagementScore: number;
  communityParticipation: 'isolated' | 'low' | 'moderate' | 'high';
  socialSupportNetwork: 'none' | 'weak' | 'moderate' | 'strong';
  riskBehaviors: string[];
  crisisHistoryCount: number;
  complianceScore?: number;
  mobilityPattern?: 'sedentary' | 'limited' | 'moderate' | 'active';
}

// ============================================================================
// Prediction & Analysis Types
// ============================================================================

export type WellbeingDomain =
  | 'health'
  | 'economic'
  | 'educational'
  | 'social'
  | 'housing'
  | 'mental_health'
  | 'food_security'
  | 'employment';

export type RiskLevel = 'critical' | 'high' | 'moderate' | 'low' | 'minimal';

export type InterventionType =
  | 'immediate_crisis'
  | 'preventive_outreach'
  | 'resource_allocation'
  | 'program_enrollment'
  | 'case_management'
  | 'community_connection'
  | 'skills_training'
  | 'health_screening';

export interface ContributingFactor {
  factor: string;
  impact: number;
  domain: WellbeingDomain;
}

export interface WellbeingPrediction {
  citizenId: string;
  predictionId: string;
  timestamp: string;
  overallWellbeingScore: number;
  domainScores: Record<WellbeingDomain, number>;
  riskLevel: RiskLevel;
  trajectoryTrend: 'declining' | 'stable' | 'improving';
  confidenceScore: number;
  predictionHorizon: '30_days' | '90_days' | '180_days' | '365_days';
  contributingFactors: ContributingFactor[];
}

export interface ResourceRequirements {
  estimatedCost?: number;
  staffHours?: number;
  duration?: string;
}

export interface InterventionRecommendation {
  recommendationId: string;
  citizenId: string;
  predictionId: string;
  interventionType: InterventionType;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  targetDomains: WellbeingDomain[];
  suggestedPrograms: string[];
  estimatedImpact: number;
  resourceRequirements: ResourceRequirements;
  rationale: string;
  createdAt: string;
  expiresAt?: string;
}

export interface DomainAllocation {
  domain: WellbeingDomain;
  amount: number;
  rationale: string;
  expectedOutcomes: string[];
}

export interface ResourceAllocation {
  allocationId: string;
  region: string;
  timestamp: string;
  totalBudget: number;
  allocations: DomainAllocation[];
  populationAtRisk: number;
  projectedImpact: {
    citizensServed: number;
    wellbeingImprovement: number;
  };
}

export interface TopRiskFactor {
  factor: string;
  prevalence: number;
  averageImpact: number;
}

export interface CohortAnalysis {
  cohortId: string;
  criteria: Record<string, unknown>;
  populationSize: number;
  averageWellbeingScore: number;
  riskDistribution: Record<RiskLevel, number>;
  topRiskFactors: TopRiskFactor[];
  recommendedInterventions: string[];
  projectedOutcomes: {
    withIntervention: number;
    withoutIntervention: number;
  };
}

// ============================================================================
// Integrated Citizen Profile
// ============================================================================

export interface HistoricalScore {
  timestamp: string;
  score: number;
}

export interface CitizenWellbeingProfile {
  citizenId: string;
  lastUpdated: string;
  healthData?: HealthData;
  economicData?: EconomicData;
  educationalData?: EducationalData;
  behavioralData?: BehavioralData;
  predictions: WellbeingPrediction[];
  activeInterventions: InterventionRecommendation[];
  historicalScores: HistoricalScore[];
}

// ============================================================================
// Validation Helpers
// ============================================================================

export function isValidWellbeingDomain(domain: string): domain is WellbeingDomain {
  return ['health', 'economic', 'educational', 'social', 'housing', 'mental_health', 'food_security', 'employment'].includes(domain);
}

export function isValidRiskLevel(level: string): level is RiskLevel {
  return ['critical', 'high', 'moderate', 'low', 'minimal'].includes(level);
}
