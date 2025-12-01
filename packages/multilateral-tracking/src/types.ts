/**
 * Multilateral Organization Tracking Types
 * Comprehensive types for tracking UN, regional organizations, and international institutions
 */

export enum OrganizationType {
  UN_SYSTEM = 'UN_SYSTEM',
  REGIONAL_ORGANIZATION = 'REGIONAL_ORGANIZATION',
  SECURITY_ALLIANCE = 'SECURITY_ALLIANCE',
  ECONOMIC_BLOC = 'ECONOMIC_BLOC',
  DEVELOPMENT_BANK = 'DEVELOPMENT_BANK',
  SPECIALIZED_AGENCY = 'SPECIALIZED_AGENCY',
  INTERGOVERNMENTAL = 'INTERGOVERNMENTAL',
  TREATY_ORGANIZATION = 'TREATY_ORGANIZATION',
  FORUM = 'FORUM',
  COUNCIL = 'COUNCIL'
}

export enum MembershipStatus {
  FULL_MEMBER = 'FULL_MEMBER',
  ASSOCIATE_MEMBER = 'ASSOCIATE_MEMBER',
  OBSERVER = 'OBSERVER',
  DIALOGUE_PARTNER = 'DIALOGUE_PARTNER',
  CANDIDATE = 'CANDIDATE',
  SUSPENDED = 'SUSPENDED',
  FORMER_MEMBER = 'FORMER_MEMBER',
  APPLICANT = 'APPLICANT'
}

export enum VotingPower {
  VETO_POWER = 'VETO_POWER',
  WEIGHTED_VOTE = 'WEIGHTED_VOTE',
  EQUAL_VOTE = 'EQUAL_VOTE',
  NO_VOTE = 'NO_VOTE',
  QUALIFIED_MAJORITY = 'QUALIFIED_MAJORITY',
  CONSENSUS_REQUIRED = 'CONSENSUS_REQUIRED'
}

export interface MultilateralOrganization {
  id: string;
  name: string;
  acronym: string;
  type: OrganizationType;
  founded: Date;
  headquarters: Location;

  // Membership
  members: Member[];
  memberCount: number;
  expansionStatus: 'OPEN' | 'RESTRICTED' | 'CLOSED' | 'SELECTIVE';

  // Structure
  governanceStructure: GovernanceStructure;
  secretariat?: Secretariat;
  principalOrgans: PrincipalOrgan[];
  subsidiaryBodies: SubsidiaryBody[];

  // Operations
  mandate: string;
  objectives: string[];
  activities: Activity[];
  programs: Program[];
  budget?: Budget;
  funding: FundingSource[];

  // Decision making
  decisionMakingProcess: DecisionMakingProcess;
  votingRules: VotingRules;
  consensusMechanisms?: string[];

  // Engagement
  meetings: Meeting[];
  summits: Summit[];
  resolutions: Resolution[];
  declarations: Declaration[];

  // Relationships
  parentOrganization?: string;
  affiliatedOrganizations: string[];
  partnerOrganizations: string[];
  competingOrganizations: string[];

  // Performance
  effectiveness: number; // 0-100
  influence: number; // 0-100
  cohesion: number; // 0-100
  activity Level: 'VERY_HIGH' | 'HIGH' | 'MODERATE' | 'LOW' | 'DORMANT';

  // Analysis
  keyIssues: string[];
  currentChallenges: string[];
  successStories: string[];
  reformProposals?: Reform[];

  // Metadata
  website?: string;
  lastUpdated: Date;
  sources: Source[];
}

export interface Location {
  city: string;
  country: string;
  region?: string;
  significance?: string;
}

export interface Member {
  country: string;
  status: MembershipStatus;
  joinedDate: Date;
  leftDate?: Date;
  suspendedDate?: Date;
  votingPower: VotingPower;
  votingWeight?: number;
  contributions?: Contribution[];
  representation: Representation[];
  activeParticipation: number; // 0-100
  influence: number; // 0-100
  leadership: LeadershipPosition[];
  priorities: string[];
  blocAffiliation?: string[];
}

export interface Contribution {
  type: 'FINANCIAL' | 'IN_KIND' | 'PERSONNEL' | 'TECHNICAL';
  amount?: number;
  currency?: string;
  description?: string;
  year: number;
  percentage?: number; // Percentage of total budget
}

export interface Representation {
  role: string;
  name: string;
  title: string;
  since: Date;
  until?: Date;
  level: 'AMBASSADOR' | 'PERMANENT_REPRESENTATIVE' | 'DELEGATE' | 'OBSERVER';
}

export interface LeadershipPosition {
  position: string;
  organization: string;
  since: Date;
  until?: Date;
  significance: number; // 1-10
}

export interface GovernanceStructure {
  type: 'DEMOCRATIC' | 'CONSENSUS' | 'HIERARCHICAL' | 'WEIGHTED' | 'HYBRID';
  decisionMakingBody: string;
  executiveBody: string;
  administrativeBody?: string;
  rotatingPresidency: boolean;
  presidencyTerm?: string;
  currentPresident?: string;
  currentChair?: string;
}

export interface Secretariat {
  name: string;
  location: Location;
  secretaryGeneral: {
    name: string;
    country: string;
    since: Date;
    until?: Date;
    termLength: number;
  };
  staff: {
    total: number;
    professional: number;
    support: number;
    byNationality?: Record<string, number>;
  };
  departments: Department[];
}

export interface Department {
  name: string;
  head: string;
  mandate: string;
  staff: number;
  budget?: number;
}

export interface PrincipalOrgan {
  name: string;
  type: 'ASSEMBLY' | 'COUNCIL' | 'COURT' | 'COMMISSION' | 'COMMITTEE';
  composition: string;
  members: number;
  meetingFrequency: string;
  powers: string[];
  currentPriorities: string[];
}

export interface SubsidiaryBody {
  name: string;
  type: string;
  parentOrgan: string;
  mandate: string;
  established: Date;
  members?: string[];
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'TERMINATED';
}

export interface Activity {
  id: string;
  type: 'PEACEKEEPING' | 'HUMANITARIAN' | 'DEVELOPMENT' | 'MONITORING' | 'MEDIATION' | 'CAPACITY_BUILDING';
  name: string;
  description: string;
  location?: string;
  startDate: Date;
  endDate?: Date;
  status: 'PLANNED' | 'ACTIVE' | 'SUSPENDED' | 'COMPLETED' | 'FAILED';
  budget?: number;
  personnel?: number;
  participants: string[];
  outcomes?: string[];
  effectiveness: number; // 0-100
}

export interface Program {
  id: string;
  name: string;
  objective: string;
  thematicArea: string;
  startDate: Date;
  endDate?: Date;
  budget: number;
  beneficiaries: string[];
  implementingAgencies: string[];
  progress: number; // 0-100
  impact: string;
}

export interface Budget {
  totalAmount: number;
  currency: string;
  fiscalYear: number;
  breakdown: {
    category: string;
    amount: number;
    percentage: number;
  }[];
  topContributors: {
    country: string;
    amount: number;
    percentage: number;
  }[];
}

export interface FundingSource {
  type: 'ASSESSED_CONTRIBUTIONS' | 'VOLUNTARY_CONTRIBUTIONS' | 'GRANTS' | 'LOANS' | 'PRIVATE' | 'OTHER';
  amount: number;
  percentage: number;
  conditions?: string[];
}

export interface DecisionMakingProcess {
  type: 'VOTING' | 'CONSENSUS' | 'HYBRID';
  votingThreshold?: string;
  vetoExists: boolean;
  vetoHolders?: string[];
  quorumRequirement?: string;
  amendmentProcedure?: string;
  appealMechanism?: string;
}

export interface VotingRules {
  type: 'SIMPLE_MAJORITY' | 'TWO_THIRDS' | 'QUALIFIED_MAJORITY' | 'UNANIMITY' | 'CONSENSUS';
  weightingSystem?: 'EQUAL' | 'POPULATION' | 'CONTRIBUTION' | 'MIXED';
  abstentionRules: string;
  procedureForDisputes: string;
}

export interface Meeting {
  id: string;
  organ: string;
  sessionNumber?: number;
  date: Date;
  location: Location;
  duration: number; // days
  attendees: string[];
  agenda: AgendaItem[];
  outcomes: Outcome[];
  documents: Document[];
  significance: number; // 1-10
}

export interface Summit {
  id: string;
  name: string;
  edition?: number;
  date: Date;
  location: Location;
  theme: string;
  participants: Participant[];
  outcomes: Outcome[];
  declarations?: Declaration[];
  sideEvents?: string[];
  mediaAttention: 'VERY_HIGH' | 'HIGH' | 'MODERATE' | 'LOW';
  significance: number; // 1-10
}

export interface Participant {
  country: string;
  name: string;
  title: string;
  level: 'HEAD_OF_STATE' | 'HEAD_OF_GOVERNMENT' | 'MINISTER' | 'SENIOR_OFFICIAL' | 'DELEGATE';
  role?: string;
}

export interface AgendaItem {
  number: string;
  title: string;
  description: string;
  proposedBy: string[];
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'PENDING' | 'DISCUSSED' | 'ADOPTED' | 'DEFERRED' | 'REJECTED';
  outcome?: string;
}

export interface Outcome {
  type: 'RESOLUTION' | 'DECISION' | 'DECLARATION' | 'COMMUNIQUE' | 'AGREEMENT' | 'STATEMENT';
  title: string;
  number?: string;
  adoptedDate: Date;
  votingRecord?: VotingRecord;
  content: string;
  significance: number; // 1-10
  implementation: ImplementationStatus;
}

export interface VotingRecord {
  inFavor: string[];
  against: string[];
  abstained: string[];
  absent?: string[];
  consensusAchieved: boolean;
  vetoExercised?: string[];
}

export interface ImplementationStatus {
  status: 'NOT_STARTED' | 'INITIATED' | 'IN_PROGRESS' | 'COMPLETED' | 'STALLED' | 'ABANDONED';
  progress: number; // 0-100
  compliance: {
    country: string;
    level: 'FULL' | 'PARTIAL' | 'MINIMAL' | 'NON_COMPLIANT';
    actions: string[];
  }[];
  obstacles?: string[];
  deadline?: Date;
}

export interface Resolution {
  id: string;
  number: string;
  title: string;
  adoptedDate: Date;
  organ: string;
  sponsors: string[];
  subject: string;
  operativeParagraphs: string[];
  votingRecord: VotingRecord;
  bindingForce: 'BINDING' | 'RECOMMENDATORY' | 'DECLARATORY';
  implementation: ImplementationStatus;
  relatedResolutions?: string[];
}

export interface Declaration {
  id: string;
  title: string;
  adoptedDate: Date;
  occasion: string;
  signatories: string[];
  content: string;
  keyPrinciples: string[];
  commitments: string[];
  significance: number; // 1-10
}

export interface Document {
  id: string;
  symbol: string;
  title: string;
  type: 'REPORT' | 'RESOLUTION' | 'DECISION' | 'LETTER' | 'NOTE' | 'WORKING_PAPER';
  date: Date;
  language: string[];
  url?: string;
  summary?: string;
}

export interface Reform {
  id: string;
  title: string;
  proposedBy: string[];
  proposedDate: Date;
  objective: string;
  description: string;
  scope: 'STRUCTURAL' | 'PROCEDURAL' | 'FINANCIAL' | 'MANDATE' | 'COMPREHENSIVE';
  support: {
    countries: string[];
    percentage: number;
  };
  opposition: {
    countries: string[];
    reasons: string[];
  };
  status: 'PROPOSED' | 'UNDER_DISCUSSION' | 'NEGOTIATING' | 'ADOPTED' | 'REJECTED' | 'STALLED';
  implementation?: {
    startDate?: Date;
    progress: number;
    challenges: string[];
  };
}

export interface Source {
  type: 'OFFICIAL' | 'MEDIA' | 'ACADEMIC' | 'NGO' | 'GOVERNMENT';
  name: string;
  url?: string;
  date: Date;
  reliability: number; // 0-1
}

export interface VotingPattern {
  country: string;
  organization: string;
  totalVotes: number;
  votingAlignment: {
    withCountry: string;
    agreementRate: number; // 0-100
  }[];
  keyPositions: {
    issue: string;
    position: 'FOR' | 'AGAINST' | 'ABSTAIN';
    frequency: number;
  }[];
  blocVoting?: {
    bloc: string;
    coherence: number; // 0-100
  };
}

export interface PowerDynamics {
  organization: string;
  dominantActors: {
    country: string;
    influence: number; // 0-100
    mechanisms: string[];
  }[];
  coalitions: Coalition[];
  competingBlocs: {
    name: string;
    members: string[];
    objectives: string[];
  }[];
  balanceOfPower: {
    type: 'UNIPOLAR' | 'BIPOLAR' | 'MULTIPOLAR' | 'BALANCED';
    description: string;
  };
}

export interface Coalition {
  id: string;
  name: string;
  members: string[];
  formed: Date;
  dissolved?: Date;
  purpose: string;
  cohesion: number; // 0-100
  effectiveness: number; // 0-100
  achievements: string[];
  challenges: string[];
}

export interface OrganizationComparison {
  organizations: MultilateralOrganization[];
  membershipOverlap: {
    org1: string;
    org2: string;
    sharedMembers: string[];
    overlapPercentage: number;
  }[];
  functionalOverlap: {
    domain: string;
    organizations: string[];
    cooperation: 'HIGH' | 'MEDIUM' | 'LOW';
    competition: 'HIGH' | 'MEDIUM' | 'LOW';
  }[];
  effectivenessRanking: {
    organization: string;
    score: number;
    ranking: number;
  }[];
}
