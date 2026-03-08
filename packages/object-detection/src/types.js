"use strict";
/**
 * Object Detection Types
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomTrainingConfigSchema = exports.SmallObjectConfigSchema = exports.TrackingResultSchema = exports.TrackedObjectSchema = exports.MOTConfigSchema = exports.InstanceSegmentationSchema = exports.Detection3DSchema = exports.ObjectDetectionResultSchema = exports.ObjectDetectionConfigSchema = void 0;
const zod_1 = require("zod");
const computer_vision_1 = require("@intelgraph/computer-vision");
/**
 * Object Detection Configuration
 */
exports.ObjectDetectionConfigSchema = zod_1.z.object({
    model_type: zod_1.z.enum(['yolov8', 'yolov9', 'faster_rcnn', 'ssd', 'efficientdet']),
    model_size: zod_1.z.enum(['nano', 'small', 'medium', 'large', 'xlarge']).default('medium'),
    confidence_threshold: computer_vision_1.ConfidenceSchema.default(0.5),
    nms_threshold: zod_1.z.number().min(0).max(1).default(0.4),
    max_detections: zod_1.z.number().int().positive().default(100),
    input_size: zod_1.z.tuple([zod_1.z.number(), zod_1.z.number()]).optional(),
    device: zod_1.z.enum(['cpu', 'cuda', 'auto']).default('auto'),
    classes: zod_1.z.array(zod_1.z.string()).optional(),
    enable_tracking: zod_1.z.boolean().default(false),
    batch_size: zod_1.z.number().int().positive().default(1),
});
/**
 * Detection Result with additional metadata
 */
exports.ObjectDetectionResultSchema = zod_1.z.object({
    detections: zod_1.z.array(computer_vision_1.DetectionSchema),
    image_size: zod_1.z.object({
        width: zod_1.z.number(),
        height: zod_1.z.number(),
    }),
    model_info: zod_1.z.object({
        name: zod_1.z.string(),
        version: zod_1.z.string().optional(),
        device: zod_1.z.string(),
    }),
    processing_time_ms: zod_1.z.number(),
    timestamp: zod_1.z.string(),
});
/**
 * 3D Object Detection
 */
exports.Detection3DSchema = computer_vision_1.DetectionSchema.extend({
    bbox_3d: zod_1.z.object({
        center: zod_1.z.tuple([zod_1.z.number(), zod_1.z.number(), zod_1.z.number()]),
        dimensions: zod_1.z.tuple([zod_1.z.number(), zod_1.z.number(), zod_1.z.number()]),
        rotation: zod_1.z.number(),
    }).optional(),
    distance: zod_1.z.number().optional(),
    depth: zod_1.z.number().optional(),
});
/**
 * Instance Segmentation Result
 */
exports.InstanceSegmentationSchema = computer_vision_1.DetectionSchema.extend({
    mask: zod_1.z.array(zod_1.z.array(zod_1.z.number())),
    contours: zod_1.z.array(zod_1.z.array(zod_1.z.tuple([zod_1.z.number(), zod_1.z.number()]))).optional(),
    polygon: zod_1.z.array(zod_1.z.tuple([zod_1.z.number(), zod_1.z.number()])).optional(),
});
/**
 * Multi-Object Tracking (MOT) Configuration
 */
exports.MOTConfigSchema = zod_1.z.object({
    tracker_type: zod_1.z.enum(['sort', 'deepsort', 'bytetrack', 'botsort']).default('bytetrack'),
    max_age: zod_1.z.number().int().positive().default(30),
    min_hits: zod_1.z.number().int().positive().default(3),
    iou_threshold: zod_1.z.number().min(0).max(1).default(0.3),
    use_embeddings: zod_1.z.boolean().default(true),
    embedding_model: zod_1.z.string().optional(),
});
/**
 * Tracked Object
 */
exports.TrackedObjectSchema = zod_1.z.object({
    track_id: zod_1.z.number().int(),
    detection: computer_vision_1.DetectionSchema,
    trajectory: zod_1.z.array(computer_vision_1.BoundingBoxSchema),
    velocity: zod_1.z.object({
        x: zod_1.z.number(),
        y: zod_1.z.number(),
    }),
    age: zod_1.z.number().int(),
    time_since_update: zod_1.z.number().int(),
    hits: zod_1.z.number().int(),
    embedding: zod_1.z.array(zod_1.z.number()).optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
});
/**
 * Tracking Result
 */
exports.TrackingResultSchema = zod_1.z.object({
    frame_id: zod_1.z.number().int(),
    tracked_objects: zod_1.z.array(exports.TrackedObjectSchema),
    new_tracks: zod_1.z.array(zod_1.z.number().int()),
    lost_tracks: zod_1.z.array(zod_1.z.number().int()),
    active_tracks: zod_1.z.number().int(),
    timestamp: zod_1.z.string(),
});
/**
 * Small Object Detection Configuration
 */
exports.SmallObjectConfigSchema = zod_1.z.object({
    min_object_size: zod_1.z.number().int().positive().default(16),
    enable_tiling: zod_1.z.boolean().default(true),
    tile_size: zod_1.z.number().int().positive().default(640),
    tile_overlap: zod_1.z.number().min(0).max(0.5).default(0.2),
    merge_detections: zod_1.z.boolean().default(true),
});
/**
 * Custom Object Training Configuration
 */
exports.CustomTrainingConfigSchema = zod_1.z.object({
    dataset_path: zod_1.z.string(),
    annotation_format: zod_1.z.enum(['coco', 'yolo', 'pascal_voc', 'darknet']),
    num_classes: zod_1.z.number().int().positive(),
    class_names: zod_1.z.array(zod_1.z.string()),
    epochs: zod_1.z.number().int().positive().default(100),
    batch_size: zod_1.z.number().int().positive().default(16),
    learning_rate: zod_1.z.number().positive().default(0.001),
    image_size: zod_1.z.number().int().positive().default(640),
    augmentation: zod_1.z.boolean().default(true),
    pretrained: zod_1.z.boolean().default(true),
    save_dir: zod_1.z.string(),
});
