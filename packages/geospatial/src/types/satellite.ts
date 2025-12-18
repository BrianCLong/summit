/**
 * Satellite Imagery Types for GEOINT Operations
 * Supports raster/vector fusion, change detection, and Neo4j integration
 */

import { Geometry, Position } from 'geojson';
import { BoundingBox, GeoPoint, IntelFeature } from './geospatial.js';

/**
 * Spectral band definitions for satellite imagery
 */
export type SpectralBand =
  | 'panchromatic'
  | 'red'
  | 'green'
  | 'blue'
  | 'nir' // Near-infrared
  | 'swir1' // Short-wave infrared 1
  | 'swir2' // Short-wave infrared 2
  | 'thermal'
  | 'coastal'
  | 'cirrus';

/**
 * Satellite platform/constellation identifier
 */
export type SatellitePlatform =
  | 'sentinel-2'
  | 'landsat-8'
  | 'landsat-9'
  | 'worldview-3'
  | 'worldview-4'
  | 'planet'
  | 'maxar'
  | 'iceye'
  | 'capella'
  | 'synthetic' // Test data
  | 'classified';

/**
 * Image processing level
 */
export type ProcessingLevel =
  | 'L0' // Raw
  | 'L1A' // Radiometric correction
  | 'L1B' // Geometric correction
  | 'L1C' // Orthorectified
  | 'L2A' // Atmospherically corrected
  | 'L3' // Derived product
  | 'analysis_ready';

/**
 * Comprehensive satellite scene metadata
 */
export interface SatelliteScene {
  id: string;
  platform: SatellitePlatform;
  sensor: string;
  acquisitionDate: Date;
  processingLevel: ProcessingLevel;
  bbox: BoundingBox;
  geometry: Geometry;
  gsd: number; // Ground sample distance in meters
  bands: SpectralBand[];
  cloudCoverPercent: number;
  sunElevation?: number;
  sunAzimuth?: number;
  viewAngle?: number;
  classification: 'unclassified' | 'cui' | 'secret' | 'top_secret';

  // Storage references
  tileUrls?: Record<SpectralBand, string>;
  cogUrl?: string; // Cloud-optimized GeoTIFF
  localPath?: string; // Air-gapped storage path

  // Provenance
  source: string;
  ingestTimestamp: Date;
  checksumSha256?: string;

  metadata?: Record<string, unknown>;
}

/**
 * Raster tile for efficient processing
 */
export interface RasterTile {
  sceneId: string;
  tileId: string;
  x: number;
  y: number;
  z: number; // Zoom level
  bbox: BoundingBox;
  band: SpectralBand;
  width: number;
  height: number;
  data: Float32Array | Uint16Array | Uint8Array;
  noDataValue?: number;
  stats?: TileStatistics;
}

/**
 * Statistics for a raster tile
 */
export interface TileStatistics {
  min: number;
  max: number;
  mean: number;
  stdDev: number;
  histogram?: number[];
  validPixelCount: number;
}

/**
 * Vector feature extracted from imagery
 */
export interface ExtractedFeature extends IntelFeature {
  properties: IntelFeature['properties'] & {
    sceneId: string;
    extractionMethod: string;
    detectionConfidence: number;
    pixelBounds?: [number, number, number, number]; // [minX, minY, maxX, maxY]
    spectralSignature?: number[];
    changeType?: ChangeType;
    previousStateId?: string;
  };
}

/**
 * Change detection types
 */
export type ChangeType =
  | 'construction'
  | 'demolition'
  | 'vegetation_gain'
  | 'vegetation_loss'
  | 'water_change'
  | 'vehicle_movement'
  | 'infrastructure'
  | 'activity_increase'
  | 'activity_decrease'
  | 'unknown';

/**
 * Change detection result
 */
export interface ChangeDetectionResult {
  id: string;
  beforeSceneId: string;
  afterSceneId: string;
  detectionTimestamp: Date;
  method: ChangeDetectionMethod;
  bbox: BoundingBox;
  changes: DetectedChange[];
  overallConfidence: number;
  processingTimeMs: number;
  metadata?: Record<string, unknown>;
}

/**
 * Change detection method
 */
export type ChangeDetectionMethod =
  | 'spectral_differencing'
  | 'ndvi_differencing'
  | 'object_based'
  | 'deep_learning'
  | 'hybrid'
  | 'agentic_ensemble';

/**
 * Individual detected change
 */
export interface DetectedChange {
  id: string;
  type: ChangeType;
  geometry: Geometry;
  centroid: GeoPoint;
  areaSqMeters: number;
  confidence: number;
  magnitudeScore: number; // 0-1 indicating intensity of change
  beforeValues?: number[];
  afterValues?: number[];
  description?: string;
  linkedEntityId?: string; // Neo4j entity reference
  tags?: string[];
}

/**
 * GDAL processing options
 */
export interface GDALProcessingOptions {
  inputSRS?: string;
  outputSRS?: string;
  resampleMethod?: 'nearest' | 'bilinear' | 'cubic' | 'cubicspline' | 'lanczos';
  outputFormat?: 'GTiff' | 'COG' | 'VRT' | 'PNG' | 'JPEG';
  compression?: 'DEFLATE' | 'LZW' | 'ZSTD' | 'JPEG' | 'NONE';
  tileSize?: number;
  overviewLevels?: number[];
  noDataValue?: number;
  bandSelection?: number[];
  clipBbox?: BoundingBox;
  scaleRange?: [number, number];
  creationOptions?: Record<string, string>;
}

/**
 * Raster/Vector fusion configuration
 */
export interface FusionConfig {
  vectorLayers: string[];
  rasterBands: SpectralBand[];
  fusionMethod: 'overlay' | 'zonal_stats' | 'sample_extraction' | 'segmentation';
  outputType: 'enriched_vectors' | 'raster_attributes' | 'graph_nodes';
  bufferMeters?: number;
  aggregationMethod?: 'mean' | 'median' | 'mode' | 'max' | 'min' | 'sum';
}

/**
 * Fusion result
 */
export interface FusionResult {
  id: string;
  config: FusionConfig;
  sceneId: string;
  features: ExtractedFeature[];
  statistics: FusionStatistics;
  processingTimeMs: number;
  timestamp: Date;
}

/**
 * Statistics from fusion operation
 */
export interface FusionStatistics {
  inputFeatureCount: number;
  outputFeatureCount: number;
  bandsProcessed: SpectralBand[];
  coveragePercent: number;
  nullValuePercent: number;
  zonalStats?: Record<string, TileStatistics>;
}

/**
 * Neo4j geospatial node representation
 */
export interface GeoNode {
  nodeId: string;
  nodeType: GeoNodeType;
  geometry: Geometry;
  centroid: Position;
  bbox: BoundingBox;
  properties: Record<string, unknown>;
  sceneIds: string[];
  confidence: number;
  firstObserved: Date;
  lastObserved: Date;
  observationCount: number;
  classification: string;
  provenance: ProvenanceRecord;
}

/**
 * Types of geospatial nodes in the graph
 */
export type GeoNodeType =
  | 'facility'
  | 'infrastructure'
  | 'vehicle'
  | 'vessel'
  | 'aircraft'
  | 'natural_feature'
  | 'activity_site'
  | 'change_event'
  | 'observation'
  | 'aoi'; // Area of Interest

/**
 * Relationship between geo nodes
 */
export interface GeoRelationship {
  relationshipId: string;
  relationshipType: GeoRelationshipType;
  sourceNodeId: string;
  targetNodeId: string;
  properties: Record<string, unknown>;
  confidence: number;
  observedAt: Date;
  sceneId?: string;
}

/**
 * Types of relationships between geo nodes
 */
export type GeoRelationshipType =
  | 'near' // Spatial proximity
  | 'contains' // Spatial containment
  | 'intersects' // Spatial intersection
  | 'connected_to' // Infrastructure connection
  | 'observed_with' // Co-observation
  | 'changed_from' // Temporal change
  | 'part_of' // Hierarchical
  | 'activity_at' // Activity relationship
  | 'moved_to'; // Movement track

/**
 * Provenance record for audit trail
 */
export interface ProvenanceRecord {
  id: string;
  source: string;
  method: string;
  timestamp: Date;
  operator?: string;
  pipeline?: string;
  inputIds: string[];
  parameters?: Record<string, unknown>;
  checksum?: string;
}

/**
 * Air-gapped cache entry
 */
export interface CacheEntry {
  key: string;
  data: Buffer | string | object;
  dataType: 'raster' | 'vector' | 'metadata' | 'model' | 'tile';
  sizeBytes: number;
  createdAt: Date;
  expiresAt?: Date;
  accessCount: number;
  lastAccessedAt: Date;
  priority: 'critical' | 'high' | 'normal' | 'low';
  checksumMd5: string;
  compressed: boolean;
  encryption?: {
    algorithm: string;
    keyId: string;
  };
}

/**
 * Cache statistics
 */
export interface CacheStats {
  totalEntries: number;
  totalSizeBytes: number;
  hitCount: number;
  missCount: number;
  evictionCount: number;
  avgAccessTimeMs: number;
  oldestEntry?: Date;
  newestEntry?: Date;
  entriesByType: Record<string, number>;
  entriesByPriority: Record<string, number>;
}

/**
 * Processing pipeline status
 */
export interface PipelineStatus {
  pipelineId: string;
  name: string;
  status: 'idle' | 'running' | 'completed' | 'failed' | 'paused';
  progress: number; // 0-100
  currentStep?: string;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  metrics: {
    scenesProcessed: number;
    featuresExtracted: number;
    nodesCreated: number;
    changesDetected: number;
    processingTimeMs: number;
  };
}

/**
 * Agentic task for change detection
 */
export interface AgenticTask {
  taskId: string;
  taskType: 'monitor' | 'detect' | 'analyze' | 'alert';
  priority: 'flash' | 'immediate' | 'priority' | 'routine';
  aoi: Geometry;
  parameters: {
    minConfidence?: number;
    changeTypes?: ChangeType[];
    timeWindow?: { start: Date; end: Date };
    revisitIntervalHours?: number;
    alertThreshold?: number;
  };
  status: 'queued' | 'running' | 'completed' | 'failed';
  createdAt: Date;
  lastRunAt?: Date;
  nextRunAt?: Date;
  results?: ChangeDetectionResult[];
}

/**
 * 3D visualization configuration
 */
export interface Visualization3DConfig {
  viewpoint: {
    longitude: number;
    latitude: number;
    altitude: number;
    heading: number;
    pitch: number;
    roll: number;
  };
  layers: VisualizationLayer[];
  terrain: {
    enabled: boolean;
    exaggeration: number;
    provider: 'cesium' | 'mapbox' | 'local';
  };
  lighting: {
    dateTime: Date;
    shadows: boolean;
    ambientOcclusion: boolean;
  };
  animation?: {
    enabled: boolean;
    startTime: Date;
    endTime: Date;
    speedMultiplier: number;
  };
}

/**
 * Visualization layer
 */
export interface VisualizationLayer {
  id: string;
  type: 'imagery' | 'terrain' | 'vector' | 'heatmap' | '3d_tiles' | 'point_cloud';
  visible: boolean;
  opacity: number;
  source: string;
  style?: Record<string, unknown>;
  temporal?: {
    timeField: string;
    animate: boolean;
  };
}
