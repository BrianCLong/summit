/**
 * Digital Twin Infrastructure Types
 * Core type definitions for the digital twin system
 */

/**
 * Asset types for digital twin modeling
 */
export enum AssetType {
  BUILDING = 'BUILDING',
  BRIDGE = 'BRIDGE',
  ROAD = 'ROAD',
  UTILITY = 'UTILITY',
  WATER_SYSTEM = 'WATER_SYSTEM',
  POWER_GRID = 'POWER_GRID',
  TELECOMMUNICATIONS = 'TELECOMMUNICATIONS',
  TRANSIT = 'TRANSIT',
  GREEN_SPACE = 'GREEN_SPACE',
  WASTE_MANAGEMENT = 'WASTE_MANAGEMENT',
}

/**
 * Scenario types for simulation
 */
export enum ScenarioType {
  DISASTER = 'DISASTER',
  MAINTENANCE = 'MAINTENANCE',
  URBAN_PLANNING = 'URBAN_PLANNING',
  TRAFFIC = 'TRAFFIC',
  CLIMATE = 'CLIMATE',
}

/**
 * Disaster subtypes for detailed simulation
 */
export enum DisasterSubtype {
  EARTHQUAKE = 'EARTHQUAKE',
  FLOOD = 'FLOOD',
  FIRE = 'FIRE',
  HURRICANE = 'HURRICANE',
  TSUNAMI = 'TSUNAMI',
}

/**
 * Synchronization state for twin assets
 */
export enum TwinSyncState {
  SYNCED = 'SYNCED',
  PENDING = 'PENDING',
  STALE = 'STALE',
  ERROR = 'ERROR',
  OFFLINE = 'OFFLINE',
}

/**
 * Health status for assets
 */
export enum HealthStatus {
  EXCELLENT = 'EXCELLENT',
  GOOD = 'GOOD',
  FAIR = 'FAIR',
  POOR = 'POOR',
  CRITICAL = 'CRITICAL',
}

/**
 * GeoJSON geometry types
 */
export interface GeoJSONGeometry {
  type: 'Point' | 'LineString' | 'Polygon' | 'MultiPoint' | 'MultiLineString' | 'MultiPolygon';
  coordinates: number[] | number[][] | number[][][] | number[][][][];
}

/**
 * GeoJSON Feature
 */
export interface GeoJSONFeature {
  type: 'Feature';
  id?: string | number;
  geometry: GeoJSONGeometry;
  properties: Record<string, unknown>;
}

/**
 * GeoJSON FeatureCollection
 */
export interface GeoJSONFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}

/**
 * Sensor binding configuration
 */
export interface SensorBinding {
  sensorId: string;
  sensorType: string;
  dataPath: string;
  updateInterval: number;
  lastReading?: SensorReading;
}

/**
 * Individual sensor reading
 */
export interface SensorReading {
  sensorId: string;
  timestamp: Date;
  value: number | string | boolean | Record<string, unknown>;
  unit?: string;
  quality: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';
}

/**
 * Asset metadata container
 */
export interface AssetMetadata {
  constructionDate?: Date;
  lastInspection?: Date;
  owner?: string;
  category?: string;
  capacity?: number;
  materials?: string[];
  certifications?: string[];
  customFields?: Record<string, unknown>;
}

/**
 * Core digital twin asset representation
 */
export interface DigitalTwinAsset {
  id: string;
  name: string;
  type: AssetType;
  geometry: GeoJSONGeometry;
  metadata: AssetMetadata;
  sensorBindings: SensorBinding[];
  lastSync: Date;
  syncState: TwinSyncState;
  healthStatus: HealthStatus;
  healthScore: number;
  parentId?: string;
  childIds?: string[];
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Simulation parameters
 */
export interface SimulationParameters {
  duration: number;
  timeStep: number;
  affectedArea?: GeoJSONGeometry;
  intensity?: number;
  startConditions?: Record<string, unknown>;
  constraints?: Record<string, unknown>;
}

/**
 * Simulation result data
 */
export interface SimulationResult {
  timestamp: Date;
  affectedAssets: string[];
  metrics: Record<string, number>;
  predictions: MaintenancePrediction[];
  recommendations: string[];
  confidenceScore: number;
}

/**
 * Simulation scenario definition
 */
export interface SimulationScenario {
  id: string;
  name: string;
  type: ScenarioType;
  subtype?: DisasterSubtype | string;
  parameters: SimulationParameters;
  results?: SimulationResult;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  createdAt: Date;
  completedAt?: Date;
}

/**
 * Maintenance prediction output
 */
export interface MaintenancePrediction {
  assetId: string;
  predictedFailureDate: Date;
  failureProbability: number;
  recommendedAction: string;
  estimatedCost: number;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidenceInterval: {
    lower: Date;
    upper: Date;
  };
}

/**
 * Cost-benefit analysis result
 */
export interface CostBenefitAnalysis {
  assetId: string;
  maintenanceCost: number;
  replacementCost: number;
  downtimeCost: number;
  riskCost: number;
  recommendedAction: 'MAINTAIN' | 'REPLACE' | 'MONITOR' | 'DECOMMISSION';
  netBenefit: number;
  paybackPeriod: number;
}

/**
 * Smart city integration endpoint
 */
export interface CitySystemEndpoint {
  id: string;
  name: string;
  type: string;
  url: string;
  authMethod: 'API_KEY' | 'OAUTH2' | 'CERTIFICATE' | 'NONE';
  credentials?: Record<string, string>;
  dataFormat: 'JSON' | 'XML' | 'GEOJSON' | 'CSV';
  syncInterval: number;
  lastSync?: Date;
  status: 'ACTIVE' | 'INACTIVE' | 'ERROR';
}

/**
 * Federation export configuration (Estonia model)
 */
export interface FederationExport {
  id: string;
  targetCity: string;
  targetEndpoint: string;
  assetFilter: {
    types?: AssetType[];
    tags?: string[];
    area?: GeoJSONGeometry;
  };
  schedule: string;
  lastExport?: Date;
  status: 'ACTIVE' | 'PAUSED' | 'ERROR';
}

/**
 * Input types for service operations
 */
export interface CreateAssetInput {
  name: string;
  type: AssetType;
  geometry: GeoJSONGeometry;
  metadata?: AssetMetadata;
  sensorBindings?: SensorBinding[];
  parentId?: string;
  tags?: string[];
}

export interface UpdateAssetInput {
  name?: string;
  geometry?: GeoJSONGeometry;
  metadata?: AssetMetadata;
  sensorBindings?: SensorBinding[];
  tags?: string[];
}

export interface AssetQueryFilter {
  types?: AssetType[];
  tags?: string[];
  area?: GeoJSONGeometry;
  healthStatus?: HealthStatus[];
  syncState?: TwinSyncState[];
  parentId?: string;
}
