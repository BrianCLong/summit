"use strict";
/**
 * Core Computer Vision Types
 * Shared types and interfaces for all CV modules
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImageQualitySchema = exports.DeviceType = exports.OptimizationType = exports.PerformanceMetricsSchema = exports.TrackingResultSchema = exports.DepthMapSchema = exports.SceneClassificationSchema = exports.ColorHistogramSchema = exports.SimilarityResultSchema = exports.EmbeddingSchema = exports.VideoMetadataSchema = exports.ImageMetadataSchema = exports.ProcessingResultSchema = exports.ModelConfigSchema = exports.KeypointSchema = exports.SegmentationMaskSchema = exports.DetectionSchema = exports.ConfidenceSchema = exports.ImageDimensionsSchema = exports.Point3DSchema = exports.PointSchema = exports.BoundingBoxXYXYSchema = exports.BoundingBoxSchema = void 0;
const zod_1 = require("zod");
/**
 * Bounding Box Schema (x, y, width, height)
 */
exports.BoundingBoxSchema = zod_1.z.object({
    x: zod_1.z.number(),
    y: zod_1.z.number(),
    width: zod_1.z.number(),
    height: zod_1.z.number(),
});
/**
 * Bounding Box XYXY Schema (x1, y1, x2, y2)
 */
exports.BoundingBoxXYXYSchema = zod_1.z.object({
    x1: zod_1.z.number(),
    y1: zod_1.z.number(),
    x2: zod_1.z.number(),
    y2: zod_1.z.number(),
});
/**
 * Point Schema (2D coordinates)
 */
exports.PointSchema = zod_1.z.object({
    x: zod_1.z.number(),
    y: zod_1.z.number(),
});
/**
 * Point 3D Schema
 */
exports.Point3DSchema = zod_1.z.object({
    x: zod_1.z.number(),
    y: zod_1.z.number(),
    z: zod_1.z.number(),
});
/**
 * Image Dimensions
 */
exports.ImageDimensionsSchema = zod_1.z.object({
    width: zod_1.z.number().int().positive(),
    height: zod_1.z.number().int().positive(),
    channels: zod_1.z.number().int().default(3),
});
/**
 * Detection Confidence
 */
exports.ConfidenceSchema = zod_1.z.number().min(0).max(1);
/**
 * Object Detection Result
 */
exports.DetectionSchema = zod_1.z.object({
    class_name: zod_1.z.string(),
    class_id: zod_1.z.number().int(),
    confidence: exports.ConfidenceSchema,
    bbox: exports.BoundingBoxSchema,
    bbox_xyxy: zod_1.z.tuple([zod_1.z.number(), zod_1.z.number(), zod_1.z.number(), zod_1.z.number()]),
    area: zod_1.z.number(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
});
/**
 * Segmentation Mask
 */
exports.SegmentationMaskSchema = zod_1.z.object({
    class_id: zod_1.z.number().int(),
    class_name: zod_1.z.string(),
    confidence: exports.ConfidenceSchema,
    mask: zod_1.z.array(zod_1.z.array(zod_1.z.number())), // 2D array of pixel values
    bbox: exports.BoundingBoxSchema,
    area: zod_1.z.number(),
    polygons: zod_1.z.array(zod_1.z.array(exports.PointSchema)).optional(),
});
/**
 * Keypoint
 */
exports.KeypointSchema = zod_1.z.object({
    name: zod_1.z.string(),
    position: exports.PointSchema,
    confidence: exports.ConfidenceSchema,
    visible: zod_1.z.boolean().default(true),
});
/**
 * Model Configuration
 */
exports.ModelConfigSchema = zod_1.z.object({
    model_name: zod_1.z.string(),
    model_path: zod_1.z.string().optional(),
    model_version: zod_1.z.string().optional(),
    device: zod_1.z.enum(['cpu', 'cuda', 'auto']).default('auto'),
    batch_size: zod_1.z.number().int().positive().default(1),
    input_size: zod_1.z.tuple([zod_1.z.number(), zod_1.z.number()]).optional(),
    confidence_threshold: zod_1.z.number().min(0).max(1).default(0.5),
    nms_threshold: zod_1.z.number().min(0).max(1).default(0.4),
    max_detections: zod_1.z.number().int().positive().default(100),
    fp16: zod_1.z.boolean().default(false),
    int8: zod_1.z.boolean().default(false),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
});
/**
 * Processing Result Base
 */
exports.ProcessingResultSchema = zod_1.z.object({
    success: zod_1.z.boolean(),
    timestamp: zod_1.z.string(),
    processing_time_ms: zod_1.z.number(),
    model_info: zod_1.z.object({
        name: zod_1.z.string(),
        version: zod_1.z.string().optional(),
        device: zod_1.z.string(),
    }),
    error: zod_1.z.string().optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
});
/**
 * Image Metadata
 */
exports.ImageMetadataSchema = zod_1.z.object({
    source: zod_1.z.string(),
    dimensions: exports.ImageDimensionsSchema,
    format: zod_1.z.string().optional(),
    color_space: zod_1.z.string().optional(),
    dpi: zod_1.z.tuple([zod_1.z.number(), zod_1.z.number()]).optional(),
    exif: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
    file_size: zod_1.z.number().optional(),
    hash: zod_1.z.string().optional(),
});
/**
 * Video Metadata
 */
exports.VideoMetadataSchema = zod_1.z.object({
    source: zod_1.z.string(),
    dimensions: exports.ImageDimensionsSchema,
    fps: zod_1.z.number().positive(),
    frame_count: zod_1.z.number().int().positive(),
    duration_seconds: zod_1.z.number().positive(),
    codec: zod_1.z.string().optional(),
    bitrate: zod_1.z.number().optional(),
    format: zod_1.z.string().optional(),
});
/**
 * Embedding Vector
 */
exports.EmbeddingSchema = zod_1.z.object({
    vector: zod_1.z.array(zod_1.z.number()),
    dimensions: zod_1.z.number().int().positive(),
    model: zod_1.z.string(),
    normalized: zod_1.z.boolean().default(false),
});
/**
 * Visual Similarity Result
 */
exports.SimilarityResultSchema = zod_1.z.object({
    query_id: zod_1.z.string(),
    matches: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.string(),
        similarity_score: zod_1.z.number().min(0).max(1),
        distance: zod_1.z.number(),
        metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
    })),
    search_params: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
});
/**
 * Color Histogram
 */
exports.ColorHistogramSchema = zod_1.z.object({
    bins: zod_1.z.number().int().positive(),
    channels: zod_1.z.array(zod_1.z.string()),
    histogram: zod_1.z.array(zod_1.z.array(zod_1.z.number())),
    dominant_colors: zod_1.z.array(zod_1.z.object({
        color: zod_1.z.tuple([zod_1.z.number(), zod_1.z.number(), zod_1.z.number()]),
        percentage: zod_1.z.number().min(0).max(100),
    })).optional(),
});
/**
 * Scene Classification Result
 */
exports.SceneClassificationSchema = zod_1.z.object({
    scene_type: zod_1.z.string(),
    confidence: exports.ConfidenceSchema,
    top_k_predictions: zod_1.z.array(zod_1.z.object({
        scene_type: zod_1.z.string(),
        confidence: exports.ConfidenceSchema,
    })),
    indoor_outdoor: zod_1.z.enum(['indoor', 'outdoor', 'unknown']).optional(),
    lighting: zod_1.z.enum(['day', 'night', 'dawn', 'dusk', 'unknown']).optional(),
    weather: zod_1.z.enum(['clear', 'cloudy', 'rainy', 'snowy', 'unknown']).optional(),
});
/**
 * Depth Map
 */
exports.DepthMapSchema = zod_1.z.object({
    depth_values: zod_1.z.array(zod_1.z.array(zod_1.z.number())), // 2D array
    min_depth: zod_1.z.number(),
    max_depth: zod_1.z.number(),
    normalized: zod_1.z.boolean(),
    unit: zod_1.z.enum(['meters', 'pixels', 'relative']),
});
/**
 * Tracking Result
 */
exports.TrackingResultSchema = zod_1.z.object({
    track_id: zod_1.z.number().int(),
    object_id: zod_1.z.string().optional(),
    bbox: exports.BoundingBoxSchema,
    confidence: exports.ConfidenceSchema,
    class_name: zod_1.z.string(),
    frame_number: zod_1.z.number().int(),
    trajectory: zod_1.z.array(exports.PointSchema).optional(),
    velocity: zod_1.z.object({
        x: zod_1.z.number(),
        y: zod_1.z.number(),
    }).optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
});
/**
 * Performance Metrics
 */
exports.PerformanceMetricsSchema = zod_1.z.object({
    inference_time_ms: zod_1.z.number(),
    preprocessing_time_ms: zod_1.z.number(),
    postprocessing_time_ms: zod_1.z.number(),
    total_time_ms: zod_1.z.number(),
    throughput_fps: zod_1.z.number().optional(),
    gpu_memory_mb: zod_1.z.number().optional(),
    cpu_memory_mb: zod_1.z.number().optional(),
});
/**
 * Model Optimization Type
 */
var OptimizationType;
(function (OptimizationType) {
    OptimizationType["NONE"] = "none";
    OptimizationType["FP16"] = "fp16";
    OptimizationType["INT8"] = "int8";
    OptimizationType["TENSORRT"] = "tensorrt";
    OptimizationType["ONNX"] = "onnx";
    OptimizationType["QUANTIZED"] = "quantized";
})(OptimizationType || (exports.OptimizationType = OptimizationType = {}));
/**
 * Device Type
 */
var DeviceType;
(function (DeviceType) {
    DeviceType["CPU"] = "cpu";
    DeviceType["CUDA"] = "cuda";
    DeviceType["MPS"] = "mps";
    DeviceType["TENSORRT"] = "tensorrt";
    DeviceType["EDGE"] = "edge";
})(DeviceType || (exports.DeviceType = DeviceType = {}));
/**
 * Image Quality Assessment
 */
exports.ImageQualitySchema = zod_1.z.object({
    overall_score: zod_1.z.number().min(0).max(100),
    sharpness: zod_1.z.number().min(0).max(100),
    brightness: zod_1.z.number().min(0).max(100),
    contrast: zod_1.z.number().min(0).max(100),
    noise_level: zod_1.z.number().min(0).max(100),
    blur_detected: zod_1.z.boolean(),
    artifacts: zod_1.z.array(zod_1.z.string()).optional(),
    recommendations: zod_1.z.array(zod_1.z.string()).optional(),
});
