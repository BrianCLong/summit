/**
 * Country Risk Package - Type Definitions
 * Comprehensive types for country risk assessment, scoring, and forecasting
 */

/**
 * Credit Rating Scale (similar to S&P, Moody's, Fitch)
 */
export enum CreditRating {
  // Investment Grade
  AAA = 'AAA',   // Extremely strong capacity
  AA_PLUS = 'AA+',
  AA = 'AA',
  AA_MINUS = 'AA-',
  A_PLUS = 'A+',
  A = 'A',
  A_MINUS = 'A-',
  BBB_PLUS = 'BBB+',
  BBB = 'BBB',
  BBB_MINUS = 'BBB-',

  // Speculative Grade (High Yield)
  BB_PLUS = 'BB+',
  BB = 'BB',
  BB_MINUS = 'BB-',
  B_PLUS = 'B+',
  B = 'B',
  B_MINUS = 'B-',
  CCC_PLUS = 'CCC+',
  CCC = 'CCC',
  CCC_MINUS = 'CCC-',
  CC = 'CC',
  C = 'C',
  D = 'D'        // Default
}

/**
 * Risk Level Classification
 */
export enum RiskLevel {
  VERY_LOW = 'VERY_LOW',
  LOW = 'LOW',
  MODERATE = 'MODERATE',
  HIGH = 'HIGH',
  VERY_HIGH = 'VERY_HIGH',
  EXTREME = 'EXTREME'
}

/**
 * Risk Category Types
 */
export enum RiskCategory {
  POLITICAL = 'POLITICAL',
  ECONOMIC = 'ECONOMIC',
  SECURITY = 'SECURITY',
  REGULATORY = 'REGULATORY',
  OPERATIONAL = 'OPERATIONAL',
  SOCIAL = 'SOCIAL',
  ENVIRONMENTAL = 'ENVIRONMENTAL',
  TECHNOLOGICAL = 'TECHNOLOGICAL'
}

/**
 * Outlook indicates the direction of potential rating changes
 */
export enum RatingOutlook {
  POSITIVE = 'POSITIVE',       // May be upgraded
  STABLE = 'STABLE',           // Unlikely to change
  NEGATIVE = 'NEGATIVE',       // May be downgraded
  DEVELOPING = 'DEVELOPING'    // Uncertain direction
}

/**
 * Risk Trend Direction
 */
export enum TrendDirection {
  IMPROVING = 'IMPROVING',
  STABLE = 'STABLE',
  DETERIORATING = 'DETERIORATING',
  VOLATILE = 'VOLATILE'
}

/**
 * Comprehensive Country Risk Profile
 */
export interface CountryRiskProfile {
  // Identification
  countryCode: string;          // ISO 3166-1 alpha-3
  countryName: string;
  region: string;
  subRegion?: string;

  // Overall Assessment
  overallRating: CreditRating;
  overallScore: number;         // 0-100
  riskLevel: RiskLevel;
  outlook: RatingOutlook;

  // Category Scores
  riskScores: CategoryRiskScores;

  // Detailed Indicators
  indicators: RiskIndicators;

  // Temporal Data
  assessmentDate: Date;
  nextReviewDate: Date;
  lastModified: Date;

  // Historical Context
  historicalData: HistoricalRiskData;
  trends: RiskTrends;

  // Peer Comparisons
  peerComparisons: PeerComparison[];
  regionalRanking?: number;
  globalRanking?: number;

  // Additional Context
  keyRisks: KeyRisk[];
  opportunities: Opportunity[];
  recommendations: string[];

  // Metadata
  analyst?: string;
  confidence: number;           // 0-1
  dataQuality: DataQuality;
  sources: DataSource[];
  metadata: Record<string, any>;
}

/**
 * Risk Scores by Category
 */
export interface CategoryRiskScores {
  political: RiskScore;
  economic: RiskScore;
  security: RiskScore;
  regulatory: RiskScore;
  operational: RiskScore;
  social: RiskScore;
  environmental: RiskScore;
  technological: RiskScore;
}

/**
 * Individual Risk Score
 */
export interface RiskScore {
  category: RiskCategory;
  score: number;                // 0-100 (100 = lowest risk)
  rating: CreditRating;
  weight: number;               // Contribution to overall score
  riskLevel: RiskLevel;
  trend: TrendDirection;

  // Sub-scores
  subScores?: Record<string, number>;

  // Justification
  drivers: string[];            // Key factors affecting score
  concerns: string[];           // Specific risk concerns

  lastUpdated: Date;
  confidence: number;           // 0-1
}

/**
 * Comprehensive Risk Indicators
 */
export interface RiskIndicators {
  political: PoliticalIndicators;
  economic: EconomicIndicators;
  security: SecurityIndicators;
  regulatory: RegulatoryIndicators;
  operational: OperationalIndicators;
  social: SocialIndicators;
  environmental: EnvironmentalIndicators;
  technological: TechnologicalIndicators;
}

/**
 * Political Risk Indicators
 */
export interface PoliticalIndicators {
  // Stability
  governmentStability: number;          // 0-100
  politicalViolence: number;            // 0-100
  institutionalStrength: number;        // 0-100
  ruleOfLaw: number;                    // 0-100

  // Governance
  corruptionIndex: number;              // 0-100 (100 = least corrupt)
  bureaucracyQuality: number;           // 0-100
  transparencyScore: number;            // 0-100
  democracyIndex: number;               // 0-100

  // Leadership
  leadershipStability: number;          // 0-100
  successionRisk: number;               // 0-100
  policyConsistency: number;            // 0-100

  // International Relations
  diplomaticStanding: number;           // 0-100
  conflictRisk: number;                 // 0-100
  sanctionsRisk: number;                // 0-100

  // Elections & Transitions
  upcomingElections?: ElectionRisk[];
  transitionRisk: number;               // 0-100
}

/**
 * Economic Risk Indicators
 */
export interface EconomicIndicators {
  // Macro Indicators
  gdpGrowth: number;                    // Percentage
  inflationRate: number;                // Percentage
  unemploymentRate: number;             // Percentage
  fiscalBalance: number;                // % of GDP
  currentAccountBalance: number;        // % of GDP

  // Debt & Solvency
  publicDebtToGDP: number;              // Percentage
  externalDebtToGDP: number;            // Percentage
  debtServiceRatio: number;             // Percentage
  debtSustainability: number;           // 0-100

  // Monetary & Financial
  monetaryStability: number;            // 0-100
  bankingSystemStrength: number;        // 0-100
  creditGrowth: number;                 // Percentage
  nonPerformingLoans: number;           // Percentage

  // External Position
  foreignReserves: number;              // Months of imports
  exchangeRateStability: number;        // 0-100
  exportDiversification: number;        // 0-100
  currentAccountVulnerability: number;  // 0-100

  // Market Indicators
  sovereignSpread?: number;             // Basis points
  stockMarketVolatility?: number;       // 0-100
  creditDefaultSwapSpread?: number;     // Basis points
}

/**
 * Security Risk Indicators
 */
export interface SecurityIndicators {
  // Conflict & Violence
  conflictIntensity: number;            // 0-100
  terrorismThreat: number;              // 0-100
  civilUnrest: number;                  // 0-100
  criminalityRate: number;              // 0-100

  // Military
  militaryCapability: number;           // 0-100
  militarySpending: number;             // % of GDP
  armedForcesStrength?: number;         // Personnel

  // Border & Regional
  borderSecurity: number;               // 0-100
  regionalStability: number;            // 0-100
  neighborhoodRisk: number;             // 0-100

  // Specific Threats
  cyberSecurityRisk: number;            // 0-100
  organizedCrimeRisk: number;           // 0-100
  narcoTraffickingRisk: number;         // 0-100
}

/**
 * Regulatory Risk Indicators
 */
export interface RegulatoryIndicators {
  // Legal Framework
  legalSystemStrength: number;          // 0-100
  contractEnforcement: number;          // 0-100
  propertyRights: number;               // 0-100
  intellectualPropertyProtection: number; // 0-100

  // Business Environment
  easeOfDoingBusiness: number;          // 0-100
  regulatoryQuality: number;            // 0-100
  regulatoryStability: number;          // 0-100
  bureaucraticComplexity: number;       // 0-100

  // Compliance
  antiMoneyLaunderingCompliance: number; // 0-100
  taxTransparency: number;              // 0-100
  laborRegulationComplexity: number;    // 0-100
  environmentalRegulation: number;      // 0-100

  // Market Access
  tradeBarriers: number;                // 0-100
  investmentRestrictions: number;       // 0-100
  currencyControls: number;             // 0-100
}

/**
 * Operational Risk Indicators
 */
export interface OperationalIndicators {
  // Infrastructure
  infrastructureQuality: number;        // 0-100
  logisticsPerformance: number;         // 0-100
  energyReliability: number;            // 0-100
  telecommunicationsQuality: number;    // 0-100

  // Human Capital
  laborForceQuality: number;            // 0-100
  educationLevel: number;               // 0-100
  skillsAvailability: number;           // 0-100
  laborCostCompetitiveness: number;     // 0-100

  // Supply Chain
  supplyChainResilience: number;        // 0-100
  portEfficiency: number;               // 0-100
  customsEfficiency: number;            // 0-100

  // Business Continuity
  naturalDisasterRisk: number;          // 0-100
  pandemicPreparedness: number;         // 0-100
  businessDisruptionRisk: number;       // 0-100
}

/**
 * Social Risk Indicators
 */
export interface SocialIndicators {
  // Demographics
  populationGrowth: number;             // Percentage
  ageDepedencyRatio: number;            // Ratio
  urbanizationRate: number;             // Percentage

  // Development
  humanDevelopmentIndex: number;        // 0-1
  povertyRate: number;                  // Percentage
  incomeInequality: number;             // Gini coefficient

  // Social Stability
  socialCohesion: number;               // 0-100
  ethnicTensions: number;               // 0-100
  religiousTensions: number;            // 0-100

  // Health & Education
  healthcareQuality: number;            // 0-100
  educationQuality: number;             // 0-100
  lifeExpectancy?: number;              // Years
}

/**
 * Environmental Risk Indicators
 */
export interface EnvironmentalIndicators {
  // Climate
  climateChangeVulnerability: number;   // 0-100
  naturalDisasterFrequency: number;     // 0-100
  waterStress: number;                  // 0-100

  // Environmental Quality
  airQuality: number;                   // 0-100
  environmentalRegulation: number;      // 0-100
  sustainabilityScore: number;          // 0-100

  // Resources
  resourceScarcity: number;             // 0-100
  energySecurity: number;               // 0-100
  foodSecurity: number;                 // 0-100
}

/**
 * Technological Risk Indicators
 */
export interface TechnologicalIndicators {
  // Digital Infrastructure
  digitalInfrastructure: number;        // 0-100
  internetPenetration: number;          // Percentage
  mobileConnectivity: number;           // 0-100

  // Innovation
  innovationCapacity: number;           // 0-100
  rdInvestment: number;                 // % of GDP
  technologyAdoption: number;           // 0-100

  // Cyber Risks
  cyberSecurityMaturity: number;        // 0-100
  dataSecurity: number;                 // 0-100
  digitalRegulatoryRisk: number;        // 0-100
}

/**
 * Historical Risk Data
 */
export interface HistoricalRiskData {
  ratings: RatingHistory[];
  scores: ScoreHistory[];
  events: HistoricalRiskEvent[];
}

/**
 * Rating History Entry
 */
export interface RatingHistory {
  date: Date;
  rating: CreditRating;
  outlook: RatingOutlook;
  action: 'UPGRADE' | 'DOWNGRADE' | 'AFFIRMED' | 'INITIAL';
  reason: string;
}

/**
 * Score History Entry
 */
export interface ScoreHistory {
  date: Date;
  overallScore: number;
  categoryScores: Record<RiskCategory, number>;
}

/**
 * Historical Risk Event
 */
export interface HistoricalRiskEvent {
  date: Date;
  type: string;
  description: string;
  impact: number;               // -100 to 100
  affectedCategories: RiskCategory[];
}

/**
 * Risk Trends
 */
export interface RiskTrends {
  overall: Trend;
  byCategory: Record<RiskCategory, Trend>;

  // Momentum indicators
  momentum: TrendDirection;
  volatility: number;           // 0-100

  // Predictions
  shortTermOutlook: string;     // 3-6 months
  mediumTermOutlook: string;    // 1-2 years
  longTermOutlook: string;      // 3-5 years
}

/**
 * Trend Information
 */
export interface Trend {
  direction: TrendDirection;
  magnitude: number;            // 0-100
  duration: number;             // Days
  confidence: number;           // 0-1
  indicators: string[];
}

/**
 * Peer Comparison
 */
export interface PeerComparison {
  peerCountryCode: string;
  peerCountryName: string;

  // Comparative metrics
  ratingDifference: number;     // Notches
  scoreDifference: number;      // Points

  // Category comparisons
  categoryComparisons: Record<RiskCategory, number>; // Difference

  // Context
  similarityScore: number;      // 0-100
  comparisonType: 'REGIONAL' | 'INCOME_LEVEL' | 'STRUCTURAL' | 'CUSTOM';
}

/**
 * Key Risk
 */
export interface KeyRisk {
  id: string;
  title: string;
  description: string;
  category: RiskCategory;
  severity: RiskLevel;
  probability: number;          // 0-1
  potentialImpact: number;      // 0-100
  timeHorizon: 'SHORT' | 'MEDIUM' | 'LONG';
  mitigationStrategies?: string[];
  triggers?: string[];
}

/**
 * Opportunity
 */
export interface Opportunity {
  id: string;
  title: string;
  description: string;
  category: RiskCategory;
  potential: number;            // 0-100
  feasibility: number;          // 0-100
  timeframe: string;
}

/**
 * Election Risk
 */
export interface ElectionRisk {
  date: Date;
  type: 'PRESIDENTIAL' | 'PARLIAMENTARY' | 'LOCAL';
  transitionRisk: number;       // 0-100
  stabilityRisk: number;        // 0-100
  policyChangeRisk: number;     // 0-100
}

/**
 * Data Quality Assessment
 */
export interface DataQuality {
  overall: number;              // 0-100
  completeness: number;         // 0-100
  accuracy: number;             // 0-100
  timeliness: number;           // 0-100
  reliability: number;          // 0-100
  coverage: number;             // 0-100
  issues?: string[];
}

/**
 * Data Source
 */
export interface DataSource {
  name: string;
  type: DataSourceType;
  url?: string;
  lastUpdated: Date;
  reliability: number;          // 0-100
}

/**
 * Data Source Type
 */
export enum DataSourceType {
  OFFICIAL_STATISTICS = 'OFFICIAL_STATISTICS',
  INTERNATIONAL_ORG = 'INTERNATIONAL_ORG',
  CREDIT_RATING_AGENCY = 'CREDIT_RATING_AGENCY',
  RESEARCH_INSTITUTION = 'RESEARCH_INSTITUTION',
  NEWS_MEDIA = 'NEWS_MEDIA',
  MARKET_DATA = 'MARKET_DATA',
  PROPRIETARY = 'PROPRIETARY'
}

/**
 * Risk Assessment Configuration
 */
export interface AssessmentConfig {
  // Scoring weights
  categoryWeights: Record<RiskCategory, number>;

  // Thresholds
  ratingThresholds: RatingThresholds;

  // Assessment parameters
  historicalPeriod: number;     // Days
  forecastHorizon: number;      // Days
  confidenceThreshold: number;  // Minimum confidence

  // Peer comparison
  includePeerComparison: boolean;
  peerSelectionCriteria: PeerSelectionCriteria;

  // Options
  includeForecasting: boolean;
  includeScenarioAnalysis: boolean;
  includeStressTesting: boolean;
}

/**
 * Rating Thresholds
 */
export interface RatingThresholds {
  AAA: number;      // Score threshold for AAA
  AA: number;
  A: number;
  BBB: number;
  BB: number;
  B: number;
  CCC: number;
  CC: number;
  C: number;
  // Below C threshold = D
}

/**
 * Peer Selection Criteria
 */
export interface PeerSelectionCriteria {
  region?: string[];
  incomeLevel?: string[];
  gdpRange?: [number, number];
  populationRange?: [number, number];
  structuralSimilarity?: number;  // Minimum similarity score
  maxPeers: number;
}

/**
 * Risk Assessment Report
 */
export interface RiskAssessmentReport {
  // Summary
  executiveSummary: string;
  riskProfile: CountryRiskProfile;

  // Analysis
  detailedAnalysis: DetailedAnalysis;
  keyFindings: string[];

  // Comparisons
  peerAnalysis?: PeerAnalysis;
  historicalContext: HistoricalContext;

  // Forward Looking
  outlook: OutlookAnalysis;
  scenarios?: ScenarioAnalysis[];

  // Recommendations
  recommendations: Recommendation[];

  // Metadata
  reportDate: Date;
  reportId: string;
  analyst?: string;
}

/**
 * Detailed Analysis
 */
export interface DetailedAnalysis {
  political: CategoryAnalysis;
  economic: CategoryAnalysis;
  security: CategoryAnalysis;
  regulatory: CategoryAnalysis;
  operational: CategoryAnalysis;
  social: CategoryAnalysis;
  environmental: CategoryAnalysis;
  technological: CategoryAnalysis;
}

/**
 * Category Analysis
 */
export interface CategoryAnalysis {
  category: RiskCategory;
  score: number;
  rating: CreditRating;

  // Analysis
  strengths: string[];
  weaknesses: string[];
  trends: string[];

  // Key metrics
  topIndicators: Array<{
    name: string;
    value: number;
    benchmark: number;
    assessment: string;
  }>;

  // Outlook
  outlook: string;
  keyRisks: string[];
}

/**
 * Peer Analysis
 */
export interface PeerAnalysis {
  peers: PeerComparison[];
  regionalPosition: {
    ranking: number;
    totalCountries: number;
    percentile: number;
  };
  globalPosition: {
    ranking: number;
    totalCountries: number;
    percentile: number;
  };
  insights: string[];
}

/**
 * Historical Context
 */
export interface HistoricalContext {
  ratingChanges: RatingHistory[];
  scoreEvolution: ScoreHistory[];
  majorEvents: HistoricalRiskEvent[];
  trends: string[];
  patterns: string[];
}

/**
 * Outlook Analysis
 */
export interface OutlookAnalysis {
  horizon: string;
  outlook: RatingOutlook;
  direction: TrendDirection;

  // Factors
  positiveFactors: string[];
  negativeFactors: string[];
  uncertainties: string[];

  // Triggers
  upgradeTrigggers?: string[];
  downgradeTrigggers?: string[];
}

/**
 * Scenario Analysis
 */
export interface ScenarioAnalysis {
  id: string;
  name: string;
  description: string;
  probability: number;          // 0-1

  // Impact
  projectedRating: CreditRating;
  projectedScore: number;
  impactByCategory: Record<RiskCategory, number>;

  // Narrative
  scenario: string;
  triggers: string[];
  timeline: string;
  implications: string[];
}

/**
 * Recommendation
 */
export interface Recommendation {
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  category: RiskCategory;
  title: string;
  description: string;
  rationale: string;
  expectedImpact: string;
  timeframe: string;
}

/**
 * Risk Change Event
 */
export interface RiskChangeEvent {
  timestamp: Date;
  countryCode: string;
  changeType: 'RATING_CHANGE' | 'OUTLOOK_CHANGE' | 'SCORE_CHANGE' | 'RISK_EVENT';

  // Changes
  previousRating?: CreditRating;
  newRating?: CreditRating;
  previousOutlook?: RatingOutlook;
  newOutlook?: RatingOutlook;
  scoreChange?: number;

  // Context
  reason: string;
  affectedCategories: RiskCategory[];
  significance: 'MAJOR' | 'MODERATE' | 'MINOR';
}

/**
 * Forecast Result
 */
export interface ForecastResult {
  countryCode: string;
  forecastDate: Date;
  horizon: number;              // Days

  // Projections
  projectedRating: CreditRating;
  projectedScore: number;
  projectedRiskLevel: RiskLevel;

  // Confidence
  confidence: number;           // 0-1
  confidenceInterval: [number, number]; // Score range

  // Details
  categoryForecasts: Record<RiskCategory, number>;

  // Drivers
  keyDrivers: string[];
  assumptions: string[];
  risks: string[];
}

/**
 * Stress Test Result
 */
export interface StressTestResult {
  scenario: string;
  severity: 'MILD' | 'MODERATE' | 'SEVERE' | 'EXTREME';

  // Impact
  baselineScore: number;
  stressedScore: number;
  scoreDelta: number;

  baselineRating: CreditRating;
  stressedRating: CreditRating;
  ratingDelta: number;          // Notches

  // Details
  categoryImpacts: Record<RiskCategory, number>;

  // Analysis
  vulnerabilities: string[];
  resilience: number;           // 0-100
  recoveryTime?: number;        // Days
}
