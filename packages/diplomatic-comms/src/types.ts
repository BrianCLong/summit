/**
 * Diplomatic Communications Analysis Types
 * Comprehensive types for analyzing diplomatic communications, statements, cables, and messaging
 */

export enum CommunicationType {
  DIPLOMATIC_CABLE = 'DIPLOMATIC_CABLE',
  OFFICIAL_STATEMENT = 'OFFICIAL_STATEMENT',
  PRESS_RELEASE = 'PRESS_RELEASE',
  SPEECH = 'SPEECH',
  JOINT_STATEMENT = 'JOINT_STATEMENT',
  COMMUNIQUE = 'COMMUNIQUE',
  DEMARCHE = 'DEMARCHE',
  NOTE_VERBALE = 'NOTE_VERBALE',
  AIDE_MEMOIRE = 'AIDE_MEMOIRE',
  MEMORANDUM = 'MEMORANDUM',
  PROTEST_NOTE = 'PROTEST_NOTE',
  DIPLOMATIC_NOTE = 'DIPLOMATIC_NOTE',
  TALKING_POINTS = 'TALKING_POINTS',
  READOUT = 'READOUT',
  BRIEFING = 'BRIEFING',
  INTERVIEW = 'INTERVIEW',
  SOCIAL_MEDIA = 'SOCIAL_MEDIA'
}

export enum Tone {
  DIPLOMATIC = 'DIPLOMATIC',
  CONCILIATORY = 'CONCILIATORY',
  FRIENDLY = 'FRIENDLY',
  NEUTRAL = 'NEUTRAL',
  FIRM = 'FIRM',
  STERN = 'STERN',
  WARNING = 'WARNING',
  THREATENING = 'THREATENING',
  CONFRONTATIONAL = 'CONFRONTATIONAL',
  APOLOGETIC = 'APOLOGETIC',
  DEFENSIVE = 'DEFENSIVE',
  CELEBRATORY = 'CELEBRATORY'
}

export enum Sentiment {
  VERY_POSITIVE = 'VERY_POSITIVE',
  POSITIVE = 'POSITIVE',
  SLIGHTLY_POSITIVE = 'SLIGHTLY_POSITIVE',
  NEUTRAL = 'NEUTRAL',
  SLIGHTLY_NEGATIVE = 'SLIGHTLY_NEGATIVE',
  NEGATIVE = 'NEGATIVE',
  VERY_NEGATIVE = 'VERY_NEGATIVE'
}

export enum Urgency {
  ROUTINE = 'ROUTINE',
  PRIORITY = 'PRIORITY',
  IMMEDIATE = 'IMMEDIATE',
  FLASH = 'FLASH',
  EMERGENCY = 'EMERGENCY'
}

export enum Classification {
  UNCLASSIFIED = 'UNCLASSIFIED',
  OFFICIAL_USE_ONLY = 'OFFICIAL_USE_ONLY',
  CONFIDENTIAL = 'CONFIDENTIAL',
  SECRET = 'SECRET',
  TOP_SECRET = 'TOP_SECRET',
  SENSITIVE = 'SENSITIVE'
}

export interface DiplomaticCommunication {
  id: string;
  type: CommunicationType;
  title: string;
  date: Date;

  // Parties
  sender: Party;
  recipient?: Party;
  recipients?: Party[];
  audience: 'BILATERAL' | 'MULTILATERAL' | 'PUBLIC' | 'INTERNAL' | 'TARGETED';

  // Content
  content: string;
  language: string;
  translation?: Translation[];
  summary: string;
  keyPoints: string[];
  mainMessages: string[];

  // Classification and metadata
  classification: Classification;
  urgency: Urgency;
  cableNumber?: string;
  referenceNumber?: string;

  // Analysis
  tone: Tone;
  sentiment: Sentiment;
  sentimentScore: number; // -1 to 1
  emotion?: Emotion;
  intent: Intent;
  subtext?: string[];
  impliedMeanings?: string[];

  // Topics and themes
  topics: string[];
  themes: Theme[];
  keywords: string[];
  entities: Entity[];

  // Context
  context: Context;
  relatedCommunications?: string[];
  responseTo?: string;
  responses?: string[];
  partOfNarrative?: string;

  // Linguistic analysis
  linguisticFeatures: LinguisticFeatures;
  rhetoricalDevices?: string[];
  culturalReferences?: string[];

  // Impact and reach
  visibility: 'PUBLIC' | 'LEAKED' | 'RESTRICTED' | 'CLASSIFIED';
  mediaPickup?: MediaPickup[];
  publicReaction?: PublicReaction;
  diplomaticReaction?: DiplomaticReaction[];

  // Signals and messaging
  signals: Signal[];
  messagingStrategy?: MessagingStrategy;
  targetAudience?: string[];

  // Metadata
  source: Source;
  verified: boolean;
  confidence: number; // 0-1
  createdAt: Date;
  updatedAt: Date;
  tags?: string[];
}

export interface Party {
  type: 'COUNTRY' | 'ORGANIZATION' | 'INDIVIDUAL' | 'GROUP';
  name: string;
  country?: string;
  title?: string;
  organization?: string;
  role?: string;
}

export interface Translation {
  language: string;
  content: string;
  translator?: string;
  accuracy?: number;
  notes?: string[];
}

export interface Emotion {
  primary: string;
  secondary?: string[];
  intensity: number; // 0-100
  confidence: number; // 0-1
}

export interface Intent {
  primary: string;
  secondary?: string[];
  objectives: string[];
  desiredOutcome?: string;
  tacticUsed?: string;
}

export interface Theme {
  name: string;
  prominence: number; // 0-100
  keywords: string[];
  related: string[];
}

export interface Entity {
  type: 'PERSON' | 'ORGANIZATION' | 'LOCATION' | 'EVENT' | 'TREATY' | 'POLICY' | 'CONCEPT';
  name: string;
  mentions: number;
  sentiment?: number;
  context?: string;
}

export interface Context {
  geopoliticalSituation: string;
  bilateralRelationshipStatus: string;
  recentEvents?: string[];
  ongoingNegotiations?: string[];
  domesticPressures?: string[];
  internationalPressures?: string[];
  timing: TimingContext;
}

export interface TimingContext {
  significance: string;
  beforeEvent?: string;
  afterEvent?: string;
  duringEvent?: string;
  strategicTiming: boolean;
  timingRationale?: string;
}

export interface LinguisticFeatures {
  formality: number; // 0-100
  complexity: number; // 0-100
  clarity: number; // 0-100
  directness: number; // 0-100
  emotionality: number; // 0-100
  wordCount: number;
  sentenceCount: number;
  averageSentenceLength: number;
  readabilityScore?: number;
  unusualLanguage?: string[];
  diplomaticEuphemisms?: string[];
}

export interface MediaPickup {
  outlet: string;
  country: string;
  headline: string;
  url: string;
  publishedAt: Date;
  reach: number;
  sentiment: Sentiment;
  angle: string;
}

export interface PublicReaction {
  socialMediaMentions: number;
  sentimentBreakdown: {
    positive: number;
    neutral: number;
    negative: number;
  };
  topReactions: string[];
  viralityScore: number; // 0-100
  controversialityScore: number; // 0-100
}

export interface DiplomaticReaction {
  country: string;
  official: string;
  reactionType: 'ENDORSEMENT' | 'AGREEMENT' | 'ACKNOWLEDGMENT' | 'SILENCE' | 'DISAGREEMENT' | 'CONDEMNATION' | 'REBUTTAL';
  statement?: string;
  date: Date;
  significance: number; // 1-10
}

export interface Signal {
  type: 'POLICY_SHIFT' | 'WARNING' | 'REASSURANCE' | 'THREAT' | 'COMMITMENT' | 'AMBIGUITY' | 'DEFLECTION';
  description: string;
  strength: number; // 0-100
  clarity: number; // 0-100
  targetAudience: string[];
  interpretation: string;
  confidence: number; // 0-1
}

export interface MessagingStrategy {
  approach: 'DIRECT' | 'INDIRECT' | 'AMBIGUOUS' | 'LAYERED' | 'COORDINATED';
  objectives: string[];
  targetAudiences: string[];
  tactics: string[];
  coordination?: CoordinationPattern;
  consistency: number; // 0-100
  effectiveness: number; // 0-100
}

export interface CoordinationPattern {
  coordinatedWith: string[];
  timing: 'SIMULTANEOUS' | 'SEQUENTIAL' | 'STAGGERED';
  messageAlignment: number; // 0-100
  evidenceOfCoordination: string[];
}

export interface Source {
  type: 'OFFICIAL' | 'LEAKED' | 'DECLASSIFIED' | 'MEDIA' | 'INTERCEPTED' | 'THIRD_PARTY';
  name: string;
  url?: string;
  reliability: number; // 0-1
  date: Date;
}

export interface Cable {
  id: string;
  classification: Classification;
  originatingPost: string;
  destination: string;
  date: Date;
  subject: string;
  tags: string[];
  content: string;
  summary: string;
  actionItems?: ActionItem[];
  recommendations?: string[];
  assessments?: Assessment[];
  reportingOfficer: string;
  approvedBy: string;
}

export interface ActionItem {
  description: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  deadline?: Date;
  responsibleParty: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
}

export interface Assessment {
  subject: string;
  analysis: string;
  conclusion: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  sources: string[];
  implications: string[];
}

export interface Statement {
  id: string;
  type: CommunicationType;
  speaker: Party;
  venue: string;
  date: Date;
  content: string;
  keyQuotes: Quote[];
  context: string;
  significance: number; // 1-10
  audienceReaction?: string;
}

export interface Quote {
  text: string;
  context: string;
  significance: number; // 1-10
  tone: Tone;
  intent: string;
  mediaPickup: number;
}

export interface CommunicationPattern {
  country: string;
  period: { start: Date; end: Date };
  totalCommunications: number;
  byType: Record<CommunicationType, number>;
  averageTone: Tone;
  averageSentiment: number;
  topTopics: string[];
  topTargets: string[];
  messagingConsistency: number; // 0-100
  strategicThemes: string[];
  shifts: PatternShift[];
}

export interface PatternShift {
  date: Date;
  type: 'TONE' | 'TOPIC' | 'FREQUENCY' | 'TARGET' | 'STRATEGY';
  description: string;
  significance: number; // 1-10
  likelyReason?: string;
}

export interface NarrativeTracking {
  id: string;
  name: string;
  mainTheme: string;
  initiator: string;
  startDate: Date;
  endDate?: Date;
  status: 'EMERGING' | 'ACTIVE' | 'DOMINANT' | 'FADING' | 'DORMANT';

  communications: string[]; // Communication IDs
  keyMessages: string[];
  evolution: NarrativeEvolution[];

  adoption: {
    country: string;
    level: 'FULL' | 'PARTIAL' | 'ADAPTED' | 'REJECTED';
    adaptations?: string[];
  }[];

  counterNarratives?: {
    narrative: string;
    proponents: string[];
    strength: number; // 0-100
  }[];

  effectiveness: number; // 0-100
  reach: number; // 0-100
  credibility: number; // 0-100
}

export interface NarrativeEvolution {
  date: Date;
  change: string;
  reason?: string;
  impact: number; // 1-10
}

export interface RhetoricalAnalysis {
  communication: string;
  devices: {
    type: string;
    examples: string[];
    purpose: string;
    effectiveness: number; // 0-100
  }[];
  persuasiveTechniques: string[];
  logicalStructure: string;
  emotionalAppeals: string[];
  credibilityMarkers: string[];
  weaknesses?: string[];
}

export interface ComparativeAnalysis {
  communications: DiplomaticCommunication[];
  commonThemes: string[];
  divergences: {
    aspect: string;
    differences: string[];
    significance: number; // 1-10
  }[];
  consistencyScore: number; // 0-100
  contradictions?: string[];
  complementarity: number; // 0-100
}

export interface SignalDetection {
  signal: Signal;
  evidencePoints: string[];
  contextualFactors: string[];
  historicalPrecedents?: string[];
  predictiveValue: number; // 0-100
  actionableImplications: string[];
}
