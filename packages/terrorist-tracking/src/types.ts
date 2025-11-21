/**
 * Terrorist Tracking Types
 * Types and interfaces for terrorist organization monitoring and tracking
 */

export interface TerroristOrganization {
  id: string;
  name: string;
  aliases: string[];
  type: OrganizationType;
  ideology: Ideology[];
  foundedDate?: Date;
  operatingRegions: string[];
  estimatedStrength?: number;
  status: OrganizationStatus;
  parentOrganization?: string;
  affiliates: string[];
  metadata: Record<string, unknown>;
}

export enum OrganizationType {
  PRIMARY = 'PRIMARY',
  AFFILIATE = 'AFFILIATE',
  FRANCHISE = 'FRANCHISE',
  SPLINTER = 'SPLINTER',
  CELL = 'CELL',
  NETWORK = 'NETWORK'
}

export enum Ideology {
  RELIGIOUS_EXTREMISM = 'RELIGIOUS_EXTREMISM',
  NATIONALIST = 'NATIONALIST',
  SEPARATIST = 'SEPARATIST',
  ETHNO_NATIONALIST = 'ETHNO_NATIONALIST',
  FAR_RIGHT = 'FAR_RIGHT',
  FAR_LEFT = 'FAR_LEFT',
  ANARCHIST = 'ANARCHIST',
  SINGLE_ISSUE = 'SINGLE_ISSUE',
  MIXED = 'MIXED'
}

export enum OrganizationStatus {
  ACTIVE = 'ACTIVE',
  WEAKENED = 'WEAKENED',
  DORMANT = 'DORMANT',
  DEFUNCT = 'DEFUNCT',
  REORGANIZING = 'REORGANIZING',
  MERGED = 'MERGED'
}

export interface OrganizationLeadership {
  organizationId: string;
  members: LeadershipMember[];
  hierarchyType: 'HIERARCHICAL' | 'CELL_BASED' | 'NETWORK' | 'HYBRID';
  commandStructure: CommandNode[];
}

export interface LeadershipMember {
  personId: string;
  name: string;
  aliases: string[];
  role: string;
  rank?: string;
  status: 'ACTIVE' | 'DETAINED' | 'DECEASED' | 'UNKNOWN';
  joinDate?: Date;
  responsibilities: string[];
  knownAssociates: string[];
}

export interface CommandNode {
  level: number;
  position: string;
  memberId?: string;
  subordinates: string[];
  region?: string;
}

export interface OrganizationFinancing {
  organizationId: string;
  fundingSources: FundingSource[];
  estimatedAnnualBudget?: number;
  financialNetworks: FinancialNetwork[];
  frontCompanies: string[];
  charities: string[];
}

export interface FundingSource {
  type: FundingType;
  description: string;
  estimatedAmount?: number;
  frequency: 'ONGOING' | 'PERIODIC' | 'ONE_TIME';
  region?: string;
  verified: boolean;
}

export enum FundingType {
  STATE_SPONSORSHIP = 'STATE_SPONSORSHIP',
  DONATIONS = 'DONATIONS',
  CRIMINAL_ACTIVITY = 'CRIMINAL_ACTIVITY',
  DRUG_TRAFFICKING = 'DRUG_TRAFFICKING',
  KIDNAPPING = 'KIDNAPPING',
  EXTORTION = 'EXTORTION',
  LEGITIMATE_BUSINESS = 'LEGITIMATE_BUSINESS',
  LOOTING = 'LOOTING',
  CRYPTOCURRENCY = 'CRYPTOCURRENCY',
  UNKNOWN = 'UNKNOWN'
}

export interface FinancialNetwork {
  id: string;
  type: 'HAWALA' | 'BANKING' | 'CRYPTOCURRENCY' | 'CASH_COURIER' | 'TRADE_BASED';
  nodes: string[];
  regions: string[];
}

export interface RecruitmentNetwork {
  organizationId: string;
  recruitmentMethods: RecruitmentMethod[];
  targetDemographics: TargetDemographic[];
  recruitmentRegions: string[];
  onlinePresence: OnlinePresence[];
}

export interface RecruitmentMethod {
  type: 'ONLINE' | 'IN_PERSON' | 'PRISON' | 'RELIGIOUS_INSTITUTION' | 'COMMUNITY' | 'FAMILY';
  description: string;
  effectiveness: 'HIGH' | 'MEDIUM' | 'LOW';
  active: boolean;
}

export interface TargetDemographic {
  ageRange?: [number, number];
  gender?: string;
  socioeconomicStatus?: string;
  education?: string;
  vulnerabilities: string[];
}

export interface OnlinePresence {
  platform: string;
  accountIds: string[];
  content: string[];
  reach: number;
  lastActive?: Date;
}

export interface TrainingFacility {
  id: string;
  organizationId: string;
  location: Location;
  type: 'TRAINING_CAMP' | 'SAFE_HOUSE' | 'WEAPONS_CACHE' | 'COMMAND_CENTER';
  status: 'ACTIVE' | 'ABANDONED' | 'DESTROYED' | 'SUSPECTED';
  capacity?: number;
  discovered?: Date;
  features: string[];
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

export interface SupplyNetwork {
  organizationId: string;
  suppliers: Supplier[];
  routes: SupplyRoute[];
  materials: Material[];
}

export interface Supplier {
  id: string;
  name?: string;
  type: 'WEAPONS' | 'EXPLOSIVES' | 'COMMUNICATIONS' | 'LOGISTICS' | 'MEDICAL' | 'FOOD';
  location: string;
  active: boolean;
}

export interface SupplyRoute {
  id: string;
  origin: string;
  destination: string;
  waypoints: string[];
  type: 'LAND' | 'SEA' | 'AIR';
  frequency?: string;
  lastUsed?: Date;
}

export interface Material {
  type: string;
  description: string;
  quantity?: number;
  source?: string;
  purpose?: string;
}

export interface OrganizationTimeline {
  organizationId: string;
  events: TimelineEvent[];
}

export interface TimelineEvent {
  id: string;
  date: Date;
  type: EventType;
  description: string;
  location?: Location;
  casualties?: CasualtyCount;
  participants?: string[];
  significance: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  sources: string[];
}

export enum EventType {
  FOUNDING = 'FOUNDING',
  ATTACK = 'ATTACK',
  LEADERSHIP_CHANGE = 'LEADERSHIP_CHANGE',
  MERGER = 'MERGER',
  SPLIT = 'SPLIT',
  TERRITORY_GAIN = 'TERRITORY_GAIN',
  TERRITORY_LOSS = 'TERRITORY_LOSS',
  MAJOR_OPERATION = 'MAJOR_OPERATION',
  FOREIGN_INTERVENTION = 'FOREIGN_INTERVENTION',
  PEACE_AGREEMENT = 'PEACE_AGREEMENT',
  DESIGNATION = 'DESIGNATION'
}

export interface CasualtyCount {
  killed?: number;
  injured?: number;
  captured?: number;
}

export interface TrackingQuery {
  organizationIds?: string[];
  regions?: string[];
  ideologies?: Ideology[];
  status?: OrganizationStatus[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  minThreatLevel?: number;
}

export interface TrackingResult {
  organizations: TerroristOrganization[];
  totalCount: number;
  threats: ThreatIndicator[];
  networkAnalysis?: NetworkAnalysis;
}

export interface ThreatIndicator {
  organizationId: string;
  type: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  detected: Date;
  confidence: number;
}

export interface NetworkAnalysis {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  communities: Community[];
  centralFigures: string[];
}

export interface NetworkNode {
  id: string;
  type: 'PERSON' | 'ORGANIZATION' | 'LOCATION' | 'EVENT';
  label: string;
  attributes: Record<string, unknown>;
}

export interface NetworkEdge {
  source: string;
  target: string;
  type: string;
  weight: number;
  attributes?: Record<string, unknown>;
}

export interface Community {
  id: string;
  members: string[];
  cohesion: number;
  description?: string;
}
