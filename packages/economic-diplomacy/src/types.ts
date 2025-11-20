/**
 * Economic Diplomacy Types
 * Comprehensive types for monitoring trade negotiations, economic partnerships, and economic statecraft
 */

export enum NegotiationType {
  BILATERAL_TRADE = 'BILATERAL_TRADE',
  MULTILATERAL_TRADE = 'MULTILATERAL_TRADE',
  FREE_TRADE_AGREEMENT = 'FREE_TRADE_AGREEMENT',
  INVESTMENT_TREATY = 'INVESTMENT_TREATY',
  TAX_TREATY = 'TAX_TREATY',
  ECONOMIC_PARTNERSHIP = 'ECONOMIC_PARTNERSHIP',
  CUSTOMS_UNION = 'CUSTOMS_UNION',
  SINGLE_MARKET = 'SINGLE_MARKET',
  PREFERENTIAL_TRADE = 'PREFERENTIAL_TRADE',
  SECTOR_SPECIFIC = 'SECTOR_SPECIFIC'
}

export enum NegotiationPhase {
  PRELIMINARY = 'PRELIMINARY',
  EXPLORATORY = 'EXPLORATORY',
  SCOPING = 'SCOPING',
  FORMAL_NEGOTIATION = 'FORMAL_NEGOTIATION',
  TECHNICAL_TALKS = 'TECHNICAL_TALKS',
  FINALIZATION = 'FINALIZATION',
  LEGAL_SCRUBBING = 'LEGAL_SCRUBBING',
  SIGNATURE = 'SIGNATURE',
  RATIFICATION = 'RATIFICATION',
  IMPLEMENTATION = 'IMPLEMENTATION',
  SUSPENDED = 'SUSPENDED',
  CONCLUDED = 'CONCLUDED',
  FAILED = 'FAILED'
}

export enum PartnershipType {
  STRATEGIC_ECONOMIC_PARTNERSHIP = 'STRATEGIC_ECONOMIC_PARTNERSHIP',
  COMPREHENSIVE_PARTNERSHIP = 'COMPREHENSIVE_PARTNERSHIP',
  DEVELOPMENT_PARTNERSHIP = 'DEVELOPMENT_PARTNERSHIP',
  INVESTMENT_PARTNERSHIP = 'INVESTMENT_PARTNERSHIP',
  TECHNOLOGY_PARTNERSHIP = 'TECHNOLOGY_PARTNERSHIP',
  ENERGY_PARTNERSHIP = 'ENERGY_PARTNERSHIP',
  INFRASTRUCTURE_PARTNERSHIP = 'INFRASTRUCTURE_PARTNERSHIP',
  DIGITAL_PARTNERSHIP = 'DIGITAL_PARTNERSHIP',
  GREEN_PARTNERSHIP = 'GREEN_PARTNERSHIP'
}

export interface TradeNegotiation {
  id: string;
  name: string;
  type: NegotiationType;
  phase: NegotiationPhase;

  // Parties
  parties: Party[];
  leadNegotiators: Negotiator[];

  // Timeline
  launchDate: Date;
  targetDate?: Date;
  actualConclusionDate?: Date;
  duration?: number; // months

  // Scope and coverage
  scope: NegotiationScope;
  sectors: Sector[];
  exclusions?: string[];

  // Negotiation structure
  rounds: NegotiationRound[];
  workingGroups: WorkingGroup[];
  chapters: Chapter[];

  // Progress
  progress: number; // 0-100
  chaptersAgreed: number;
  chaptersTotal: number;
  momentum: 'STRONG' | 'MODERATE' | 'WEAK' | 'STALLED';

  // Issues
  keyStickingPoints: StickingPoint[];
  resolvedIssues: ResolvedIssue[];
  criticalIssues: CriticalIssue[];

  // Economic impact
  expectedImpact: EconomicImpact;
  stakes: Stakes;

  // Political context
  politicalContext: PoliticalContext;
  domesticConstraints: DomesticConstraint[];
  geopoliticalImplications: string[];

  // Stakeholders
  businessSupport: number; // 0-100
  publicSupport: number; // 0-100
  civilSocietyPosition: string;
  lobbyingActivity: LobbyingActivity[];

  // Prospects
  successLikelihood: number; // 0-100
  risks: Risk[];
  opportunities: Opportunity[];

  // Metadata
  lastUpdated: Date;
  sources: Source[];
  monitoring: boolean;
}

export interface Party {
  id: string;
  name: string;
  type: 'COUNTRY' | 'ECONOMIC_BLOC' | 'CUSTOMS_UNION';
  gdp: number;
  tradeVolume: number;
  population: number;
  objectives: string[];
  redLines: string[];
  priorities: Priority[];
  constraints: string[];
  leverage: number; // 0-100
}

export interface Negotiator {
  name: string;
  title: string;
  country: string;
  experience: number; // years
  expertise: string[];
  negotiationStyle: 'FLEXIBLE' | 'RIGID' | 'CREATIVE' | 'TECHNICAL' | 'POLITICAL';
  effectiveness: number; // 0-100
}

export interface NegotiationScope {
  goodsTrade: boolean;
  servicesTrade: boolean;
  investment: boolean;
  intellectualProperty: boolean;
  governmentProcurement: boolean;
  competition: boolean;
  labor: boolean;
  environment: boolean;
  digitalTrade: boolean;
  stateOwnedEnterprises: boolean;
  regulatoryCooperation: boolean;
  disputeSettlement: boolean;
  customAreas: string[];
}

export interface Sector {
  name: string;
  importance: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  sensitivity: number; // 0-100
  currentStatus: 'INCLUDED' | 'EXCLUDED' | 'UNDER_NEGOTIATION' | 'PARTIAL';
  liberalizationLevel?: number; // 0-100
  carveOuts?: string[];
  transitionPeriod?: number; // years
}

export interface NegotiationRound {
  roundNumber: number;
  date: Date;
  location: string;
  duration: number; // days
  participants: string[];
  agenda: string[];
  outcomes: RoundOutcome[];
  progress: 'BREAKTHROUGH' | 'PROGRESS' | 'MINIMAL' | 'STALEMATE' | 'REGRESSION';
  nextRound?: Date;
  significantDevelopments?: string[];
}

export interface RoundOutcome {
  area: string;
  achievement: string;
  significance: number; // 1-10
  type: 'AGREEMENT' | 'COMPROMISE' | 'DEADLOCK' | 'POSTPONEMENT';
}

export interface WorkingGroup {
  id: string;
  name: string;
  focus: string;
  chair: string;
  members: string[];
  meetings: number;
  status: 'ACTIVE' | 'COMPLETED' | 'SUSPENDED';
  progress: number; // 0-100
  deliverables: string[];
}

export interface Chapter {
  number: number;
  title: string;
  description: string;
  status: 'NOT_STARTED' | 'UNDER_NEGOTIATION' | 'AGREED_IN_PRINCIPLE' | 'FINALIZED' | 'PENDING_LEGAL_REVIEW';
  progress: number; // 0-100
  complexity: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
  controversiality: number; // 0-100
  keyIssues: string[];
  agreements?: string[];
  outstandingIssues?: string[];
}

export interface StickingPoint {
  issue: string;
  chapter: string;
  severity: 'MINOR' | 'MODERATE' | 'MAJOR' | 'CRITICAL';
  parties: string[];
  positions: {
    party: string;
    position: string;
    flexibility: number; // 0-100
  }[];
  potentialSolutions?: string[];
  resolutionProspects: 'UNLIKELY' | 'DIFFICULT' | 'POSSIBLE' | 'LIKELY';
}

export interface ResolvedIssue {
  issue: string;
  resolvedDate: Date;
  resolution: string;
  howResolved: string;
  significance: number; // 1-10
  lessonsLearned?: string[];
}

export interface CriticalIssue {
  issue: string;
  criticality: number; // 0-100
  dealBreaker: boolean;
  affectedParties: string[];
  requiresMinisterialIntervention: boolean;
  politicalSensitivity: number; // 0-100
  economicSignificance: number; // 0-100
}

export interface Priority {
  area: string;
  level: 'TOP' | 'HIGH' | 'MEDIUM' | 'LOW';
  rationale: string;
  progress: number; // 0-100
}

export interface EconomicImpact {
  estimatedTradeIncrease: number; // USD or percentage
  gdpImpact: {
    party: string;
    impact: number; // percentage
    timeframe: number; // years
  }[];
  jobsCreated?: number;
  jobsDisplaced?: number;
  sectorsGaining: string[];
  sectorsLosing: string[];
  consumerBenefit?: number; // USD
  competitivenessImpact: string;
}

export interface Stakes {
  economicStakes: number; // USD
  strategicStakes: string;
  politicalStakes: string;
  geopoliticalStakes: string;
  reputationalStakes: string;
}

export interface PoliticalContext {
  domesticPoliticalCycle: string;
  upcomingElections?: Date;
  governmentStability: number; // 0-100
  publicSentiment: 'SUPPORTIVE' | 'DIVIDED' | 'OPPOSED' | 'INDIFFERENT';
  mediaAttention: 'VERY_HIGH' | 'HIGH' | 'MODERATE' | 'LOW';
  parliamentarySupport?: number; // 0-100
}

export interface DomesticConstraint {
  type: 'POLITICAL' | 'LEGAL' | 'INSTITUTIONAL' | 'ECONOMIC' | 'SOCIAL';
  description: string;
  severity: number; // 0-100
  workarounds?: string[];
  impact: string;
}

export interface LobbyingActivity {
  actor: string;
  type: 'BUSINESS' | 'LABOR' | 'NGO' | 'AGRICULTURE' | 'CONSUMER' | 'OTHER';
  position: 'SUPPORT' | 'OPPOSE' | 'CONDITIONAL';
  intensity: number; // 0-100
  influence: number; // 0-100
  demands: string[];
}

export interface Risk {
  type: 'POLITICAL' | 'ECONOMIC' | 'LEGAL' | 'TIMING' | 'EXTERNAL';
  description: string;
  probability: number; // 0-100
  impact: number; // 1-10
  mitigation?: string[];
}

export interface Opportunity {
  description: string;
  potential: number; // 0-100
  requirements: string[];
  timeframe: 'SHORT_TERM' | 'MEDIUM_TERM' | 'LONG_TERM';
}

export interface Source {
  type: 'OFFICIAL' | 'GOVERNMENT' | 'MEDIA' | 'INDUSTRY' | 'ACADEMIC';
  name: string;
  url?: string;
  date: Date;
  reliability: number; // 0-1
}

export interface EconomicPartnership {
  id: string;
  name: string;
  type: PartnershipType;
  partners: string[];
  established: Date;
  endDate?: Date;

  // Structure
  framework: string;
  institutions: Institution[];
  mechanisms: Mechanism[];

  // Scope
  objectives: string[];
  keyAreas: KeyArea[];
  projects: Project[];
  programs: Program[];

  // Economic metrics
  totalInvestment: number; // USD
  tradeVolume: number; // USD
  investmentFlows: InvestmentFlow[];
  economicBenefit: number; // USD

  // Performance
  achievements: Achievement[];
  challenges: Challenge[];
  effectiveness: number; // 0-100
  sustainability: number; // 0-100

  // Evolution
  phases: PartnershipPhase[];
  expansionPlans?: string[];
  upgradePotential: number; // 0-100

  // Impact
  developmentImpact?: DevelopmentImpact;
  strategicValue: number; // 0-100
  politicalSignificance: number; // 0-100

  lastUpdated: Date;
  sources: Source[];
}

export interface Institution {
  name: string;
  type: 'COUNCIL' | 'COMMITTEE' | 'WORKING_GROUP' | 'SECRETARIAT' | 'FORUM';
  role: string;
  frequency: string;
  members: string[];
  decisions: number;
  effectiveness: number; // 0-100
}

export interface Mechanism {
  name: string;
  purpose: string;
  type: 'DIALOGUE' | 'COOPERATION' | 'COORDINATION' | 'CONSULTATION';
  frequency: string;
  participants: string[];
  outputs: string[];
}

export interface KeyArea {
  area: string;
  priority: 'TOP' | 'HIGH' | 'MEDIUM' | 'LOW';
  investment: number; // USD
  progress: number; // 0-100
  impact: string;
  initiatives: string[];
}

export interface Project {
  id: string;
  name: string;
  sector: string;
  countries: string[];
  value: number; // USD
  startDate: Date;
  expectedCompletion?: Date;
  status: 'PLANNED' | 'UNDER_CONSTRUCTION' | 'OPERATIONAL' | 'COMPLETED' | 'DELAYED' | 'CANCELLED';
  progress: number; // 0-100
  jobs?: number;
  economicImpact?: number; // USD
  challenges?: string[];
}

export interface Program {
  id: string;
  name: string;
  type: 'CAPACITY_BUILDING' | 'TECHNICAL_ASSISTANCE' | 'FINANCING' | 'RESEARCH' | 'EDUCATION';
  budget: number; // USD
  duration: number; // months
  beneficiaries: string[];
  status: 'ACTIVE' | 'COMPLETED' | 'SUSPENDED';
  outcomes: string[];
}

export interface InvestmentFlow {
  from: string;
  to: string;
  amount: number; // USD
  sector: string;
  year: number;
  type: 'FDI' | 'PORTFOLIO' | 'LOAN' | 'GRANT' | 'OTHER';
}

export interface Achievement {
  date: Date;
  description: string;
  significance: number; // 1-10
  impact: string;
  recognition?: string;
}

export interface Challenge {
  issue: string;
  severity: 'MINOR' | 'MODERATE' | 'SERIOUS' | 'CRITICAL';
  impact: string;
  mitigationEfforts?: string[];
  resolution?: string;
}

export interface PartnershipPhase {
  number: number;
  name: string;
  startDate: Date;
  endDate?: Date;
  objectives: string[];
  achievements: string[];
  lessons: string[];
}

export interface DevelopmentImpact {
  povertyReduction?: number; // percentage
  jobsCreated: number;
  infrastructureBuilt: string[];
  capacityBuilding: string[];
  technologyTransfer: string[];
  sustainabilityMetrics: {
    metric: string;
    value: number;
    improvement: number; // percentage
  }[];
}

export interface SanctionRegime {
  id: string;
  name: string;
  imposedBy: string[];
  targetCountry: string;
  targetEntities?: string[];
  startDate: Date;
  endDate?: Date;

  // Type and scope
  type: 'COMPREHENSIVE' | 'TARGETED' | 'SECTORAL' | 'FINANCIAL' | 'TECHNOLOGY' | 'ARMS';
  scope: SanctionScope;
  measures: Measure[];

  // Rationale
  objectives: string[];
  triggeringEvents: string[];
  legalBasis: string;

  // Impact
  economicImpact: SanctionImpact;
  humanitarianImpact?: HumanitarianImpact;
  effectiveness: number; // 0-100

  // Compliance and enforcement
  compliance: ComplianceTracking;
  violations: Violation[];
  enforcement: EnforcementAction[];

  // Evolution
  amendments: Amendment[];
  waivers: Waiver[];

  // Relief prospects
  reliefConditions?: string[];
  negotiationEfforts?: string[];
  liftingProspects: number; // 0-100

  lastUpdated: Date;
  sources: Source[];
}

export interface SanctionScope {
  trade: boolean;
  finance: boolean;
  technology: boolean;
  travel: boolean;
  assets: boolean;
  sectors: string[];
  exemptions: string[];
}

export interface Measure {
  type: string;
  description: string;
  implementationDate: Date;
  targetedEntities?: string[];
  exemptions?: string[];
  impact: string;
}

export interface SanctionImpact {
  targetCountryGDPImpact: number; // percentage
  tradeReduction: number; // percentage
  investmentLoss: number; // USD
  currencyImpact?: string;
  sectorsAffected: string[];
  spilloverEffects?: {
    country: string;
    impact: string;
  }[];
}

export interface HumanitarianImpact {
  populationAffected: number;
  severity: 'MINIMAL' | 'MODERATE' | 'SIGNIFICANT' | 'SEVERE';
  areas: string[];
  mitigationMeasures: string[];
}

export interface ComplianceTracking {
  complianceRate: number; // 0-100
  majorCompliers: string[];
  significantViolators: string[];
  enforcementActions: number;
  penalties: number; // USD
}

export interface Violation {
  date: Date;
  violator: string;
  type: string;
  description: string;
  value?: number; // USD
  enforcement?: string;
  penalty?: number; // USD
}

export interface EnforcementAction {
  date: Date;
  authority: string;
  target: string;
  action: string;
  penalty?: number; // USD
  deterrenceEffect: number; // 0-100
}

export interface Amendment {
  date: Date;
  type: 'EXPANSION' | 'REDUCTION' | 'MODIFICATION';
  description: string;
  rationale: string;
  impact: string;
}

export interface Waiver {
  grantedTo: string;
  scope: string;
  duration?: number; // months
  conditions: string[];
  rationale: string;
  date: Date;
}

export interface InvestmentTreaty {
  id: string;
  name: string;
  type: 'BIT' | 'FTA_INVESTMENT_CHAPTER' | 'MULTILATERAL';
  parties: string[];
  signedDate: Date;
  effectiveDate?: Date;
  terminationDate?: Date;

  // Provisions
  protections: Protection[];
  standardsOfTreatment: StandardOfTreatment[];
  disputeResolution: DisputeResolution;
  exceptions: Exception[];

  // Performance
  investmentVolume: number; // USD
  disputes: InvestmentDispute[];
  effectiveness: number; // 0-100

  // Modern provisions
  sustainabilityProvisions: boolean;
  laborProvisions: boolean;
  environmentalProvisions: boolean;
  anticorruptionProvisions: boolean;

  status: 'IN_FORCE' | 'SIGNED' | 'TERMINATED' | 'RENEGOTIATING';
  lastUpdated: Date;
}

export interface Protection {
  type: 'EXPROPRIATION' | 'FAIR_EQUITABLE_TREATMENT' | 'FULL_PROTECTION' | 'FREE_TRANSFER';
  description: string;
  scope: string;
  limitations?: string[];
}

export interface StandardOfTreatment {
  standard: 'NATIONAL_TREATMENT' | 'MFN' | 'MINIMUM_STANDARD';
  scope: string;
  exceptions?: string[];
}

export interface DisputeResolution {
  mechanisms: string[];
  forum: 'ICSID' | 'UNCITRAL' | 'ICC' | 'AD_HOC' | 'MULTIPLE';
  investorState: boolean;
  stateState: boolean;
  procedures: string[];
  appealMechanism?: string;
}

export interface Exception {
  type: 'NATIONAL_SECURITY' | 'PUBLIC_ORDER' | 'PRUDENTIAL' | 'TAXATION' | 'OTHER';
  description: string;
  scope: string;
}

export interface InvestmentDispute {
  id: string;
  claimant: string;
  respondent: string;
  filedDate: Date;
  amount: number; // USD
  basis: string;
  status: 'PENDING' | 'HEARING' | 'DECIDED' | 'SETTLED' | 'DISCONTINUED';
  outcome?: string;
  award?: number; // USD
  significance: number; // 1-10
}

export interface TradeDispute {
  id: string;
  complainant: string;
  respondent: string;
  thirdParties?: string[];
  filedDate: Date;
  forum: 'WTO' | 'BILATERAL' | 'REGIONAL' | 'OTHER';

  // Subject
  subject: string;
  measures: string[];
  legalBasis: string[];
  tradeValue: number; // USD

  // Process
  status: 'CONSULTATION' | 'PANEL' | 'APPEAL' | 'IMPLEMENTATION' | 'COMPLIANCE' | 'RESOLVED';
  rulings: Ruling[];
  compliance: string;

  // Impact
  economicImpact: number; // USD
  precedentialValue: number; // 0-100
  politicalSensitivity: number; // 0-100

  resolution?: string;
  lastUpdated: Date;
}

export interface Ruling {
  date: Date;
  body: string;
  finding: string;
  remedies: string[];
  deadlines?: Date;
  significance: number; // 1-10
}

export interface TradeRelationship {
  country1: string;
  country2: string;

  // Trade metrics
  bilateralTradeVolume: number; // USD
  year: number;
  country1Exports: number; // USD
  country2Exports: number; // USD
  tradeBalance: number; // Positive = country1 surplus

  // Composition
  topExportsCountry1: TradeProduct[];
  topExportsCountry2: TradeProduct[];

  // Growth and trends
  tradeGrowthRate: number; // Percentage
  historicalTrend: 'GROWING' | 'STABLE' | 'DECLINING' | 'VOLATILE';

  // Framework
  tradeAgreements: string[];
  tariffLevel: {
    country1OnCountry2: number; // Average percentage
    country2OnCountry1: number; // Average percentage
  };

  // Issues
  tradeFrictions: TradeFriction[];
  disputes: string[];

  // Potential
  unrealizedPotential: number; // USD
  growthOpportunities: string[];
  barriers: string[];

  lastUpdated: Date;
}

export interface TradeProduct {
  product: string;
  hsCode?: string;
  value: number; // USD
  share: number; // Percentage of total trade
  growth: number; // Year-over-year percentage
}

export interface TradeFriction {
  issue: string;
  type: 'TARIFF' | 'NTB' | 'REGULATORY' | 'STANDARDS' | 'SPS' | 'SUBSIDY' | 'OTHER';
  affectedTrade: number; // USD
  resolution: 'RESOLVED' | 'NEGOTIATING' | 'ESCALATED' | 'UNRESOLVED';
  impact: string;
}

export interface EconomicCoercion {
  id: string;
  imposer: string;
  target: string;
  startDate: Date;
  endDate?: Date;

  type: 'TRADE_RESTRICTION' | 'INVESTMENT_BAN' | 'BOYCOTT' | 'EMBARGO' | 'ECONOMIC_PRESSURE';
  measures: string[];

  // Objectives and context
  objectives: string[];
  trigger: string;
  demands: string[];

  // Impact
  economicDamage: number; // USD
  politicalImpact: string;
  effectiveness: number; // 0-100

  // Response
  targetResponse: string;
  retaliationMeasures?: string[];
  internationalReaction: string[];

  // Resolution
  resolutionProspects: number; // 0-100
  negotiationStatus?: string;
  outcomeß?: string;

  lastUpdated: Date;
}
