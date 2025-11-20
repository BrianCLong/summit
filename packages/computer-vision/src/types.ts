/**
 * Core Computer Vision Types
 * Shared types and interfaces for all CV modules
 */

import { z } from 'zod';

/**
 * Bounding Box Schema (x, y, width, height)
 */
export const BoundingBoxSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
});

export type BoundingBox = z.infer<typeof BoundingBoxSchema>;

/**
 * Bounding Box XYXY Schema (x1, y1, x2, y2)
 */
export const BoundingBoxXYXYSchema = z.object({
  x1: z.number(),
  y1: z.number(),
  x2: z.number(),
  y2: z.number(),
});

export type BoundingBoxXYXY = z.infer<typeof BoundingBoxXYXYSchema>;

/**
 * Point Schema (2D coordinates)
 */
export const PointSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export type Point = z.infer<typeof PointSchema>;

/**
 * Point 3D Schema
 */
export const Point3DSchema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
});

export type Point3D = z.infer<typeof Point3DSchema>;

/**
 * Image Dimensions
 */
export const ImageDimensionsSchema = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  channels: z.number().int().default(3),
});

export type ImageDimensions = z.infer<typeof ImageDimensionsSchema>;

/**
 * Detection Confidence
 */
export const ConfidenceSchema = z.number().min(0).max(1);

/**
 * Object Detection Result
 */
export const DetectionSchema = z.object({
  class_name: z.string(),
  class_id: z.number().int(),
  confidence: ConfidenceSchema,
  bbox: BoundingBoxSchema,
  bbox_xyxy: z.tuple([z.number(), z.number(), z.number(), z.number()]),
  area: z.number(),
  metadata: z.record(z.any()).optional(),
});

export type Detection = z.infer<typeof DetectionSchema>;

/**
 * Segmentation Mask
 */
export const SegmentationMaskSchema = z.object({
  class_id: z.number().int(),
  class_name: z.string(),
  confidence: ConfidenceSchema,
  mask: z.array(z.array(z.number())), // 2D array of pixel values
  bbox: BoundingBoxSchema,
  area: z.number(),
  polygons: z.array(z.array(PointSchema)).optional(),
});

export type SegmentationMask = z.infer<typeof SegmentationMaskSchema>;

/**
 * Keypoint
 */
export const KeypointSchema = z.object({
  name: z.string(),
  position: PointSchema,
  confidence: ConfidenceSchema,
  visible: z.boolean().default(true),
});

export type Keypoint = z.infer<typeof KeypointSchema>;

/**
 * Model Configuration
 */
export const ModelConfigSchema = z.object({
  model_name: z.string(),
  model_path: z.string().optional(),
  model_version: z.string().optional(),
  device: z.enum(['cpu', 'cuda', 'auto']).default('auto'),
  batch_size: z.number().int().positive().default(1),
  input_size: z.tuple([z.number(), z.number()]).optional(),
  confidence_threshold: z.number().min(0).max(1).default(0.5),
  nms_threshold: z.number().min(0).max(1).default(0.4),
  max_detections: z.number().int().positive().default(100),
  fp16: z.boolean().default(false),
  int8: z.boolean().default(false),
  metadata: z.record(z.any()).optional(),
});

export type ModelConfig = z.infer<typeof ModelConfigSchema>;

/**
 * Processing Result Base
 */
export const ProcessingResultSchema = z.object({
  success: z.boolean(),
  timestamp: z.string(),
  processing_time_ms: z.number(),
  model_info: z.object({
    name: z.string(),
    version: z.string().optional(),
    device: z.string(),
  }),
  error: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

export type ProcessingResult = z.infer<typeof ProcessingResultSchema>;

/**
 * Image Metadata
 */
export const ImageMetadataSchema = z.object({
  source: z.string(),
  dimensions: ImageDimensionsSchema,
  format: z.string().optional(),
  color_space: z.string().optional(),
  dpi: z.tuple([z.number(), z.number()]).optional(),
  exif: z.record(z.any()).optional(),
  file_size: z.number().optional(),
  hash: z.string().optional(),
});

export type ImageMetadata = z.infer<typeof ImageMetadataSchema>;

/**
 * Video Metadata
 */
export const VideoMetadataSchema = z.object({
  source: z.string(),
  dimensions: ImageDimensionsSchema,
  fps: z.number().positive(),
  frame_count: z.number().int().positive(),
  duration_seconds: z.number().positive(),
  codec: z.string().optional(),
  bitrate: z.number().optional(),
  format: z.string().optional(),
});

export type VideoMetadata = z.infer<typeof VideoMetadataSchema>;

/**
 * Embedding Vector
 */
export const EmbeddingSchema = z.object({
  vector: z.array(z.number()),
  dimensions: z.number().int().positive(),
  model: z.string(),
  normalized: z.boolean().default(false),
});

export type Embedding = z.infer<typeof EmbeddingSchema>;

/**
 * Visual Similarity Result
 */
export const SimilarityResultSchema = z.object({
  query_id: z.string(),
  matches: z.array(
    z.object({
      id: z.string(),
      similarity_score: z.number().min(0).max(1),
      distance: z.number(),
      metadata: z.record(z.any()).optional(),
    })
  ),
  search_params: z.record(z.any()).optional(),
});

export type SimilarityResult = z.infer<typeof SimilarityResultSchema>;

/**
 * Color Histogram
 */
export const ColorHistogramSchema = z.object({
  bins: z.number().int().positive(),
  channels: z.array(z.string()),
  histogram: z.array(z.array(z.number())),
  dominant_colors: z.array(
    z.object({
      color: z.tuple([z.number(), z.number(), z.number()]),
      percentage: z.number().min(0).max(100),
    })
  ).optional(),
});

export type ColorHistogram = z.infer<typeof ColorHistogramSchema>;

/**
 * Scene Classification Result
 */
export const SceneClassificationSchema = z.object({
  scene_type: z.string(),
  confidence: ConfidenceSchema,
  top_k_predictions: z.array(
    z.object({
      scene_type: z.string(),
      confidence: ConfidenceSchema,
    })
  ),
  indoor_outdoor: z.enum(['indoor', 'outdoor', 'unknown']).optional(),
  lighting: z.enum(['day', 'night', 'dawn', 'dusk', 'unknown']).optional(),
  weather: z.enum(['clear', 'cloudy', 'rainy', 'snowy', 'unknown']).optional(),
});

export type SceneClassification = z.infer<typeof SceneClassificationSchema>;

/**
 * Depth Map
 */
export const DepthMapSchema = z.object({
  depth_values: z.array(z.array(z.number())), // 2D array
  min_depth: z.number(),
  max_depth: z.number(),
  normalized: z.boolean(),
  unit: z.enum(['meters', 'pixels', 'relative']),
});

export type DepthMap = z.infer<typeof DepthMapSchema>;

/**
 * Tracking Result
 */
export const TrackingResultSchema = z.object({
  track_id: z.number().int(),
  object_id: z.string().optional(),
  bbox: BoundingBoxSchema,
  confidence: ConfidenceSchema,
  class_name: z.string(),
  frame_number: z.number().int(),
  trajectory: z.array(PointSchema).optional(),
  velocity: z.object({
    x: z.number(),
    y: z.number(),
  }).optional(),
  metadata: z.record(z.any()).optional(),
});

export type TrackingResult = z.infer<typeof TrackingResultSchema>;

/**
 * Performance Metrics
 */
export const PerformanceMetricsSchema = z.object({
  inference_time_ms: z.number(),
  preprocessing_time_ms: z.number(),
  postprocessing_time_ms: z.number(),
  total_time_ms: z.number(),
  throughput_fps: z.number().optional(),
  gpu_memory_mb: z.number().optional(),
  cpu_memory_mb: z.number().optional(),
});

export type PerformanceMetrics = z.infer<typeof PerformanceMetricsSchema>;

/**
 * Model Optimization Type
 */
export enum OptimizationType {
  NONE = 'none',
  FP16 = 'fp16',
  INT8 = 'int8',
  TENSORRT = 'tensorrt',
  ONNX = 'onnx',
  QUANTIZED = 'quantized',
}

/**
 * Device Type
 */
export enum DeviceType {
  CPU = 'cpu',
  CUDA = 'cuda',
  MPS = 'mps', // Apple Silicon
  TENSORRT = 'tensorrt',
  EDGE = 'edge', // Edge devices (Jetson, etc.)
}

/**
 * Image Quality Assessment
 */
export const ImageQualitySchema = z.object({
  overall_score: z.number().min(0).max(100),
  sharpness: z.number().min(0).max(100),
  brightness: z.number().min(0).max(100),
  contrast: z.number().min(0).max(100),
  noise_level: z.number().min(0).max(100),
  blur_detected: z.boolean(),
  artifacts: z.array(z.string()).optional(),
  recommendations: z.array(z.string()).optional(),
});

export type ImageQuality = z.infer<typeof ImageQualitySchema>;
