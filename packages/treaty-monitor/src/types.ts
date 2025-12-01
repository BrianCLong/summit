/**
 * Treaty and Agreement Monitoring Types
 * Comprehensive tracking of international treaties, agreements, and legal instruments
 */

export enum TreatyType {
  BILATERAL_TREATY = 'BILATERAL_TREATY',
  MULTILATERAL_TREATY = 'MULTILATERAL_TREATY',
  FRAMEWORK_AGREEMENT = 'FRAMEWORK_AGREEMENT',
  PROTOCOL = 'PROTOCOL',
  CONVENTION = 'CONVENTION',
  MEMORANDUM_OF_UNDERSTANDING = 'MEMORANDUM_OF_UNDERSTANDING',
  EXECUTIVE_AGREEMENT = 'EXECUTIVE_AGREEMENT',
  EXCHANGE_OF_NOTES = 'EXCHANGE_OF_NOTES',
  JOINT_DECLARATION = 'JOINT_DECLARATION',
  TREATY_AMENDMENT = 'TREATY_AMENDMENT',
  SUPPLEMENTARY_AGREEMENT = 'SUPPLEMENTARY_AGREEMENT',
  CONCORDAT = 'CONCORDAT',
  CHARTER = 'CHARTER',
  STATUTE = 'STATUTE',
  COVENANT = 'COVENANT'
}

export enum TreatyStatus {
  PROPOSED = 'PROPOSED',
  UNDER_NEGOTIATION = 'UNDER_NEGOTIATION',
  NEGOTIATION_COMPLETED = 'NEGOTIATION_COMPLETED',
  SIGNED = 'SIGNED',
  RATIFICATION_PENDING = 'RATIFICATION_PENDING',
  PARTIALLY_RATIFIED = 'PARTIALLY_RATIFIED',
  IN_FORCE = 'IN_FORCE',
  PROVISIONALLY_APPLIED = 'PROVISIONALLY_APPLIED',
  SUSPENDED = 'SUSPENDED',
  TERMINATED = 'TERMINATED',
  WITHDRAWN = 'WITHDRAWN',
  EXPIRED = 'EXPIRED',
  SUPERSEDED = 'SUPERSEDED'
}

export enum TreatyCategory {
  PEACE_AND_SECURITY = 'PEACE_AND_SECURITY',
  ARMS_CONTROL = 'ARMS_CONTROL',
  NUCLEAR_NON_PROLIFERATION = 'NUCLEAR_NON_PROLIFERATION',
  TRADE_AND_COMMERCE = 'TRADE_AND_COMMERCE',
  HUMAN_RIGHTS = 'HUMAN_RIGHTS',
  ENVIRONMENTAL = 'ENVIRONMENTAL',
  CLIMATE = 'CLIMATE',
  MARITIME = 'MARITIME',
  AVIATION = 'AVIATION',
  SPACE = 'SPACE',
  TELECOMMUNICATIONS = 'TELECOMMUNICATIONS',
  CULTURAL = 'CULTURAL',
  EXTRADITION = 'EXTRADITION',
  MUTUAL_LEGAL_ASSISTANCE = 'MUTUAL_LEGAL_ASSISTANCE',
  TAXATION = 'TAXATION',
  INVESTMENT = 'INVESTMENT',
  INTELLECTUAL_PROPERTY = 'INTELLECTUAL_PROPERTY',
  LABOR = 'LABOR',
  HEALTH = 'HEALTH',
  EDUCATION = 'EDUCATION',
  REFUGEE = 'REFUGEE',
  TERRITORIAL = 'TERRITORIAL',
  BOUNDARY = 'BOUNDARY'
}

export interface Treaty {
  id: string;
  title: string;
  officialTitle: string;
  shortTitle?: string;
  type: TreatyType;
  category: TreatyCategory[];
  status: TreatyStatus;

  // Parties
  signatories: Signatory[];
  parties: Party[];
  depositary?: string; // Country or organization holding the treaty
  openForAccession: boolean;

  // Dates
  negotiationStartDate?: Date;
  signedDate?: Date;
  entryIntoForceDate?: Date;
  expiryDate?: Date;
  terminationDate?: Date;

  // Content
  preamble?: string;
  articles: Article[];
  annexes?: Annex[];
  protocols?: Protocol[];
  fullText?: string;
  languages: string[];
  authenticTexts: string[]; // Official language versions

  // Legal framework
  legalBasis?: string;
  parentTreaty?: string; // For protocols and amendments
  relatedTreaties?: string[];
  supersedes?: string[];
  supersededBy?: string;

  // Obligations
  keyObligations: Obligation[];
  timeline?: Timeline[];
  benchmarks?: Benchmark[];

  // Reservations and declarations
  reservations: Reservation[];
  declarations: Declaration[];
  understandings: Understanding[];

  // Implementation
  implementationStatus: ImplementationStatus;
  complianceRecords: ComplianceRecord[];
  disputes?: Dispute[];

  // Monitoring
  monitoringMechanism?: MonitoringMechanism;
  reportingRequirements?: ReportingRequirement[];
  verificationMeasures?: VerificationMeasure[];

  // Amendment and review
  amendmentProcedure?: string;
  reviewConferences?: ReviewConference[];
  amendments?: Amendment[];

  // Termination
  withdrawalProcedure?: string;
  withdrawals?: Withdrawal[];
  suspensions?: Suspension[];

  // Metadata
  registrationNumber?: string; // UN Treaty Series number
  depositaryNotifications?: DepositaryNotification[];
  significance: number; // 1-10 scale
  geopoliticalImpact: number; // 1-10 scale

  createdAt: Date;
  updatedAt: Date;
  sources: Source[];
  tags?: string[];
}

export interface Signatory {
  country?: string;
  organization?: string;
  signatory: string; // Name of person who signed
  title: string;
  signatureDate: Date;
  location: string;
  reservations?: string[];
  pending: boolean; // Signed but not ratified
}

export interface Party {
  country?: string;
  organization?: string;
  ratificationDate?: Date;
  accessionDate?: Date;
  successionDate?: Date;
  effectiveDate: Date;
  depositDate?: Date;
  status: 'ACTIVE' | 'WITHDRAWN' | 'SUSPENDED' | 'TERMINATED';
  reservations?: string[];
  declarations?: string[];
}

export interface Article {
  number: string;
  title?: string;
  text: string;
  interpretation?: string;
  keyProvisions?: string[];
  obligations?: string[];
  rights?: string[];
}

export interface Annex {
  id: string;
  title: string;
  description: string;
  content?: string;
  technicalDetails?: any;
}

export interface Protocol {
  id: string;
  title: string;
  type: 'OPTIONAL_PROTOCOL' | 'ADDITIONAL_PROTOCOL' | 'AMENDING_PROTOCOL';
  status: TreatyStatus;
  signedDate?: Date;
  entryIntoForceDate?: Date;
  parties: Party[];
  provisions: string[];
}

export interface Obligation {
  id: string;
  article: string;
  description: string;
  parties: string[]; // Which parties this applies to
  deadline?: Date;
  recurring: boolean;
  frequency?: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE' | 'VIOLATED';
  verifiable: boolean;
}

export interface Timeline {
  date: Date;
  milestone: string;
  description: string;
  mandatory: boolean;
  completed: boolean;
}

export interface Benchmark {
  id: string;
  description: string;
  metrics: string[];
  targetDate?: Date;
  achieved: boolean;
  achievementDate?: Date;
}

export interface Reservation {
  country: string;
  article: string;
  text: string;
  date: Date;
  status: 'ACTIVE' | 'WITHDRAWN' | 'OBJECTED';
  objections?: {
    country: string;
    objectionText: string;
    date: Date;
  }[];
}

export interface Declaration {
  country: string;
  type: 'INTERPRETIVE' | 'POLICY' | 'UNDERSTANDING';
  text: string;
  date: Date;
  articles?: string[];
}

export interface Understanding {
  country: string;
  article: string;
  interpretation: string;
  date: Date;
}

export interface ImplementationStatus {
  overallProgress: number; // 0-100
  domesticLegislation: {
    required: boolean;
    enacted: boolean;
    legislationName?: string;
    enactmentDate?: Date;
  }[];
  institutionalFramework: {
    established: boolean;
    agencies?: string[];
  };
  budgetAllocated: boolean;
  personnelTrained: boolean;
  publicAwareness: number; // 0-100
  lastReviewDate?: Date;
}

export interface ComplianceRecord {
  id: string;
  party: string;
  period: {
    start: Date;
    end: Date;
  };
  overallCompliance: number; // 0-100
  articleCompliance: {
    article: string;
    compliant: boolean;
    partialCompliance?: number;
    notes?: string;
  }[];
  violations?: Violation[];
  report?: string;
  assessmentDate: Date;
}

export interface Violation {
  id: string;
  party: string;
  article: string;
  description: string;
  severity: 'MINOR' | 'MODERATE' | 'SERIOUS' | 'GRAVE';
  date: Date;
  reportedBy: string;
  status: 'ALLEGED' | 'UNDER_INVESTIGATION' | 'CONFIRMED' | 'RESOLVED' | 'DISPUTED';
  remedialAction?: string;
}

export interface Dispute {
  id: string;
  parties: string[];
  subject: string;
  description: string;
  article: string;
  filedDate: Date;
  disputeResolutionMechanism: 'NEGOTIATION' | 'MEDIATION' | 'ARBITRATION' | 'ICJ' | 'OTHER';
  status: 'PENDING' | 'IN_PROGRESS' | 'RESOLVED' | 'ABANDONED';
  resolution?: {
    date: Date;
    mechanism: string;
    outcome: string;
    binding: boolean;
  };
}

export interface MonitoringMechanism {
  type: 'COMMITTEE' | 'SECRETARIAT' | 'CONFERENCE_OF_PARTIES' | 'EXPERT_BODY' | 'PEER_REVIEW';
  name: string;
  composition?: string[];
  mandate: string;
  meetingFrequency?: string;
  reports?: Report[];
}

export interface ReportingRequirement {
  id: string;
  description: string;
  frequency: string;
  dueDate?: Date;
  parties: string[];
  format?: string;
  submittedReports?: {
    party: string;
    date: Date;
    reportUrl?: string;
  }[];
}

export interface VerificationMeasure {
  type: 'INSPECTION' | 'MONITORING' | 'SATELLITE' | 'DATA_EXCHANGE' | 'ON_SITE_VISIT';
  description: string;
  frequency?: string;
  responsible: string;
  lastVerification?: Date;
}

export interface ReviewConference {
  id: string;
  date: Date;
  location: string;
  participants: string[];
  agenda: string[];
  outcomes: string[];
  documents?: string[];
  nextConferenceDate?: Date;
}

export interface Amendment {
  id: string;
  title: string;
  proposedBy: string[];
  proposalDate: Date;
  description: string;
  articles: string[]; // Articles being amended
  status: 'PROPOSED' | 'UNDER_CONSIDERATION' | 'ADOPTED' | 'REJECTED' | 'IN_FORCE';
  adoptionDate?: Date;
  entryIntoForceDate?: Date;
  parties: Party[];
}

export interface Withdrawal {
  country: string;
  notificationDate: Date;
  effectiveDate: Date;
  reason?: string;
  statement?: string;
  reactions?: {
    country: string;
    reaction: string;
    date: Date;
  }[];
}

export interface Suspension {
  party: string;
  suspendedBy?: string; // If suspended by other parties
  date: Date;
  reason: string;
  articles?: string[]; // Specific articles suspended
  duration?: number; // days, if temporary
  lifted?: Date;
}

export interface DepositaryNotification {
  id: string;
  type: 'SIGNATURE' | 'RATIFICATION' | 'ACCESSION' | 'RESERVATION' | 'WITHDRAWAL' | 'AMENDMENT';
  date: Date;
  party: string;
  content: string;
  documentUrl?: string;
}

export interface Source {
  type: 'OFFICIAL_TEXT' | 'DEPOSITARY' | 'GOVERNMENT' | 'INTERNATIONAL_ORG' | 'MEDIA' | 'ACADEMIC';
  name: string;
  url?: string;
  date: Date;
  reliability: number; // 0-1
}

export interface Report {
  id: string;
  title: string;
  date: Date;
  reportType: 'COMPLIANCE' | 'IMPLEMENTATION' | 'REVIEW' | 'TECHNICAL' | 'SPECIAL';
  summary: string;
  findings?: string[];
  recommendations?: string[];
  url?: string;
}

export interface NegotiationProgress {
  treatyId: string;
  round: number;
  date: Date;
  participants: string[];
  topics: string[];
  progress: {
    topic: string;
    status: 'NOT_STARTED' | 'UNDER_DISCUSSION' | 'CONSENSUS_EMERGING' | 'AGREED' | 'DEADLOCKED';
    summary: string;
  }[];
  nextRound?: Date;
  overallProgress: number; // 0-100
}
