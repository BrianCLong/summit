/**
 * Media Manipulation Detection Types
 */

export interface ManipulationDetectionResult {
  isManipulated: boolean;
  confidence: number;
  manipulations: DetectedManipulation[];
  metadata: ManipulationMetadata;
  recommendations: string[];
}

export interface DetectedManipulation {
  type: ManipulationType;
  location: ManipulationLocation;
  confidence: number;
  description: string;
  evidence: Evidence[];
}

export enum ManipulationType {
  COPY_PASTE = 'copy_paste',
  SPLICING = 'splicing',
  CLONING = 'cloning',
  CONTENT_AWARE_FILL = 'content_aware_fill',
  COLOR_ADJUSTMENT = 'color_adjustment',
  TONE_MAPPING = 'tone_mapping',
  FILTER_APPLICATION = 'filter_application',
  RESAMPLING = 'resampling',
  NOISE_ADDITION = 'noise_addition',
  BLUR_SHARPENING = 'blur_sharpening',
  OBJECT_REMOVAL = 'object_removal',
  OBJECT_ADDITION = 'object_addition',
  PERSPECTIVE_DISTORTION = 'perspective_distortion',
  COMPRESSION_INCONSISTENCY = 'compression_inconsistency',
}

export interface ManipulationLocation {
  coordinates?: BoundingBox[];
  mask?: Buffer;
  region?: string;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Evidence {
  type: EvidenceType;
  data: any;
  visualization?: Buffer;
  description: string;
}

export enum EvidenceType {
  ERROR_LEVEL_ANALYSIS = 'ela',
  NOISE_ANALYSIS = 'noise',
  JPEG_GHOSTS = 'jpeg_ghosts',
  DCT_ANALYSIS = 'dct',
  METADATA_INCONSISTENCY = 'metadata',
  DOUBLE_COMPRESSION = 'double_compression',
  CLONING_DETECTION = 'cloning',
  FORGERY_LOCALIZATION = 'forgery_localization',
}

export interface ManipulationMetadata {
  timestamp: Date;
  processingTime: number;
  algorithms: AlgorithmInfo[];
  fileInfo: FileInfo;
}

export interface AlgorithmInfo {
  name: string;
  version: string;
  parameters: Record<string, any>;
}

export interface FileInfo {
  format: string;
  size: number;
  dimensions: { width: number; height: number };
  colorSpace: string;
  bitDepth: number;
}

export interface ExifAnalysisResult {
  hasExif: boolean;
  exifData: Record<string, any>;
  inconsistencies: ExifInconsistency[];
  tamperingDetected: boolean;
  trustScore: number;
}

export interface ExifInconsistency {
  field: string;
  issue: string;
  severity: number;
  explanation: string;
}

export interface ProvenanceResult {
  hasProvenance: boolean;
  chain: ProvenanceEntry[];
  verified: boolean;
  authenticity: number;
  blockchainVerified?: boolean;
}

export interface ProvenanceEntry {
  timestamp: Date;
  actor: string;
  action: string;
  hash: string;
  signature?: string;
}

export interface PhotoEditingDetectionResult {
  edited: boolean;
  confidence: number;
  edits: PhotoEdit[];
  toolsDetected: string[];
}

export interface PhotoEdit {
  type: string;
  location: BoundingBox;
  confidence: number;
  description: string;
}

export interface CloningDetectionResult {
  cloningDetected: boolean;
  regions: ClonedRegion[];
  confidence: number;
}

export interface ClonedRegion {
  source: BoundingBox;
  targets: BoundingBox[];
  similarity: number;
  method: 'copy_move' | 'rotate' | 'scale' | 'affine';
}

export interface SplicingDetectionResult {
  splicingDetected: boolean;
  boundaries: SpliceBoundary[];
  confidence: number;
}

export interface SpliceBoundary {
  region: BoundingBox;
  evidenceType: string;
  confidence: number;
  description: string;
}

export interface CompressionAnalysisResult {
  compressionType: string;
  quality: number;
  multipleCompression: boolean;
  compressionHistory: CompressionEvent[];
  inconsistencies: CompressionInconsistency[];
}

export interface CompressionEvent {
  type: string;
  quality: number;
  timestamp?: Date;
}

export interface CompressionInconsistency {
  location: BoundingBox;
  description: string;
  severity: number;
}
