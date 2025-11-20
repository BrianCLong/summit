/**
 * Conflict Tracker - Type Definitions
 * Types for armed conflict and security monitoring
 */

export enum ConflictType {
  INTERSTATE_WAR = 'INTERSTATE_WAR',
  CIVIL_WAR = 'CIVIL_WAR',
  INSURGENCY = 'INSURGENCY',
  TERRORISM = 'TERRORISM',
  BORDER_CONFLICT = 'BORDER_CONFLICT',
  PEACEKEEPING_OPERATION = 'PEACEKEEPING_OPERATION',
  MILITARY_EXERCISE = 'MILITARY_EXERCISE',
  PROXY_WAR = 'PROXY_WAR',
  SEPARATIST_MOVEMENT = 'SEPARATIST_MOVEMENT',
  COUP_ATTEMPT = 'COUP_ATTEMPT'
}

export enum ConflictStatus {
  ACTIVE = 'ACTIVE',
  CEASEFIRE = 'CEASEFIRE',
  FROZEN = 'FROZEN',
  RESOLVED = 'RESOLVED',
  ESCALATING = 'ESCALATING',
  DE_ESCALATING = 'DE_ESCALATING'
}

export enum IntensityLevel {
  LOW = 'LOW',           // < 100 casualties/year
  MEDIUM = 'MEDIUM',     // 100-1000 casualties/year
  HIGH = 'HIGH',         // 1000-10000 casualties/year
  EXTREME = 'EXTREME'    // > 10000 casualties/year
}

export interface Conflict {
  id: string;
  name: string;
  type: ConflictType;
  status: ConflictStatus;
  intensity: IntensityLevel;

  // Geographic
  countries: string[];
  regions: string[];
  locations: Location[];

  // Parties
  parties: ConflictParty[];
  allies: Alliance[];

  // Timeline
  startDate: Date;
  endDate?: Date;
  duration: number; // days

  // Casualties & Impact
  casualties: CasualtyData;
  displacement: DisplacementData;
  economicImpact: EconomicImpact;

  // Military Activity
  militaryActivity: MilitaryActivity[];
  weapons: WeaponSystem[];

  // Diplomacy
  ceasefires: Ceasefire[];
  peaceAgreements: PeaceAgreement[];
  negotiations: Negotiation[];

  // Analysis
  riskScore: number; // 0-100
  escalationProbability: number; // 0-1
  spilloverRisk: number; // 0-100

  // Metadata
  sources: string[];
  lastUpdated: Date;
  tags: string[];
  metadata: Record<string, any>;
}

export interface Location {
  name: string;
  latitude: number;
  longitude: number;
  type: 'FRONTLINE' | 'COMBAT_ZONE' | 'STRATEGIC_SITE' | 'CIVILIAN_AREA';
  controlled_by?: string;
}

export interface ConflictParty {
  id: string;
  name: string;
  type: 'STATE' | 'NON_STATE' | 'COALITION' | 'REBEL_GROUP' | 'TERRORIST_ORG';
  strength?: number; // estimated personnel
  leadership: string[];
  objectives: string[];
  territory?: string[];
  internationalSupport: string[];
}

export interface Alliance {
  parties: string[];
  type: 'MILITARY' | 'POLITICAL' | 'ECONOMIC';
  formalAgreement: boolean;
  established: Date;
}

export interface CasualtyData {
  military: {
    killed: number;
    wounded: number;
    missing: number;
    captured: number;
  };
  civilian: {
    killed: number;
    wounded: number;
    missing: number;
  };
  total: number;
  verified: boolean;
  lastUpdated: Date;
}

export interface DisplacementData {
  internally_displaced: number;
  refugees: number;
  asylum_seekers: number;
  returnees: number;
  destination_countries: Record<string, number>;
}

export interface EconomicImpact {
  gdp_loss_percent: number;
  infrastructure_damage_usd: number;
  reconstruction_cost_usd: number;
  trade_disruption_percent: number;
  affected_sectors: string[];
}

export interface MilitaryActivity {
  id: string;
  type: 'OFFENSIVE' | 'DEFENSIVE' | 'AIRSTRIKE' | 'ARTILLERY' | 'RAID' | 'DEPLOYMENT';
  date: Date;
  location: Location;
  parties: string[];
  description: string;
  casualties?: CasualtyData;
  significance: 'MINOR' | 'MODERATE' | 'MAJOR' | 'CRITICAL';
}

export interface WeaponSystem {
  type: string;
  supplier: string;
  recipient: string;
  quantity?: number;
  delivery_date?: Date;
  value_usd?: number;
}

export interface Ceasefire {
  id: string;
  parties: string[];
  start_date: Date;
  end_date?: Date;
  status: 'ACTIVE' | 'VIOLATED' | 'EXPIRED' | 'EXTENDED';
  violations: CeasefireViolation[];
  mediators: string[];
  terms: string[];
}

export interface CeasefireViolation {
  date: Date;
  violator: string;
  type: string;
  description: string;
  casualties?: number;
}

export interface PeaceAgreement {
  id: string;
  name: string;
  date: Date;
  parties: string[];
  mediators: string[];
  key_provisions: string[];
  implementation_status: 'NOT_STARTED' | 'PARTIAL' | 'FULL' | 'FAILED';
  monitoring_mechanism?: string;
}

export interface Negotiation {
  id: string;
  parties: string[];
  mediators: string[];
  location: string;
  start_date: Date;
  end_date?: Date;
  status: 'ONGOING' | 'STALLED' | 'SUCCESSFUL' | 'FAILED';
  topics: string[];
  outcomes?: string[];
}

export interface ConflictEvent {
  id: string;
  conflictId: string;
  type: 'BATTLE' | 'ATTACK' | 'AIRSTRIKE' | 'BOMBING' | 'CLASH';
  date: Date;
  location: Location;
  parties: string[];
  description: string;
  casualties: CasualtyData;
  impact: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  sources: string[];
}

export interface SecurityIncident {
  id: string;
  type: 'ATTACK' | 'BOMBING' | 'SHOOTING' | 'KIDNAPPING' | 'SABOTAGE';
  date: Date;
  location: Location;
  perpetrator?: string;
  target: string;
  casualties: CasualtyData;
  description: string;
  claimed_by?: string;
  verified: boolean;
}

export interface TroopMovement {
  id: string;
  country: string;
  type: 'DEPLOYMENT' | 'WITHDRAWAL' | 'ROTATION' | 'EXERCISE';
  origin: string;
  destination: string;
  date: Date;
  estimated_personnel: number;
  purpose: string;
  significance: 'ROUTINE' | 'NOTABLE' | 'SIGNIFICANT' | 'MAJOR';
}

export interface ConflictAnalysis {
  conflictId: string;
  escalation_risk: {
    score: number; // 0-100
    factors: string[];
    trend: 'INCREASING' | 'STABLE' | 'DECREASING';
  };
  spillover_analysis: {
    at_risk_countries: string[];
    probability: number;
    pathways: string[];
  };
  resolution_prospects: {
    likelihood: number; // 0-1
    timeframe: string;
    requirements: string[];
  };
  humanitarian_situation: {
    severity: 'STABLE' | 'DETERIORATING' | 'CRITICAL';
    needs: string[];
    access_constraints: string[];
  };
  recommendations: string[];
}

export interface ConflictFilter {
  types?: ConflictType[];
  statuses?: ConflictStatus[];
  intensities?: IntensityLevel[];
  countries?: string[];
  regions?: string[];
  minRiskScore?: number;
  active_only?: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface MonitoringAlert {
  id: string;
  conflictId: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  type: 'ESCALATION' | 'CEASEFIRE_VIOLATION' | 'MAJOR_INCIDENT' | 'HUMANITARIAN_CRISIS';
  message: string;
  timestamp: Date;
  acknowledged: boolean;
}
