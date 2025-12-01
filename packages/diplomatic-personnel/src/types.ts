/**
 * Diplomatic Personnel Tracking Types
 * Comprehensive types for tracking ambassadors, envoys, and diplomatic networks
 */

export enum DiplomaticRank {
  AMBASSADOR = 'AMBASSADOR',
  AMBASSADOR_AT_LARGE = 'AMBASSADOR_AT_LARGE',
  AMBASSADOR_EXTRAORDINARY = 'AMBASSADOR_EXTRAORDINARY',
  HIGH_COMMISSIONER = 'HIGH_COMMISSIONER',
  PERMANENT_REPRESENTATIVE = 'PERMANENT_REPRESENTATIVE',
  CHARGE_D_AFFAIRES = 'CHARGE_D_AFFAIRES',
  MINISTER = 'MINISTER',
  MINISTER_COUNSELOR = 'MINISTER_COUNSELOR',
  COUNSELOR = 'COUNSELOR',
  FIRST_SECRETARY = 'FIRST_SECRETARY',
  SECOND_SECRETARY = 'SECOND_SECRETARY',
  THIRD_SECRETARY = 'THIRD_SECRETARY',
  ATTACHE = 'ATTACHE',
  SPECIAL_ENVOY = 'SPECIAL_ENVOY',
  SPECIAL_REPRESENTATIVE = 'SPECIAL_REPRESENTATIVE',
  CONSUL_GENERAL = 'CONSUL_GENERAL',
  CONSUL = 'CONSUL',
  VICE_CONSUL = 'VICE_CONSUL'
}

export enum PostingType {
  BILATERAL_EMBASSY = 'BILATERAL_EMBASSY',
  CONSULATE = 'CONSULATE',
  CONSULATE_GENERAL = 'CONSULATE_GENERAL',
  PERMANENT_MISSION = 'PERMANENT_MISSION',
  SPECIAL_MISSION = 'SPECIAL_MISSION',
  LIAISON_OFFICE = 'LIAISON_OFFICE',
  INTERESTS_SECTION = 'INTERESTS_SECTION',
  DELEGATION = 'DELEGATION'
}

export enum SpecializationArea {
  POLITICAL_AFFAIRS = 'POLITICAL_AFFAIRS',
  ECONOMIC_AFFAIRS = 'ECONOMIC_AFFAIRS',
  CONSULAR_AFFAIRS = 'CONSULAR_AFFAIRS',
  PUBLIC_DIPLOMACY = 'PUBLIC_DIPLOMACY',
  TRADE_PROMOTION = 'TRADE_PROMOTION',
  DEFENSE_ATTACHE = 'DEFENSE_ATTACHE',
  INTELLIGENCE = 'INTELLIGENCE',
  CULTURAL_AFFAIRS = 'CULTURAL_AFFAIRS',
  SCIENCE_TECHNOLOGY = 'SCIENCE_TECHNOLOGY',
  HUMANITARIAN = 'HUMANITARIAN',
  ENVIRONMENTAL = 'ENVIRONMENTAL',
  MULTILATERAL = 'MULTILATERAL',
  REGIONAL_SECURITY = 'REGIONAL_SECURITY'
}

export interface Diplomat {
  id: string;
  name: string;
  rank: DiplomaticRank;
  country: string;

  // Personal background
  dateOfBirth?: Date;
  nationality: string;
  languages: Language[];
  education: Education[];
  careerStart: Date;

  // Current position
  currentPosting: Posting;
  previousPostings: Posting[];

  // Expertise
  specializations: SpecializationArea[];
  regionalExpertise: string[];
  topicalExpertise: string[];
  relationships: DiplomaticRelationship[];

  // Performance and influence
  effectiveness: number; // 0-100
  influence: number; // 0-100
  networkSize: number;
  profileLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';

  // Activities
  publicEngagements: PublicEngagement[];
  negotiations: NegotiationParticipation[];
  speeches: Speech[];
  writings: Publication[];

  // Reputation and style
  diplomaticStyle: DiplomaticStyle;
  reputation: Reputation;
  strengths: string[];
  weaknesses?: string[];

  // Recognition
  awards: Award[];
  recognitions: string[];

  // Metadata
  lastUpdated: Date;
  sources: Source[];
  verified: boolean;
  monitoring: boolean;
}

export interface Language {
  language: string;
  proficiency: 'NATIVE' | 'FLUENT' | 'PROFESSIONAL' | 'INTERMEDIATE' | 'BASIC';
  certifications?: string[];
}

export interface Education {
  institution: string;
  degree: string;
  field: string;
  year: number;
  country: string;
  notable?: string;
}

export interface Posting {
  id: string;
  type: PostingType;
  title: string;
  location: Location;
  organization?: string; // For multilateral postings

  startDate: Date;
  endDate?: Date;
  duration?: number; // months
  isCurrent: boolean;

  responsibilities: string[];
  achievements?: string[];
  challenges?: string[];

  teamSize?: number;
  budget?: number;

  significantEvents: SignificantEvent[];
  performanceRating?: number; // 0-100
}

export interface Location {
  city: string;
  country: string;
  region: string;
  strategicImportance?: number; // 0-100
}

export interface DiplomaticRelationship {
  withDiplomat: string;
  withDiplomatCountry: string;
  withDiplomatRank: DiplomaticRank;
  relationshipType: 'COUNTERPART' | 'PEER' | 'MENTOR' | 'COLLABORATOR' | 'RIVAL' | 'CONTACT';
  strength: number; // 0-100
  since: Date;
  interactions: number;
  lastInteraction?: Date;
  context?: string;
}

export interface PublicEngagement {
  id: string;
  date: Date;
  type: 'SPEECH' | 'INTERVIEW' | 'PANEL' | 'CONFERENCE' | 'CEREMONY' | 'MEETING' | 'VISIT';
  title: string;
  venue: string;
  audience: string;
  topic: string;
  significance: number; // 1-10
  mediaAttention: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
  keyMessages?: string[];
  impact?: string;
}

export interface NegotiationParticipation {
  id: string;
  negotiation: string;
  role: 'LEAD' | 'DEPUTY' | 'ADVISOR' | 'OBSERVER' | 'MEDIATOR' | 'FACILITATOR';
  startDate: Date;
  endDate?: Date;
  subject: string;
  parties: string[];
  outcome?: string;
  contribution: string;
  effectiveness: number; // 0-100
}

export interface Speech {
  id: string;
  date: Date;
  title: string;
  venue: string;
  occasion: string;
  audience: string;
  content?: string;
  keyThemes: string[];
  tone: 'CONCILIATORY' | 'FIRM' | 'CELEBRATORY' | 'CRITICAL' | 'NEUTRAL';
  significance: number; // 1-10
  mediaPickup: number;
  url?: string;
}

export interface Publication {
  id: string;
  title: string;
  type: 'ARTICLE' | 'BOOK' | 'REPORT' | 'PAPER' | 'COMMENTARY' | 'MEMOIR';
  publishedDate: Date;
  publisher: string;
  subject: string;
  abstract?: string;
  url?: string;
  citations?: number;
  influence: number; // 0-100
}

export interface DiplomaticStyle {
  approach: 'FORMAL' | 'INFORMAL' | 'PRAGMATIC' | 'IDEOLOGICAL' | 'FLEXIBLE' | 'RIGID';
  communicationStyle: 'DIRECT' | 'INDIRECT' | 'NUANCED' | 'BLUNT' | 'DIPLOMATIC';
  negotiationStyle: 'COLLABORATIVE' | 'COMPETITIVE' | 'COMPROMISING' | 'PRINCIPLED' | 'STRATEGIC';
  conflictApproach: 'CONFRONTATIONAL' | 'CONCILIATORY' | 'AVOIDANT' | 'PROBLEM_SOLVING';
  riskTolerance: 'HIGH' | 'MODERATE' | 'LOW';
  innovativeness: number; // 0-100
  culturalSensitivity: number; // 0-100
}

export interface Reputation {
  overall: number; // 0-100
  credibility: number; // 0-100
  trustworthiness: number; // 0-100
  competence: number; // 0-100
  likeability: number; // 0-100

  domesticReputation: number; // 0-100
  internationalReputation: number; // 0-100

  perceptionByCountry?: {
    country: string;
    perception: 'VERY_POSITIVE' | 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | 'VERY_NEGATIVE';
    score: number; // 0-100
  }[];

  controversies?: Controversy[];
  achievements: string[];
}

export interface Controversy {
  date: Date;
  description: string;
  type: 'SCANDAL' | 'GAFFE' | 'POLICY_DISAGREEMENT' | 'PERSONAL' | 'OTHER';
  severity: 'MINOR' | 'MODERATE' | 'MAJOR' | 'SEVERE';
  resolution?: string;
  impact: string;
}

export interface Award {
  name: string;
  year: number;
  awardedBy: string;
  category: string;
  significance: number; // 1-10
  description?: string;
}

export interface SignificantEvent {
  date: Date;
  event: string;
  type: 'ACHIEVEMENT' | 'CHALLENGE' | 'CRISIS' | 'BREAKTHROUGH' | 'SETBACK';
  description: string;
  impact: number; // 1-10
  lessons?: string[];
}

export interface Source {
  type: 'OFFICIAL' | 'MEDIA' | 'ACADEMIC' | 'DIPLOMATIC' | 'BIOGRAPHY';
  name: string;
  url?: string;
  date: Date;
  reliability: number; // 0-1
}

export interface DiplomaticNetwork {
  id: string;
  name: string;
  type: 'FORMAL' | 'INFORMAL' | 'PROFESSIONAL' | 'ALUMNI' | 'REGIONAL' | 'THEMATIC';
  members: NetworkMember[];
  formed?: Date;
  purpose: string;
  activities: string[];
  influence: number; // 0-100
  cohesion: number; // 0-100
}

export interface NetworkMember {
  diplomatId: string;
  name: string;
  country: string;
  rank: DiplomaticRank;
  role: 'LEADER' | 'CORE' | 'ACTIVE' | 'PERIPHERAL';
  joinedDate: Date;
  contributions: string[];
}

export interface Embassy {
  id: string;
  country: string; // Country that owns the embassy
  hostCountry: string; // Country where embassy is located
  location: Location;
  established: Date;

  // Leadership
  headOfMission: string; // Diplomat ID
  deputyHeadOfMission?: string;
  staff: EmbassyStaff;

  // Structure
  departments: Department[];
  size: 'SMALL' | 'MEDIUM' | 'LARGE' | 'VERY_LARGE';
  budget?: number;

  // Operations
  functions: string[];
  priorities: string[];
  activities: Activity[];

  // Performance
  effectiveness: number; // 0-100
  bilateralRelationshipQuality: number; // 0-100

  // Facilities
  compounds?: number;
  consularPosts?: ConsularPost[];

  lastUpdated: Date;
}

export interface EmbassyStaff {
  totalStaff: number;
  diplomaticStaff: number;
  administrativeStaff: number;
  localStaff: number;

  byRank: {
    rank: DiplomaticRank;
    count: number;
  }[];

  bySpecialization: {
    area: SpecializationArea;
    count: number;
  }[];

  turnoverRate?: number; // Annual percentage
}

export interface Department {
  name: string;
  head: string; // Diplomat ID
  staff: number;
  focus: string[];
  budget?: number;
  keyProjects?: string[];
}

export interface Activity {
  id: string;
  type: 'DIPLOMATIC_ENGAGEMENT' | 'TRADE_PROMOTION' | 'CULTURAL_EVENT' | 'CONSULAR_SERVICE' | 'PUBLIC_DIPLOMACY';
  description: string;
  date: Date;
  participants?: number;
  outcome?: string;
  effectiveness: number; // 0-100
}

export interface ConsularPost {
  id: string;
  type: 'CONSULATE_GENERAL' | 'CONSULATE' | 'VICE_CONSULATE' | 'CONSULAR_AGENCY';
  location: Location;
  headOfPost: string; // Diplomat ID
  staff: number;
  servicesOffered: string[];
  jurisdiction: string[];
}

export interface DiplomaticCorps {
  hostCountry: string;
  totalAmbassadors: number;
  embassies: string[]; // Embassy IDs
  deanOfCorps?: string; // Diplomat ID

  byRegion: {
    region: string;
    count: number;
  }[];

  byRelationshipQuality: {
    quality: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
    count: number;
  }[];

  averageCredentialingTime?: number; // days
  lastUpdated: Date;
}

export interface CareerPath {
  diplomat: string;
  stages: CareerStage[];
  trajectory: 'ASCENDING' | 'STABLE' | 'DECLINING' | 'LATERAL';
  peakRank: DiplomaticRank;
  peakInfluence: number; // 0-100

  promotionVelocity: number; // Years between promotions
  geographicDiversity: number; // 0-100
  functionalDiversity: number; // 0-100

  futureProspects: {
    likelyNextPosting?: string;
    potentialPeakRank?: DiplomaticRank;
    retirementEstimate?: Date;
    successorCandidates?: string[];
  };
}

export interface CareerStage {
  posting: Posting;
  rank: DiplomaticRank;
  duration: number; // months
  impact: number; // 1-10
  keyAchievements: string[];
  skillsDeveloped: string[];
}

export interface DiplomaticCadre {
  country: string;
  totalDiplomats: number;
  activeOverseas: number;
  activeAtHome: number;

  byRank: {
    rank: DiplomaticRank;
    count: number;
  }[];

  byRegion: {
    region: string;
    count: number;
  }[];

  bySpecialization: {
    area: SpecializationArea;
    count: number;
  }[];

  averageAge?: number;
  averageYearsOfService?: number;
  genderDistribution?: {
    male: number;
    female: number;
    other?: number;
  };

  recruitmentRate?: number; // Per year
  attritionRate?: number; // Percentage
  promotionRate?: number; // Percentage

  trainingPrograms: string[];
  languageCapabilities: {
    language: string;
    speakers: number;
  }[];

  reputation: number; // 0-100
  effectiveness: number; // 0-100
}

export interface AppointmentTracking {
  diplomat: string;
  appointmentDate: Date;
  appointingAuthority: string;
  posting: string;
  confirmationRequired: boolean;
  confirmed: boolean;
  confirmationDate?: Date;

  politicalContext: string;
  significance: number; // 1-10
  controversies?: string[];

  predecessors?: {
    name: string;
    tenure: number; // months
    performance: string;
  }[];

  expectations: string[];
  challenges: string[];
}

export interface RotationPattern {
  country: string;
  averageTourLength: number; // months
  typicalRotationCycle: number; // years

  geographicRotation: {
    region: string;
    frequency: number;
    averageStay: number; // months
  }[];

  rankProgression: {
    fromRank: DiplomaticRank;
    toRank: DiplomaticRank;
    averageTime: number; // years
  }[];

  hardshipPostCompensation: boolean;
  preferredPostings: string[];
  difficultToFillPostings: string[];
}

export interface InfluenceMetrics {
  diplomat: string;
  period: { start: Date; end: Date };

  networkInfluence: number; // 0-100
  mediaInfluence: number; // 0-100
  politicalInfluence: number; // 0-100
  policyInfluence: number; // 0-100

  accessToPowerCenters: number; // 0-100
  thoughtLeadership: number; // 0-100
  negotiatingPower: number; // 0-100

  overallInfluence: number; // 0-100
  trend: 'RISING' | 'STABLE' | 'DECLINING';

  influenceFactors: string[];
  influenceSpheres: string[];
}

export interface PersonnelComparison {
  diplomats: Diplomat[];
  commonBackground?: string[];
  distinctiveFeatures: {
    diplomat: string;
    features: string[];
  }[];
  effectivenessRanking: {
    diplomat: string;
    rank: number;
    score: number;
  }[];
  networkOverlap: {
    diplomat1: string;
    diplomat2: string;
    sharedContacts: number;
    overlapPercentage: number;
  }[];
}
