/**
 * Bilateral Relations Monitoring Types
 * Comprehensive tracking of bilateral relationships between countries
 */

export enum RelationshipStatus {
  STRATEGIC_PARTNERSHIP = 'STRATEGIC_PARTNERSHIP',
  COMPREHENSIVE_PARTNERSHIP = 'COMPREHENSIVE_PARTNERSHIP',
  NORMAL = 'NORMAL',
  STRAINED = 'STRAINED',
  TENSE = 'TENSE',
  HOSTILE = 'HOSTILE',
  SEVERED = 'SEVERED',
  FROZEN = 'FROZEN',
  NORMALIZING = 'NORMALIZING',
  IMPROVING = 'IMPROVING',
  DETERIORATING = 'DETERIORATING'
}

export enum CooperationLevel {
  EXTENSIVE = 'EXTENSIVE',
  SUBSTANTIAL = 'SUBSTANTIAL',
  MODERATE = 'MODERATE',
  LIMITED = 'LIMITED',
  MINIMAL = 'MINIMAL',
  NONE = 'NONE'
}

export interface BilateralRelationship {
  id: string;
  country1: string;
  country2: string;
  status: RelationshipStatus;

  // Overall assessment
  relationshipQuality: number; // 0-100
  strategicAlignment: number; // 0-100
  trustLevel: number; // 0-100
  stability: number; // 0-100

  // Historical context
  diplomaticRelationsSince?: Date;
  historicalMilestones: HistoricalMilestone[];
  historicalGrievances?: Grievance[];
  conflictHistory?: Conflict[];

  // Cooperation areas
  cooperationAreas: CooperationArea[];
  jointInitiatives: JointInitiative[];
  exchangePrograms: ExchangeProgram[];

  // Friction points
  frictionPoints: FrictionPoint[];
  disputes: DisputeIssue[];
  sanctions?: Sanction[];
  restrictions?: Restriction[];

  // Trade and economics
  tradeRelationship: TradeRelationship;
  investmentFlows: InvestmentFlow[];
  economicAgreements: string[]; // Treaty IDs

  // Defense and security
  defenseCooperation: DefenseCooperation;
  intelligenceSharing?: IntelligenceSharing;
  militaryAgreements: string[]; // Treaty IDs

  // Diplomatic engagement
  diplomaticLevel: 'AMBASSADORIAL' | 'CHARGE_D_AFFAIRES' | 'INTERESTS_SECTION' | 'NONE';
  diplomaticExchanges: DiplomaticExchange[];
  highLevelVisits: HighLevelVisit[];

  // Cultural and people-to-people
  culturalExchanges: CulturalExchange[];
  touristFlows?: TouristFlow;
  studentExchanges?: StudentExchange;
  diasporaConnections?: DiasporaConnection;

  // Multilateral coordination
  multilateralAlignment: number; // 0-100 (UN voting, etc.)
  sharedAlliances?: string[];
  opposingBlocs?: string[];

  // Trajectory and prediction
  recentTrend: 'IMPROVING' | 'STABLE' | 'DETERIORATING' | 'VOLATILE';
  projectedTrajectory: Trajectory;
  riskFactors: RiskFactor[];
  opportunityFactors: OpportunityFactor[];

  // Analysis
  keyDrivers: string[];
  constrainingFactors: string[];
  wildCards: string[]; // Unpredictable factors

  lastUpdated: Date;
  confidence: number;
  sources: Source[];
}

export interface HistoricalMilestone {
  date: Date;
  event: string;
  impact: 'VERY_POSITIVE' | 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | 'VERY_NEGATIVE';
  description: string;
  significance: number; // 1-10
}

export interface Grievance {
  id: string;
  issue: string;
  since: Date;
  aggrievedParty: string;
  description: string;
  severity: 'MINOR' | 'MODERATE' | 'SERIOUS' | 'CRITICAL';
  resolved: boolean;
  resolution?: {
    date: Date;
    method: string;
    outcome: string;
  };
}

export interface Conflict {
  id: string;
  name: string;
  period: { start: Date; end?: Date };
  type: 'MILITARY' | 'ECONOMIC' | 'DIPLOMATIC' | 'HYBRID';
  outcome: string;
  casualties?: number;
  economicCost?: number;
  politicalImpact: string;
  lingering Effects: string[];
}

export interface CooperationArea {
  domain: string;
  level: CooperationLevel;
  description: string;
  startDate?: Date;
  mechanisms: string[];
  achievements: string[];
  challenges: string[];
  trend: 'EXPANDING' | 'STABLE' | 'CONTRACTING';
  value?: number; // Economic value if applicable
}

export interface JointInitiative {
  id: string;
  name: string;
  type: 'PROJECT' | 'PROGRAM' | 'FACILITY' | 'ORGANIZATION' | 'RESEARCH';
  startDate: Date;
  status: 'PLANNED' | 'ACTIVE' | 'SUSPENDED' | 'COMPLETED' | 'CANCELLED';
  description: string;
  objectives: string[];
  budget?: number;
  achievements?: string[];
}

export interface ExchangeProgram {
  id: string;
  type: 'STUDENT' | 'SCHOLAR' | 'PROFESSIONAL' | 'MILITARY' | 'CULTURAL';
  participants: number;
  annualVolume?: number;
  duration?: string;
  fundingSource: string;
  impact: string;
}

export interface FrictionPoint {
  id: string;
  issue: string;
  category: 'TERRITORIAL' | 'ECONOMIC' | 'POLITICAL' | 'HUMAN_RIGHTS' | 'SECURITY' | 'OTHER';
  severity: number; // 1-10
  since: Date;
  description: string;
  escalationRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  resolutionProspects: 'UNLIKELY' | 'DIFFICULT' | 'POSSIBLE' | 'LIKELY';
  positions: {
    country: string;
    position: string;
    redLines?: string[];
  }[];
}

export interface DisputeIssue {
  id: string;
  subject: string;
  disputeType: 'BORDER' | 'MARITIME' | 'TRADE' | 'HISTORICAL' | 'DIPLOMATIC' | 'OTHER';
  since: Date;
  status: 'DORMANT' | 'ACTIVE' | 'ESCALATING' | 'NEGOTIATING' | 'RESOLVED';
  resolutionMechanism?: string;
  thirdPartyInvolvement?: string[];
  timeline?: Date;
}

export interface Sanction {
  id: string;
  imposedBy: string;
  imposedOn: string;
  type: 'ECONOMIC' | 'DIPLOMATIC' | 'MILITARY' | 'INDIVIDUAL' | 'SECTORAL';
  imposedDate: Date;
  liftedDate?: Date;
  reason: string;
  scope: string;
  impact: string;
  effectiveness: number; // 0-100
}

export interface Restriction {
  id: string;
  type: 'VISA' | 'TRADE' | 'TECHNOLOGY' | 'INVESTMENT' | 'TRAVEL' | 'MEDIA';
  description: string;
  imposedDate: Date;
  justification: string;
  impact: string;
}

export interface TradeRelationship {
  bilateralTradeVolume: number; // USD
  tradeBalance: number; // Positive = country1 surplus
  topExports: { product: string; value: number }[];
  topImports: { product: string; value: number }[];
  tradeAgreements: string[];
  tariffs: { average: number; range: string };
  tradeDisputes: string[];
  trend: 'GROWING' | 'STABLE' | 'DECLINING';
  year: number;
}

export interface InvestmentFlow {
  direction: string; // "country1 to country2" or reverse
  fdiStock: number;
  annualFlow: number;
  keyInvestors: string[];
  sectors: string[];
  restrictions: string[];
  trend: 'INCREASING' | 'STABLE' | 'DECREASING';
  year: number;
}

export interface DefenseCooperation {
  level: CooperationLevel;
  militaryAlliance?: string;
  defenseAgreements: string[];
  jointExercises: {
    name: string;
    frequency: string;
    lastHeld?: Date;
    participants: number;
  }[];
  armsTradeVolume?: number;
  technologySharing: boolean;
  basesOrFacilities?: string[];
  interoperability: number; // 0-100
}

export interface IntelligenceSharing {
  level: 'NONE' | 'MINIMAL' | 'SELECTIVE' | 'SUBSTANTIAL' | 'EXTENSIVE';
  formalAgreement: boolean;
  categories: string[];
  restrictions: string[];
  trust: number; // 0-100
}

export interface DiplomaticExchange {
  date: Date;
  type: 'VISIT' | 'MEETING' | 'CALL' | 'MESSAGE' | 'DEMARCHE';
  level: 'HEAD_OF_STATE' | 'FOREIGN_MINISTER' | 'AMBASSADOR' | 'OFFICIAL';
  participants: string[];
  topics: string[];
  outcome?: string;
  tone: 'POSITIVE' | 'NEUTRAL' | 'TENSE' | 'CONFRONTATIONAL';
}

export interface HighLevelVisit {
  id: string;
  visitor: string;
  visitorTitle: string;
  visitingCountry: string;
  hostCountry: string;
  visitDate: Date;
  duration: number; // days
  purpose: string;
  outcomes: string[];
  significance: number; // 1-10
  mediaAttention: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface CulturalExchange {
  id: string;
  type: 'EXHIBITION' | 'PERFORMANCE' | 'FILM' | 'LITERATURE' | 'SPORTS' | 'OTHER';
  description: string;
  date: Date;
  participants?: number;
  audience?: number;
  impact: string;
}

export interface TouristFlow {
  fromCountry1ToCountry2: number;
  fromCountry2ToCountry1: number;
  year: number;
  trend: 'INCREASING' | 'STABLE' | 'DECREASING';
  visaRequirements: string;
}

export interface StudentExchange {
  studentsFromCountry1: number;
  studentsFromCountry2: number;
  year: number;
  scholarshipPrograms: string[];
  topDestinations: string[];
  trend: 'GROWING' | 'STABLE' | 'DECLINING';
}

export interface DiasporaConnection {
  diasporaSize: number;
  hostCountry: string;
  originCountry: string;
  influence: 'HIGH' | 'MEDIUM' | 'LOW';
  organizationsActive: string[];
  politicalImpact: string;
  economicImpact?: number; // Remittances, etc.
}

export interface Trajectory {
  shortTerm: { // 0-1 year
    prediction: RelationshipStatus;
    confidence: number;
    keyFactors: string[];
  };
  mediumTerm: { // 1-5 years
    prediction: RelationshipStatus;
    confidence: number;
    keyFactors: string[];
  };
  longTerm: { // 5+ years
    prediction: RelationshipStatus;
    confidence: number;
    keyFactors: string[];
  };
}

export interface RiskFactor {
  factor: string;
  probability: number; // 0-100
  impact: number; // 1-10
  timeframe: 'IMMEDIATE' | 'SHORT_TERM' | 'MEDIUM_TERM' | 'LONG_TERM';
  mitigation?: string;
}

export interface OpportunityFactor {
  opportunity: string;
  probability: number; // 0-100
  benefit: number; // 1-10
  timeframe: 'IMMEDIATE' | 'SHORT_TERM' | 'MEDIUM_TERM' | 'LONG_TERM';
  requirements?: string[];
}

export interface Source {
  type: 'OFFICIAL' | 'DIPLOMATIC' | 'MEDIA' | 'ACADEMIC' | 'INTELLIGENCE';
  name: string;
  url?: string;
  date: Date;
  reliability: number;
}

export interface RelationshipComparison {
  relationships: BilateralRelationship[];
  averageQuality: number;
  bestRelationship: { countries: string[]; quality: number };
  worstRelationship: { countries: string[]; quality: number };
  mostImproved: { countries: string[]; improvement: number };
  mostDeteriorated: { countries: string[]; deterioration: number };
}
