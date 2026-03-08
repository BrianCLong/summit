"use strict";
/**
 * Base Classes for Computer Vision Models
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PerformanceMonitor = exports.BaseComputerVisionModel = void 0;
/**
 * Abstract Base Computer Vision Model
 */
class BaseComputerVisionModel {
    config;
    initialized = false;
    modelLoaded = false;
    constructor(config) {
        this.config = config;
    }
    /**
     * Process multiple images in batch
     * Default implementation processes sequentially
     */
    async processBatch(imagePaths, options) {
        const results = [];
        for (const imagePath of imagePaths) {
            const result = await this.processImage(imagePath, options);
            results.push(result);
        }
        return results;
    }
    /**
     * Get model configuration
     */
    getConfig() {
        return this.config;
    }
    /**
     * Get model information
     */
    getModelInfo() {
        return {
            model_name: this.config.model_name,
            model_version: this.config.model_version,
            device: this.config.device,
            initialized: this.initialized,
            model_loaded: this.modelLoaded,
        };
    }
    /**
     * Check if model is ready
     */
    ensureInitialized() {
        if (!this.initialized) {
            throw new Error('Model not initialized. Call initialize() first.');
        }
    }
    /**
     * Dispose of model resources
     */
    async dispose() {
        this.initialized = false;
        this.modelLoaded = false;
    }
    /**
     * Create a processing result
     */
    createProcessingResult(data, startTime, error) {
        const processingTime = Date.now() - startTime;
        return {
            success: !error,
            timestamp: new Date().toISOString(),
            processing_time_ms: processingTime,
            model_info: {
                name: this.config.model_name,
                version: this.config.model_version || 'unknown',
                device: this.config.device,
            },
            error,
            data,
        };
    }
}
exports.BaseComputerVisionModel = BaseComputerVisionModel;
/**
 * Performance Monitor
 */
class PerformanceMonitor {
    metrics = new Map();
    /**
     * Start timing
     */
    start() {
        const startTime = Date.now();
        const startMemory = process.memoryUsage();
        return {
            end: () => {
                const endTime = Date.now();
                const endMemory = process.memoryUsage();
                return {
                    inference_time_ms: endTime - startTime,
                    preprocessing_time_ms: 0,
                    postprocessing_time_ms: 0,
                    total_time_ms: endTime - startTime,
                    cpu_memory_mb: (endMemory.heapUsed - startMemory.heapUsed) / (1024 * 1024),
                };
            },
        };
    }
    /**
     * Record metrics
     */
    record(modelName, metrics) {
        if (!this.metrics.has(modelName)) {
            this.metrics.set(modelName, []);
        }
        this.metrics.get(modelName).push(metrics);
    }
    /**
     * Get average metrics
     */
    getAverageMetrics(modelName) {
        const metricsArray = this.metrics.get(modelName);
        if (!metricsArray || metricsArray.length === 0) {
            return null;
        }
        const avg = metricsArray.reduce((acc, m) => ({
            inference_time_ms: acc.inference_time_ms + m.inference_time_ms,
            preprocessing_time_ms: acc.preprocessing_time_ms + m.preprocessing_time_ms,
            postprocessing_time_ms: acc.postprocessing_time_ms + m.postprocessing_time_ms,
            total_time_ms: acc.total_time_ms + m.total_time_ms,
            cpu_memory_mb: (acc.cpu_memory_mb || 0) + (m.cpu_memory_mb || 0),
            gpu_memory_mb: (acc.gpu_memory_mb || 0) + (m.gpu_memory_mb || 0),
        }), {
            inference_time_ms: 0,
            preprocessing_time_ms: 0,
            postprocessing_time_ms: 0,
            total_time_ms: 0,
            cpu_memory_mb: 0,
            gpu_memory_mb: 0,
        });
        const count = metricsArray.length;
        return {
            inference_time_ms: avg.inference_time_ms / count,
            preprocessing_time_ms: avg.preprocessing_time_ms / count,
            postprocessing_time_ms: avg.postprocessing_time_ms / count,
            total_time_ms: avg.total_time_ms / count,
            throughput_fps: 1000 / (avg.total_time_ms / count),
            cpu_memory_mb: avg.cpu_memory_mb / count,
            gpu_memory_mb: avg.gpu_memory_mb / count,
        };
    }
    /**
     * Clear metrics
     */
    clear(modelName) {
        if (modelName) {
            this.metrics.delete(modelName);
        }
        else {
            this.metrics.clear();
        }
    }
}
exports.PerformanceMonitor = PerformanceMonitor;
