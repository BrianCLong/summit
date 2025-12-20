/**
 * Object Detection Types
 */

import { z } from 'zod';
import { DetectionSchema, BoundingBoxSchema, ConfidenceSchema } from '@intelgraph/computer-vision';

/**
 * Object Detection Configuration
 */
export const ObjectDetectionConfigSchema = z.object({
  model_type: z.enum(['yolov8', 'yolov9', 'faster_rcnn', 'ssd', 'efficientdet']),
  model_size: z.enum(['nano', 'small', 'medium', 'large', 'xlarge']).default('medium'),
  confidence_threshold: ConfidenceSchema.default(0.5),
  nms_threshold: z.number().min(0).max(1).default(0.4),
  max_detections: z.number().int().positive().default(100),
  input_size: z.tuple([z.number(), z.number()]).optional(),
  device: z.enum(['cpu', 'cuda', 'auto']).default('auto'),
  classes: z.array(z.string()).optional(),
  enable_tracking: z.boolean().default(false),
  batch_size: z.number().int().positive().default(1),
});

export type ObjectDetectionConfig = z.infer<typeof ObjectDetectionConfigSchema>;

/**
 * Detection Result with additional metadata
 */
export const ObjectDetectionResultSchema = z.object({
  detections: z.array(DetectionSchema),
  image_size: z.object({
    width: z.number(),
    height: z.number(),
  }),
  model_info: z.object({
    name: z.string(),
    version: z.string().optional(),
    device: z.string(),
  }),
  processing_time_ms: z.number(),
  timestamp: z.string(),
});

export type ObjectDetectionResult = z.infer<typeof ObjectDetectionResultSchema>;

/**
 * 3D Object Detection
 */
export const Detection3DSchema = DetectionSchema.extend({
  bbox_3d: z.object({
    center: z.tuple([z.number(), z.number(), z.number()]),
    dimensions: z.tuple([z.number(), z.number(), z.number()]),
    rotation: z.number(),
  }).optional(),
  distance: z.number().optional(),
  depth: z.number().optional(),
});

export type Detection3D = z.infer<typeof Detection3DSchema>;

/**
 * Instance Segmentation Result
 */
export const InstanceSegmentationSchema = DetectionSchema.extend({
  mask: z.array(z.array(z.number())),
  contours: z.array(z.array(z.tuple([z.number(), z.number()]))).optional(),
  polygon: z.array(z.tuple([z.number(), z.number()])).optional(),
});

export type InstanceSegmentation = z.infer<typeof InstanceSegmentationSchema>;

/**
 * Multi-Object Tracking (MOT) Configuration
 */
export const MOTConfigSchema = z.object({
  tracker_type: z.enum(['sort', 'deepsort', 'bytetrack', 'botsort']).default('bytetrack'),
  max_age: z.number().int().positive().default(30),
  min_hits: z.number().int().positive().default(3),
  iou_threshold: z.number().min(0).max(1).default(0.3),
  use_embeddings: z.boolean().default(true),
  embedding_model: z.string().optional(),
});

export type MOTConfig = z.infer<typeof MOTConfigSchema>;

/**
 * Tracked Object
 */
export const TrackedObjectSchema = z.object({
  track_id: z.number().int(),
  detection: DetectionSchema,
  trajectory: z.array(BoundingBoxSchema),
  velocity: z.object({
    x: z.number(),
    y: z.number(),
  }),
  age: z.number().int(),
  time_since_update: z.number().int(),
  hits: z.number().int(),
  embedding: z.array(z.number()).optional(),
  metadata: z.record(z.any()).optional(),
});

export type TrackedObject = z.infer<typeof TrackedObjectSchema>;

/**
 * Tracking Result
 */
export const TrackingResultSchema = z.object({
  frame_id: z.number().int(),
  tracked_objects: z.array(TrackedObjectSchema),
  new_tracks: z.array(z.number().int()),
  lost_tracks: z.array(z.number().int()),
  active_tracks: z.number().int(),
  timestamp: z.string(),
});

export type TrackingResult = z.infer<typeof TrackingResultSchema>;

/**
 * Small Object Detection Configuration
 */
export const SmallObjectConfigSchema = z.object({
  min_object_size: z.number().int().positive().default(16),
  enable_tiling: z.boolean().default(true),
  tile_size: z.number().int().positive().default(640),
  tile_overlap: z.number().min(0).max(0.5).default(0.2),
  merge_detections: z.boolean().default(true),
});

export type SmallObjectConfig = z.infer<typeof SmallObjectConfigSchema>;

/**
 * Custom Object Training Configuration
 */
export const CustomTrainingConfigSchema = z.object({
  dataset_path: z.string(),
  annotation_format: z.enum(['coco', 'yolo', 'pascal_voc', 'darknet']),
  num_classes: z.number().int().positive(),
  class_names: z.array(z.string()),
  epochs: z.number().int().positive().default(100),
  batch_size: z.number().int().positive().default(16),
  learning_rate: z.number().positive().default(0.001),
  image_size: z.number().int().positive().default(640),
  augmentation: z.boolean().default(true),
  pretrained: z.boolean().default(true),
  save_dir: z.string(),
});

export type CustomTrainingConfig = z.infer<typeof CustomTrainingConfigSchema>;
