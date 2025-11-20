/**
 * Geospatial Analysis - Core Types
 *
 * Types for terrain analysis, viewshed, and geospatial intelligence
 */

import { GeoCoordinate, BoundingBox } from '../../satellite-imagery/src/types';

/**
 * Digital Elevation Model
 */
export interface DigitalElevationModel {
  dem_id: string;
  source: 'srtm' | 'aster' | 'ned' | 'lidar' | 'custom';
  resolution_meters: number;
  area: BoundingBox;
  elevation_data_uri: string;
  min_elevation_m: number;
  max_elevation_m: number;
  vertical_accuracy_m: number;
  projection: string;
  datum: string;
}

/**
 * Terrain analysis result
 */
export interface TerrainAnalysis {
  analysis_id: string;
  dem: DigitalElevationModel;
  slope_uri?: string;
  aspect_uri?: string;
  hillshade_uri?: string;
  roughness_uri?: string;
  tpi_uri?: string; // Topographic Position Index
  tri_uri?: string; // Terrain Ruggedness Index
}

/**
 * Slope analysis
 */
export interface SlopeAnalysis {
  location: GeoCoordinate;
  slope_degrees: number;
  slope_percent: number;
  slope_category: 'flat' | 'gentle' | 'moderate' | 'steep' | 'very_steep';
  suitable_for_construction: boolean;
  erosion_risk: 'low' | 'medium' | 'high';
}

/**
 * Aspect analysis
 */
export interface AspectAnalysis {
  location: GeoCoordinate;
  aspect_degrees: number; // 0-360, 0 = North
  aspect_direction: 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';
  solar_exposure: 'low' | 'medium' | 'high';
}

/**
 * Viewshed analysis
 */
export interface ViewshedAnalysis {
  viewshed_id: string;
  observer_location: GeoCoordinate;
  observer_height_m: number;
  target_height_m: number;
  max_distance_km: number;
  visible_area_sqkm: number;
  viewshed_map_uri: string;
  visible_points: GeoCoordinate[];
  visibility_percentage: number;
}

/**
 * Line of sight analysis
 */
export interface LineOfSightAnalysis {
  los_id: string;
  observer: GeoCoordinate;
  target: GeoCoordinate;
  observer_height_m: number;
  target_height_m: number;
  visible: boolean;
  distance_km: number;
  elevation_profile: ElevationPoint[];
  obstruction?: Obstruction;
}

/**
 * Elevation point along profile
 */
export interface ElevationPoint {
  location: GeoCoordinate;
  distance_from_start_m: number;
  elevation_m: number;
  los_height_m: number;
  visible: boolean;
}

/**
 * LOS obstruction
 */
export interface Obstruction {
  location: GeoCoordinate;
  distance_from_observer_m: number;
  terrain_elevation_m: number;
  required_elevation_m: number;
  clearance_m: number;
}

/**
 * Elevation profile
 */
export interface ElevationProfile {
  profile_id: string;
  start_point: GeoCoordinate;
  end_point: GeoCoordinate;
  total_distance_m: number;
  points: ElevationPoint[];
  min_elevation_m: number;
  max_elevation_m: number;
  elevation_gain_m: number;
  elevation_loss_m: number;
}

/**
 * Hydrological analysis
 */
export interface HydrologicalAnalysis {
  analysis_id: string;
  watershed_uri?: string;
  flow_direction_uri?: string;
  flow_accumulation_uri?: string;
  stream_network_uri?: string;
  watersheds: Watershed[];
  streams: StreamSegment[];
}

/**
 * Watershed
 */
export interface Watershed {
  watershed_id: string;
  outlet_point: GeoCoordinate;
  area_sqkm: number;
  perimeter_km: number;
  boundary: GeoCoordinate[];
  stream_order: number;
}

/**
 * Stream segment
 */
export interface StreamSegment {
  stream_id: string;
  coordinates: GeoCoordinate[];
  length_km: number;
  stream_order: number;
  upstream_area_sqkm: number;
  gradient: number;
}

/**
 * Accessibility analysis
 */
export interface AccessibilityAnalysis {
  analysis_id: string;
  origin: GeoCoordinate;
  max_travel_time_minutes: number;
  transport_mode: 'walking' | 'driving' | 'helicopter';
  accessible_area_sqkm: number;
  isochrones: Isochrone[];
  reachable_points: ReachablePoint[];
}

/**
 * Isochrone (equal time contour)
 */
export interface Isochrone {
  travel_time_minutes: number;
  boundary: GeoCoordinate[];
  area_sqkm: number;
}

/**
 * Reachable point
 */
export interface ReachablePoint {
  location: GeoCoordinate;
  travel_time_minutes: number;
  route_distance_km: number;
}

/**
 * Coverage analysis
 */
export interface CoverageAnalysis {
  analysis_id: string;
  sensor_locations: SensorLocation[];
  total_coverage_area_sqkm: number;
  coverage_percentage: number;
  coverage_map_uri: string;
  gap_areas: BoundingBox[];
  redundancy_map_uri?: string;
}

/**
 * Sensor location
 */
export interface SensorLocation {
  sensor_id: string;
  location: GeoCoordinate;
  height_m: number;
  coverage_radius_km?: number;
  field_of_view_degrees?: number;
  azimuth_degrees?: number;
  coverage_area_sqkm: number;
}

/**
 * 3D terrain visualization
 */
export interface TerrainVisualization {
  visualization_id: string;
  area: BoundingBox;
  dem: DigitalElevationModel;
  imagery_overlay?: string;
  mesh_uri: string;
  texture_uri?: string;
  vertical_exaggeration: number;
  camera_positions?: CameraPosition[];
}

/**
 * Camera position for visualization
 */
export interface CameraPosition {
  position: GeoCoordinate;
  target: GeoCoordinate;
  field_of_view_degrees: number;
  name?: string;
}

/**
 * Mission planning support
 */
export interface MissionPlan {
  plan_id: string;
  mission_name: string;
  area_of_operations: BoundingBox;
  objectives: MissionObjective[];
  routes: Route[];
  landing_zones?: LandingZone[];
  observation_points?: ObservationPoint[];
  threat_analysis?: ThreatAnalysis;
}

/**
 * Mission objective
 */
export interface MissionObjective {
  objective_id: string;
  objective_type: 'observation' | 'reconnaissance' | 'surveillance' | 'other';
  location: GeoCoordinate;
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
}

/**
 * Route planning
 */
export interface Route {
  route_id: string;
  waypoints: Waypoint[];
  total_distance_km: number;
  estimated_duration_minutes: number;
  elevation_profile: ElevationProfile;
  terrain_analysis: RouteTerrainAnalysis;
  visibility_analysis?: RouteVisibilityAnalysis;
}

/**
 * Waypoint
 */
export interface Waypoint {
  waypoint_id: string;
  location: GeoCoordinate;
  elevation_m: number;
  name?: string;
  waypoint_type: 'start' | 'intermediate' | 'end' | 'checkpoint';
  actions?: string[];
}

/**
 * Route terrain analysis
 */
export interface RouteTerrainAnalysis {
  max_slope_degrees: number;
  avg_slope_degrees: number;
  total_elevation_gain_m: number;
  total_elevation_loss_m: number;
  terrain_difficulty: 'easy' | 'moderate' | 'difficult' | 'extreme';
  obstacles: TerrainObstacle[];
}

/**
 * Terrain obstacle
 */
export interface TerrainObstacle {
  obstacle_id: string;
  location: GeoCoordinate;
  obstacle_type: 'cliff' | 'water' | 'dense_vegetation' | 'urban' | 'other';
  severity: 'low' | 'medium' | 'high';
  bypass_route?: GeoCoordinate[];
}

/**
 * Route visibility analysis
 */
export interface RouteVisibilityAnalysis {
  exposed_segments: RouteSegment[];
  concealed_segments: RouteSegment[];
  exposure_percentage: number;
  threat_exposure: ThreatExposure[];
}

/**
 * Route segment
 */
export interface RouteSegment {
  start_point: GeoCoordinate;
  end_point: GeoCoordinate;
  length_km: number;
  exposure_level: number; // 0-1
}

/**
 * Threat exposure
 */
export interface ThreatExposure {
  threat_location: GeoCoordinate;
  threat_type: string;
  exposure_duration_minutes: number;
  exposure_segments: RouteSegment[];
  mitigation_options?: string[];
}

/**
 * Landing zone analysis
 */
export interface LandingZone {
  lz_id: string;
  location: GeoCoordinate;
  area_sqm: number;
  suitability_score: number; // 0-100
  slope_degrees: number;
  obstacles: string[];
  surface_type: string;
  accessibility: AccessibilityAnalysis;
  approach_corridors: ApproachCorridor[];
}

/**
 * Approach corridor
 */
export interface ApproachCorridor {
  corridor_id: string;
  heading_degrees: number;
  width_m: number;
  length_m: number;
  clear: boolean;
  obstacles: string[];
}

/**
 * Observation point analysis
 */
export interface ObservationPoint {
  point_id: string;
  location: GeoCoordinate;
  elevation_m: number;
  viewshed: ViewshedAnalysis;
  concealment_score: number; // 0-100
  access_difficulty: 'easy' | 'moderate' | 'difficult';
  tactical_value: number; // 0-100
}

/**
 * Threat analysis
 */
export interface ThreatAnalysis {
  analysis_id: string;
  threat_locations: ThreatLocation[];
  threat_coverage_map_uri: string;
  safe_corridors: SafeCorridor[];
  risk_assessment: RiskAssessment;
}

/**
 * Threat location
 */
export interface ThreatLocation {
  threat_id: string;
  location: GeoCoordinate;
  threat_type: string;
  range_km: number;
  coverage_area: BoundingBox;
  threat_level: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Safe corridor
 */
export interface SafeCorridor {
  corridor_id: string;
  path: GeoCoordinate[];
  width_m: number;
  threat_exposure: number; // 0-1
  recommended: boolean;
}

/**
 * Risk assessment
 */
export interface RiskAssessment {
  overall_risk: 'low' | 'medium' | 'high' | 'critical';
  risk_factors: RiskFactor[];
  mitigation_recommendations: string[];
}

/**
 * Risk factor
 */
export interface RiskFactor {
  factor: string;
  severity: 'low' | 'medium' | 'high';
  likelihood: 'low' | 'medium' | 'high';
  impact: string;
}
