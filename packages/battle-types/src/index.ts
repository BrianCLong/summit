/**
 * @intelgraph/battle-types
 * Type definitions for Multidomain Data Fusion and Battle Management
 */

// =============================================================================
// DOMAIN IDENTIFIERS
// =============================================================================

export type DataDomain =
  | 'SENSOR_GRID'
  | 'SATELLITE'
  | 'COMMS'
  | 'CYBER'
  | 'HUMINT'
  | 'SIGINT'
  | 'IMINT'
  | 'GEOINT'
  | 'OSINT'
  | 'ELINT'
  | 'MASINT'
  | 'EXTERNAL';

export type ForceType = 'BLUE' | 'RED' | 'NEUTRAL' | 'UNKNOWN';

export type UnitType =
  | 'INFANTRY'
  | 'ARMOR'
  | 'ARTILLERY'
  | 'AIR'
  | 'NAVAL'
  | 'CYBER'
  | 'LOGISTICS'
  | 'COMMAND'
  | 'RECON'
  | 'SPECIAL_OPS';

export type ThreatLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'MINIMAL';

export type OperationalStatus =
  | 'ACTIVE'
  | 'STANDBY'
  | 'ENGAGED'
  | 'RETREATING'
  | 'DESTROYED'
  | 'UNKNOWN';

// =============================================================================
// GEOGRAPHIC AND TEMPORAL
// =============================================================================

export interface GeoLocation {
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy?: number;
  coordinateSystem?: 'WGS84' | 'MGRS' | 'UTM';
}

export interface BoundingBox {
  northWest: GeoLocation;
  southEast: GeoLocation;
}

export interface TemporalRange {
  start: Date;
  end?: Date;
  duration?: number; // milliseconds
}

// =============================================================================
// DATA INGESTION TYPES
// =============================================================================

export interface DataSource {
  id: string;
  name: string;
  domain: DataDomain;
  reliability: 'A' | 'B' | 'C' | 'D' | 'E' | 'F'; // NATO reliability scale
  credibility: 1 | 2 | 3 | 4 | 5 | 6; // NATO credibility scale
  lastContact: Date;
  metadata?: Record<string, unknown>;
}

export interface RawIngestEvent {
  eventId: string;
  sourceId: string;
  domain: DataDomain;
  timestamp: Date;
  payload: unknown;
  headers?: Record<string, string>;
  checksum?: string;
}

export interface NormalizedIngestEvent {
  eventId: string;
  sourceId: string;
  domain: DataDomain;
  timestamp: Date;
  normalizedAt: Date;
  entityType: string;
  entityId?: string;
  location?: GeoLocation;
  confidence: number; // 0-1
  data: Record<string, unknown>;
  provenance: ProvenanceChain;
}

export interface ProvenanceChain {
  sourceId: string;
  sourceDomain: DataDomain;
  reliability: string;
  credibility: number;
  transformations: string[];
  correlationIds: string[];
}

// =============================================================================
// BATTLEFIELD ENTITIES
// =============================================================================

export interface BattlefieldEntity {
  id: string;
  name: string;
  designation?: string;
  forceType: ForceType;
  unitType: UnitType;
  status: OperationalStatus;
  location: GeoLocation;
  heading?: number; // degrees
  speed?: number; // km/h
  strength?: number; // 0-100%
  confidence: number;
  lastUpdated: Date;
  sources: string[];
  metadata?: Record<string, unknown>;
}

export interface Track {
  id: string;
  entityId: string;
  positions: TrackPoint[];
  predictedPath?: GeoLocation[];
  velocity?: Vector3D;
  lastUpdated: Date;
}

export interface TrackPoint {
  location: GeoLocation;
  timestamp: Date;
  confidence: number;
  sourceId: string;
}

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

// =============================================================================
// SENSOR AND SATELLITE DATA
// =============================================================================

export interface SensorReading {
  sensorId: string;
  sensorType: string;
  timestamp: Date;
  location: GeoLocation;
  detections: Detection[];
  environmentalData?: EnvironmentalData;
}

export interface Detection {
  id: string;
  type: 'CONTACT' | 'SIGNAL' | 'ANOMALY' | 'TRACK';
  classification?: string;
  location: GeoLocation;
  bearing?: number;
  range?: number;
  confidence: number;
  signature?: SignatureData;
}

export interface SignatureData {
  type: 'RADAR' | 'IR' | 'ACOUSTIC' | 'EM' | 'VISUAL';
  strength: number;
  frequency?: number;
  characteristics?: Record<string, unknown>;
}

export interface EnvironmentalData {
  temperature?: number;
  humidity?: number;
  windSpeed?: number;
  windDirection?: number;
  visibility?: number;
  precipitation?: string;
}

export interface SatelliteImagery {
  imageId: string;
  satelliteId: string;
  captureTime: Date;
  boundingBox: BoundingBox;
  resolution: number; // meters per pixel
  spectralBands: string[];
  cloudCover?: number;
  analysisResults?: ImageAnalysisResult[];
}

export interface ImageAnalysisResult {
  type: string;
  location: GeoLocation;
  confidence: number;
  classification?: string;
  dimensions?: { width: number; height: number };
}

// =============================================================================
// COMMUNICATIONS AND CYBER
// =============================================================================

export interface CommsIntercept {
  interceptId: string;
  timestamp: Date;
  frequency?: number;
  protocol?: string;
  sourceLocation?: GeoLocation;
  targetLocation?: GeoLocation;
  contentType: 'VOICE' | 'DATA' | 'VIDEO' | 'ENCRYPTED';
  classification?: string;
  metadata?: Record<string, unknown>;
}

export interface CyberEvent {
  eventId: string;
  timestamp: Date;
  eventType:
    | 'INTRUSION'
    | 'MALWARE'
    | 'DOS'
    | 'DATA_EXFIL'
    | 'RECONNAISSANCE'
    | 'LATERAL_MOVEMENT';
  severity: ThreatLevel;
  sourceIp?: string;
  targetIp?: string;
  targetAsset?: string;
  indicators: string[];
  ttps?: string[]; // MITRE ATT&CK TTPs
  attribution?: string;
}

// =============================================================================
// FUSION TYPES
// =============================================================================

export interface FusionResult {
  fusionId: string;
  timestamp: Date;
  entities: FusedEntity[];
  correlations: EntityCorrelation[];
  situationalPicture: SituationalPicture;
  confidence: number;
  sourceCount: number;
  domainCoverage: DataDomain[];
}

export interface FusedEntity {
  id: string;
  canonicalId: string;
  entity: BattlefieldEntity;
  fusionScore: number;
  contributingSources: SourceContribution[];
  conflicts?: DataConflict[];
  lastFused: Date;
}

export interface SourceContribution {
  sourceId: string;
  domain: DataDomain;
  weight: number;
  confidence: number;
  timestamp: Date;
}

export interface DataConflict {
  field: string;
  values: Array<{
    value: unknown;
    sourceId: string;
    confidence: number;
  }>;
  resolution?: {
    selectedValue: unknown;
    method: 'HIGHEST_CONFIDENCE' | 'MOST_RECENT' | 'WEIGHTED_AVERAGE' | 'MANUAL';
  };
}

export interface EntityCorrelation {
  entityId1: string;
  entityId2: string;
  correlationType: 'SAME_ENTITY' | 'RELATED' | 'COMMANDING' | 'SUPPORTING';
  confidence: number;
  evidence: string[];
}

export interface SituationalPicture {
  timestamp: Date;
  areaOfInterest: BoundingBox;
  blueForces: BattlefieldEntity[];
  redForces: BattlefieldEntity[];
  neutralForces: BattlefieldEntity[];
  unknownContacts: BattlefieldEntity[];
  threats: ThreatAssessment[];
  logisticsStatus: LogisticsSnapshot;
}

// =============================================================================
// THREAT ASSESSMENT
// =============================================================================

export interface ThreatAssessment {
  id: string;
  entityId: string;
  threatLevel: ThreatLevel;
  threatType: string;
  capabilities: string[];
  intent?: 'OFFENSIVE' | 'DEFENSIVE' | 'UNKNOWN';
  targetAssets?: string[];
  timeToImpact?: number; // seconds
  confidence: number;
  mitigations?: string[];
}

// =============================================================================
// LOGISTICS
// =============================================================================

export interface LogisticsSnapshot {
  timestamp: Date;
  supplyLines: SupplyLine[];
  depots: LogisticsDepot[];
  convoys: Convoy[];
  overallReadiness: number; // 0-100%
}

export interface SupplyLine {
  id: string;
  startPoint: GeoLocation;
  endPoint: GeoLocation;
  status: 'OPEN' | 'CONTESTED' | 'BLOCKED' | 'DAMAGED';
  capacity: number;
  currentLoad: number;
  threats?: string[];
}

export interface LogisticsDepot {
  id: string;
  name: string;
  location: GeoLocation;
  type: 'AMMUNITION' | 'FUEL' | 'FOOD' | 'MEDICAL' | 'EQUIPMENT' | 'MIXED';
  stockLevel: number; // 0-100%
  resupplyEta?: Date;
}

export interface Convoy {
  id: string;
  origin: string;
  destination: string;
  currentLocation: GeoLocation;
  eta: Date;
  cargo: string[];
  escortStrength: number;
  status: OperationalStatus;
}

// =============================================================================
// SCENARIO SIMULATION
// =============================================================================

export interface Scenario {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  createdBy: string;
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED';
  timeScale: number; // 1 = real-time, >1 = accelerated
  startTime: Date;
  currentTime: Date;
  initialState: SituationalPicture;
  events: ScenarioEvent[];
  outcomes?: ScenarioOutcome[];
}

export interface ScenarioEvent {
  id: string;
  scheduledTime: Date;
  eventType: string;
  parameters: Record<string, unknown>;
  executed: boolean;
  result?: unknown;
}

export interface ScenarioOutcome {
  metric: string;
  value: number;
  comparison?: 'BETTER' | 'WORSE' | 'SAME';
  notes?: string;
}

// =============================================================================
// OPERATIONAL PLANNING
// =============================================================================

export interface OperationalPlan {
  id: string;
  name: string;
  classification: string;
  status: 'DRAFT' | 'APPROVED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  commander: string;
  createdAt: Date;
  approvedAt?: Date;
  objective: string;
  phases: PlanPhase[];
  resources: ResourceAllocation[];
  constraints: string[];
  contingencies: Contingency[];
}

export interface PlanPhase {
  id: string;
  name: string;
  order: number;
  startCondition: string;
  endCondition: string;
  objectives: string[];
  assignedUnits: string[];
  timeline?: TemporalRange;
}

export interface ResourceAllocation {
  resourceType: string;
  quantity: number;
  unit: string;
  assignedTo: string;
  priority: number;
}

export interface Contingency {
  trigger: string;
  response: string;
  priority: number;
}

// =============================================================================
// COMMAND AND CONTROL
// =============================================================================

export interface Command {
  id: string;
  issuedAt: Date;
  issuedBy: string;
  targetUnitId: string;
  commandType: string;
  parameters: Record<string, unknown>;
  priority: 'IMMEDIATE' | 'PRIORITY' | 'ROUTINE';
  status: 'PENDING' | 'ACKNOWLEDGED' | 'EXECUTING' | 'COMPLETED' | 'FAILED';
  acknowledgedAt?: Date;
  completedAt?: Date;
  result?: CommandResult;
}

export interface CommandResult {
  success: boolean;
  message?: string;
  metrics?: Record<string, number>;
  sideEffects?: string[];
}

export interface DecisionLog {
  id: string;
  timestamp: Date;
  decisionMaker: string;
  decisionType: string;
  context: Record<string, unknown>;
  options: DecisionOption[];
  selectedOption: string;
  rationale: string;
  outcome?: string;
}

export interface DecisionOption {
  id: string;
  description: string;
  pros: string[];
  cons: string[];
  riskLevel: ThreatLevel;
  resourceCost?: number;
}

// =============================================================================
// KAFKA EVENT TYPES
// =============================================================================

export interface BattleEvent {
  eventType: BattleEventType;
  timestamp: Date;
  correlationId: string;
  payload: unknown;
  metadata: EventMetadata;
}

export type BattleEventType =
  | 'ENTITY_DETECTED'
  | 'ENTITY_UPDATED'
  | 'ENTITY_LOST'
  | 'FUSION_COMPLETED'
  | 'THREAT_IDENTIFIED'
  | 'COMMAND_ISSUED'
  | 'COMMAND_ACKNOWLEDGED'
  | 'COMMAND_COMPLETED'
  | 'COMMAND_FAILED'
  | 'DECISION_MADE'
  | 'POSITION_UPDATE'
  | 'LOGISTICS_UPDATE'
  | 'SCENARIO_EVENT'
  | 'ALERT';

export interface EventMetadata {
  sourceService: string;
  version: string;
  traceId?: string;
  spanId?: string;
}

// =============================================================================
// DOMAIN WEIGHTS FOR FUSION
// =============================================================================

export const DOMAIN_WEIGHTS: Record<DataDomain, number> = {
  SENSOR_GRID: 0.15,
  SATELLITE: 0.15,
  COMMS: 0.10,
  CYBER: 0.08,
  HUMINT: 0.12,
  SIGINT: 0.12,
  IMINT: 0.10,
  GEOINT: 0.08,
  OSINT: 0.04,
  ELINT: 0.03,
  MASINT: 0.02,
  EXTERNAL: 0.01,
};

export const RELIABILITY_SCORES: Record<string, number> = {
  A: 1.0,
  B: 0.8,
  C: 0.6,
  D: 0.4,
  E: 0.2,
  F: 0.0,
};

export const CREDIBILITY_SCORES: Record<number, number> = {
  1: 1.0, // Confirmed
  2: 0.8, // Probably true
  3: 0.6, // Possibly true
  4: 0.4, // Doubtful
  5: 0.2, // Improbable
  6: 0.0, // Cannot be judged
};
