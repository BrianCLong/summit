/**
 * GEOINT (Geospatial Intelligence) - Core Types
 *
 * Unified types for comprehensive geospatial intelligence operations
 */

import { SatelliteImage, BoundingBox, GeoCoordinate } from '../../satellite-imagery/src/types';
import { DetectedObject, DetectionResult } from '../../object-detection/src/types';
import { DetectedChange, ChangeDetectionResult } from '../../change-detection/src/types';

/**
 * GEOINT product types
 */
export enum GEOINTProductType {
  ANNOTATED_IMAGERY = 'annotated_imagery',
  TARGET_FOLDER = 'target_folder',
  SITE_CHARACTERIZATION = 'site_characterization',
  DAMAGE_ASSESSMENT = 'damage_assessment',
  BEFORE_AFTER_COMPARISON = 'before_after_comparison',
  MEASUREMENT_MENSURATION = 'measurement_mensuration',
  THREE_D_MODEL = '3d_model',
  INTELLIGENCE_BRIEF = 'intelligence_brief',
  KML_KMZ = 'kml_kmz',
  ACTIVITY_REPORT = 'activity_report'
}

/**
 * Intelligence priority requirements
 */
export enum IntelligencePriority {
  ROUTINE = 'routine',
  PRIORITY = 'priority',
  IMMEDIATE = 'immediate',
  FLASH = 'flash'
}

/**
 * Pattern of life analysis
 */
export interface PatternOfLifeAnalysis {
  analysis_id: string;
  target_id: string;
  target_type: string;
  location: BoundingBox;
  observation_period_days: number;
  observations: LifePatternObservation[];
  patterns_identified: IdentifiedPattern[];
  anomalies: Anomaly[];
  predictive_model?: PredictiveModel;
  confidence_score: number;
}

/**
 * Life pattern observation
 */
export interface LifePatternObservation {
  observation_id: string;
  timestamp: Date;
  image_id: string;
  detected_objects: DetectedObject[];
  activity_level: number; // 0-1
  notable_events: string[];
}

/**
 * Identified pattern
 */
export interface IdentifiedPattern {
  pattern_id: string;
  pattern_type: 'temporal' | 'spatial' | 'behavioral';
  description: string;
  frequency: string; // e.g., "daily", "weekly"
  confidence: number;
  examples: string[]; // observation IDs
  statistical_significance: number;
}

/**
 * Anomaly detection
 */
export interface Anomaly {
  anomaly_id: string;
  timestamp: Date;
  anomaly_type: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  deviation_from_normal: number;
  potential_explanations: string[];
}

/**
 * Predictive model
 */
export interface PredictiveModel {
  model_id: string;
  model_type: string;
  predictions: Prediction[];
  accuracy_metrics: AccuracyMetrics;
}

/**
 * Prediction
 */
export interface Prediction {
  prediction_id: string;
  predicted_timestamp: Date;
  predicted_activity: string;
  probability: number;
  confidence_interval: {
    lower: number;
    upper: number;
  };
}

/**
 * Accuracy metrics
 */
export interface AccuracyMetrics {
  precision: number;
  recall: number;
  f1_score: number;
  mean_absolute_error?: number;
}

/**
 * Facility utilization assessment
 */
export interface FacilityUtilization {
  facility_id: string;
  facility_type: string;
  location: GeoCoordinate;
  observation_period_days: number;
  utilization_rate: number; // 0-1
  peak_utilization_times: TimeWindow[];
  capacity_estimate?: number;
  activity_timeline: ActivityTimelineEntry[];
}

/**
 * Time window
 */
export interface TimeWindow {
  start_time: Date;
  end_time: Date;
  utilization_level: number;
}

/**
 * Activity timeline entry
 */
export interface ActivityTimelineEntry {
  timestamp: Date;
  activity_type: string;
  intensity: number; // 0-1
  objects_detected: number;
  image_id: string;
}

/**
 * Supply chain monitoring
 */
export interface SupplyChainMonitoring {
  monitoring_id: string;
  supply_chain_name: string;
  nodes: SupplyChainNode[];
  routes: SupplyRoute[];
  throughput_analysis: ThroughputAnalysis;
  disruptions: Disruption[];
}

/**
 * Supply chain node
 */
export interface SupplyChainNode {
  node_id: string;
  node_type: 'source' | 'warehouse' | 'distribution' | 'destination';
  location: GeoCoordinate;
  capacity_estimate?: number;
  activity_level: number;
  recent_changes: DetectedChange[];
}

/**
 * Supply route
 */
export interface SupplyRoute {
  route_id: string;
  origin_node_id: string;
  destination_node_id: string;
  waypoints: GeoCoordinate[];
  traffic_frequency: number; // vehicles per day
  transport_mode: 'road' | 'rail' | 'air' | 'sea';
  recent_activity: RouteActivity[];
}

/**
 * Route activity
 */
export interface RouteActivity {
  timestamp: Date;
  vehicles_detected: number;
  vehicle_types: string[];
  direction: 'forward' | 'reverse' | 'bidirectional';
  image_id: string;
}

/**
 * Throughput analysis
 */
export interface ThroughputAnalysis {
  average_daily_throughput: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  peak_periods: TimeWindow[];
  bottlenecks: SupplyChainNode[];
}

/**
 * Disruption
 */
export interface Disruption {
  disruption_id: string;
  timestamp: Date;
  location: GeoCoordinate;
  disruption_type: string;
  impact_level: 'low' | 'medium' | 'high';
  affected_nodes: string[];
  affected_routes: string[];
  estimated_duration_hours?: number;
}

/**
 * Military readiness indicator
 */
export interface MilitaryReadinessIndicator {
  indicator_id: string;
  facility_id: string;
  observation_period_days: number;
  readiness_level: 'low' | 'normal' | 'elevated' | 'high';
  indicators: ReadinessIndicator[];
  assessment_confidence: number;
  trend: 'improving' | 'declining' | 'stable';
}

/**
 * Readiness indicator
 */
export interface ReadinessIndicator {
  indicator_type: string;
  current_value: number;
  baseline_value: number;
  deviation: number;
  significance: 'low' | 'medium' | 'high';
  description: string;
}

/**
 * Multi-intelligence fusion result
 */
export interface MultiIntFusionResult {
  fusion_id: string;
  target_id: string;
  intelligence_sources: IntelligenceSource[];
  fused_assessment: FusedAssessment;
  confidence_score: number;
  conflicting_information?: ConflictingInfo[];
  recommendations: string[];
}

/**
 * Intelligence source
 */
export interface IntelligenceSource {
  source_id: string;
  source_type: 'IMINT' | 'SIGINT' | 'HUMINT' | 'OSINT' | 'MASINT';
  data: any;
  reliability: number; // 0-1
  timeliness: number; // 0-1
  relevance: number; // 0-1
  collection_time: Date;
}

/**
 * Fused assessment
 */
export interface FusedAssessment {
  assessment_id: string;
  target_description: string;
  location: GeoCoordinate;
  location_confidence: number;
  characteristics: Record<string, any>;
  activities: string[];
  threat_level?: 'low' | 'medium' | 'high' | 'critical';
  assessment_time: Date;
}

/**
 * Conflicting information
 */
export interface ConflictingInfo {
  attribute: string;
  sources: string[];
  values: any[];
  resolution_method?: string;
  resolved_value?: any;
}

/**
 * GEOINT product
 */
export interface GEOINTProduct {
  product_id: string;
  product_type: GEOINTProductType;
  title: string;
  description: string;
  classification: string;
  priority: IntelligencePriority;
  target_id?: string;
  area_of_interest: BoundingBox;
  primary_image_id: string;
  supporting_images: string[];
  annotations: Annotation[];
  measurements: Measurement[];
  analysis_results: AnalysisResult[];
  conclusions: string[];
  created_by: string;
  created_at: Date;
  approved_by?: string;
  approved_at?: Date;
  distribution_list: string[];
  product_uri: string;
}

/**
 * Annotation
 */
export interface Annotation {
  annotation_id: string;
  annotation_type: 'text' | 'arrow' | 'box' | 'polygon' | 'icon';
  coordinates: GeoCoordinate | GeoCoordinate[];
  content: string;
  style?: AnnotationStyle;
  created_by: string;
  created_at: Date;
}

/**
 * Annotation style
 */
export interface AnnotationStyle {
  color?: string;
  font_size?: number;
  line_width?: number;
  fill_opacity?: number;
  icon_type?: string;
}

/**
 * Measurement
 */
export interface Measurement {
  measurement_id: string;
  measurement_type: 'length' | 'area' | 'height' | 'width' | 'angle';
  value: number;
  unit: string;
  accuracy_estimate?: number;
  method: string;
  coordinates: GeoCoordinate[];
  description?: string;
}

/**
 * Analysis result
 */
export interface AnalysisResult {
  result_id: string;
  analysis_type: string;
  findings: string[];
  confidence: number;
  supporting_evidence: string[];
  limitations?: string[];
}

/**
 * Intelligence archive
 */
export interface IntelligenceArchive {
  archive_id: string;
  target_id?: string;
  area_of_interest?: BoundingBox;
  images: SatelliteImage[];
  detection_results: DetectionResult[];
  change_results: ChangeDetectionResult[];
  products: GEOINTProduct[];
  temporal_coverage: {
    start_date: Date;
    end_date: Date;
  };
  metadata: Record<string, any>;
  indexed_at: Date;
  last_updated: Date;
}

/**
 * Trending analysis
 */
export interface TrendingAnalysis {
  trend_id: string;
  metric_name: string;
  time_series: TimeSeriesPoint[];
  trend_direction: 'increasing' | 'decreasing' | 'stable' | 'cyclical';
  rate_of_change: number;
  statistical_significance: number;
  forecast?: Forecast;
}

/**
 * Time series point
 */
export interface TimeSeriesPoint {
  timestamp: Date;
  value: number;
  confidence?: number;
}

/**
 * Forecast
 */
export interface Forecast {
  forecast_points: TimeSeriesPoint[];
  method: string;
  confidence_interval: number;
}

/**
 * Export configuration
 */
export interface ExportConfig {
  format: 'geotiff' | 'kml' | 'kmz' | 'shp' | 'geojson' | 'pdf' | 'pptx';
  include_annotations: boolean;
  include_metadata: boolean;
  classification_marking: string;
  compression?: boolean;
  resolution?: number;
}
