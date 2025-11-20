/**
 * Base Classes for Computer Vision Models
 */

import {
  ModelConfig,
  ProcessingResult,
  PerformanceMetrics,
  ImageDimensions,
} from './types.js';

/**
 * Base Computer Vision Model Interface
 */
export interface IComputerVisionModel {
  /**
   * Initialize the model
   */
  initialize(): Promise<void>;

  /**
   * Process a single image
   */
  processImage(imagePath: string, options?: Record<string, any>): Promise<any>;

  /**
   * Process multiple images in batch
   */
  processBatch(imagePaths: string[], options?: Record<string, any>): Promise<any[]>;

  /**
   * Get model configuration
   */
  getConfig(): ModelConfig;

  /**
   * Get model information
   */
  getModelInfo(): Record<string, any>;

  /**
   * Dispose of model resources
   */
  dispose(): Promise<void>;
}

/**
 * Abstract Base Computer Vision Model
 */
export abstract class BaseComputerVisionModel implements IComputerVisionModel {
  protected config: ModelConfig;
  protected initialized: boolean = false;
  protected modelLoaded: boolean = false;

  constructor(config: ModelConfig) {
    this.config = config;
  }

  /**
   * Initialize the model (must be implemented by subclasses)
   */
  abstract initialize(): Promise<void>;

  /**
   * Process a single image (must be implemented by subclasses)
   */
  abstract processImage(imagePath: string, options?: Record<string, any>): Promise<any>;

  /**
   * Process multiple images in batch
   * Default implementation processes sequentially
   */
  async processBatch(
    imagePaths: string[],
    options?: Record<string, any>
  ): Promise<any[]> {
    const results: any[] = [];

    for (const imagePath of imagePaths) {
      const result = await this.processImage(imagePath, options);
      results.push(result);
    }

    return results;
  }

  /**
   * Get model configuration
   */
  getConfig(): ModelConfig {
    return this.config;
  }

  /**
   * Get model information
   */
  getModelInfo(): Record<string, any> {
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
  protected ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('Model not initialized. Call initialize() first.');
    }
  }

  /**
   * Dispose of model resources
   */
  async dispose(): Promise<void> {
    this.initialized = false;
    this.modelLoaded = false;
  }

  /**
   * Create a processing result
   */
  protected createProcessingResult(
    data: any,
    startTime: number,
    error?: string
  ): ProcessingResult & { data?: any } {
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

/**
 * Base Object Detector
 */
export interface IObjectDetector extends IComputerVisionModel {
  /**
   * Detect objects in image
   */
  detect(
    imagePath: string,
    options?: {
      confidenceThreshold?: number;
      nmsThreshold?: number;
      maxDetections?: number;
      classes?: string[];
    }
  ): Promise<any>;

  /**
   * Track objects across frames
   */
  track?(
    imagePaths: string[],
    options?: Record<string, any>
  ): Promise<any>;
}

/**
 * Base Face Analyzer
 */
export interface IFaceAnalyzer extends IComputerVisionModel {
  /**
   * Detect faces in image
   */
  detectFaces(imagePath: string, options?: Record<string, any>): Promise<any>;

  /**
   * Extract face embeddings
   */
  extractEmbeddings(imagePath: string, options?: Record<string, any>): Promise<any>;

  /**
   * Compare face similarity
   */
  compareFaces?(face1: any, face2: any): Promise<number>;

  /**
   * Cluster faces
   */
  clusterFaces?(faces: any[], options?: Record<string, any>): Promise<any>;
}

/**
 * Base OCR Engine
 */
export interface IOCREngine extends IComputerVisionModel {
  /**
   * Extract text from image
   */
  extractText(
    imagePath: string,
    options?: {
      languages?: string[];
      confidenceThreshold?: number;
      wordLevel?: boolean;
    }
  ): Promise<any>;

  /**
   * Detect text regions
   */
  detectTextRegions?(imagePath: string, options?: Record<string, any>): Promise<any>;

  /**
   * Extract structured data
   */
  extractStructuredData?(
    imagePath: string,
    documentType: string,
    options?: Record<string, any>
  ): Promise<any>;
}

/**
 * Base Scene Analyzer
 */
export interface ISceneAnalyzer extends IComputerVisionModel {
  /**
   * Classify scene
   */
  classifyScene(imagePath: string, options?: Record<string, any>): Promise<any>;

  /**
   * Perform semantic segmentation
   */
  segmentScene?(imagePath: string, options?: Record<string, any>): Promise<any>;

  /**
   * Estimate depth
   */
  estimateDepth?(imagePath: string, options?: Record<string, any>): Promise<any>;

  /**
   * Generate scene graph
   */
  generateSceneGraph?(imagePath: string, options?: Record<string, any>): Promise<any>;
}

/**
 * Base Video Analyzer
 */
export interface IVideoAnalyzer extends IComputerVisionModel {
  /**
   * Analyze video
   */
  analyzeVideo(videoPath: string, options?: Record<string, any>): Promise<any>;

  /**
   * Extract key frames
   */
  extractKeyFrames?(videoPath: string, options?: Record<string, any>): Promise<any>;

  /**
   * Detect actions
   */
  detectActions?(videoPath: string, options?: Record<string, any>): Promise<any>;

  /**
   * Track objects in video
   */
  trackObjects?(videoPath: string, options?: Record<string, any>): Promise<any>;
}

/**
 * Base Image Forensics Analyzer
 */
export interface IImageForensics extends IComputerVisionModel {
  /**
   * Detect manipulation
   */
  detectManipulation(imagePath: string, options?: Record<string, any>): Promise<any>;

  /**
   * Detect deepfakes
   */
  detectDeepfake?(imagePath: string, options?: Record<string, any>): Promise<any>;

  /**
   * Extract and analyze metadata
   */
  analyzeMetadata?(imagePath: string, options?: Record<string, any>): Promise<any>;

  /**
   * Detect copy-move forgery
   */
  detectCopyMove?(imagePath: string, options?: Record<string, any>): Promise<any>;
}

/**
 * Base Image Enhancement
 */
export interface IImageEnhancer extends IComputerVisionModel {
  /**
   * Upscale image (super-resolution)
   */
  upscale(
    imagePath: string,
    options?: {
      scaleFactor?: number;
      model?: string;
    }
  ): Promise<any>;

  /**
   * Denoise image
   */
  denoise?(imagePath: string, options?: Record<string, any>): Promise<any>;

  /**
   * Remove background
   */
  removeBackground?(imagePath: string, options?: Record<string, any>): Promise<any>;

  /**
   * Enhance quality
   */
  enhance?(imagePath: string, options?: Record<string, any>): Promise<any>;
}

/**
 * Performance Monitor
 */
export class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetrics[]> = new Map();

  /**
   * Start timing
   */
  start(): { end: () => PerformanceMetrics } {
    const startTime = Date.now();
    const startMemory = process.memoryUsage();

    return {
      end: (): PerformanceMetrics => {
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
  record(modelName: string, metrics: PerformanceMetrics): void {
    if (!this.metrics.has(modelName)) {
      this.metrics.set(modelName, []);
    }
    this.metrics.get(modelName)!.push(metrics);
  }

  /**
   * Get average metrics
   */
  getAverageMetrics(modelName: string): PerformanceMetrics | null {
    const metricsArray = this.metrics.get(modelName);
    if (!metricsArray || metricsArray.length === 0) {
      return null;
    }

    const avg = metricsArray.reduce(
      (acc, m) => ({
        inference_time_ms: acc.inference_time_ms + m.inference_time_ms,
        preprocessing_time_ms: acc.preprocessing_time_ms + m.preprocessing_time_ms,
        postprocessing_time_ms: acc.postprocessing_time_ms + m.postprocessing_time_ms,
        total_time_ms: acc.total_time_ms + m.total_time_ms,
        cpu_memory_mb: (acc.cpu_memory_mb || 0) + (m.cpu_memory_mb || 0),
        gpu_memory_mb: (acc.gpu_memory_mb || 0) + (m.gpu_memory_mb || 0),
      }),
      {
        inference_time_ms: 0,
        preprocessing_time_ms: 0,
        postprocessing_time_ms: 0,
        total_time_ms: 0,
        cpu_memory_mb: 0,
        gpu_memory_mb: 0,
      }
    );

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
  clear(modelName?: string): void {
    if (modelName) {
      this.metrics.delete(modelName);
    } else {
      this.metrics.clear();
    }
  }
}
