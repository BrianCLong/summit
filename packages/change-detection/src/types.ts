/**
 * Change Detection - Core Types
 *
 * Types for detecting changes in satellite imagery over time
 */

import { GeoCoordinate, BoundingBox, SatelliteImage } from '../../satellite-imagery/src/types';

/**
 * Change types
 */
export enum ChangeType {
  BUILDING_CONSTRUCTION = 'building_construction',
  BUILDING_DESTRUCTION = 'building_destruction',
  INFRASTRUCTURE_ADDITION = 'infrastructure_addition',
  INFRASTRUCTURE_REMOVAL = 'infrastructure_removal',
  VEGETATION_CHANGE = 'vegetation_change',
  LAND_USE_CHANGE = 'land_use_change',
  DISASTER_DAMAGE = 'disaster_damage',
  MILITARY_ACTIVITY = 'military_activity',
  BORDER_CHANGE = 'border_change',
  CAMP_EXPANSION = 'camp_expansion',
  UNKNOWN = 'unknown'
}

/**
 * Change severity
 */
export enum ChangeSeverity {
  MINOR = 'minor',
  MODERATE = 'moderate',
  MAJOR = 'major',
  CRITICAL = 'critical'
}

/**
 * Change detection method
 */
export enum ChangeDetectionMethod {
  IMAGE_DIFFERENCING = 'image_differencing',
  CHANGE_VECTOR_ANALYSIS = 'change_vector_analysis',
  POST_CLASSIFICATION = 'post_classification',
  PRINCIPAL_COMPONENT_ANALYSIS = 'pca',
  MULTIVARIATE_ALTERATION_DETECTION = 'mad',
  DEEP_LEARNING = 'deep_learning',
  COHERENT_CHANGE_DETECTION = 'ccd' // For SAR
}

/**
 * Detected change
 */
export interface DetectedChange {
  change_id: string;
  change_type: ChangeType;
  severity: ChangeSeverity;
  confidence: number;
  location: BoundingBox;
  center_point: GeoCoordinate;
  area_square_meters: number;
  reference_image_id: string;
  comparison_image_id: string;
  reference_date: Date;
  comparison_date: Date;
  time_difference_days: number;
  description?: string;
  attributes?: Record<string, any>;
  detected_at: Date;
}

/**
 * Building change detection
 */
export interface BuildingChange extends DetectedChange {
  change_type: ChangeType.BUILDING_CONSTRUCTION | ChangeType.BUILDING_DESTRUCTION;
  building_count_before: number;
  building_count_after: number;
  buildings_added: number;
  buildings_removed: number;
  total_area_changed_sqm: number;
  construction_progress_percentage?: number;
}

/**
 * Infrastructure change
 */
export interface InfrastructureChange extends DetectedChange {
  change_type: ChangeType.INFRASTRUCTURE_ADDITION | ChangeType.INFRASTRUCTURE_REMOVAL;
  infrastructure_type: 'road' | 'bridge' | 'runway' | 'power_line' | 'pipeline' | 'other';
  length_meters?: number;
  completion_percentage?: number;
}

/**
 * Vegetation change
 */
export interface VegetationChange extends DetectedChange {
  change_type: ChangeType.VEGETATION_CHANGE;
  ndvi_before: number;
  ndvi_after: number;
  ndvi_difference: number;
  vegetation_loss_hectares?: number;
  vegetation_gain_hectares?: number;
  deforestation?: boolean;
  agricultural_expansion?: boolean;
}

/**
 * Disaster damage assessment
 */
export interface DisasterDamage extends DetectedChange {
  change_type: ChangeType.DISASTER_DAMAGE;
  disaster_type: 'earthquake' | 'flood' | 'fire' | 'hurricane' | 'explosion' | 'other';
  damage_level: 'destroyed' | 'severe' | 'moderate' | 'light';
  structures_affected: number;
  estimated_affected_population?: number;
}

/**
 * Military activity change
 */
export interface MilitaryActivityChange extends DetectedChange {
  change_type: ChangeType.MILITARY_ACTIVITY;
  activity_type: 'deployment' | 'withdrawal' | 'fortification' | 'exercise' | 'other';
  asset_count_before: number;
  asset_count_after: number;
  asset_types?: string[];
}

/**
 * Change detection configuration
 */
export interface ChangeDetectionConfig {
  method: ChangeDetectionMethod;
  min_change_area_sqm: number;
  min_confidence: number;
  sensitivity: 'low' | 'medium' | 'high';
  ignore_seasonal_changes: boolean;
  ignore_shadow_changes: boolean;
  multi_temporal: boolean;
}

/**
 * Change detection result
 */
export interface ChangeDetectionResult {
  result_id: string;
  reference_image: SatelliteImage;
  comparison_image: SatelliteImage;
  method: ChangeDetectionMethod;
  changes: DetectedChange[];
  total_changes: number;
  total_area_changed_sqm: number;
  change_percentage: number;
  change_map_uri?: string;
  confidence_map_uri?: string;
  processing_time_ms: number;
  detected_at: Date;
}

/**
 * Time series analysis result
 */
export interface TimeSeriesAnalysis {
  analysis_id: string;
  location: BoundingBox;
  images: SatelliteImage[];
  start_date: Date;
  end_date: Date;
  changes: DetectedChange[];
  change_timeline: ChangeTimelineEvent[];
  trends: ChangeTrend[];
}

/**
 * Change timeline event
 */
export interface ChangeTimelineEvent {
  date: Date;
  change_type: ChangeType;
  description: string;
  severity: ChangeSeverity;
  location: GeoCoordinate;
  image_id: string;
}

/**
 * Change trend
 */
export interface ChangeTrend {
  trend_id: string;
  change_type: ChangeType;
  trend_direction: 'increasing' | 'decreasing' | 'stable' | 'fluctuating';
  rate_of_change: number;
  confidence: number;
  projection?: {
    future_date: Date;
    projected_value: number;
  };
}

/**
 * Change alert
 */
export interface ChangeAlert {
  alert_id: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  change: DetectedChange;
  alert_conditions: string[];
  recipients: string[];
  notification_sent: boolean;
  created_at: Date;
  acknowledged_at?: Date;
  acknowledged_by?: string;
}

/**
 * Change detection subscription
 */
export interface ChangeDetectionSubscription {
  subscription_id: string;
  user_id: string;
  area_of_interest: BoundingBox;
  change_types: ChangeType[];
  min_severity: ChangeSeverity;
  check_frequency_hours: number;
  alert_method: 'email' | 'webhook' | 'sms' | 'all';
  active: boolean;
  created_at: Date;
  last_check: Date;
}

/**
 * Comparison pair
 */
export interface ImageComparisonPair {
  reference_image: SatelliteImage;
  comparison_image: SatelliteImage;
  time_difference_days: number;
  spatial_overlap_percentage: number;
  suitable_for_comparison: boolean;
  issues?: string[];
}
