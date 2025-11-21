/**
 * Foreign Fighters Types
 * Types for tracking foreign fighters and returnees
 */

export interface ForeignFighter {
  id: string;
  personalInfo: PersonalInfo;
  status: FighterStatus;
  journey: Journey;
  combatExperience: CombatExperience;
  affiliations: string[];
  threatLevel: ThreatLevel;
  monitoring: MonitoringStatus;
  lastUpdated: Date;
}

export interface PersonalInfo {
  name: string;
  aliases: string[];
  nationality: string;
  dateOfBirth?: Date;
  gender?: string;
  languages: string[];
  skills: string[];
  background: string;
}

export enum FighterStatus {
  TRAVELING = 'TRAVELING',
  IN_CONFLICT_ZONE = 'IN_CONFLICT_ZONE',
  RETURNED = 'RETURNED',
  DETAINED = 'DETAINED',
  DECEASED = 'DECEASED',
  UNKNOWN = 'UNKNOWN'
}

export interface Journey {
  departure: TravelLeg;
  conflictZoneEntry?: TravelLeg;
  conflictZoneExit?: TravelLeg;
  return?: TravelLeg;
  facilitators: string[];
  network: string;
  route: string[];
}

export interface TravelLeg {
  date: Date;
  location: string;
  method: string;
  documents: TravelDocument[];
  detected: boolean;
}

export interface TravelDocument {
  type: 'PASSPORT' | 'ID' | 'VISA' | 'FRAUDULENT' | 'STOLEN';
  number?: string;
  country: string;
  authentic: boolean;
}

export interface CombatExperience {
  conflictZone: string;
  organization: string;
  role: string;
  duration?: number; // days
  training: TrainingReceived[];
  operations: OperationParticipation[];
  specializations: string[];
  rank?: string;
}

export interface TrainingReceived {
  type: string;
  location?: string;
  duration?: number;
  instructor?: string;
  skills: string[];
  date?: Date;
}

export interface OperationParticipation {
  type: string;
  date: Date;
  location?: string;
  role: string;
  outcome?: string;
}

export enum ThreatLevel {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
  MINIMAL = 'MINIMAL'
}

export interface MonitoringStatus {
  active: boolean;
  methods: string[];
  lastContact?: Date;
  location?: string;
  restrictions: string[];
  agencies: string[];
}

export interface ReturneeProfile {
  fighterId: string;
  returnDate: Date;
  returnReason: ReturnReason;
  debrief: Debrief;
  reintegration: ReintegrationProgram;
  riskAssessment: ReturneeRiskAssessment;
  monitoring: MonitoringStatus;
}

export enum ReturnReason {
  DISILLUSIONMENT = 'DISILLUSIONMENT',
  INJURY = 'INJURY',
  FAMILY = 'FAMILY',
  DEPORTATION = 'DEPORTATION',
  MISSION = 'MISSION',
  CONFLICT_END = 'CONFLICT_END',
  UNKNOWN = 'UNKNOWN'
}

export interface Debrief {
  conducted: boolean;
  date?: Date;
  agency?: string;
  intelligence: IntelligenceGathered[];
  cooperation: 'FULL' | 'PARTIAL' | 'MINIMAL' | 'NONE';
}

export interface IntelligenceGathered {
  category: string;
  description: string;
  value: 'HIGH' | 'MEDIUM' | 'LOW';
  verified: boolean;
}

export interface ReintegrationProgram {
  enrolled: boolean;
  program?: string;
  startDate?: Date;
  components: ProgramComponent[];
  progress: 'SUCCESSFUL' | 'ONGOING' | 'STRUGGLING' | 'FAILED';
}

export interface ProgramComponent {
  type: 'DERADICALIZATION' | 'VOCATIONAL' | 'EDUCATION' | 'COUNSELING' | 'COMMUNITY';
  status: 'COMPLETED' | 'IN_PROGRESS' | 'NOT_STARTED';
  provider: string;
}

export interface ReturneeRiskAssessment {
  overallRisk: number;
  ideologicalCommitment: number;
  violentIntent: number;
  capability: number;
  network: number;
  factors: RiskFactor[];
  assessmentDate: Date;
  nextReview?: Date;
}

export interface RiskFactor {
  category: string;
  description: string;
  score: number;
  mitigating: boolean;
}

export interface FighterNetwork {
  id: string;
  name?: string;
  members: string[];
  facilitators: Facilitator[];
  routes: TravelRoute[];
  active: boolean;
  identified: Date;
}

export interface Facilitator {
  id: string;
  name?: string;
  role: string;
  location?: string;
  fighters: string[];
  active: boolean;
}

export interface TravelRoute {
  id: string;
  origin: string;
  destination: string;
  waypoints: string[];
  frequency: 'HIGH' | 'MEDIUM' | 'LOW';
  lastUsed?: Date;
  detected: boolean;
}

export interface VeteranFighterNetwork {
  members: string[];
  cohesion: number;
  activities: string[];
  threatLevel: ThreatLevel;
  monitoring: boolean;
}

export interface SkillsTransfer {
  fromFighter: string;
  toIndividuals: string[];
  skills: string[];
  context: string;
  date: Date;
  detected: boolean;
}

export interface TrackingQuery {
  status?: FighterStatus[];
  nationalities?: string[];
  threatLevels?: ThreatLevel[];
  conflictZones?: string[];
  returnees?: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface TrackingResult {
  fighters: ForeignFighter[];
  totalCount: number;
  networks: FighterNetwork[];
  returnees: ReturneeProfile[];
  trends: FighterTrend[];
}

export interface FighterTrend {
  type: string;
  direction: 'INCREASING' | 'DECREASING' | 'STABLE';
  magnitude: number;
  period: string;
  description: string;
}

export interface BorderAlert {
  fighterId: string;
  type: 'DEPARTURE' | 'ENTRY' | 'TRANSIT';
  location: string;
  date: Date;
  detected: boolean;
  action: 'ALLOWED' | 'DETAINED' | 'REFUSED_ENTRY' | 'MONITORING';
  agencies: string[];
}
