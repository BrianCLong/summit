/**
 * ESG Metrics Calculation Engine
 * Algorithms for computing ESG scores and metrics
 */

import type {
  ESGScore,
  EnvironmentalMetrics,
  SocialMetrics,
  GovernanceMetrics,
  ESGReport,
  ESGCategory,
} from '../types/esg-models.js';

// ============================================================================
// Score Weights Configuration
// ============================================================================

export interface ScoreWeights {
  environmental: {
    carbonEmissions: number;
    energy: number;
    water: number;
    waste: number;
  };
  social: {
    diversity: number;
    laborPractices: number;
    healthAndSafety: number;
    communityImpact: number;
    humanRights: number;
  };
  governance: {
    boardComposition: number;
    executiveCompensation: number;
    ethicsAndCompliance: number;
    riskManagement: number;
    shareholderRights: number;
  };
  categoryWeights: {
    environmental: number;
    social: number;
    governance: number;
  };
}

export const DEFAULT_WEIGHTS: ScoreWeights = {
  environmental: {
    carbonEmissions: 0.35,
    energy: 0.25,
    water: 0.20,
    waste: 0.20,
  },
  social: {
    diversity: 0.20,
    laborPractices: 0.20,
    healthAndSafety: 0.25,
    communityImpact: 0.15,
    humanRights: 0.20,
  },
  governance: {
    boardComposition: 0.25,
    executiveCompensation: 0.15,
    ethicsAndCompliance: 0.30,
    riskManagement: 0.20,
    shareholderRights: 0.10,
  },
  categoryWeights: {
    environmental: 0.34,
    social: 0.33,
    governance: 0.33,
  },
};

// ============================================================================
// Score Calculation Functions
// ============================================================================

/**
 * Normalizes a value to a 0-100 scale
 */
function normalize(
  value: number,
  min: number,
  max: number,
  inverse: boolean = false,
): number {
  if (max === min) return 50;
  const normalized = ((value - min) / (max - min)) * 100;
  const clamped = Math.max(0, Math.min(100, normalized));
  return inverse ? 100 - clamped : clamped;
}

/**
 * Calculate Environmental Score
 */
export function calculateEnvironmentalScore(
  metrics: EnvironmentalMetrics,
  weights: ScoreWeights['environmental'] = DEFAULT_WEIGHTS.environmental,
  benchmarks?: EnvironmentalBenchmarks,
): number {
  const scores: number[] = [];

  // Carbon Emissions Score (lower is better)
  if (metrics.carbonEmissions) {
    const emissionsScore = calculateCarbonScore(metrics.carbonEmissions, benchmarks?.carbonEmissions);
    scores.push(emissionsScore * weights.carbonEmissions);
  }

  // Energy Score (higher renewable % is better)
  if (metrics.energy) {
    const energyScore = calculateEnergyScore(metrics.energy, benchmarks?.energy);
    scores.push(energyScore * weights.energy);
  }

  // Water Score (lower consumption, higher recycling is better)
  if (metrics.water) {
    const waterScore = calculateWaterScore(metrics.water, benchmarks?.water);
    scores.push(waterScore * weights.water);
  }

  // Waste Score (higher diversion rate is better)
  if (metrics.waste) {
    const wasteScore = calculateWasteScore(metrics.waste, benchmarks?.waste);
    scores.push(wasteScore * weights.waste);
  }

  // Calculate weighted average
  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
  return scores.length > 0
    ? Math.round((scores.reduce((a, b) => a + b, 0) / totalWeight) * 100) / 100
    : 0;
}

/**
 * Calculate Social Score
 */
export function calculateSocialScore(
  metrics: SocialMetrics,
  weights: ScoreWeights['social'] = DEFAULT_WEIGHTS.social,
  benchmarks?: SocialBenchmarks,
): number {
  const scores: number[] = [];

  // Diversity Score
  if (metrics.diversity) {
    const diversityScore = calculateDiversityScore(metrics.diversity, benchmarks?.diversity);
    scores.push(diversityScore * weights.diversity);
  }

  // Labor Practices Score
  if (metrics.laborPractices) {
    const laborScore = calculateLaborScore(metrics.laborPractices, benchmarks?.laborPractices);
    scores.push(laborScore * weights.laborPractices);
  }

  // Health & Safety Score
  if (metrics.healthAndSafety) {
    const safetyScore = calculateSafetyScore(metrics.healthAndSafety, benchmarks?.healthAndSafety);
    scores.push(safetyScore * weights.healthAndSafety);
  }

  // Community Impact Score
  if (metrics.communityImpact) {
    const communityScore = calculateCommunityScore(
      metrics.communityImpact,
      benchmarks?.communityImpact,
    );
    scores.push(communityScore * weights.communityImpact);
  }

  // Human Rights Score
  if (metrics.humanRights) {
    const humanRightsScore = calculateHumanRightsScore(
      metrics.humanRights,
      benchmarks?.humanRights,
    );
    scores.push(humanRightsScore * weights.humanRights);
  }

  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
  return scores.length > 0
    ? Math.round((scores.reduce((a, b) => a + b, 0) / totalWeight) * 100) / 100
    : 0;
}

/**
 * Calculate Governance Score
 */
export function calculateGovernanceScore(
  metrics: GovernanceMetrics,
  weights: ScoreWeights['governance'] = DEFAULT_WEIGHTS.governance,
  benchmarks?: GovernanceBenchmarks,
): number {
  const scores: number[] = [];

  // Board Composition Score
  if (metrics.boardComposition) {
    const boardScore = calculateBoardScore(metrics.boardComposition, benchmarks?.boardComposition);
    scores.push(boardScore * weights.boardComposition);
  }

  // Executive Compensation Score
  if (metrics.executiveCompensation) {
    const compScore = calculateCompensationScore(
      metrics.executiveCompensation,
      benchmarks?.executiveCompensation,
    );
    scores.push(compScore * weights.executiveCompensation);
  }

  // Ethics & Compliance Score
  if (metrics.ethicsAndCompliance) {
    const ethicsScore = calculateEthicsScore(
      metrics.ethicsAndCompliance,
      benchmarks?.ethicsAndCompliance,
    );
    scores.push(ethicsScore * weights.ethicsAndCompliance);
  }

  // Risk Management Score
  if (metrics.riskManagement) {
    const riskScore = calculateRiskManagementScore(
      metrics.riskManagement,
      benchmarks?.riskManagement,
    );
    scores.push(riskScore * weights.riskManagement);
  }

  // Shareholder Rights Score
  if (metrics.shareholderRights) {
    const rightsScore = calculateShareholderRightsScore(
      metrics.shareholderRights,
      benchmarks?.shareholderRights,
    );
    scores.push(rightsScore * weights.shareholderRights);
  }

  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
  return scores.length > 0
    ? Math.round((scores.reduce((a, b) => a + b, 0) / totalWeight) * 100) / 100
    : 0;
}

/**
 * Calculate Overall ESG Score
 */
export function calculateESGScore(
  environmental: EnvironmentalMetrics,
  social: SocialMetrics,
  governance: GovernanceMetrics,
  weights: ScoreWeights = DEFAULT_WEIGHTS,
  benchmarks?: AllBenchmarks,
): ESGScore {
  const envScore = calculateEnvironmentalScore(
    environmental,
    weights.environmental,
    benchmarks?.environmental,
  );
  const socScore = calculateSocialScore(social, weights.social, benchmarks?.social);
  const govScore = calculateGovernanceScore(
    governance,
    weights.governance,
    benchmarks?.governance,
  );

  const overall =
    envScore * weights.categoryWeights.environmental +
    socScore * weights.categoryWeights.social +
    govScore * weights.categoryWeights.governance;

  return {
    overall: Math.round(overall * 100) / 100,
    environmental: envScore,
    social: socScore,
    governance: govScore,
    methodology: 'Summit ESG Scoring v1.0',
    calculatedAt: new Date(),
  };
}

// ============================================================================
// Component Score Calculators
// ============================================================================

function calculateCarbonScore(
  carbon: EnvironmentalMetrics['carbonEmissions'],
  benchmark?: CarbonBenchmarks,
): number {
  // Score based on emissions intensity and reduction progress
  const intensityScore = normalize(
    carbon.intensityRatio,
    benchmark?.intensityRatio?.min ?? 0,
    benchmark?.intensityRatio?.max ?? 100,
    true, // Lower is better
  );

  const reductionScore =
    carbon.reductionTarget && carbon.reductionAchieved
      ? normalize(
          (carbon.reductionAchieved / carbon.reductionTarget) * 100,
          0,
          100,
        )
      : 50; // Neutral if no target

  return intensityScore * 0.6 + reductionScore * 0.4;
}

function calculateEnergyScore(
  energy: EnvironmentalMetrics['energy'],
  benchmark?: EnergyBenchmarks,
): number {
  // Higher renewable percentage = better score
  return normalize(
    energy.renewablePercentage,
    benchmark?.renewablePercentage?.min ?? 0,
    benchmark?.renewablePercentage?.max ?? 100,
  );
}

function calculateWaterScore(
  water: EnvironmentalMetrics['water'],
  benchmark?: WaterBenchmarks,
): number {
  // Higher recycling rate = better score
  const recycleRate =
    water.totalWithdrawal > 0 ? (water.recycledWater / water.totalWithdrawal) * 100 : 0;
  return normalize(
    recycleRate,
    benchmark?.recycleRate?.min ?? 0,
    benchmark?.recycleRate?.max ?? 100,
  );
}

function calculateWasteScore(
  waste: EnvironmentalMetrics['waste'],
  benchmark?: WasteBenchmarks,
): number {
  return normalize(
    waste.diversionRate,
    benchmark?.diversionRate?.min ?? 0,
    benchmark?.diversionRate?.max ?? 100,
  );
}

function calculateDiversityScore(
  diversity: SocialMetrics['diversity'],
  benchmark?: DiversityBenchmarks,
): number {
  const total = diversity.totalEmployees;
  if (total === 0) return 50;

  const genderBalance =
    100 -
    Math.abs(
      50 - (diversity.genderDiversity.female / total) * 100,
    ) *
      2;

  return normalize(genderBalance, 0, 100);
}

function calculateLaborScore(
  labor: SocialMetrics['laborPractices'],
  benchmark?: LaborBenchmarks,
): number {
  // Lower turnover = better
  const turnoverScore = normalize(
    labor.voluntaryTurnoverRate,
    benchmark?.turnoverRate?.min ?? 0,
    benchmark?.turnoverRate?.max ?? 50,
    true,
  );

  // Higher training hours = better
  const trainingScore = normalize(
    labor.trainingHoursPerEmployee,
    benchmark?.trainingHours?.min ?? 0,
    benchmark?.trainingHours?.max ?? 100,
  );

  return turnoverScore * 0.5 + trainingScore * 0.5;
}

function calculateSafetyScore(
  safety: SocialMetrics['healthAndSafety'],
  benchmark?: SafetyBenchmarks,
): number {
  // Lower incident rate = better
  const incidentScore = normalize(
    safety.totalRecordableIncidentRate,
    benchmark?.incidentRate?.min ?? 0,
    benchmark?.incidentRate?.max ?? 10,
    true,
  );

  // Zero fatalities is critical
  const fatalityPenalty = safety.fatalities > 0 ? safety.fatalities * 10 : 0;

  return Math.max(0, incidentScore - fatalityPenalty);
}

function calculateCommunityScore(
  community: SocialMetrics['communityImpact'],
  benchmark?: CommunityBenchmarks,
): number {
  // Higher local hiring = better
  return normalize(
    community.localHiringPercentage,
    benchmark?.localHiring?.min ?? 0,
    benchmark?.localHiring?.max ?? 100,
  );
}

function calculateHumanRightsScore(
  humanRights: SocialMetrics['humanRights'],
  benchmark?: HumanRightsBenchmarks,
): number {
  // Higher training coverage = better
  const trainingScore = normalize(humanRights.humanRightsTrainingCoverage, 0, 100);

  // Grievance resolution rate
  const resolutionRate =
    humanRights.grievancesFiled > 0
      ? (humanRights.grievancesResolved / humanRights.grievancesFiled) * 100
      : 100;
  const resolutionScore = normalize(resolutionRate, 0, 100);

  // Risk assessments completed
  const assessmentScore =
    humanRights.childLaborRiskAssessment && humanRights.forcedLaborRiskAssessment
      ? 100
      : humanRights.childLaborRiskAssessment || humanRights.forcedLaborRiskAssessment
        ? 50
        : 0;

  return trainingScore * 0.4 + resolutionScore * 0.3 + assessmentScore * 0.3;
}

function calculateBoardScore(
  board: GovernanceMetrics['boardComposition'],
  benchmark?: BoardBenchmarks,
): number {
  // Independence ratio
  const independenceScore = normalize(
    (board.independentMembers / board.totalMembers) * 100,
    benchmark?.independence?.min ?? 0,
    benchmark?.independence?.max ?? 100,
  );

  // Gender diversity on board
  const genderScore = normalize(
    (board.femaleMembers / board.totalMembers) * 100,
    benchmark?.genderDiversity?.min ?? 0,
    benchmark?.genderDiversity?.max ?? 50,
  );

  // Attendance rate
  const attendanceScore = normalize(
    board.attendanceRate,
    benchmark?.attendance?.min ?? 0,
    benchmark?.attendance?.max ?? 100,
  );

  return independenceScore * 0.4 + genderScore * 0.3 + attendanceScore * 0.3;
}

function calculateCompensationScore(
  comp: GovernanceMetrics['executiveCompensation'],
  benchmark?: CompensationBenchmarks,
): number {
  // Lower CEO ratio = better (inverse)
  const ratioScore = normalize(
    comp.ceoToMedianWorkerRatio,
    benchmark?.ceoRatio?.min ?? 0,
    benchmark?.ceoRatio?.max ?? 500,
    true,
  );

  // Higher performance-based = better
  const performanceScore = normalize(
    comp.performanceBasedCompensation,
    benchmark?.performanceBased?.min ?? 0,
    benchmark?.performanceBased?.max ?? 100,
  );

  // Clawback policy in place
  const clawbackScore = comp.clawbackPolicyInPlace ? 100 : 0;

  return ratioScore * 0.4 + performanceScore * 0.4 + clawbackScore * 0.2;
}

function calculateEthicsScore(
  ethics: GovernanceMetrics['ethicsAndCompliance'],
  benchmark?: EthicsBenchmarks,
): number {
  // Higher training completion = better
  const trainingScore = normalize(ethics.ethicsTrainingCompletion, 0, 100);

  // Lower incidents = better
  const incidentPenalty =
    (ethics.corruptionIncidents + ethics.antiCompetitiveIncidents) * 5;

  // Lower fines = better
  const finesPenalty =
    ethics.regulatoryFines > 0
      ? normalize(
          ethics.regulatoryFines,
          0,
          benchmark?.fines?.max ?? 10000000,
          true,
        )
      : 100;

  const baseScore = trainingScore * 0.5 + finesPenalty * 0.5;
  return Math.max(0, baseScore - incidentPenalty);
}

function calculateRiskManagementScore(
  risk: GovernanceMetrics['riskManagement'],
  benchmark?: RiskBenchmarks,
): number {
  let score = 0;

  // ERM in place
  if (risk.enterpriseRiskManagementInPlace) score += 30;

  // Climate risk assessment
  if (risk.climateRiskAssessment) score += 20;

  // Lower cyber incidents = better
  const cyberScore = normalize(
    risk.cybersecurityIncidents + risk.dataBreaches,
    0,
    benchmark?.incidents?.max ?? 10,
    true,
  );
  score += cyberScore * 0.3;

  // Business continuity tests
  const continuityScore = normalize(
    risk.businessContinuityTestsPerYear,
    0,
    benchmark?.bcTests?.max ?? 4,
  );
  score += continuityScore * 0.2;

  return score;
}

function calculateShareholderRightsScore(
  rights: GovernanceMetrics['shareholderRights'],
  benchmark?: ShareholderBenchmarks,
): number {
  let score = 0;

  if (rights.oneShareOneVote) score += 30;
  if (rights.proxyAccessAvailable) score += 20;

  // Higher participation = better
  score += normalize(rights.annualMeetingParticipation, 0, 100) * 0.5;

  return score;
}

// ============================================================================
// Benchmark Types
// ============================================================================

interface BenchmarkRange {
  min: number;
  max: number;
}

interface CarbonBenchmarks {
  intensityRatio?: BenchmarkRange;
}

interface EnergyBenchmarks {
  renewablePercentage?: BenchmarkRange;
}

interface WaterBenchmarks {
  recycleRate?: BenchmarkRange;
}

interface WasteBenchmarks {
  diversionRate?: BenchmarkRange;
}

interface DiversityBenchmarks {
  genderBalance?: BenchmarkRange;
}

interface LaborBenchmarks {
  turnoverRate?: BenchmarkRange;
  trainingHours?: BenchmarkRange;
}

interface SafetyBenchmarks {
  incidentRate?: BenchmarkRange;
}

interface CommunityBenchmarks {
  localHiring?: BenchmarkRange;
}

interface HumanRightsBenchmarks {
  trainingCoverage?: BenchmarkRange;
}

interface BoardBenchmarks {
  independence?: BenchmarkRange;
  genderDiversity?: BenchmarkRange;
  attendance?: BenchmarkRange;
}

interface CompensationBenchmarks {
  ceoRatio?: BenchmarkRange;
  performanceBased?: BenchmarkRange;
}

interface EthicsBenchmarks {
  fines?: BenchmarkRange;
}

interface RiskBenchmarks {
  incidents?: BenchmarkRange;
  bcTests?: BenchmarkRange;
}

interface ShareholderBenchmarks {
  participation?: BenchmarkRange;
}

export interface EnvironmentalBenchmarks {
  carbonEmissions?: CarbonBenchmarks;
  energy?: EnergyBenchmarks;
  water?: WaterBenchmarks;
  waste?: WasteBenchmarks;
}

export interface SocialBenchmarks {
  diversity?: DiversityBenchmarks;
  laborPractices?: LaborBenchmarks;
  healthAndSafety?: SafetyBenchmarks;
  communityImpact?: CommunityBenchmarks;
  humanRights?: HumanRightsBenchmarks;
}

export interface GovernanceBenchmarks {
  boardComposition?: BoardBenchmarks;
  executiveCompensation?: CompensationBenchmarks;
  ethicsAndCompliance?: EthicsBenchmarks;
  riskManagement?: RiskBenchmarks;
  shareholderRights?: ShareholderBenchmarks;
}

export interface AllBenchmarks {
  environmental?: EnvironmentalBenchmarks;
  social?: SocialBenchmarks;
  governance?: GovernanceBenchmarks;
}

// ============================================================================
// Trend Analysis
// ============================================================================

export type TrendDirection = 'improving' | 'stable' | 'declining';

export interface TrendAnalysis {
  direction: TrendDirection;
  percentageChange: number;
  periods: number;
  confidence: 'high' | 'medium' | 'low';
}

export function analyzeTrend(
  currentValue: number,
  previousValues: number[],
  higherIsBetter: boolean = true,
): TrendAnalysis {
  if (previousValues.length === 0) {
    return {
      direction: 'stable',
      percentageChange: 0,
      periods: 0,
      confidence: 'low',
    };
  }

  const recentValue = previousValues[previousValues.length - 1];
  const percentageChange =
    recentValue !== 0 ? ((currentValue - recentValue) / Math.abs(recentValue)) * 100 : 0;

  let direction: TrendDirection;
  if (Math.abs(percentageChange) < 2) {
    direction = 'stable';
  } else if (higherIsBetter) {
    direction = percentageChange > 0 ? 'improving' : 'declining';
  } else {
    direction = percentageChange < 0 ? 'improving' : 'declining';
  }

  const confidence: 'high' | 'medium' | 'low' =
    previousValues.length >= 4 ? 'high' : previousValues.length >= 2 ? 'medium' : 'low';

  return {
    direction,
    percentageChange: Math.round(percentageChange * 100) / 100,
    periods: previousValues.length,
    confidence,
  };
}

// ============================================================================
// Report Score Summary
// ============================================================================

export function generateScoreSummary(report: ESGReport): {
  overallScore: number;
  categoryScores: Record<ESGCategory, number>;
  strengths: string[];
  improvements: string[];
  industryComparison?: string;
} {
  const strengths: string[] = [];
  const improvements: string[] = [];

  const { scores } = report;

  // Identify strengths (scores >= 70)
  if (scores.environmental >= 70) {
    strengths.push('Strong environmental performance');
  }
  if (scores.social >= 70) {
    strengths.push('Strong social practices');
  }
  if (scores.governance >= 70) {
    strengths.push('Robust governance framework');
  }

  // Identify improvement areas (scores < 50)
  if (scores.environmental < 50) {
    improvements.push('Environmental metrics need attention');
  }
  if (scores.social < 50) {
    improvements.push('Social practices require improvement');
  }
  if (scores.governance < 50) {
    improvements.push('Governance framework needs strengthening');
  }

  let industryComparison: string | undefined;
  if (scores.benchmarkComparison) {
    const percentile = scores.benchmarkComparison.percentileRank;
    if (percentile >= 75) {
      industryComparison = 'Top quartile performer in industry';
    } else if (percentile >= 50) {
      industryComparison = 'Above average industry performance';
    } else if (percentile >= 25) {
      industryComparison = 'Below average industry performance';
    } else {
      industryComparison = 'Bottom quartile - significant improvement needed';
    }
  }

  return {
    overallScore: scores.overall,
    categoryScores: {
      environmental: scores.environmental,
      social: scores.social,
      governance: scores.governance,
    },
    strengths,
    improvements,
    industryComparison,
  };
}
