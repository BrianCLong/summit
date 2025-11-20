/**
 * Diplomatic Event Types and Tracking
 * Comprehensive types for tracking diplomatic activities, state visits, and international engagements
 */

export enum DiplomaticEventType {
  STATE_VISIT = 'STATE_VISIT',
  OFFICIAL_VISIT = 'OFFICIAL_VISIT',
  WORKING_VISIT = 'WORKING_VISIT',
  SUMMIT = 'SUMMIT',
  CONFERENCE = 'CONFERENCE',
  BILATERAL_MEETING = 'BILATERAL_MEETING',
  MULTILATERAL_MEETING = 'MULTILATERAL_MEETING',
  NEGOTIATION_SESSION = 'NEGOTIATION_SESSION',
  TREATY_SIGNING = 'TREATY_SIGNING',
  DIPLOMATIC_APPOINTMENT = 'DIPLOMATIC_APPOINTMENT',
  EMBASSY_EVENT = 'EMBASSY_EVENT',
  CONSULATE_EVENT = 'CONSULATE_EVENT',
  PROTOCOL_EVENT = 'PROTOCOL_EVENT',
  CULTURAL_DIPLOMACY = 'CULTURAL_DIPLOMACY',
  PUBLIC_DIPLOMACY = 'PUBLIC_DIPLOMACY',
  TRACK_TWO_DIPLOMACY = 'TRACK_TWO_DIPLOMACY',
  BACKCHANNEL_COMMUNICATION = 'BACKCHANNEL_COMMUNICATION',
  DIPLOMATIC_RECEPTION = 'DIPLOMATIC_RECEPTION',
  CREDENTIALS_PRESENTATION = 'CREDENTIALS_PRESENTATION',
  RECALL_OR_EXPULSION = 'RECALL_OR_EXPULSION'
}

export enum EventStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  POSTPONED = 'POSTPONED',
  RUMORED = 'RUMORED',
  CONFIRMED = 'CONFIRMED'
}

export enum DiplomaticLevel {
  HEAD_OF_STATE = 'HEAD_OF_STATE',
  HEAD_OF_GOVERNMENT = 'HEAD_OF_GOVERNMENT',
  FOREIGN_MINISTER = 'FOREIGN_MINISTER',
  MINISTER = 'MINISTER',
  AMBASSADOR = 'AMBASSADOR',
  DEPUTY_MINISTER = 'DEPUTY_MINISTER',
  SPECIAL_ENVOY = 'SPECIAL_ENVOY',
  DIRECTOR_GENERAL = 'DIRECTOR_GENERAL',
  SENIOR_OFFICIAL = 'SENIOR_OFFICIAL',
  WORKING_LEVEL = 'WORKING_LEVEL',
  NON_GOVERNMENTAL = 'NON_GOVERNMENTAL'
}

export interface Participant {
  id: string;
  name: string;
  title: string;
  country: string;
  organization?: string;
  level: DiplomaticLevel;
  role: string;
  delegation?: string[];
}

export interface Location {
  city: string;
  country: string;
  venue?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  significance?: string;
}

export interface DiplomaticEvent {
  id: string;
  type: DiplomaticEventType;
  title: string;
  description: string;
  status: EventStatus;

  // Timing
  scheduledStartDate: Date;
  scheduledEndDate?: Date;
  actualStartDate?: Date;
  actualEndDate?: Date;
  duration?: number; // in hours

  // Participants
  participants: Participant[];
  hostCountry: string;
  guestCountries: string[];
  organizations?: string[];

  // Location
  location: Location;

  // Context
  agenda?: string[];
  topics?: string[];
  expectedOutcomes?: string[];
  actualOutcomes?: string[];
  significance: number; // 1-10 scale
  confidentialityLevel: 'PUBLIC' | 'RESTRICTED' | 'CONFIDENTIAL' | 'SECRET';

  // Protocol details
  protocolNotes?: string[];
  culturalConsiderations?: string[];
  securityLevel?: string;
  mediaAccess?: 'OPEN' | 'POOL' | 'CLOSED' | 'EMBARGOED';

  // Relationships
  relatedEvents?: string[]; // Event IDs
  relatedTreaties?: string[]; // Treaty IDs
  relatedNegotiations?: string[]; // Negotiation IDs

  // Analysis
  backgroundContext?: string;
  historicalSignificance?: string;
  politicalImplications?: string[];
  economicImplications?: string[];
  securityImplications?: string[];

  // Documentation
  officialStatements?: Statement[];
  mediaReports?: MediaReport[];
  photos?: string[];
  videos?: string[];
  documents?: Document[];

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  sources: Source[];
  confidence: number; // 0-1 scale
  verified: boolean;
  tags?: string[];
}

export interface Statement {
  id: string;
  eventId: string;
  speaker: string;
  speakerTitle: string;
  speakerCountry: string;
  statementType: 'SPEECH' | 'PRESS_RELEASE' | 'JOINT_STATEMENT' | 'COMMUNIQUE' | 'REMARKS';
  content: string;
  language: string;
  translation?: string;
  timestamp: Date;
  tone?: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | 'CONCILIATORY' | 'FIRM' | 'CONFRONTATIONAL';
  keyPoints?: string[];
  sentiment?: number; // -1 to 1
  audience: string;
  url?: string;
}

export interface MediaReport {
  id: string;
  eventId: string;
  outlet: string;
  country: string;
  headline: string;
  summary: string;
  url: string;
  publishedAt: Date;
  sentiment?: number;
  bias?: string;
  reach?: number;
  credibility?: number;
}

export interface Document {
  id: string;
  eventId: string;
  title: string;
  type: 'AGENDA' | 'MINUTES' | 'MEMORANDUM' | 'AGREEMENT' | 'PROTOCOL' | 'COMMUNIQUE';
  classification: string;
  url?: string;
  summary?: string;
  keyPoints?: string[];
  uploadedAt: Date;
}

export interface Source {
  type: 'OFFICIAL' | 'MEDIA' | 'INTELLIGENCE' | 'DIPLOMATIC_CABLE' | 'SOCIAL_MEDIA' | 'THIRD_PARTY';
  name: string;
  url?: string;
  reliability: number; // 0-1 scale
  timestamp: Date;
}

export interface StateVisit extends DiplomaticEvent {
  type: DiplomaticEventType.STATE_VISIT;
  visitingHead: Participant;
  hostHead: Participant;
  ceremonialEvents: CeremonialEvent[];
  bilateralMeetings: Meeting[];
  jointDocuments?: string[];
  giftsExchanged?: Gift[];
}

export interface CeremonialEvent {
  id: string;
  type: 'ARRIVAL_CEREMONY' | 'STATE_DINNER' | 'WREATH_LAYING' | 'HONOR_GUARD' | 'FAREWELL';
  description: string;
  timestamp: Date;
  participants: string[];
  significance?: string;
}

export interface Meeting {
  id: string;
  type: 'BILATERAL' | 'TRILATERAL' | 'MULTILATERAL' | 'PULL_ASIDE';
  participants: Participant[];
  topics: string[];
  duration: number;
  outcomes?: string[];
  agreementsReached?: string[];
}

export interface Gift {
  from: string;
  to: string;
  description: string;
  symbolicSignificance?: string;
  estimatedValue?: number;
}

export interface SummitEvent extends DiplomaticEvent {
  type: DiplomaticEventType.SUMMIT;
  summitName: string;
  summitSeries?: string; // e.g., "G7", "G20", "ASEAN"
  edition?: number; // e.g., 47th edition
  theme?: string;
  workingGroups?: WorkingGroup[];
  sideEvents?: DiplomaticEvent[];
  communique?: Document;
  declarations?: Document[];
}

export interface WorkingGroup {
  id: string;
  name: string;
  topic: string;
  chair: Participant;
  members: Participant[];
  meetings: Meeting[];
  outputs?: Document[];
}

export interface NegotiationSession {
  id: string;
  sessionNumber: number;
  negotiationId: string;
  date: Date;
  duration: number;
  participants: Participant[];
  topics: string[];
  proposals?: Proposal[];
  progress: 'BREAKTHROUGH' | 'PROGRESS' | 'STALLED' | 'REGRESSION' | 'DEADLOCK';
  nextSession?: Date;
  confidentialityLevel: string;
}

export interface Proposal {
  id: string;
  proposer: string;
  description: string;
  responses: {
    country: string;
    response: 'ACCEPT' | 'REJECT' | 'COUNTER' | 'RESERVE' | 'CONSIDER';
    comments?: string;
  }[];
  status: 'TABLED' | 'UNDER_CONSIDERATION' | 'ACCEPTED' | 'REJECTED' | 'MODIFIED';
}

export interface EmbassyActivity {
  id: string;
  embassyId: string;
  country: string;
  hostCountry: string;
  activityType: 'RECEPTION' | 'NATIONAL_DAY' | 'CONSULAR_SERVICE' | 'CULTURAL_EVENT' | 'BRIEFING' | 'PROTEST_NOTE';
  date: Date;
  description: string;
  participants?: Participant[];
  significance?: number;
  publicVisibility: boolean;
}

export interface BackchannelIndicator {
  id: string;
  countries: string[];
  indicatorType: 'UNOFFICIAL_MEETING' | 'THIRD_PARTY_MEDIATION' | 'PRIVATE_COMMUNICATION' | 'TRACK_TWO';
  date: Date;
  location?: Location;
  participants?: string[]; // Often anonymized
  topic?: string;
  confidence: number;
  sources: Source[];
  context?: string;
}
