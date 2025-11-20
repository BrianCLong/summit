/**
 * Extremism Monitor Types
 * Types for attack planning detection and extremist activity monitoring
 */

export interface AttackPlan {
  id: string;
  status: AttackStatus;
  targetType: TargetType;
  targets: Target[];
  planners: string[];
  timeline?: AttackTimeline;
  indicators: AttackIndicator[];
  confidence: number;
  severity: ThreatSeverity;
  discovered: Date;
  lastUpdated: Date;
  intelligence: IntelligenceSource[];
}

export enum AttackStatus {
  PLANNING = 'PLANNING',
  PREPARATION = 'PREPARATION',
  IMMINENT = 'IMMINENT',
  EXECUTED = 'EXECUTED',
  DISRUPTED = 'DISRUPTED',
  ABANDONED = 'ABANDONED'
}

export enum TargetType {
  CIVILIAN = 'CIVILIAN',
  GOVERNMENT = 'GOVERNMENT',
  MILITARY = 'MILITARY',
  INFRASTRUCTURE = 'INFRASTRUCTURE',
  RELIGIOUS = 'RELIGIOUS',
  ECONOMIC = 'ECONOMIC',
  SYMBOLIC = 'SYMBOLIC',
  MASS_GATHERING = 'MASS_GATHERING',
  TRANSPORTATION = 'TRANSPORTATION',
  UTILITY = 'UTILITY'
}

export interface Target {
  id: string;
  name: string;
  type: TargetType;
  location: Location;
  vulnerability: VulnerabilityAssessment;
  surveillance: SurveillanceActivity[];
  significance: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface Location {
  latitude?: number;
  longitude?: number;
  country: string;
  region: string;
  city?: string;
  address?: string;
  description?: string;
}

export interface VulnerabilityAssessment {
  score: number;
  factors: string[];
  securityMeasures: string[];
  weaknesses: string[];
  assessmentDate: Date;
}

export interface SurveillanceActivity {
  id: string;
  date: Date;
  type: 'PHYSICAL' | 'DIGITAL' | 'RECONNAISSANCE';
  description: string;
  individuals?: string[];
  detected: boolean;
}

export interface AttackTimeline {
  planningStart?: Date;
  preparationStart?: Date;
  expectedExecution?: Date;
  executionWindow?: {
    start: Date;
    end: Date;
  };
  keyMilestones: Milestone[];
}

export interface Milestone {
  date: Date;
  description: string;
  completed: boolean;
  significance: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface AttackIndicator {
  id: string;
  type: IndicatorType;
  description: string;
  detected: Date;
  confidence: number;
  severity: ThreatSeverity;
  corroborated: boolean;
  sources: string[];
}

export enum IndicatorType {
  TARGET_SURVEILLANCE = 'TARGET_SURVEILLANCE',
  WEAPONS_PROCUREMENT = 'WEAPONS_PROCUREMENT',
  EXPLOSIVES_ACQUISITION = 'EXPLOSIVES_ACQUISITION',
  ATTACK_REHEARSAL = 'ATTACK_REHEARSAL',
  COMMUNICATION_PATTERN = 'COMMUNICATION_PATTERN',
  TRAVEL_PATTERN = 'TRAVEL_PATTERN',
  TRAINING_ACTIVITY = 'TRAINING_ACTIVITY',
  OPSEC_LAPSE = 'OPSEC_LAPSE',
  MARTYRDOM_VIDEO = 'MARTYRDOM_VIDEO',
  LAST_TESTAMENT = 'LAST_TESTAMENT',
  FUNDING_TRANSFER = 'FUNDING_TRANSFER',
  SAFEHOUSE_RENTAL = 'SAFEHOUSE_RENTAL'
}

export enum ThreatSeverity {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
  INFORMATIONAL = 'INFORMATIONAL'
}

export interface IntelligenceSource {
  type: 'HUMINT' | 'SIGINT' | 'OSINT' | 'IMINT' | 'TECHINT';
  reliability: 'CONFIRMED' | 'PROBABLE' | 'DOUBTFUL' | 'UNCONFIRMED';
  description: string;
  collected: Date;
  classification?: string;
}

export interface WeaponsProcurement {
  id: string;
  individualId?: string;
  organizationId?: string;
  weaponTypes: WeaponType[];
  quantity?: number;
  source?: string;
  location?: string;
  date: Date;
  detected: boolean;
  intelligence: IntelligenceSource[];
}

export enum WeaponType {
  SMALL_ARMS = 'SMALL_ARMS',
  EXPLOSIVES = 'EXPLOSIVES',
  IED_COMPONENTS = 'IED_COMPONENTS',
  CHEMICAL = 'CHEMICAL',
  BIOLOGICAL = 'BIOLOGICAL',
  VEHICLE = 'VEHICLE',
  DRONE = 'DRONE',
  AMMUNITION = 'AMMUNITION',
  DETONATORS = 'DETONATORS'
}

export interface ExplosivesMaterial {
  id: string;
  type: ExplosiveType;
  quantity?: number;
  source?: string;
  acquiredBy?: string;
  date: Date;
  location?: string;
  purpose?: string;
}

export enum ExplosiveType {
  COMMERCIAL = 'COMMERCIAL',
  MILITARY = 'MILITARY',
  HOMEMADE = 'HOMEMADE',
  PRECURSOR_CHEMICAL = 'PRECURSOR_CHEMICAL',
  FERTILIZER = 'FERTILIZER',
  FUEL = 'FUEL',
  INITIATOR = 'INITIATOR'
}

export interface TrainingActivity {
  id: string;
  participants: string[];
  type: TrainingType;
  location?: Location;
  startDate: Date;
  endDate?: Date;
  skills: string[];
  instructor?: string;
  detected: boolean;
}

export enum TrainingType {
  WEAPONS = 'WEAPONS',
  EXPLOSIVES = 'EXPLOSIVES',
  TACTICS = 'TACTICS',
  OPERATIONAL_SECURITY = 'OPERATIONAL_SECURITY',
  SURVEILLANCE = 'SURVEILLANCE',
  CYBER = 'CYBER',
  MEDICAL = 'MEDICAL',
  PHYSICAL = 'PHYSICAL'
}

export interface CommunicationPattern {
  id: string;
  participants: string[];
  medium: CommunicationMedium;
  frequency: number;
  duration?: number;
  encrypted: boolean;
  languages: string[];
  keywords: string[];
  analyzed: Date;
  anomalies: CommunicationAnomaly[];
}

export enum CommunicationMedium {
  PHONE = 'PHONE',
  EMAIL = 'EMAIL',
  MESSAGING_APP = 'MESSAGING_APP',
  SOCIAL_MEDIA = 'SOCIAL_MEDIA',
  FORUM = 'FORUM',
  ENCRYPTED_CHANNEL = 'ENCRYPTED_CHANNEL',
  IN_PERSON = 'IN_PERSON',
  COURIER = 'COURIER'
}

export interface CommunicationAnomaly {
  type: string;
  description: string;
  significance: ThreatSeverity;
  detected: Date;
}

export interface TravelPattern {
  id: string;
  individualId: string;
  origin: string;
  destination: string;
  date: Date;
  purpose?: string;
  conflictZone: boolean;
  suspiciousIndicators: string[];
  borderCrossings: BorderCrossing[];
}

export interface BorderCrossing {
  location: string;
  date: Date;
  method: 'LEGAL' | 'ILLEGAL' | 'UNKNOWN';
  documents: string[];
  flagged: boolean;
}

export interface OperationalSecurityLapse {
  id: string;
  individualId?: string;
  organizationId?: string;
  type: string;
  description: string;
  date: Date;
  exposure: string[];
  exploited: boolean;
  intelligence: IntelligenceSource[];
}

export interface MartyrdomMaterial {
  id: string;
  individualId: string;
  type: 'VIDEO' | 'AUDIO' | 'WRITTEN';
  created: Date;
  discovered: Date;
  content: string;
  distribution?: string[];
  authenticated: boolean;
}

export interface AttackRehearsal {
  id: string;
  participants: string[];
  location?: Location;
  date: Date;
  targetType?: TargetType;
  tactics: string[];
  detected: boolean;
  intelligence: IntelligenceSource[];
}

export interface MonitoringQuery {
  status?: AttackStatus[];
  targetTypes?: TargetType[];
  severities?: ThreatSeverity[];
  regions?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  minConfidence?: number;
  indicatorTypes?: IndicatorType[];
}

export interface MonitoringResult {
  attacks: AttackPlan[];
  totalCount: number;
  criticalThreats: AttackPlan[];
  indicators: AttackIndicator[];
  trends: ThreatTrend[];
}

export interface ThreatTrend {
  type: string;
  direction: 'INCREASING' | 'DECREASING' | 'STABLE';
  magnitude: number;
  period: string;
  description: string;
}

export interface RiskAssessment {
  attackPlanId: string;
  overallRisk: number;
  likelihood: number;
  impact: number;
  factors: RiskFactor[];
  mitigations: string[];
  assessmentDate: Date;
}

export interface RiskFactor {
  category: string;
  description: string;
  weight: number;
  present: boolean;
}
