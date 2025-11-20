/**
 * SAR Processing - Core Types
 *
 * Types for Synthetic Aperture Radar processing and analysis
 */

import { GeoCoordinate, BoundingBox, SatelliteImage, SARMode } from '../../satellite-imagery/src/types';

/**
 * SAR polarization
 */
export enum SARPolarization {
  HH = 'hh', // Horizontal transmit, Horizontal receive
  HV = 'hv', // Horizontal transmit, Vertical receive
  VH = 'vh', // Vertical transmit, Horizontal receive
  VV = 'vv'  // Vertical transmit, Vertical receive
}

/**
 * SAR product type
 */
export enum SARProductType {
  SLC = 'slc', // Single Look Complex
  GRD = 'grd', // Ground Range Detected
  OCN = 'ocn', // Ocean product
  RAW = 'raw'  // Raw data
}

/**
 * InSAR processing level
 */
export enum InSARProcessingLevel {
  INTERFEROGRAM = 'interferogram',
  COHERENCE = 'coherence',
  UNWRAPPED = 'unwrapped',
  DISPLACEMENT = 'displacement',
  VELOCITY = 'velocity'
}

/**
 * SAR image metadata
 */
export interface SARImageMetadata {
  sar_mode: SARMode;
  polarization: SARPolarization[];
  product_type: SARProductType;
  wavelength_cm: number;
  frequency_ghz: number;
  range_resolution_m: number;
  azimuth_resolution_m: number;
  range_looks: number;
  azimuth_looks: number;
  incidence_angle_near: number;
  incidence_angle_far: number;
  orbit_number: number;
  pass_direction: 'ascending' | 'descending';
  polarimetric: boolean;
}

/**
 * InSAR pair
 */
export interface InSARPair {
  master_image: SatelliteImage;
  slave_image: SatelliteImage;
  temporal_baseline_days: number;
  perpendicular_baseline_meters: number;
  coherence_estimate: number;
  suitable_for_insar: boolean;
  critical_baseline_meters: number;
}

/**
 * Interferogram
 */
export interface Interferogram {
  interferogram_id: string;
  insar_pair: InSARPair;
  phase_data_uri: string;
  coherence_data_uri: string;
  amplitude_data_uri: string;
  wavelength_cm: number;
  fringes_per_cycle: number;
  flat_earth_removed: boolean;
  topographic_phase_removed: boolean;
  processing_date: Date;
}

/**
 * Phase unwrapping result
 */
export interface UnwrappedPhase {
  unwrapped_id: string;
  interferogram: Interferogram;
  unwrapped_phase_uri: string;
  unwrapping_method: 'snaphu' | 'branch_cut' | 'minimum_cost_flow' | 'statistical_cost';
  quality_map_uri?: string;
  residues_count: number;
  unwrapping_errors?: number;
}

/**
 * Displacement map
 */
export interface DisplacementMap {
  displacement_id: string;
  unwrapped_phase: UnwrappedPhase;
  displacement_uri: string;
  displacement_direction: 'line_of_sight' | 'vertical' | 'horizontal' | '3d';
  min_displacement_mm: number;
  max_displacement_mm: number;
  mean_displacement_mm: number;
  std_displacement_mm: number;
  reference_point?: GeoCoordinate;
}

/**
 * Subsidence detection result
 */
export interface SubsidenceDetection {
  detection_id: string;
  location: BoundingBox;
  center_point: GeoCoordinate;
  max_subsidence_mm_per_year: number;
  area_affected_sqkm: number;
  subsidence_rate_map_uri: string;
  time_series: SubsidenceTimeSeries[];
  confidence: number;
  cause?: 'groundwater_extraction' | 'mining' | 'oil_gas_extraction' | 'natural' | 'unknown';
}

/**
 * Subsidence time series
 */
export interface SubsidenceTimeSeries {
  date: Date;
  displacement_mm: number;
  uncertainty_mm: number;
}

/**
 * Coherent Change Detection (CCD) result
 */
export interface CoherentChangeDetection {
  ccd_id: string;
  reference_image: SatelliteImage;
  comparison_image: SatelliteImage;
  coherence_map_uri: string;
  change_map_uri: string;
  changes_detected: CCDChange[];
  processing_method: 'amplitude' | 'phase' | 'coherence' | 'hybrid';
}

/**
 * CCD detected change
 */
export interface CCDChange {
  change_id: string;
  location: BoundingBox;
  center_point: GeoCoordinate;
  area_sqm: number;
  coherence_before: number;
  coherence_after: number;
  coherence_loss: number;
  change_type: 'construction' | 'destruction' | 'flooding' | 'vegetation' | 'other';
  confidence: number;
}

/**
 * Ground Moving Target Indicator (GMTI) detection
 */
export interface GMTIDetection {
  detection_id: string;
  image_id: string;
  targets: MovingTarget[];
  detection_time: Date;
  min_detectable_velocity_mps: number;
}

/**
 * Moving target
 */
export interface MovingTarget {
  target_id: string;
  position: GeoCoordinate;
  velocity_mps: number;
  heading_degrees: number;
  radar_cross_section_dbsm?: number;
  target_type?: 'vehicle' | 'ship' | 'aircraft' | 'unknown';
  confidence: number;
}

/**
 * Polarimetric SAR decomposition
 */
export interface PolSARDecomposition {
  decomposition_id: string;
  sar_image: SatelliteImage;
  method: 'freeman_durden' | 'yamaguchi' | 'cloude_pottier' | 'van_zyl';
  surface_scattering_uri: string;
  double_bounce_uri: string;
  volume_scattering_uri: string;
  helix_scattering_uri?: string;
}

/**
 * Target classification result
 */
export interface SARTargetClassification {
  classification_id: string;
  target_location: GeoCoordinate;
  target_type: string;
  confidence: number;
  features: SARTargetFeatures;
  polarimetric_signature?: PolSARDecomposition;
}

/**
 * SAR target features
 */
export interface SARTargetFeatures {
  radar_cross_section: number;
  aspect_ratio?: number;
  orientation_degrees?: number;
  texture_features?: number[];
  polarimetric_features?: Record<string, number>;
}

/**
 * Oil spill detection (SAR-specific)
 */
export interface SAROilSpillDetection {
  detection_id: string;
  image_id: string;
  spill_polygons: GeoCoordinate[][];
  total_area_sqkm: number;
  dark_spot_confidence: number;
  look_alike_probability: number; // Probability of false alarm (natural phenomena)
  wind_speed_mps?: number;
  wind_direction_degrees?: number;
  slick_characteristics: SlickCharacteristics;
}

/**
 * Oil slick characteristics
 */
export interface SlickCharacteristics {
  length_km: number;
  width_km: number;
  orientation_degrees: number;
  shape: 'elongated' | 'circular' | 'irregular';
  internal_structure: 'homogeneous' | 'heterogeneous';
  edge_characteristics: 'sharp' | 'diffuse';
}

/**
 * Flood mapping result
 */
export interface SARFloodMapping {
  mapping_id: string;
  image_id: string;
  flooded_area_sqkm: number;
  water_extent_uri: string;
  water_polygons: GeoCoordinate[][];
  flood_depth_estimate?: FloodDepthEstimate[];
  affected_infrastructure?: AffectedInfrastructure;
}

/**
 * Flood depth estimate
 */
export interface FloodDepthEstimate {
  location: GeoCoordinate;
  estimated_depth_meters: number;
  confidence: number;
}

/**
 * Affected infrastructure
 */
export interface AffectedInfrastructure {
  roads_km: number;
  buildings_count: number;
  agricultural_land_hectares: number;
  estimated_population_affected: number;
}

/**
 * Maritime surveillance result
 */
export interface MaritimeSurveillance {
  surveillance_id: string;
  image_id: string;
  area_covered: BoundingBox;
  ships_detected: ShipDetection[];
  wake_detections: WakeDetection[];
  illegal_fishing_alerts?: IllegalFishingAlert[];
  surveillance_time: Date;
}

/**
 * Ship detection (SAR-specific)
 */
export interface ShipDetection {
  detection_id: string;
  position: GeoCoordinate;
  length_meters: number;
  heading_degrees: number;
  speed_knots?: number;
  radar_signature: number;
  ship_type_estimate?: string;
  ais_correlation?: AISData;
}

/**
 * AIS (Automatic Identification System) data
 */
export interface AISData {
  mmsi: string;
  vessel_name: string;
  vessel_type: string;
  ais_position: GeoCoordinate;
  ais_time: Date;
  position_discrepancy_meters?: number; // Distance between SAR and AIS position
}

/**
 * Wake detection
 */
export interface WakeDetection {
  wake_id: string;
  wake_pattern: GeoCoordinate[];
  associated_ship?: string; // Ship detection ID
  wake_angle_degrees: number;
  estimated_speed_knots?: number;
}

/**
 * Illegal fishing alert
 */
export interface IllegalFishingAlert {
  alert_id: string;
  ship_detection: ShipDetection;
  alert_reason: string[];
  in_prohibited_zone: boolean;
  ais_transmitter_off: boolean;
  suspicious_behavior: boolean;
  priority: 'low' | 'medium' | 'high';
}

/**
 * SAR processing configuration
 */
export interface SARProcessingConfig {
  calibration: boolean;
  speckle_filtering: boolean;
  speckle_filter_type?: 'lee' | 'frost' | 'gamma_map' | 'refined_lee';
  multilooking: boolean;
  range_looks?: number;
  azimuth_looks?: number;
  terrain_correction: boolean;
  radiometric_correction: boolean;
}

/**
 * InSAR processing configuration
 */
export interface InSARProcessingConfig {
  coregistration_method: 'cross_correlation' | 'coherence' | 'dem_assisted';
  dem_source: 'srtm' | 'aster' | 'custom';
  flat_earth_removal: boolean;
  topographic_phase_removal: boolean;
  filtering_method?: 'goldstein' | 'boxcar' | 'gaussian';
  unwrapping_method: 'snaphu' | 'branch_cut' | 'minimum_cost_flow';
  geocoding: boolean;
}
