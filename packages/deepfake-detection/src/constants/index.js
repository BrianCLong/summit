"use strict";
/**
 * Constants for deepfake detection system
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FEATURE_FLAGS = exports.ERROR_CODES = exports.METRIC_NAMES = exports.STORAGE_PATHS = exports.NOTIFICATION_TEMPLATES = exports.RATE_LIMITS = exports.RETRY_POLICY = exports.CACHE_TTL = exports.JOB_PRIORITIES = exports.DRIFT_THRESHOLDS = exports.FEATURE_EXTRACTION = exports.ENSEMBLE_WEIGHTS = exports.MODEL_VERSIONS = exports.SUPPORTED_MIME_TYPES = exports.FILE_SIZE_LIMITS = exports.PROCESSING_TIMEOUTS = exports.ALERT_SEVERITY_BY_CONFIDENCE = exports.CONFIDENCE_THRESHOLDS = void 0;
// Confidence thresholds
exports.CONFIDENCE_THRESHOLDS = {
    LOW: 0.3,
    MEDIUM: 0.5,
    HIGH: 0.7,
    VERY_HIGH: 0.9,
};
// Alert severity mappings
exports.ALERT_SEVERITY_BY_CONFIDENCE = [
    { minConfidence: 0.9, severity: 'CRITICAL' },
    { minConfidence: 0.7, severity: 'HIGH' },
    { minConfidence: 0.5, severity: 'MEDIUM' },
    { minConfidence: 0.3, severity: 'LOW' },
];
// Processing timeouts (milliseconds)
exports.PROCESSING_TIMEOUTS = {
    IMAGE: 30_000, // 30 seconds
    AUDIO: 120_000, // 2 minutes
    VIDEO: 300_000, // 5 minutes
    ENSEMBLE: 600_000, // 10 minutes
};
// File size limits (bytes)
exports.FILE_SIZE_LIMITS = {
    IMAGE: 50 * 1024 * 1024, // 50 MB
    AUDIO: 500 * 1024 * 1024, // 500 MB
    VIDEO: 2 * 1024 * 1024 * 1024, // 2 GB
};
// Supported MIME types
exports.SUPPORTED_MIME_TYPES = {
    VIDEO: [
        'video/mp4',
        'video/mpeg',
        'video/quicktime',
        'video/x-msvideo',
        'video/x-matroska',
        'video/webm',
    ],
    AUDIO: [
        'audio/mpeg',
        'audio/mp3',
        'audio/wav',
        'audio/wave',
        'audio/x-wav',
        'audio/flac',
        'audio/ogg',
        'audio/webm',
    ],
    IMAGE: [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/bmp',
        'image/tiff',
    ],
};
// Model versions (current production versions)
exports.MODEL_VERSIONS = {
    VIDEO_FACE: 'v1.2.0',
    VIDEO_GENERIC: 'v1.0.0',
    AUDIO_SPECTROGRAM: 'v1.1.0',
    AUDIO_WAVEFORM: 'v1.0.0',
    IMAGE_MANIPULATION: 'v1.0.1',
    IMAGE_GAN: 'v1.0.0',
    ENSEMBLE: 'v1.0.0',
};
// Ensemble weights (for weighted voting)
exports.ENSEMBLE_WEIGHTS = {
    VIDEO_FACE: 0.4,
    VIDEO_GENERIC: 0.2,
    AUDIO_SPECTROGRAM: 0.25,
    AUDIO_WAVEFORM: 0.1,
    IMAGE_MANIPULATION: 0.2,
    IMAGE_GAN: 0.05,
};
// Feature extraction parameters
exports.FEATURE_EXTRACTION = {
    // Video
    VIDEO_SAMPLE_FPS: 1, // Sample 1 frame per second
    VIDEO_MAX_FRAMES: 300, // Max 300 frames (5 min @ 1 fps)
    VIDEO_FACE_SIZE: 256, // Resize detected faces to 256x256
    // Audio
    AUDIO_SAMPLE_RATE: 16000, // Resample to 16 kHz
    AUDIO_SEGMENT_DURATION: 5, // 5-second segments
    AUDIO_MEL_BINS: 128, // Number of mel filterbank bins
    AUDIO_N_FFT: 2048, // FFT window size
    AUDIO_HOP_LENGTH: 512, // Hop length for STFT
    // Image
    IMAGE_TARGET_SIZE: 299, // Resize to 299x299 for XceptionNet
};
// Model drift thresholds
exports.DRIFT_THRESHOLDS = {
    FEATURE_DRIFT: 0.3, // PSI threshold
    PREDICTION_DRIFT: 0.2, // KL divergence threshold
    PERFORMANCE_DEGRADATION: 0.05, // 5% accuracy drop
};
// Job queue priorities
exports.JOB_PRIORITIES = {
    CRITICAL: 10,
    HIGH: 7,
    NORMAL: 5,
    LOW: 2,
    BACKGROUND: 1,
};
// Cache TTLs (seconds)
exports.CACHE_TTL = {
    DETECTION_RESULT: 86400, // 24 hours
    MODEL_METADATA: 3600, // 1 hour
    MEDIA_METADATA: 7200, // 2 hours
    ALERT_SUMMARY: 300, // 5 minutes
};
// Retry policies
exports.RETRY_POLICY = {
    MAX_ATTEMPTS: 3,
    INITIAL_DELAY_MS: 1000,
    MAX_DELAY_MS: 60000,
    BACKOFF_MULTIPLIER: 2,
};
// API rate limits (requests per minute)
exports.RATE_LIMITS = {
    UPLOAD: 100,
    DETECTION: 200,
    QUERY: 1000,
    ADMIN: 50,
};
// Notification templates
exports.NOTIFICATION_TEMPLATES = {
    HIGH_CONFIDENCE_DETECTION: {
        subject: 'High Confidence Deepfake Detected',
        body: 'A deepfake with {confidence}% confidence was detected in media {mediaId}. Review required.',
    },
    CRITICAL_ALERT: {
        subject: 'CRITICAL: Deepfake Alert',
        body: 'Critical deepfake alert for investigation {investigationId}. Immediate action required.',
    },
    MODEL_DRIFT_DETECTED: {
        subject: 'Model Drift Detected',
        body: 'Model {modelId} is showing signs of drift. Drift score: {driftScore}. Retraining recommended.',
    },
};
// Storage paths
exports.STORAGE_PATHS = {
    MEDIA: 'media',
    MODELS: 'models',
    VISUALIZATIONS: 'visualizations',
    EXPORTS: 'exports',
    TEMP: 'temp',
};
// Metrics
exports.METRIC_NAMES = {
    DETECTION_REQUESTS: 'deepfake_detection_requests_total',
    DETECTION_DURATION: 'deepfake_detection_duration_seconds',
    CONFIDENCE_SCORE: 'deepfake_confidence_score',
    MODEL_LOAD_TIME: 'deepfake_model_load_time_seconds',
    GPU_UTILIZATION: 'deepfake_gpu_utilization_percent',
    JOBS_QUEUED: 'deepfake_jobs_queued',
    JOBS_COMPLETED: 'deepfake_jobs_completed_total',
    JOBS_PROCESSING_DURATION: 'deepfake_jobs_processing_duration_seconds',
    ALERTS_CREATED: 'deepfake_alerts_created_total',
    ALERTS_RESOLVED: 'deepfake_alerts_resolved_total',
    ALERT_TIME_TO_RESOLUTION: 'deepfake_alert_time_to_resolution_seconds',
    MODEL_ACCURACY: 'deepfake_model_accuracy',
    MODEL_DRIFT_SCORE: 'deepfake_model_drift_score',
};
// Error codes
exports.ERROR_CODES = {
    // Media errors
    MEDIA_NOT_FOUND: 'MEDIA_NOT_FOUND',
    MEDIA_TOO_LARGE: 'MEDIA_TOO_LARGE',
    UNSUPPORTED_FORMAT: 'UNSUPPORTED_FORMAT',
    CORRUPT_FILE: 'CORRUPT_FILE',
    // Detection errors
    DETECTION_FAILED: 'DETECTION_FAILED',
    DETECTION_TIMEOUT: 'DETECTION_TIMEOUT',
    MODEL_NOT_LOADED: 'MODEL_NOT_LOADED',
    INSUFFICIENT_QUALITY: 'INSUFFICIENT_QUALITY',
    // Model errors
    MODEL_NOT_FOUND: 'MODEL_NOT_FOUND',
    MODEL_LOAD_FAILED: 'MODEL_LOAD_FAILED',
    INFERENCE_ERROR: 'INFERENCE_ERROR',
    // System errors
    OUT_OF_MEMORY: 'OUT_OF_MEMORY',
    GPU_NOT_AVAILABLE: 'GPU_NOT_AVAILABLE',
    STORAGE_ERROR: 'STORAGE_ERROR',
    DATABASE_ERROR: 'DATABASE_ERROR',
    QUEUE_ERROR: 'QUEUE_ERROR',
    // Auth errors
    UNAUTHORIZED: 'UNAUTHORIZED',
    FORBIDDEN: 'FORBIDDEN',
    RATE_LIMITED: 'RATE_LIMITED',
};
// Feature flags
exports.FEATURE_FLAGS = {
    ENABLE_GPU: true,
    ENABLE_CACHING: true,
    ENABLE_ENSEMBLE: true,
    ENABLE_EXPLANATIONS: true,
    ENABLE_DRIFT_DETECTION: true,
    ENABLE_AUTO_RETRAINING: false, // Disabled for now
    ENABLE_FEDERATED_LEARNING: false, // Future feature
};
