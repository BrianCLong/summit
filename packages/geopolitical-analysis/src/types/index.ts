/**
 * Geopolitical Analysis Types
 * @module @summit/geopolitical-analysis/types
 */

/**
 * Risk severity levels for all indicators
 */
export enum RiskLevel {
  LOW = 'LOW',
  MODERATE = 'MODERATE',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

/**
 * Confidence level in the analysis
 */
export enum ConfidenceLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  VERY_HIGH = 'VERY_HIGH',
}

/**
 * Time horizon for predictions and analysis
 */
export enum TimeHorizon {
  IMMEDIATE = 'IMMEDIATE', // < 30 days
  SHORT_TERM = 'SHORT_TERM', // 1-6 months
  MEDIUM_TERM = 'MEDIUM_TERM', // 6-24 months
  LONG_TERM = 'LONG_TERM', // > 24 months
}

/**
 * Base interface for all geopolitical indicators
 */
export interface BaseIndicator {
  id: string;
  countryCode: string;
  countryName: string;
  timestamp: Date;
  score: number; // 0-100 scale
  riskLevel: RiskLevel;
  confidence: ConfidenceLevel;
  metadata: Record<string, unknown>;
}

/**
 * Political stability indicators
 */
export interface PoliticalStabilityIndicator extends BaseIndicator {
  type: 'POLITICAL_STABILITY';
  eliteCohesion: number; // 0-100
  governmentEffectiveness: number; // 0-100
  politicalViolenceRisk: number; // 0-100
  institutionalStrength: number; // 0-100
  protestActivity: number; // 0-100
  electionRisk: number; // 0-100
}

/**
 * Economic stability indicators
 */
export interface EconomicStabilityIndicator extends BaseIndicator {
  type: 'ECONOMIC_STABILITY';
  gdpGrowthRate: number;
  inflationRate: number;
  unemploymentRate: number;
  currencyStability: number; // 0-100
  debtToGdpRatio: number;
  foreignReserves: number; // in USD billions
  economicDiversification: number; // 0-100
}

/**
 * Food security indicators
 */
export interface FoodSecurityIndicator extends BaseIndicator {
  type: 'FOOD_SECURITY';
  grainReservesDays: number;
  foodPriceInflation: number;
  importDependence: number; // 0-100
  agriculturalProduction: number; // index
  supplyChainDisruption: number; // 0-100
  socialUnrestRisk: number; // 0-100
}

/**
 * Supply chain risk indicators
 */
export interface SupplyChainIndicator extends BaseIndicator {
  type: 'SUPPLY_CHAIN';
  resourceType: string; // e.g., 'lithium', 'rare-earths', 'oil'
  supplyConcentration: number; // 0-100, higher = more concentrated
  alternativeSourcesAvailable: number; // 0-100
  transportationRisk: number; // 0-100
  geopoliticalDependency: number; // 0-100
  stockpileDays: number;
}

/**
 * Water security indicators
 */
export interface WaterSecurityIndicator extends BaseIndicator {
  type: 'WATER_SECURITY';
  waterStressLevel: number; // 0-100
  transboundaryDependence: number; // 0-100
  upstreamCountries: string[];
  downstreamCountries: string[];
  damInfrastructureRisk: number; // 0-100
  conflictProbability: number; // 0-100
}

/**
 * Alliance stability indicators
 */
export interface AllianceStabilityIndicator extends BaseIndicator {
  type: 'ALLIANCE_STABILITY';
  allianceName: string;
  memberCountries: string[];
  cohesionScore: number; // 0-100
  militaryIntegration: number; // 0-100
  economicInterdependence: number; // 0-100
  politicalAlignment: number; // 0-100
  recentTensions: string[];
}

/**
 * Leadership transition risk
 */
export interface LeadershipTransitionIndicator extends BaseIndicator {
  type: 'LEADERSHIP_TRANSITION';
  leaderName: string;
  ageYears: number;
  healthRiskFactors: number; // 0-100
  successionClarityScore: number; // 0-100, higher = clearer
  eliteFractureRisk: number; // 0-100
  transitionProbabilityNextYear: number; // 0-100
  potentialSuccessors: number;
}

/**
 * Military capability indicators
 */
export interface MilitaryCapabilityIndicator extends BaseIndicator {
  type: 'MILITARY_CAPABILITY';
  militaryExpenditureUsd: number;
  militaryExpenditurePercentGdp: number;
  activePersonnel: number;
  modernizationIndex: number; // 0-100
  coupRisk: number; // 0-100
  externalThreatLevel: number; // 0-100
}

/**
 * Sanctions impact indicators
 */
export interface SanctionsImpactIndicator extends BaseIndicator {
  type: 'SANCTIONS_IMPACT';
  sanctioningCountries: string[];
  economicImpact: number; // 0-100
  evasionCapability: number; // 0-100
  alternativeTradeRoutes: string[];
  financialSystemIsolation: number; // 0-100
  timeUnderSanctionsMonths: number;
}

/**
 * Currency sovereignty indicators
 */
export interface CurrencySovereigntyIndicator extends BaseIndicator {
  type: 'CURRENCY_SOVEREIGNTY';
  dollarDependence: number; // 0-100
  alternativeCurrencyUsage: number; // 0-100
  foreignExchangeReserves: number; // USD billions
  capitalControlStrength: number; // 0-100
  internationalPaymentSystemAccess: number; // 0-100
}

/**
 * Humanitarian crisis early warning
 */
export interface HumanitarianCrisisIndicator extends BaseIndicator {
  type: 'HUMANITARIAN_CRISIS';
  displacedPopulation: number;
  foodInsecurity: number; // 0-100
  healthSystemCollapse: number; // 0-100
  violenceAgainstCivilians: number; // incidents per month
  accessToBasicServices: number; // 0-100
  internationalResponseNeeded: boolean;
}

/**
 * Strategic resource dependency
 */
export interface StrategyResourceDependencyIndicator extends BaseIndicator {
  type: 'STRATEGIC_RESOURCE';
  resourceName: string;
  importDependence: number; // 0-100
  domesticProductionCapacity: number; // units per year
  strategicReserveMonths: number;
  alternativeSupplierCount: number;
  criticalityScore: number; // 0-100
}

/**
 * Arctic territorial control indicators
 */
export interface ArcticControlIndicator extends BaseIndicator {
  type: 'ARCTIC_CONTROL';
  territorialClaims: string[]; // area descriptions
  militaryPresence: number; // 0-100
  icebreakerFleetSize: number;
  resourceExplorationActivity: number; // 0-100
  internationalDisputeIntensity: number; // 0-100
}

/**
 * Energy security indicators
 */
export interface EnergySecurityIndicator extends BaseIndicator {
  type: 'ENERGY_SECURITY';
  energyImportDependence: number; // 0-100
  renewableEnergyShare: number; // 0-100
  strategicPetroleumReserveDays: number;
  nuclearPowerCapacity: number; // MW
  gridResilience: number; // 0-100
}

/**
 * Diaspora influence indicators
 */
export interface DiasporaInfluenceIndicator extends BaseIndicator {
  type: 'DIASPORA_INFLUENCE';
  diasporaPopulation: number;
  remittanceFlowsUsd: number;
  politicalOrganizationLevel: number; // 0-100
  hostCountryIntegration: number; // 0-100
  influenceOnHomeCountryPolitics: number; // 0-100
}

/**
 * Nuclear capability indicators
 */
export interface NuclearCapabilityIndicator extends BaseIndicator {
  type: 'NUCLEAR_CAPABILITY';
  declaredNuclearState: boolean;
  enrichmentCapability: boolean;
  deliverySystemCapability: boolean;
  internationalMonitoringCompliance: number; // 0-100
  proliferationRisk: number; // 0-100
  estimatedTimeToBreakoutMonths: number | null;
}

/**
 * Global power transition metrics
 */
export interface PowerTransitionIndicator extends BaseIndicator {
  type: 'POWER_TRANSITION';
  militaryCapabilityIndex: number; // 0-100
  economicCapabilityIndex: number; // 0-100
  technologicalCapabilityIndex: number; // 0-100
  diplomaticInfluenceIndex: number; // 0-100
  overallPowerScore: number; // 0-100
  trendDirection: 'RISING' | 'STABLE' | 'DECLINING';
  yearsToParityWithLeader: number | null;
}

/**
 * Scenario model for what-if analysis
 */
export interface ScenarioModel {
  id: string;
  name: string;
  description: string;
  createdAt: Date;
  createdBy: string;
  timeHorizon: TimeHorizon;
  assumptions: ScenarioAssumption[];
  indicators: GeopoliticalIndicator[];
  outcomes: ScenarioOutcome[];
  probabilityScore: number; // 0-100
  impactScore: number; // 0-100
}

/**
 * Scenario assumption
 */
export interface ScenarioAssumption {
  id: string;
  description: string;
  category: string;
  likelihood: number; // 0-100
  impact: number; // 0-100
}

/**
 * Scenario outcome
 */
export interface ScenarioOutcome {
  id: string;
  description: string;
  timeframe: TimeHorizon;
  affectedCountries: string[];
  affectedSectors: string[];
  severity: RiskLevel;
  mitigationOptions: string[];
}

/**
 * Union type for all geopolitical indicators
 */
export type GeopoliticalIndicator =
  | PoliticalStabilityIndicator
  | EconomicStabilityIndicator
  | FoodSecurityIndicator
  | SupplyChainIndicator
  | WaterSecurityIndicator
  | AllianceStabilityIndicator
  | LeadershipTransitionIndicator
  | MilitaryCapabilityIndicator
  | SanctionsImpactIndicator
  | CurrencySovereigntyIndicator
  | HumanitarianCrisisIndicator
  | StrategyResourceDependencyIndicator
  | ArcticControlIndicator
  | EnergySecurityIndicator
  | DiasporaInfluenceIndicator
  | NuclearCapabilityIndicator
  | PowerTransitionIndicator;

/**
 * Analysis request
 */
export interface AnalysisRequest {
  countries?: string[];
  indicatorTypes?: GeopoliticalIndicator['type'][];
  timeHorizon?: TimeHorizon;
  includeScenarios?: boolean;
  confidenceThreshold?: ConfidenceLevel;
}

/**
 * Analysis result
 */
export interface AnalysisResult {
  id: string;
  requestedAt: Date;
  completedAt: Date;
  indicators: GeopoliticalIndicator[];
  scenarios?: ScenarioModel[];
  summary: AnalysisSummary;
}

/**
 * Analysis summary
 */
export interface AnalysisSummary {
  totalIndicators: number;
  criticalRiskCount: number;
  highRiskCount: number;
  topRisks: Array<{
    country: string;
    indicatorType: string;
    riskLevel: RiskLevel;
    description: string;
  }>;
  recommendations: string[];
}

/**
 * Ethical compliance check result
 */
export interface ComplianceCheckResult {
  passed: boolean;
  violations: ComplianceViolation[];
  timestamp: Date;
  reviewer: string;
}

/**
 * Compliance violation
 */
export interface ComplianceViolation {
  category: 'PRIVACY' | 'ETHICS' | 'LEGAL' | 'OPERATIONAL';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  remediation: string;
}
