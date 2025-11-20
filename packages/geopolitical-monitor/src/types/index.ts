/**
 * Geopolitical Monitor - Type Definitions
 * Comprehensive types for political event monitoring and analysis
 */

export enum EventType {
  // Political Events
  ELECTION = 'ELECTION',
  POLITICAL_TRANSITION = 'POLITICAL_TRANSITION',
  POLICY_CHANGE = 'POLICY_CHANGE',
  LEADERSHIP_CHANGE = 'LEADERSHIP_CHANGE',
  COALITION_FORMATION = 'COALITION_FORMATION',
  REFERENDUM = 'REFERENDUM',
  PROTEST = 'PROTEST',
  COUP = 'COUP',
  POLITICAL_VIOLENCE = 'POLITICAL_VIOLENCE',
  DIPLOMATIC_EVENT = 'DIPLOMATIC_EVENT',

  // Legislative
  LEGISLATION_PROPOSED = 'LEGISLATION_PROPOSED',
  LEGISLATION_PASSED = 'LEGISLATION_PASSED',
  LEGISLATION_VETOED = 'LEGISLATION_VETOED',
  PARLIAMENTARY_SESSION = 'PARLIAMENTARY_SESSION',

  // International Relations
  SUMMIT = 'SUMMIT',
  STATE_VISIT = 'STATE_VISIT',
  DIPLOMATIC_INCIDENT = 'DIPLOMATIC_INCIDENT',
  TREATY_SIGNED = 'TREATY_SIGNED',
  ALLIANCE_FORMED = 'ALLIANCE_FORMED',
  SANCTIONS_IMPOSED = 'SANCTIONS_IMPOSED',
  TRADE_AGREEMENT = 'TRADE_AGREEMENT'
}

export enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export enum EventSource {
  NEWS_MEDIA = 'NEWS_MEDIA',
  GOVERNMENT_OFFICIAL = 'GOVERNMENT_OFFICIAL',
  INTELLIGENCE_REPORT = 'INTELLIGENCE_REPORT',
  SOCIAL_MEDIA = 'SOCIAL_MEDIA',
  DIPLOMATIC_CABLE = 'DIPLOMATIC_CABLE',
  RESEARCH_INSTITUTION = 'RESEARCH_INSTITUTION',
  NGO_REPORT = 'NGO_REPORT'
}

export interface GeopoliticalEvent {
  id: string;
  type: EventType;
  title: string;
  description: string;
  country: string;
  region: string;
  timestamp: Date;
  source: EventSource;
  sourceUrl?: string;
  riskLevel: RiskLevel;
  confidence: number; // 0-1
  verified: boolean;
  tags: string[];

  // Entities involved
  actors: Actor[];
  affectedCountries: string[];

  // Analysis
  impact: EventImpact;
  sentiment: number; // -1 to 1
  volatilityScore: number; // 0-100

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  metadata: Record<string, any>;
}

export interface Actor {
  id: string;
  name: string;
  type: ActorType;
  role: string;
  affiliation?: string;
  country?: string;
}

export enum ActorType {
  GOVERNMENT = 'GOVERNMENT',
  POLITICAL_PARTY = 'POLITICAL_PARTY',
  LEADER = 'LEADER',
  ORGANIZATION = 'ORGANIZATION',
  MILITARY = 'MILITARY',
  REBEL_GROUP = 'REBEL_GROUP',
  INTERNATIONAL_ORG = 'INTERNATIONAL_ORG'
}

export interface EventImpact {
  economic: number; // 0-100
  political: number; // 0-100
  social: number; // 0-100
  security: number; // 0-100
  overall: number; // 0-100

  affectedSectors: string[];
  estimatedPopulationAffected?: number;
  estimatedEconomicImpact?: {
    amount: number;
    currency: string;
  };
}

export interface PoliticalEvent extends GeopoliticalEvent {
  type: EventType;
  electionType?: 'PRESIDENTIAL' | 'PARLIAMENTARY' | 'LOCAL' | 'REFERENDUM';
  incumbent?: string;
  challenger?: string;
  results?: ElectionResults;
  policyArea?: string;
  legislationId?: string;
}

export interface ElectionResults {
  winner?: string;
  votingComplete: boolean;
  turnout?: number;
  results: {
    candidate: string;
    party?: string;
    votes: number;
    percentage: number;
  }[];
}

export interface DiplomaticEvent extends GeopoliticalEvent {
  participants: string[]; // Country codes
  hostCountry: string;
  outcomes?: string[];
  agreementsReached?: Agreement[];
}

export interface Agreement {
  id: string;
  title: string;
  type: 'TREATY' | 'MOU' | 'DECLARATION' | 'PROTOCOL';
  signatories: string[];
  effectiveDate?: Date;
  expiryDate?: Date;
  summary: string;
}

export interface ProtestEvent extends GeopoliticalEvent {
  estimatedParticipants?: number;
  cause: string[];
  violence: boolean;
  casualties?: {
    deaths: number;
    injuries: number;
  };
  governmentResponse?: string;
}

export interface MonitoringConfig {
  regions: string[];
  countries: string[];
  eventTypes: EventType[];
  minRiskLevel: RiskLevel;
  minConfidence: number;
  sources: EventSource[];
  updateInterval: number; // milliseconds
  enableAlerts: boolean;
  alertThresholds: {
    riskLevel: RiskLevel;
    volatilityScore: number;
  };
}

export interface EventFilter {
  regions?: string[];
  countries?: string[];
  eventTypes?: EventType[];
  riskLevels?: RiskLevel[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  minConfidence?: number;
  verified?: boolean;
  tags?: string[];
}

export interface EventAnalysis {
  eventId: string;
  trends: Trend[];
  relatedEvents: string[];
  historicalComparison: HistoricalComparison[];
  predictions: Prediction[];
  recommendations: string[];
}

export interface Trend {
  id: string;
  type: 'ESCALATION' | 'DE_ESCALATION' | 'STABILIZATION' | 'VOLATILITY';
  direction: 'INCREASING' | 'DECREASING' | 'STABLE';
  strength: number; // 0-100
  timeframe: string;
  indicators: string[];
}

export interface HistoricalComparison {
  historicalEventId: string;
  similarity: number; // 0-1
  outcome: string;
  lessons: string[];
}

export interface Prediction {
  scenario: string;
  probability: number; // 0-1
  timeframe: string;
  indicators: string[];
  potentialImpact: EventImpact;
}

export interface Alert {
  id: string;
  eventId: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  title: string;
  message: string;
  timestamp: Date;
  acknowledged: boolean;
  recipients: string[];
}
