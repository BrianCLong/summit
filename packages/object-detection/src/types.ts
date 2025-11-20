/**
 * Object Detection and Recognition - Core Types
 *
 * Types for detecting and classifying objects in satellite imagery
 */

import { GeoCoordinate, BoundingBox } from '../../satellite-imagery/src/types';

/**
 * Object types that can be detected
 */
export enum ObjectType {
  AIRCRAFT = 'aircraft',
  VEHICLE = 'vehicle',
  SHIP = 'ship',
  BUILDING = 'building',
  INFRASTRUCTURE = 'infrastructure',
  MILITARY_ASSET = 'military_asset',
  VEGETATION = 'vegetation',
  WATER_BODY = 'water_body',
  ROAD = 'road',
  RUNWAY = 'runway',
  STORAGE_TANK = 'storage_tank',
  CROWD = 'crowd',
  UNKNOWN = 'unknown'
}

/**
 * Aircraft classifications
 */
export enum AircraftType {
  FIGHTER = 'fighter',
  BOMBER = 'bomber',
  TRANSPORT = 'transport',
  HELICOPTER = 'helicopter',
  UAV = 'uav',
  COMMERCIAL = 'commercial',
  CARGO = 'cargo',
  UNKNOWN = 'unknown'
}

/**
 * Vehicle classifications
 */
export enum VehicleType {
  CAR = 'car',
  TRUCK = 'truck',
  TANK = 'tank',
  APC = 'apc', // Armored Personnel Carrier
  ARTILLERY = 'artillery',
  MISSILE_LAUNCHER = 'missile_launcher',
  BUS = 'bus',
  UNKNOWN = 'unknown'
}

/**
 * Ship classifications
 */
export enum ShipType {
  CARRIER = 'carrier',
  DESTROYER = 'destroyer',
  SUBMARINE = 'submarine',
  CARGO = 'cargo',
  TANKER = 'tanker',
  FISHING = 'fishing',
  PATROL = 'patrol',
  YACHT = 'yacht',
  UNKNOWN = 'unknown'
}

/**
 * Building classifications
 */
export enum BuildingType {
  RESIDENTIAL = 'residential',
  COMMERCIAL = 'commercial',
  INDUSTRIAL = 'industrial',
  MILITARY = 'military',
  HANGAR = 'hangar',
  WAREHOUSE = 'warehouse',
  POWER_PLANT = 'power_plant',
  UNKNOWN = 'unknown'
}

/**
 * Detected object
 */
export interface DetectedObject {
  object_id: string;
  object_type: ObjectType;
  classification?: string; // Specific type (e.g., AircraftType)
  confidence: number; // 0-1
  bounding_box: BoundingBox;
  center_point: GeoCoordinate;
  pixel_coordinates: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  area_square_meters?: number;
  dimensions?: {
    length_meters?: number;
    width_meters?: number;
    height_meters?: number;
  };
  orientation_degrees?: number; // 0-360
  attributes?: Record<string, any>;
  detected_at: Date;
  image_id: string;
}

/**
 * Aircraft detection result
 */
export interface AircraftDetection extends DetectedObject {
  object_type: ObjectType.AIRCRAFT;
  aircraft_type: AircraftType;
  wingspan_meters?: number;
  length_meters?: number;
  tail_number?: string;
  parking_status?: 'parked' | 'taxiing' | 'flying';
  alert_status?: 'armed' | 'unarmed' | 'unknown';
}

/**
 * Vehicle detection result
 */
export interface VehicleDetection extends DetectedObject {
  object_type: ObjectType.VEHICLE;
  vehicle_type: VehicleType;
  in_formation?: boolean;
  convoy_id?: string;
  moving?: boolean;
  speed_kph?: number;
}

/**
 * Ship detection result
 */
export interface ShipDetection extends DetectedObject {
  object_type: ObjectType.SHIP;
  ship_type: ShipType;
  mmsi?: string; // Maritime Mobile Service Identity
  imo_number?: string;
  vessel_name?: string;
  length_meters?: number;
  heading_degrees?: number;
  speed_knots?: number;
  port_of_registry?: string;
  in_port?: boolean;
}

/**
 * Building detection result
 */
export interface BuildingDetection extends DetectedObject {
  object_type: ObjectType.BUILDING;
  building_type: BuildingType;
  footprint_area_sqm?: number;
  height_meters?: number;
  number_of_floors?: number;
  roof_type?: string;
  construction_material?: string;
}

/**
 * Object detection configuration
 */
export interface DetectionConfig {
  object_types: ObjectType[];
  min_confidence: number;
  max_objects?: number;
  use_gpu: boolean;
  model_name: string;
  model_version: string;
  nms_threshold?: number; // Non-maximum suppression
  batch_size?: number;
}

/**
 * Detection model metadata
 */
export interface DetectionModel {
  model_id: string;
  model_name: string;
  model_version: string;
  object_types: ObjectType[];
  architecture: 'yolo' | 'faster_rcnn' | 'ssd' | 'retinanet' | 'efficientdet' | 'custom';
  input_size: number;
  mean_average_precision: number; // mAP metric
  inference_time_ms: number;
  training_dataset: string;
  created_at: Date;
}

/**
 * Batch detection result
 */
export interface DetectionResult {
  image_id: string;
  objects: DetectedObject[];
  total_objects: number;
  objects_by_type: Record<ObjectType, number>;
  detection_time_ms: number;
  model_used: string;
  confidence_threshold: number;
}

/**
 * Object tracking result
 */
export interface TrackedObject {
  track_id: string;
  object_type: ObjectType;
  detections: DetectedObject[];
  first_seen: Date;
  last_seen: Date;
  trajectory?: GeoCoordinate[];
  average_speed_kph?: number;
  movement_pattern?: 'stationary' | 'linear' | 'circular' | 'random';
  status: 'active' | 'lost' | 'completed';
}

/**
 * Counting result
 */
export interface CountingResult {
  image_id: string;
  object_type: ObjectType;
  total_count: number;
  count_by_classification?: Record<string, number>;
  density_per_sqkm?: number;
  confidence_score: number;
  counting_method: 'detection' | 'density_estimation' | 'regression';
}

/**
 * Crowd estimation result
 */
export interface CrowdEstimation {
  image_id: string;
  estimated_count: number;
  confidence_interval: {
    lower: number;
    upper: number;
  };
  density_map_uri?: string;
  crowd_areas: BoundingBox[];
  method: 'density_map' | 'detection' | 'regression';
}

/**
 * Infrastructure mapping result
 */
export interface InfrastructureMap {
  map_id: string;
  area_of_interest: BoundingBox;
  roads: RoadSegment[];
  buildings: BuildingDetection[];
  runways: RunwayDetection[];
  storage_tanks: StorageTankDetection[];
  power_lines?: PowerLineDetection[];
  created_at: Date;
}

/**
 * Road segment
 */
export interface RoadSegment {
  segment_id: string;
  coordinates: GeoCoordinate[];
  road_type: 'highway' | 'primary' | 'secondary' | 'local' | 'unpaved';
  width_meters?: number;
  length_meters: number;
  surface_condition?: 'good' | 'fair' | 'poor';
}

/**
 * Runway detection
 */
export interface RunwayDetection {
  runway_id: string;
  center_line: GeoCoordinate[];
  length_meters: number;
  width_meters: number;
  heading_degrees: number;
  surface_type: 'paved' | 'unpaved' | 'grass';
  condition: 'operational' | 'damaged' | 'under_construction';
  markings_visible: boolean;
}

/**
 * Storage tank detection
 */
export interface StorageTankDetection extends DetectedObject {
  object_type: ObjectType.STORAGE_TANK;
  tank_type: 'cylindrical' | 'spherical' | 'rectangular';
  diameter_meters?: number;
  height_meters?: number;
  capacity_estimate_cubic_meters?: number;
  roof_type: 'fixed' | 'floating' | 'dome';
  contents?: 'oil' | 'gas' | 'water' | 'chemical' | 'unknown';
}

/**
 * Power line detection
 */
export interface PowerLineDetection {
  line_id: string;
  coordinates: GeoCoordinate[];
  length_meters: number;
  voltage_class?: 'transmission' | 'distribution';
  tower_locations?: GeoCoordinate[];
}

/**
 * Agricultural assessment
 */
export interface AgriculturalAssessment {
  assessment_id: string;
  area: BoundingBox;
  crop_type?: string;
  health_index: number; // NDVI-based, 0-1
  growth_stage?: string;
  estimated_yield?: number;
  irrigation_detected: boolean;
  area_hectares: number;
  assessment_date: Date;
}

/**
 * Deforestation detection
 */
export interface DeforestationDetection {
  detection_id: string;
  area: BoundingBox;
  deforested_area_hectares: number;
  forest_loss_percentage: number;
  detection_method: 'change_detection' | 'classification';
  confidence: number;
  reference_date: Date;
  comparison_date: Date;
}

/**
 * Oil spill detection
 */
export interface OilSpillDetection {
  spill_id: string;
  location: GeoCoordinate[];
  area_square_km: number;
  thickness_estimate?: string;
  source_identified: boolean;
  source_location?: GeoCoordinate;
  wind_direction?: number;
  drift_prediction?: GeoCoordinate[];
  detection_method: 'sar' | 'optical' | 'hybrid';
  confidence: number;
  detected_at: Date;
}
