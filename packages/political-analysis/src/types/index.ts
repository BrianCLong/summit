/**
 * Political Analysis Types
 * Comprehensive type definitions for political intelligence and analysis
 */

// ==================== Core Enums ====================

export enum PoliticalActorType {
  LEADER = 'LEADER',
  PARTY = 'PARTY',
  FACTION = 'FACTION',
  COALITION = 'COALITION',
  OPPOSITION = 'OPPOSITION',
  ACTIVIST_GROUP = 'ACTIVIST_GROUP',
  MILITARY_LEADER = 'MILITARY_LEADER',
  RELIGIOUS_LEADER = 'RELIGIOUS_LEADER',
  BUSINESS_ELITE = 'BUSINESS_ELITE',
  MEDIA_INFLUENCER = 'MEDIA_INFLUENCER'
}

export enum GovernmentType {
  DEMOCRACY = 'DEMOCRACY',
  AUTOCRACY = 'AUTOCRACY',
  OLIGARCHY = 'OLIGARCHY',
  THEOCRACY = 'THEOCRACY',
  MILITARY_JUNTA = 'MILITARY_JUNTA',
  MONARCHY = 'MONARCHY',
  CONSTITUTIONAL_MONARCHY = 'CONSTITUTIONAL_MONARCHY',
  SINGLE_PARTY = 'SINGLE_PARTY',
  FEDERAL_REPUBLIC = 'FEDERAL_REPUBLIC',
  PARLIAMENTARY = 'PARLIAMENTARY',
  PRESIDENTIAL = 'PRESIDENTIAL',
  HYBRID = 'HYBRID'
}

export enum IdeologyType {
  LIBERAL = 'LIBERAL',
  CONSERVATIVE = 'CONSERVATIVE',
  SOCIALIST = 'SOCIALIST',
  COMMUNIST = 'COMMUNIST',
  NATIONALIST = 'NATIONALIST',
  POPULIST = 'POPULIST',
  CENTRIST = 'CENTRIST',
  PROGRESSIVE = 'PROGRESSIVE',
  LIBERTARIAN = 'LIBERTARIAN',
  AUTHORITARIAN = 'AUTHORITARIAN',
  RELIGIOUS = 'RELIGIOUS',
  SECULAR = 'SECULAR',
  GREEN = 'GREEN',
  TECHNOCRATIC = 'TECHNOCRATIC'
}

export enum PowerLevel {
  DOMINANT = 'DOMINANT',
  STRONG = 'STRONG',
  MODERATE = 'MODERATE',
  WEAK = 'WEAK',
  DECLINING = 'DECLINING',
  RISING = 'RISING',
  MARGINAL = 'MARGINAL'
}

export enum StabilityLevel {
  STABLE = 'STABLE',
  MOSTLY_STABLE = 'MOSTLY_STABLE',
  UNCERTAIN = 'UNCERTAIN',
  UNSTABLE = 'UNSTABLE',
  VOLATILE = 'VOLATILE',
  CRISIS = 'CRISIS',
  COLLAPSE = 'COLLAPSE'
}

export enum ElectoralSystemType {
  FIRST_PAST_POST = 'FIRST_PAST_POST',
  PROPORTIONAL = 'PROPORTIONAL',
  MIXED = 'MIXED',
  TWO_ROUND = 'TWO_ROUND',
  RANKED_CHOICE = 'RANKED_CHOICE',
  SINGLE_TRANSFERABLE = 'SINGLE_TRANSFERABLE',
  PARTY_LIST = 'PARTY_LIST',
  NON_COMPETITIVE = 'NON_COMPETITIVE',
  NONE = 'NONE'
}

export enum PoliticalTrendType {
  DEMOCRATIZATION = 'DEMOCRATIZATION',
  AUTHORITARIAN_BACKSLIDING = 'AUTHORITARIAN_BACKSLIDING',
  POLARIZATION = 'POLARIZATION',
  POPULIST_SURGE = 'POPULIST_SURGE',
  POLITICAL_FRAGMENTATION = 'POLITICAL_FRAGMENTATION',
  CONSOLIDATION = 'CONSOLIDATION',
  REFORM_MOVEMENT = 'REFORM_MOVEMENT',
  REVOLUTIONARY = 'REVOLUTIONARY',
  COUNTER_REVOLUTIONARY = 'COUNTER_REVOLUTIONARY',
  TECHNOCRATIC_SHIFT = 'TECHNOCRATIC_SHIFT'
}

export enum IntelligenceConfidence {
  CONFIRMED = 'CONFIRMED',
  HIGH = 'HIGH',
  MODERATE = 'MODERATE',
  LOW = 'LOW',
  UNCONFIRMED = 'UNCONFIRMED',
  RUMOR = 'RUMOR'
}

export enum IntelligenceSource {
  HUMINT = 'HUMINT',
  OSINT = 'OSINT',
  SIGINT = 'SIGINT',
  DIPLOMATIC = 'DIPLOMATIC',
  MEDIA = 'MEDIA',
  ACADEMIC = 'ACADEMIC',
  LEAKED = 'LEAKED',
  INSIDER = 'INSIDER',
  ANALYSIS = 'ANALYSIS'
}

// ==================== Political Actors ====================

export interface PoliticalActor {
  id: string;
  type: PoliticalActorType;
  name: string;
  country: string;
  region?: string;
  ideology: IdeologyType[];
  powerLevel: PowerLevel;
  description: string;
  founded?: Date;
  active: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface PoliticalLeader extends PoliticalActor {
  type: PoliticalActorType.LEADER;
  fullName: string;
  position: string;
  previousPositions?: string[];
  birthDate?: Date;
  education?: string[];
  militaryService?: boolean;
  approval?: ApprovalRating;
  leadership: LeadershipProfile;
  alliances: string[];
  rivals: string[];
}

export interface PoliticalParty extends PoliticalActor {
  type: PoliticalActorType.PARTY;
  leader: string;
  founders?: string[];
  seats?: number;
  totalSeats?: number;
  votingShare?: number;
  membership?: number;
  coalition?: string[];
  platform: PolicyPosition[];
}

export interface PoliticalFaction extends PoliticalActor {
  type: PoliticalActorType.FACTION;
  parentOrganization?: string;
  leaders: string[];
  size: number;
  influence: PowerLevel;
  goals: string[];
}

// ==================== Government Structures ====================

export interface GovernmentStructure {
  id: string;
  country: string;
  type: GovernmentType;
  headOfState: string;
  headOfGovernment: string;
  legislature: Legislature;
  judiciary: Judiciary;
  executive: Executive;
  localGovernment: LocalGovernment[];
  constitution: ConstitutionalFramework;
  checkBalance: ChecksAndBalances;
  succession: SuccessionMechanism;
  createdAt: Date;
  updatedAt: Date;
}

export interface Legislature {
  type: 'UNICAMERAL' | 'BICAMERAL' | 'NONE';
  chambers: Chamber[];
  totalSeats: number;
  currentComposition: PartyComposition[];
  powers: string[];
  effectiveness: number; // 0-100
}

export interface Chamber {
  name: string;
  seats: number;
  composition: PartyComposition[];
  electionDate?: Date;
  nextElection?: Date;
  term: number; // in years
}

export interface PartyComposition {
  partyId: string;
  partyName: string;
  seats: number;
  percentage: number;
}

export interface Judiciary {
  type: 'INDEPENDENT' | 'SEMI_INDEPENDENT' | 'CONTROLLED';
  highestCourt: string;
  judgesAppointed: boolean;
  judicialReview: boolean;
  independence: number; // 0-100
}

export interface Executive {
  type: 'PRESIDENTIAL' | 'PARLIAMENTARY' | 'SEMI_PRESIDENTIAL' | 'ABSOLUTE';
  leader: string;
  cabinet: CabinetMember[];
  powers: string[];
  termLimit?: number;
  termLength: number;
}

export interface CabinetMember {
  name: string;
  position: string;
  party?: string;
  appointedDate: Date;
  background?: string;
}

export interface LocalGovernment {
  level: 'REGIONAL' | 'PROVINCIAL' | 'MUNICIPAL' | 'LOCAL';
  name: string;
  leader?: string;
  autonomy: number; // 0-100
  population?: number;
}

export interface ConstitutionalFramework {
  hasConstitution: boolean;
  adopted?: Date;
  lastAmended?: Date;
  amendmentDifficulty: 'EASY' | 'MODERATE' | 'DIFFICULT' | 'VERY_DIFFICULT';
  protections: string[];
}

export interface ChecksAndBalances {
  score: number; // 0-100
  legislativeOversight: boolean;
  judicialReview: boolean;
  mediaFreedom: number; // 0-100
  civilSociety: number; // 0-100
}

export interface SuccessionMechanism {
  type: 'ELECTORAL' | 'HEREDITARY' | 'APPOINTED' | 'MILITARY' | 'UNCLEAR';
  clarity: number; // 0-100
  stability: number; // 0-100
  nextTransition?: Date;
  potentialSuccessors?: string[];
}

// ==================== Political Trends ====================

export interface PoliticalTrend {
  id: string;
  type: PoliticalTrendType;
  country: string;
  region?: string;
  title: string;
  description: string;
  startDate: Date;
  endDate?: Date;
  active: boolean;
  strength: number; // 0-100
  momentum: 'ACCELERATING' | 'STABLE' | 'DECELERATING';
  drivers: string[];
  impacts: TrendImpact[];
  relatedActors: string[];
  indicators: TrendIndicator[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TrendImpact {
  area: 'GOVERNANCE' | 'SOCIETY' | 'ECONOMY' | 'SECURITY' | 'INTERNATIONAL';
  description: string;
  severity: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
}

export interface TrendIndicator {
  name: string;
  value: number;
  change: number;
  timestamp: Date;
}

export interface PoliticalMovement {
  id: string;
  name: string;
  type: 'PROTEST' | 'REFORM' | 'REVOLUTIONARY' | 'ELECTORAL' | 'SOCIAL';
  country: string;
  ideology: IdeologyType[];
  leaders: string[];
  size: number;
  support: number; // 0-100
  active: boolean;
  goals: string[];
  tactics: string[];
  achievements: string[];
  opposition: string[];
  startDate: Date;
  endDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ==================== Power Dynamics ====================

export interface PowerDynamics {
  id: string;
  country: string;
  region?: string;
  powerStructure: PowerStructure;
  alliances: PoliticalAlliance[];
  conflicts: PoliticalConflict[];
  balanceOfPower: PowerBalance[];
  influenceNetworks: InfluenceNetwork[];
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface PowerStructure {
  dominantActors: string[];
  risingActors: string[];
  decliningActors: string[];
  powerConcentration: number; // 0-100
  competitiveness: number; // 0-100
}

export interface PoliticalAlliance {
  id: string;
  name: string;
  members: string[];
  type: 'COALITION' | 'INFORMAL' | 'STRATEGIC' | 'IDEOLOGICAL';
  strength: number; // 0-100
  stability: number; // 0-100
  purpose: string;
  formed: Date;
  expires?: Date;
  active: boolean;
}

export interface PoliticalConflict {
  id: string;
  type: 'IDEOLOGICAL' | 'POWER_STRUGGLE' | 'POLICY' | 'PERSONAL' | 'FACTIONAL';
  parties: string[];
  intensity: 'LOW' | 'MODERATE' | 'HIGH' | 'SEVERE';
  description: string;
  startDate: Date;
  resolution?: ConflictResolution;
  active: boolean;
}

export interface ConflictResolution {
  type: 'COMPROMISE' | 'VICTORY' | 'STALEMATE' | 'ONGOING';
  date: Date;
  winner?: string;
  terms?: string[];
}

export interface PowerBalance {
  dimension: string; // e.g., "Legislative", "Executive", "Military", "Economic"
  actors: PowerPosition[];
  concentration: number; // 0-100
  stability: number; // 0-100
}

export interface PowerPosition {
  actorId: string;
  share: number; // 0-100
  trend: 'INCREASING' | 'STABLE' | 'DECREASING';
}

export interface InfluenceNetwork {
  id: string;
  name: string;
  type: 'PATRONAGE' | 'IDEOLOGICAL' | 'ETHNIC' | 'REGIONAL' | 'ECONOMIC';
  nodes: NetworkNode[];
  connections: NetworkConnection[];
  centrality: Record<string, number>;
}

export interface NetworkNode {
  actorId: string;
  role: string;
  importance: number; // 0-100
}

export interface NetworkConnection {
  from: string;
  to: string;
  type: 'SUPPORTS' | 'OPPOSES' | 'INFLUENCES' | 'ALLIED' | 'RIVAL';
  strength: number; // 0-100
}

// ==================== Policy Positions ====================

export interface PolicyPosition {
  id: string;
  actorId: string;
  domain: PolicyDomain;
  stance: string;
  priority: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  details: string;
  proposals?: string[];
  voting?: VotingRecord[];
  consistency: number; // 0-100
  createdAt: Date;
  updatedAt: Date;
}

export enum PolicyDomain {
  ECONOMIC = 'ECONOMIC',
  FOREIGN_POLICY = 'FOREIGN_POLICY',
  DEFENSE = 'DEFENSE',
  HEALTHCARE = 'HEALTHCARE',
  EDUCATION = 'EDUCATION',
  ENVIRONMENT = 'ENVIRONMENT',
  IMMIGRATION = 'IMMIGRATION',
  JUSTICE = 'JUSTICE',
  SOCIAL_WELFARE = 'SOCIAL_WELFARE',
  INFRASTRUCTURE = 'INFRASTRUCTURE',
  ENERGY = 'ENERGY',
  TECHNOLOGY = 'TECHNOLOGY',
  CIVIL_RIGHTS = 'CIVIL_RIGHTS',
  SECURITY = 'SECURITY'
}

export interface VotingRecord {
  legislation: string;
  vote: 'YES' | 'NO' | 'ABSTAIN' | 'ABSENT';
  date: Date;
  rationale?: string;
}

// ==================== Electoral Systems ====================

export interface ElectoralSystem {
  id: string;
  country: string;
  type: ElectoralSystemType;
  level: 'NATIONAL' | 'REGIONAL' | 'LOCAL';
  description: string;
  threshold?: number; // percentage
  districts?: number;
  totalSeats: number;
  termLength: number; // in years
  fairness: number; // 0-100
  competitiveness: number; // 0-100
  createdAt: Date;
  updatedAt: Date;
}

export interface ElectionResult {
  id: string;
  country: string;
  region?: string;
  level: 'NATIONAL' | 'REGIONAL' | 'LOCAL';
  type: 'PRESIDENTIAL' | 'LEGISLATIVE' | 'LOCAL' | 'REFERENDUM';
  date: Date;
  turnout: number; // percentage
  results: CandidateResult[];
  integrity: ElectionIntegrity;
  significance: string;
  outcomes: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CandidateResult {
  candidateId?: string;
  partyId?: string;
  name: string;
  votes: number;
  percentage: number;
  seats?: number;
  won: boolean;
}

export interface ElectionIntegrity {
  free: boolean;
  fair: boolean;
  transparent: boolean;
  issues: string[];
  internationalObservers: boolean;
  score: number; // 0-100
}

export interface ElectoralForecast {
  id: string;
  electionId: string;
  country: string;
  electionDate: Date;
  forecastDate: Date;
  predictions: Prediction[];
  methodology: string;
  confidence: number; // 0-100
  scenarios: Scenario[];
  keyFactors: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Prediction {
  actorId: string;
  actorName: string;
  predictedVoteShare: number;
  predictedSeats?: number;
  probability: number; // 0-100
  range: [number, number];
}

export interface Scenario {
  name: string;
  probability: number; // 0-100
  description: string;
  implications: string[];
}

// ==================== Political Stability ====================

export interface PoliticalStability {
  id: string;
  country: string;
  timestamp: Date;
  overallLevel: StabilityLevel;
  overallScore: number; // 0-100
  indicators: StabilityIndicator[];
  riskFactors: RiskFactor[];
  stabilizingFactors: string[];
  trajectory: 'IMPROVING' | 'STABLE' | 'DETERIORATING';
  forecast: StabilityForecast;
  createdAt: Date;
  updatedAt: Date;
}

export interface StabilityIndicator {
  category: StabilityCategory;
  score: number; // 0-100
  trend: 'IMPROVING' | 'STABLE' | 'DETERIORATING';
  dataPoints: IndicatorDataPoint[];
}

export enum StabilityCategory {
  GOVERNANCE = 'GOVERNANCE',
  LEGITIMACY = 'LEGITIMACY',
  COHESION = 'COHESION',
  INSTITUTIONS = 'INSTITUTIONS',
  RULE_OF_LAW = 'RULE_OF_LAW',
  CIVIL_LIBERTIES = 'CIVIL_LIBERTIES',
  ECONOMIC_STABILITY = 'ECONOMIC_STABILITY',
  SOCIAL_STABILITY = 'SOCIAL_STABILITY',
  SECURITY = 'SECURITY'
}

export interface IndicatorDataPoint {
  date: Date;
  value: number;
  source?: string;
}

export interface RiskFactor {
  type: 'POLITICAL' | 'SOCIAL' | 'ECONOMIC' | 'SECURITY' | 'INSTITUTIONAL';
  description: string;
  severity: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  likelihood: number; // 0-100
  impact: number; // 0-100
  mitigation?: string[];
}

export interface StabilityForecast {
  horizon: 'SHORT_TERM' | 'MEDIUM_TERM' | 'LONG_TERM'; // 6mo, 1-2yr, 3-5yr
  predictedLevel: StabilityLevel;
  confidence: number; // 0-100
  scenarios: StabilityScenario[];
}

export interface StabilityScenario {
  name: string;
  probability: number; // 0-100
  stabilityLevel: StabilityLevel;
  triggers: string[];
  implications: string[];
}

// ==================== Leadership Assessment ====================

export interface LeadershipProfile {
  leadershipStyle: LeadershipStyle;
  decisionMaking: DecisionMakingStyle;
  politicalSkills: PoliticalSkills;
  personality: PersonalityTraits;
  strengths: string[];
  weaknesses: string[];
  effectiveness: number; // 0-100
}

export enum LeadershipStyle {
  AUTHORITARIAN = 'AUTHORITARIAN',
  DEMOCRATIC = 'DEMOCRATIC',
  POPULIST = 'POPULIST',
  TECHNOCRATIC = 'TECHNOCRATIC',
  CHARISMATIC = 'CHARISMATIC',
  PRAGMATIC = 'PRAGMATIC',
  IDEOLOGICAL = 'IDEOLOGICAL',
  CONSENSUS_BUILDER = 'CONSENSUS_BUILDER'
}

export enum DecisionMakingStyle {
  DECISIVE = 'DECISIVE',
  DELIBERATIVE = 'DELIBERATIVE',
  CONSULTATIVE = 'CONSULTATIVE',
  IMPULSIVE = 'IMPULSIVE',
  CAUTIOUS = 'CAUTIOUS',
  DATA_DRIVEN = 'DATA_DRIVEN',
  INTUITIVE = 'INTUITIVE'
}

export interface PoliticalSkills {
  negotiation: number; // 0-100
  coalition_building: number;
  communication: number;
  strategic_thinking: number;
  crisis_management: number;
  patronage: number;
  manipulation: number;
  legitimacy: number;
}

export interface PersonalityTraits {
  narcissism: number; // 0-100
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
  machiavellianism: number;
  risk_tolerance: number;
}

export interface ApprovalRating {
  overall: number; // 0-100
  date: Date;
  source: string;
  demographics: DemographicBreakdown[];
  trend: 'RISING' | 'STABLE' | 'FALLING';
  history: ApprovalDataPoint[];
}

export interface DemographicBreakdown {
  category: string;
  segment: string;
  approval: number;
}

export interface ApprovalDataPoint {
  date: Date;
  rating: number;
  event?: string;
}

// ==================== Political Intelligence ====================

export interface PoliticalIntelligence {
  id: string;
  source: IntelligenceSource;
  confidence: IntelligenceConfidence;
  country: string;
  region?: string;
  category: IntelligenceCategory;
  title: string;
  summary: string;
  details: string;
  actors: string[];
  implications: string[];
  urgency: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  verified: boolean;
  collectedAt: Date;
  validUntil?: Date;
  tags: string[];
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export enum IntelligenceCategory {
  LEADERSHIP = 'LEADERSHIP',
  POLICY = 'POLICY',
  ELECTION = 'ELECTION',
  COUP = 'COUP',
  PROTEST = 'PROTEST',
  ALLIANCE = 'ALLIANCE',
  CONFLICT = 'CONFLICT',
  CORRUPTION = 'CORRUPTION',
  SUCCESSION = 'SUCCESSION',
  REFORM = 'REFORM',
  CRISIS = 'CRISIS',
  FOREIGN_RELATIONS = 'FOREIGN_RELATIONS'
}

export interface IntelligencePattern {
  id: string;
  name: string;
  type: 'TREND' | 'ANOMALY' | 'CYCLE' | 'CORRELATION';
  description: string;
  intelligence: string[];
  confidence: number; // 0-100
  significance: number; // 0-100
  discoveredAt: Date;
  indicators: string[];
}

export interface IntelligenceInsight {
  id: string;
  title: string;
  type: 'ANALYSIS' | 'PREDICTION' | 'WARNING' | 'OPPORTUNITY';
  content: string;
  confidence: number; // 0-100
  impact: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  timeframe: string;
  sources: string[];
  recommendations: string[];
  generatedAt: Date;
  validUntil?: Date;
}

// ==================== Analysis Results ====================

export interface PoliticalLandscapeAnalysis {
  id: string;
  country: string;
  region?: string;
  timestamp: Date;
  overview: string;
  governmentStructure: GovernmentStructure;
  keyActors: PoliticalActor[];
  powerDynamics: PowerDynamics;
  stability: PoliticalStability;
  trends: PoliticalTrend[];
  risks: RiskFactor[];
  opportunities: string[];
  outlook: string;
  confidence: number; // 0-100
  createdAt: Date;
  updatedAt: Date;
}

export interface PowerDynamicsAssessment {
  id: string;
  country: string;
  timestamp: Date;
  powerStructure: PowerStructure;
  alliances: PoliticalAlliance[];
  conflicts: PoliticalConflict[];
  shifts: PowerShift[];
  analysis: string;
  implications: string[];
  forecast: PowerForecast;
  confidence: number; // 0-100
  createdAt: Date;
}

export interface PowerShift {
  type: 'RISING' | 'DECLINING' | 'CONSOLIDATION' | 'FRAGMENTATION';
  actors: string[];
  magnitude: number; // 0-100
  speed: 'GRADUAL' | 'MODERATE' | 'RAPID';
  causes: string[];
  implications: string[];
}

export interface PowerForecast {
  horizon: 'SHORT_TERM' | 'MEDIUM_TERM' | 'LONG_TERM';
  scenarios: PowerScenario[];
  likelyOutcome: string;
  confidence: number; // 0-100
}

export interface PowerScenario {
  name: string;
  probability: number; // 0-100
  description: string;
  powerStructure: string;
  triggers: string[];
}

// ==================== Event Emitter Events ====================

export interface PoliticalAnalysisEvents {
  'analysis:complete': (analysis: PoliticalLandscapeAnalysis) => void;
  'stability:changed': (stability: PoliticalStability) => void;
  'power:shift': (shift: PowerShift) => void;
  'intelligence:received': (intel: PoliticalIntelligence) => void;
  'insight:generated': (insight: IntelligenceInsight) => void;
  'pattern:detected': (pattern: IntelligencePattern) => void;
  'forecast:updated': (forecast: ElectoralForecast | StabilityForecast) => void;
  'trend:emerging': (trend: PoliticalTrend) => void;
  'conflict:detected': (conflict: PoliticalConflict) => void;
  'alliance:formed': (alliance: PoliticalAlliance) => void;
  'leader:change': (leader: PoliticalLeader) => void;
  'election:result': (result: ElectionResult) => void;
  'risk:alert': (risk: RiskFactor) => void;
  error: (error: Error) => void;
}

// ==================== Configuration ====================

export interface PoliticalAnalysisConfig {
  country?: string;
  regions?: string[];
  trackActors?: boolean;
  trackTrends?: boolean;
  trackStability?: boolean;
  forecastElections?: boolean;
  intelligenceThreshold?: IntelligenceConfidence;
  updateInterval?: number; // in milliseconds
  enableRealTimeAnalysis?: boolean;
  cacheResults?: boolean;
  maxCacheAge?: number; // in milliseconds
}

export interface IntelligenceEngineConfig {
  sources: IntelligenceSource[];
  minimumConfidence: IntelligenceConfidence;
  patternDetection?: boolean;
  insightGeneration?: boolean;
  autoProcess?: boolean;
  retentionPeriod?: number; // in days
  priorityCategories?: IntelligenceCategory[];
}
