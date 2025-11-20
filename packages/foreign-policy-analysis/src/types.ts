/**
 * Foreign Policy Analysis Types
 * Comprehensive analysis of foreign policy positions, strategies, and evolution
 */

export enum PolicyDomain {
  SECURITY = 'SECURITY',
  DEFENSE = 'DEFENSE',
  TRADE = 'TRADE',
  DIPLOMACY = 'DIPLOMACY',
  ECONOMIC = 'ECONOMIC',
  HUMAN_RIGHTS = 'HUMAN_RIGHTS',
  ENVIRONMENT = 'ENVIRONMENT',
  DEVELOPMENT = 'DEVELOPMENT',
  INTELLIGENCE = 'INTELLIGENCE',
  CYBER = 'CYBER',
  SPACE = 'SPACE',
  ENERGY = 'ENERGY',
  MIGRATION = 'MIGRATION',
  HEALTH = 'HEALTH',
  COUNTERTERRORISM = 'COUNTERTERRORISM',
  NUCLEAR = 'NUCLEAR',
  HUMANITARIAN = 'HUMANITARIAN'
}

export enum PolicyPosition {
  STRONGLY_SUPPORT = 'STRONGLY_SUPPORT',
  SUPPORT = 'SUPPORT',
  NEUTRAL = 'NEUTRAL',
  OPPOSE = 'OPPOSE',
  STRONGLY_OPPOSE = 'STRONGLY_OPPOSE',
  ABSTAIN = 'ABSTAIN',
  CONDITIONAL = 'CONDITIONAL',
  EVOLVING = 'EVOLVING'
}

export enum PolicyShiftType {
  MAJOR_REVERSAL = 'MAJOR_REVERSAL',
  GRADUAL_SHIFT = 'GRADUAL_SHIFT',
  TACTICAL_ADJUSTMENT = 'TACTICAL_ADJUSTMENT',
  RHETORICAL_CHANGE = 'RHETORICAL_CHANGE',
  LEADERSHIP_DRIVEN = 'LEADERSHIP_DRIVEN',
  CRISIS_DRIVEN = 'CRISIS_DRIVEN',
  DOMESTIC_DRIVEN = 'DOMESTIC_DRIVEN',
  ALLIANCE_DRIVEN = 'ALLIANCE_DRIVEN'
}

export interface ForeignPolicy {
  id: string;
  country: string;
  domain: PolicyDomain;
  topic: string;
  position: PolicyPosition;

  // Policy details
  officialStatement: string;
  keyPrinciples: string[];
  strategicObjectives: string[];
  redLines?: string[];
  flexibilityAreas?: string[];

  // Context
  historicalContext?: string;
  domesticFactors: string[];
  internationalPressures: string[];
  economicFactors: string[];
  securityFactors: string[];

  // Documents
  policyDocuments: PolicyDocument[];
  speeches: Speech[];
  votingRecords: VotingRecord[];

  // Evolution
  previousPositions?: PolicyPosition[];
  shiftHistory?: PolicyShift[];
  trendDirection: 'HARDENING' | 'SOFTENING' | 'STABLE' | 'VOLATILE';

  // Relationships
  alignedCountries: string[];
  opposingCountries: string[];
  swingCountries?: string[];

  // Implementation
  policyInstruments: PolicyInstrument[];
  resourceAllocation?: ResourceAllocation;
  implementation: Implementation;

  // Analysis
  consistency: number; // 0-100
  credibility: number; // 0-100
  effectiveness: number; // 0-100
  predictability: number; // 0-100

  lastUpdated: Date;
  confidence: number;
  sources: Source[];
}

export interface PolicyDocument {
  id: string;
  title: string;
  type: 'STRATEGY' | 'DOCTRINE' | 'WHITE_PAPER' | 'NSC_DIRECTIVE' | 'POLICY_BRIEF' | 'ROADMAP';
  releaseDate: Date;
  classification: string;
  summary: string;
  keyPoints: string[];
  url?: string;
  significance: number;
}

export interface Speech {
  id: string;
  speaker: string;
  speakerTitle: string;
  venue: string;
  date: Date;
  audience: string;
  topic: string;
  transcript?: string;
  keyQuotes: string[];
  tone: 'CONCILIATORY' | 'FIRM' | 'AGGRESSIVE' | 'DEFENSIVE' | 'COOPERATIVE';
  policySignals: string[];
  sentiment: number; // -1 to 1
}

export interface VotingRecord {
  id: string;
  forum: string; // e.g., "UN General Assembly", "UN Security Council"
  resolution: string;
  resolutionNumber?: string;
  vote: 'YES' | 'NO' | 'ABSTAIN' | 'ABSENT';
  date: Date;
  topic: string;
  explanation?: string;
  cosponsored?: boolean;
  alignmentWithAllies?: number; // percentage
}

export interface PolicyShift {
  id: string;
  fromPosition: PolicyPosition;
  toPosition: PolicyPosition;
  shiftType: PolicyShiftType;
  date: Date;
  triggers: string[];
  announcement?: string;
  rationale?: string;
  domesticReaction?: string;
  internationalReaction?: {
    country: string;
    reaction: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' | 'CONCERNED';
    statement?: string;
  }[];
  reversible: boolean;
  magnitude: number; // 1-10
}

export interface PolicyInstrument {
  type: 'DIPLOMATIC' | 'MILITARY' | 'ECONOMIC' | 'INFORMATION' | 'LEGAL' | 'COVERT';
  description: string;
  active: boolean;
  effectiveness?: number;
  cost?: number;
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface ResourceAllocation {
  budgetAmount?: number;
  personnel?: number;
  facilities?: string[];
  programs?: string[];
  priorityLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface Implementation {
  status: 'PLANNED' | 'INITIATED' | 'ONGOING' | 'COMPLETED' | 'SUSPENDED' | 'FAILED';
  progress: number; // 0-100
  milestones: Milestone[];
  challenges: string[];
  successFactors: string[];
  metrics?: Metric[];
}

export interface Milestone {
  description: string;
  targetDate?: Date;
  completed: boolean;
  completionDate?: Date;
}

export interface Metric {
  name: string;
  target: number;
  current: number;
  unit: string;
  trend: 'IMPROVING' | 'STABLE' | 'DECLINING';
}

export interface Source {
  type: 'OFFICIAL' | 'MEDIA' | 'ACADEMIC' | 'INTELLIGENCE' | 'THINK_TANK';
  name: string;
  url?: string;
  date: Date;
  reliability: number;
}

export interface NationalInterest {
  id: string;
  country: string;
  interest: string;
  category: 'VITAL' | 'IMPORTANT' | 'PERIPHERAL';
  description: string;
  threatsToInterest: string[];
  policiesSupporting: string[];
  tradeofsAccepted?: string[];
  competingInterests?: string[];
  stability: 'ENDURING' | 'STABLE' | 'EVOLVING' | 'CONTESTED';
}

export interface StrategicDoctrine {
  id: string;
  country: string;
  name: string;
  adoptedDate: Date;
  administrationOrLeader: string;

  corePrinciples: string[];
  worldview: string;
  threatPerception: string[];
  allianceStrategy: string;
  useOfForcePhilosophy: string;

  domains: {
    domain: PolicyDomain;
    approach: string;
    priority: number;
  }[];

  departures?: {
    fromDoctrine: string;
    keyChanges: string[];
  };

  consistency: number; // 0-100
  durability: number; // 0-100 (likelihood to persist beyond current leadership)
}

export interface PolicyAlignment {
  country1: string;
  country2: string;
  domain?: PolicyDomain;

  overallAlignment: number; // 0-100
  domainAlignment: {
    domain: PolicyDomain;
    alignment: number;
    trend: 'CONVERGING' | 'DIVERGING' | 'STABLE';
  }[];

  keySimilarities: string[];
  keyDifferences: string[];

  votingAlignment?: number; // percentage in international forums
  treatyCooperation?: number;
  diplomaticCoordination?: number;

  trajectory: 'IMPROVING' | 'STABLE' | 'DETERIORATING';
  outlook: string;
}

export interface PolicyComparison {
  countries: string[];
  domain: PolicyDomain;
  topic: string;

  positions: {
    country: string;
    position: PolicyPosition;
    rationale: string;
  }[];

  spectrum: {
    mostHawkish: string[];
    moderate: string[];
    mostDovish: string[];
  };

  coalitions: {
    name: string;
    members: string[];
    position: string;
  }[];

  outliers: string[];
  consensus?: string;
}
