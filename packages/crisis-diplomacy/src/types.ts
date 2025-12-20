/**
 * Crisis Diplomacy Types
 * Comprehensive types for monitoring conflict mediation, peace processes, and crisis communications
 */

export enum CrisisType {
  ARMED_CONFLICT = 'ARMED_CONFLICT',
  TERRITORIAL_DISPUTE = 'TERRITORIAL_DISPUTE',
  DIPLOMATIC_CRISIS = 'DIPLOMATIC_CRISIS',
  HUMANITARIAN_CRISIS = 'HUMANITARIAN_CRISIS',
  POLITICAL_CRISIS = 'POLITICAL_CRISIS',
  ECONOMIC_CRISIS = 'ECONOMIC_CRISIS',
  REFUGEE_CRISIS = 'REFUGEE_CRISIS',
  HOSTAGE_CRISIS = 'HOSTAGE_CRISIS',
  NUCLEAR_CRISIS = 'NUCLEAR_CRISIS',
  CYBER_CRISIS = 'CYBER_CRISIS',
  TERRORIST_INCIDENT = 'TERRORIST_INCIDENT',
  INTERNATIONAL_INCIDENT = 'INTERNATIONAL_INCIDENT'
}

export enum CrisisPhase {
  EMERGING = 'EMERGING',
  ESCALATING = 'ESCALATING',
  PEAK = 'PEAK',
  DE_ESCALATING = 'DE_ESCALATING',
  STABILIZING = 'STABILIZING',
  RESOLVED = 'RESOLVED',
  FROZEN = 'FROZEN',
  RECURRING = 'RECURRING'
}

export enum EscalationLevel {
  LOW = 'LOW',
  MODERATE = 'MODERATE',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
  MAXIMUM = 'MAXIMUM'
}

export enum MediationType {
  DIRECT_NEGOTIATION = 'DIRECT_NEGOTIATION',
  THIRD_PARTY_MEDIATION = 'THIRD_PARTY_MEDIATION',
  SHUTTLE_DIPLOMACY = 'SHUTTLE_DIPLOMACY',
  TRACK_ONE = 'TRACK_ONE',
  TRACK_TWO = 'TRACK_TWO',
  TRACK_THREE = 'TRACK_THREE',
  MULTI_TRACK = 'MULTI_TRACK',
  UN_MEDIATION = 'UN_MEDIATION',
  REGIONAL_MEDIATION = 'REGIONAL_MEDIATION',
  GOOD_OFFICES = 'GOOD_OFFICES',
  ARBITRATION = 'ARBITRATION',
  CONCILIATION = 'CONCILIATION'
}

export interface Crisis {
  id: string;
  name: string;
  type: CrisisType;
  phase: CrisisPhase;
  escalationLevel: EscalationLevel;

  // Parties involved
  primaryParties: Party[];
  secondaryParties: Party[];
  externalActors: ExternalActor[];

  // Timeline
  startDate: Date;
  peakDate?: Date;
  endDate?: Date;
  duration?: number; // days
  timeline: TimelineEvent[];

  // Characteristics
  location: Location;
  scope: 'LOCAL' | 'REGIONAL' | 'INTERNATIONAL' | 'GLOBAL';
  intensity: number; // 0-100
  complexity: number; // 0-100

  // Impact
  casualties?: CasualtyCount;
  displacement?: DisplacementData;
  economicImpact?: EconomicImpact;
  humanitarianImpact?: HumanitarianImpact;
  politicalImpact: string[];
  regionalStability: number; // 0-100

  // Diplomacy
  mediationEfforts: MediationEffort[];
  negotiations: Negotiation[];
  ceasefires: Ceasefire[];
  agreements: Agreement[];
  failedInitiatives: FailedInitiative[];

  // Communications
  crisisCommunications: CrisisCommunication[];
  hotlineActivity: HotlineActivity[];
  backchannelActivity: BackchannelActivity[];

  // Risk factors
  escalationRisks: EscalationRisk[];
  deescalationOpportunities: DeescalationOpportunity[];
  spoilerRisks: SpoilerRisk[];
  wildCards: string[];

  // Analysis
  rootCauses: string[];
  triggeringEvents: string[];
  keyIssues: string[];
  obstacles: string[];
  successFactors?: string[];

  // Predictions
  trajectoryPrediction: TrajectoryPrediction;
  resolutionProspects: ResolutionProspects;

  // Metadata
  lastUpdated: Date;
  sources: Source[];
  confidence: number; // 0-1
  monitoring: boolean;
}

export interface Party {
  id: string;
  name: string;
  type: 'STATE' | 'NON_STATE_ACTOR' | 'INSURGENT_GROUP' | 'POLITICAL_FACTION' | 'ETHNIC_GROUP';
  country?: string;
  leaders: Leader[];
  objectives: string[];
  redLines: string[];
  capabilities: Capabilities;
  willingness: number; // 0-100 (to negotiate)
  constraints: string[];
  backers?: string[];
  leverage: number; // 0-100
}

export interface Leader {
  name: string;
  title: string;
  since: Date;
  influence: number; // 0-100
  negotiationStyle: string;
  credibility: number; // 0-100
}

export interface ExternalActor {
  country: string;
  role: 'MEDIATOR' | 'GUARANTOR' | 'BACKER' | 'OBSERVER' | 'SPOILER' | 'FACILITATOR';
  involvement: number; // 0-100
  objectives: string[];
  leverage: number; // 0-100
  actions: string[];
}

export interface Location {
  countries: string[];
  regions: string[];
  cities?: string[];
  conflictZones?: string[];
  strategicImportance: number; // 0-100
}

export interface TimelineEvent {
  date: Date;
  event: string;
  type: 'OUTBREAK' | 'ESCALATION' | 'ATTACK' | 'NEGOTIATION' | 'AGREEMENT' | 'VIOLATION' | 'INTERVENTION' | 'OTHER';
  parties: string[];
  impact: number; // 1-10
  description: string;
}

export interface CasualtyCount {
  confirmed: number;
  estimated: number;
  civilians: number;
  combatants: number;
  period: { start: Date; end: Date };
  source: string;
}

export interface DisplacementData {
  internally: number;
  refugees: number;
  hostCountries: { country: string; count: number }[];
  trend: 'INCREASING' | 'STABLE' | 'DECREASING';
  lastUpdated: Date;
}

export interface EconomicImpact {
  directCost: number; // USD
  indirectCost: number; // USD
  infrastructureDamage: number; // USD
  tradeDisruption: number; // USD
  affectedCountries: string[];
  globalImpact?: string;
}

export interface HumanitarianImpact {
  peopleAffected: number;
  peopleInNeed: number;
  accessRestrictions: string[];
  aidEfforts: AidEffort[];
  severity: 'MINIMAL' | 'MODERATE' | 'SEVERE' | 'CATASTROPHIC';
}

export interface AidEffort {
  organization: string;
  type: 'FOOD' | 'MEDICAL' | 'SHELTER' | 'PROTECTION' | 'MULTI_SECTOR';
  scale: number; // USD
  beneficiaries: number;
  challenges: string[];
}

export interface Capabilities {
  military: number; // 0-100
  economic: number; // 0-100
  political: number; // 0-100
  international: number; // 0-100
  popular: number; // 0-100
}

export interface MediationEffort {
  id: string;
  type: MediationType;
  mediator: string;
  mediatorType: 'COUNTRY' | 'UN' | 'REGIONAL_ORG' | 'INDIVIDUAL' | 'NGO';
  startDate: Date;
  endDate?: Date;
  status: 'ACTIVE' | 'SUSPENDED' | 'CONCLUDED' | 'FAILED';

  parties: string[];
  objectives: string[];
  approach: string;
  phases: MediationPhase[];

  progress: number; // 0-100
  breakthroughs?: Breakthrough[];
  setbacks?: Setback[];

  factors: {
    mediatorCredibility: number; // 0-100
    partyWillingness: number; // 0-100
    externalSupport: number; // 0-100
    timing: number; // 0-100
  };

  outcomes?: string[];
  lessons?: string[];
}

export interface MediationPhase {
  number: number;
  name: string;
  startDate: Date;
  endDate?: Date;
  objectives: string[];
  activities: string[];
  achievements?: string[];
  challenges: string[];
}

export interface Breakthrough {
  date: Date;
  description: string;
  significance: number; // 1-10
  impact: string;
  sustainabilityRisk: number; // 0-100
}

export interface Setback {
  date: Date;
  description: string;
  severity: number; // 1-10
  cause: string;
  recovery: 'IMMEDIATE' | 'GRADUAL' | 'UNCERTAIN' | 'UNLIKELY';
}

export interface Negotiation {
  id: string;
  round: number;
  date: Date;
  location: string;
  format: 'BILATERAL' | 'MULTILATERAL' | 'PROXIMITY' | 'SHUTTLE';
  participants: Participant[];
  agenda: string[];

  outcomes: NegotiationOutcome[];
  agreements?: Agreement[];
  disagreements?: string[];

  atmosphereTone: 'POSITIVE' | 'CONSTRUCTIVE' | 'TENSE' | 'HOSTILE' | 'DEADLOCKED';
  progress: 'BREAKTHROUGH' | 'PROGRESS' | 'STALEMATE' | 'REGRESSION';

  nextRound?: Date;
  continuationLikelihood: number; // 0-100
}

export interface Participant {
  party: string;
  representative: string;
  title: string;
  delegationSize?: number;
  approach: 'FLEXIBLE' | 'RIGID' | 'STRATEGIC' | 'PRINCIPLED';
  concessions?: string[];
  demands: string[];
}

export interface NegotiationOutcome {
  type: 'AGREEMENT' | 'PARTIAL_AGREEMENT' | 'UNDERSTANDING' | 'COMMITMENT' | 'DEADLOCK';
  subject: string;
  details: string;
  bindingForce: 'BINDING' | 'NON_BINDING' | 'POLITICAL';
  verificationMechanism?: string;
}

export interface Ceasefire {
  id: string;
  type: 'PERMANENT' | 'INDEFINITE' | 'TEMPORARY' | 'LIMITED' | 'HUMANITARIAN';
  parties: string[];
  startDate: Date;
  endDate?: Date;
  duration?: number; // days

  terms: string[];
  exclusions?: string[];
  verificationMechanism?: VerificationMechanism;

  status: 'HOLDING' | 'VIOLATED' | 'EXPIRED' | 'EXTENDED' | 'COLLAPSED';
  violations?: Violation[];
  compliance: number; // 0-100

  success: boolean;
  transitionPlan?: string;
}

export interface VerificationMechanism {
  type: 'MONITORS' | 'PEACEKEEPERS' | 'SATELLITE' | 'REPORTS' | 'MIXED';
  implementer: string;
  personnel?: number;
  coverage: number; // 0-100
  effectiveness: number; // 0-100
}

export interface Violation {
  date: Date;
  violator: string;
  type: string;
  severity: 'MINOR' | 'MODERATE' | 'MAJOR' | 'SEVERE';
  description: string;
  response?: string;
  verified: boolean;
}

export interface Agreement {
  id: string;
  name: string;
  type: 'PEACE_AGREEMENT' | 'FRAMEWORK_AGREEMENT' | 'INTERIM_AGREEMENT' | 'PROTOCOL' | 'MOU';
  date: Date;
  location: string;

  signatories: string[];
  witnesses?: string[];
  guarantors?: string[];

  provisions: Provision[];
  timeline: ImplementationTimeline;

  status: 'SIGNED' | 'RATIFIED' | 'IMPLEMENTED' | 'PARTIALLY_IMPLEMENTED' | 'FAILED';
  implementation: number; // 0-100
  compliance: ComplianceTracking[];

  sustainability: number; // 0-100
  risks: string[];
}

export interface Provision {
  category: 'POLITICAL' | 'SECURITY' | 'ECONOMIC' | 'HUMANITARIAN' | 'JUSTICE' | 'GOVERNANCE';
  description: string;
  responsible: string[];
  deadline?: Date;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'STALLED' | 'VIOLATED';
  progress: number; // 0-100
}

export interface ImplementationTimeline {
  phases: {
    name: string;
    startDate: Date;
    endDate: Date;
    milestones: string[];
    status: 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'DELAYED';
  }[];
}

export interface ComplianceTracking {
  party: string;
  overall: number; // 0-100
  byProvision: { provision: string; compliance: number }[];
  violations: string[];
  goodFaithEfforts: number; // 0-100
}

export interface FailedInitiative {
  id: string;
  type: string;
  initiator: string;
  date: Date;
  objectives: string[];
  failureReasons: string[];
  lessons: string[];
  impact: number; // 1-10
}

export interface CrisisCommunication {
  id: string;
  date: Date;
  sender: string;
  recipient?: string;
  type: 'STATEMENT' | 'HOTLINE' | 'LETTER' | 'BACKCHANNEL' | 'PUBLIC' | 'PRIVATE';
  urgency: 'ROUTINE' | 'PRIORITY' | 'IMMEDIATE' | 'EMERGENCY';
  content: string;
  tone: 'CONCILIATORY' | 'FIRM' | 'WARNING' | 'THREATENING' | 'REASSURING';
  intent: string;
  effectiveness: number; // 0-100
}

export interface HotlineActivity {
  date: Date;
  participants: string[];
  duration?: number; // minutes
  purpose: string;
  outcome: string;
  effectivenesss: number; // 0-100
  frequency: number; // calls per day/week
}

export interface BackchannelActivity {
  id: string;
  parties: string[];
  intermediary?: string;
  startDate: Date;
  endDate?: Date;
  objectives: string[];
  confidenceLevel: number; // 0-100
  productivity: number; // 0-100
  discovered: boolean;
  impact?: string;
}

export interface EscalationRisk {
  factor: string;
  probability: number; // 0-100
  severity: number; // 1-10
  timeframe: 'IMMEDIATE' | 'SHORT_TERM' | 'MEDIUM_TERM' | 'LONG_TERM';
  triggers: string[];
  indicators: string[];
  mitigation?: string[];
}

export interface DeescalationOpportunity {
  opportunity: string;
  feasibility: number; // 0-100
  impact: number; // 1-10
  timeframe: 'IMMEDIATE' | 'SHORT_TERM' | 'MEDIUM_TERM' | 'LONG_TERM';
  requirements: string[];
  risks: string[];
  sponsors?: string[];
}

export interface SpoilerRisk {
  actor: string;
  motivation: string;
  capability: number; // 0-100
  likelihood: number; // 0-100
  potentialImpact: number; // 1-10
  countermeasures: string[];
}

export interface TrajectoryPrediction {
  shortTerm: {
    phase: CrisisPhase;
    probability: number; // 0-100
    keyFactors: string[];
  };
  mediumTerm: {
    phase: CrisisPhase;
    probability: number;
    keyFactors: string[];
  };
  longTerm: {
    phase: CrisisPhase;
    probability: number;
    keyFactors: string[];
  };
  confidence: number; // 0-100
}

export interface ResolutionProspects {
  likelihood: number; // 0-100
  timeframe: string;
  mostLikelyPath: string;
  alternativePaths: string[];
  prerequisites: string[];
  obstacles: string[];
  catalysts?: string[];
  confidence: number; // 0-100
}

export interface Source {
  type: 'OFFICIAL' | 'MEDIA' | 'NGO' | 'INTELLIGENCE' | 'ACADEMIC' | 'WITNESS';
  name: string;
  url?: string;
  date: Date;
  reliability: number; // 0-1
}

export interface PeaceProcess {
  id: string;
  crisis: string;
  name: string;
  startDate: Date;
  endDate?: Date;
  status: 'INITIATED' | 'ONGOING' | 'STALLED' | 'COMPLETED' | 'FAILED';

  framework: string;
  phases: ProcessPhase[];
  stakeholders: Stakeholder[];

  achievements: string[];
  challenges: string[];
  momentum: 'STRONG' | 'MODERATE' | 'WEAK' | 'STALLED';

  publicSupport: {
    party: string;
    support: number; // 0-100
  }[];

  sustainability: number; // 0-100
  successProspects: number; // 0-100
}

export interface ProcessPhase {
  number: number;
  name: string;
  objectives: string[];
  status: 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'STALLED';
  progress: number; // 0-100
  challenges: string[];
}

export interface Stakeholder {
  name: string;
  type: 'PRIMARY_PARTY' | 'MEDIATOR' | 'GUARANTOR' | 'OBSERVER' | 'SUPPORTER';
  role: string;
  influence: number; // 0-100
  commitment: number; // 0-100
}

export interface CrisisComparison {
  crises: Crisis[];
  similarities: string[];
  differences: string[];
  lessons: string[];
  applicableStrategies: string[];
}

export interface EarlyWarningIndicator {
  indicator: string;
  category: 'POLITICAL' | 'MILITARY' | 'ECONOMIC' | 'SOCIAL' | 'ENVIRONMENTAL';
  threshold: number;
  currentLevel: number;
  trend: 'IMPROVING' | 'STABLE' | 'DETERIORATING';
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}
