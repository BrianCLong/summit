/**
 * Satellite Imagery Platform - Core Types
 *
 * Comprehensive types for satellite imagery ingestion, processing, and analysis
 */

/**
 * Satellite imagery source types
 */
export enum ImagerySource {
  MAXAR = 'maxar',
  PLANET = 'planet',
  AIRBUS = 'airbus',
  LANDSAT = 'landsat',
  SENTINEL = 'sentinel',
  GOVERNMENT = 'government',
  COMMERCIAL = 'commercial',
  CUSTOM = 'custom'
}

/**
 * Imagery types and sensor modes
 */
export enum ImageryType {
  ELECTRO_OPTICAL = 'electro_optical',
  SAR = 'sar',
  MULTISPECTRAL = 'multispectral',
  HYPERSPECTRAL = 'hyperspectral',
  INFRARED = 'infrared',
  FULL_MOTION_VIDEO = 'fmv',
  PANCHROMATIC = 'panchromatic',
  THERMAL = 'thermal'
}

/**
 * SAR imaging modes
 */
export enum SARMode {
  STRIPMAP = 'stripmap',
  SPOTLIGHT = 'spotlight',
  SCANSAR = 'scansar',
  TOPSAR = 'topsar',
  INTERFEROMETRIC = 'interferometric',
  POLARIMETRIC = 'polarimetric'
}

/**
 * Image processing status
 */
export enum ProcessingStatus {
  RAW = 'raw',
  PREPROCESSING = 'preprocessing',
  CORRECTED = 'corrected',
  ORTHORECTIFIED = 'orthorectified',
  ENHANCED = 'enhanced',
  ANALYZED = 'analyzed',
  ARCHIVED = 'archived',
  FAILED = 'failed'
}

/**
 * Collection priority levels
 */
export enum CollectionPriority {
  ROUTINE = 'routine',
  PRIORITY = 'priority',
  IMMEDIATE = 'immediate',
  FLASH = 'flash'
}

/**
 * Geospatial bounding box
 */
export interface BoundingBox {
  north: number;
  south: number;
  east: number;
  west: number;
}

/**
 * Geographic coordinates
 */
export interface GeoCoordinate {
  latitude: number;
  longitude: number;
  altitude?: number;
}

/**
 * Image resolution metadata
 */
export interface Resolution {
  ground_sample_distance: number; // meters per pixel
  spatial_resolution: number; // meters
  spectral_resolution?: number; // nanometers
  temporal_resolution?: number; // revisit time in hours
  radiometric_resolution?: number; // bits per pixel
}

/**
 * Sensor metadata
 */
export interface SensorMetadata {
  sensor_id: string;
  sensor_type: ImageryType;
  platform_name: string;
  sensor_name: string;
  orbital_altitude?: number; // km
  swath_width?: number; // km
  revisit_time?: number; // days
  resolution: Resolution;
  spectral_bands?: SpectralBand[];
  sar_mode?: SARMode;
  polarization?: string[];
  wavelength?: number; // for SAR, in cm
}

/**
 * Spectral band definition
 */
export interface SpectralBand {
  band_number: number;
  band_name: string;
  wavelength_min: number; // nanometers
  wavelength_max: number; // nanometers
  wavelength_center: number; // nanometers
  bandwidth: number; // nanometers
  purpose?: string;
}

/**
 * Image acquisition metadata
 */
export interface AcquisitionMetadata {
  acquisition_time: Date;
  acquisition_mode: string;
  look_angle?: number; // degrees
  incidence_angle?: number; // degrees
  azimuth_angle?: number; // degrees
  sun_elevation?: number; // degrees
  sun_azimuth?: number; // degrees
  cloud_cover_percentage?: number;
  snow_cover_percentage?: number;
  quality_score?: number; // 0-100
  off_nadir_angle?: number; // degrees
  orbit_direction?: 'ascending' | 'descending';
}

/**
 * Image processing parameters
 */
export interface ProcessingParameters {
  atmospheric_correction?: boolean;
  geometric_correction?: boolean;
  orthorectification?: boolean;
  pan_sharpening?: boolean;
  radiometric_calibration?: boolean;
  noise_reduction?: boolean;
  cloud_removal?: boolean;
  shadow_removal?: boolean;
  resolution_enhancement?: boolean;
  fusion_applied?: string[];
  dem_used?: string; // digital elevation model
  processing_level: string;
  algorithm_version?: string;
}

/**
 * Satellite imagery metadata
 */
export interface ImageryMetadata {
  image_id: string;
  source: ImagerySource;
  imagery_type: ImageryType;
  sensor: SensorMetadata;
  acquisition: AcquisitionMetadata;
  bounding_box: BoundingBox;
  center_point: GeoCoordinate;
  corner_coordinates: GeoCoordinate[];
  processing: ProcessingParameters;
  status: ProcessingStatus;
  file_size_bytes: number;
  file_format: string;
  projection: string;
  datum: string;
  created_at: Date;
  updated_at: Date;
  tags?: string[];
  classification?: string;
}

/**
 * Satellite imagery data
 */
export interface SatelliteImage {
  metadata: ImageryMetadata;
  data_uri: string;
  thumbnail_uri?: string;
  quicklook_uri?: string;
  auxiliary_files?: Record<string, string>;
  bands?: ImageBand[];
  statistics?: ImageStatistics;
}

/**
 * Individual image band data
 */
export interface ImageBand {
  band_number: number;
  band_name: string;
  data_uri: string;
  statistics: BandStatistics;
  spectral_info?: SpectralBand;
}

/**
 * Band-level statistics
 */
export interface BandStatistics {
  min_value: number;
  max_value: number;
  mean_value: number;
  std_deviation: number;
  histogram?: number[];
  no_data_value?: number;
}

/**
 * Image-level statistics
 */
export interface ImageStatistics {
  total_pixels: number;
  valid_pixels: number;
  no_data_pixels: number;
  cloud_pixels?: number;
  shadow_pixels?: number;
  bands: BandStatistics[];
  quality_flags?: Record<string, boolean>;
}

/**
 * Collection tasking request
 */
export interface TaskingRequest {
  request_id: string;
  requester_id: string;
  priority: CollectionPriority;
  target_area: BoundingBox | GeoCoordinate[];
  collection_start: Date;
  collection_end: Date;
  required_resolution?: number;
  required_imagery_types?: ImageryType[];
  max_cloud_cover?: number;
  max_off_nadir?: number;
  specific_sensors?: string[];
  revisit_frequency?: number; // days
  intelligence_requirements?: string[];
  status: 'pending' | 'approved' | 'collecting' | 'completed' | 'cancelled';
  collected_images?: string[]; // image_ids
  created_at: Date;
  updated_at: Date;
}

/**
 * Satellite collection configuration
 */
export interface CollectionConfig {
  auto_download: boolean;
  cloud_threshold: number;
  quality_threshold: number;
  processing_level: string;
  delivery_format: string[];
  notification_endpoints?: string[];
  archive_policy: 'immediate' | 'delayed' | 'on_demand';
  retention_days?: number;
}

/**
 * Image download task
 */
export interface DownloadTask {
  task_id: string;
  image_id: string;
  source: ImagerySource;
  source_identifier: string;
  priority: CollectionPriority;
  status: 'queued' | 'downloading' | 'processing' | 'completed' | 'failed';
  progress_percentage: number;
  bytes_downloaded?: number;
  total_bytes?: number;
  download_start?: Date;
  download_end?: Date;
  error_message?: string;
  retry_count: number;
  created_at: Date;
}

/**
 * Image catalog entry
 */
export interface CatalogEntry {
  catalog_id: string;
  image_id: string;
  metadata: ImageryMetadata;
  availability: 'online' | 'nearline' | 'offline';
  access_restrictions?: string[];
  preview_available: boolean;
  download_options: DownloadOption[];
  related_images?: string[]; // other images in time series
  indexed_at: Date;
}

/**
 * Download options for imagery
 */
export interface DownloadOption {
  format: string;
  processing_level: string;
  bands?: string[];
  projection?: string;
  file_size_bytes: number;
  delivery_time_minutes: number;
  cost?: number;
}

/**
 * Image search query
 */
export interface ImagerySearchQuery {
  area_of_interest?: BoundingBox | GeoCoordinate[];
  date_range?: {
    start: Date;
    end: Date;
  };
  sources?: ImagerySource[];
  imagery_types?: ImageryType[];
  max_cloud_cover?: number;
  min_resolution?: number;
  max_resolution?: number;
  sensors?: string[];
  tags?: string[];
  quality_min?: number;
  limit?: number;
  offset?: number;
  sort_by?: 'acquisition_time' | 'cloud_cover' | 'resolution' | 'quality';
  sort_order?: 'asc' | 'desc';
}

/**
 * Search results
 */
export interface ImagerySearchResults {
  total_count: number;
  results: CatalogEntry[];
  query: ImagerySearchQuery;
  search_time_ms: number;
}

/**
 * Real-time downlink data
 */
export interface DownlinkData {
  downlink_id: string;
  satellite_id: string;
  ground_station: string;
  downlink_time: Date;
  data_volume_gb: number;
  images_received: number;
  processing_status: ProcessingStatus;
  priority_images?: string[];
}
