/**
 * YOLO Object Detection Implementation
 * Bridges to Python YOLO implementation
 */

import { spawn } from 'child_process';
import { promisify } from 'util';
import { promises as fs } from 'fs';
import path from 'path';
import {
  IObjectDetector,
  ModelConfig,
  Detection,
  BaseComputerVisionModel,
} from '@intelgraph/computer-vision';
import {
  ObjectDetectionConfig,
  ObjectDetectionResult,
  InstanceSegmentation,
} from './types.js';

const execFile = promisify(require('child_process').execFile);

/**
 * YOLO Detector for real-time object detection
 * Supports YOLOv8 and YOLOv9 models
 */
export class YOLODetector extends BaseComputerVisionModel implements IObjectDetector {
  private pythonScriptPath: string;
  private modelPath: string;
  private detectionConfig: ObjectDetectionConfig;

  constructor(config: Partial<ObjectDetectionConfig> = {}) {
    const modelConfig: ModelConfig = {
      model_name: config.model_type || 'yolov8',
      device: config.device || 'auto',
      confidence_threshold: config.confidence_threshold || 0.5,
      nms_threshold: config.nms_threshold || 0.4,
      max_detections: config.max_detections || 100,
      batch_size: config.batch_size || 1,
    };

    super(modelConfig);

    this.detectionConfig = {
      model_type: config.model_type || 'yolov8',
      model_size: config.model_size || 'medium',
      confidence_threshold: config.confidence_threshold || 0.5,
      nms_threshold: config.nms_threshold || 0.4,
      max_detections: config.max_detections || 100,
      device: config.device || 'auto',
      classes: config.classes,
      enable_tracking: config.enable_tracking || false,
      batch_size: config.batch_size || 1,
      input_size: config.input_size,
    };

    // Default paths (can be overridden)
    this.pythonScriptPath = process.env.YOLO_SCRIPT_PATH ||
      path.join(process.cwd(), 'server/src/ai/models/yolo_detection.py');
    this.modelPath = this.getModelPath();
  }

  /**
   * Get model path based on size
   */
  private getModelPath(): string {
    const sizeMap: Record<string, string> = {
      nano: 'yolov8n.pt',
      small: 'yolov8s.pt',
      medium: 'yolov8m.pt',
      large: 'yolov8l.pt',
      xlarge: 'yolov8x.pt',
    };

    if (this.detectionConfig.model_type === 'yolov9') {
      return sizeMap[this.detectionConfig.model_size].replace('yolov8', 'yolov9');
    }

    return sizeMap[this.detectionConfig.model_size];
  }

  /**
   * Initialize the detector
   */
  async initialize(): Promise<void> {
    // Check if Python script exists
    try {
      await fs.access(this.pythonScriptPath);
      this.initialized = true;
      this.modelLoaded = true;
    } catch (error) {
      throw new Error(`YOLO script not found at ${this.pythonScriptPath}`);
    }
  }

  /**
   * Detect objects in image
   */
  async detect(
    imagePath: string,
    options?: {
      confidenceThreshold?: number;
      nmsThreshold?: number;
      maxDetections?: number;
      classes?: string[];
    }
  ): Promise<ObjectDetectionResult> {
    this.ensureInitialized();

    const startTime = Date.now();

    try {
      const result = await this.runPythonDetection(imagePath, options);
      return {
        ...result,
        timestamp: new Date().toISOString(),
        processing_time_ms: Date.now() - startTime,
      };
    } catch (error) {
      throw new Error(`Detection failed: ${error}`);
    }
  }

  /**
   * Process a single image
   */
  async processImage(
    imagePath: string,
    options?: Record<string, any>
  ): Promise<ObjectDetectionResult> {
    return this.detect(imagePath, options);
  }

  /**
   * Process multiple images in batch
   */
  async processBatch(
    imagePaths: string[],
    options?: Record<string, any>
  ): Promise<ObjectDetectionResult[]> {
    // Process in parallel with batch size limit
    const batchSize = this.config.batch_size;
    const results: ObjectDetectionResult[] = [];

    for (let i = 0; i < imagePaths.length; i += batchSize) {
      const batch = imagePaths.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map((imagePath) => this.processImage(imagePath, options))
      );
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Run Python detection script
   */
  private async runPythonDetection(
    imagePath: string,
    options?: {
      confidenceThreshold?: number;
      nmsThreshold?: number;
      maxDetections?: number;
      classes?: string[];
    }
  ): Promise<ObjectDetectionResult> {
    const args = [
      this.pythonScriptPath,
      '--image', imagePath,
      '--model', this.modelPath,
      '--confidence', String(options?.confidenceThreshold || this.config.confidence_threshold),
      '--nms', String(options?.nmsThreshold || this.config.nms_threshold),
      '--max-detections', String(options?.maxDetections || this.config.max_detections),
      '--device', this.config.device,
    ];

    if (options?.classes && options.classes.length > 0) {
      args.push('--classes', options.classes.join(','));
    }

    return new Promise((resolve, reject) => {
      const python = spawn('python3', args);
      let stdout = '';
      let stderr = '';

      python.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      python.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      python.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Python script failed: ${stderr}`));
          return;
        }

        try {
          const result = JSON.parse(stdout);

          if (result.error) {
            reject(new Error(result.error));
            return;
          }

          resolve({
            detections: result.detections || [],
            image_size: {
              width: result.image_shape?.[1] || 0,
              height: result.image_shape?.[0] || 0,
            },
            model_info: {
              name: result.model || this.modelPath,
              device: this.config.device,
            },
            processing_time_ms: 0, // Will be set by caller
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          reject(new Error(`Failed to parse detection result: ${error}`));
        }
      });
    });
  }

  /**
   * Detect small objects using tiling strategy
   */
  async detectSmallObjects(
    imagePath: string,
    options?: {
      tileSize?: number;
      overlap?: number;
      minObjectSize?: number;
    }
  ): Promise<ObjectDetectionResult> {
    // Implementation would tile the image and merge detections
    // For now, delegate to regular detection
    return this.detect(imagePath);
  }

  /**
   * Perform instance segmentation
   */
  async segmentInstances(
    imagePath: string,
    options?: Record<string, any>
  ): Promise<InstanceSegmentation[]> {
    // Would use YOLOv8-seg model
    // For now, return detections without masks
    const result = await this.detect(imagePath, options);
    return result.detections.map((det) => ({
      ...det,
      mask: [],
    }));
  }

  /**
   * Track objects across frames
   */
  async track(
    imagePaths: string[],
    options?: Record<string, any>
  ): Promise<any> {
    // Multi-object tracking implementation
    // Would use ByteTrack or similar
    const detections = await this.processBatch(imagePaths, options);

    // Simple tracking by matching detections
    // Production implementation would use proper tracker
    return {
      frames: detections.map((det, idx) => ({
        frame_id: idx,
        detections: det.detections,
      })),
    };
  }

  /**
   * Draw detections on image
   */
  async drawDetections(
    imagePath: string,
    detections: Detection[],
    outputPath: string,
    options?: {
      showConfidence?: boolean;
      colorMap?: Record<string, [number, number, number]>;
    }
  ): Promise<string> {
    // Call Python script to draw
    const args = [
      this.pythonScriptPath,
      '--image', imagePath,
      '--model', this.modelPath,
      '--output-image', outputPath,
    ];

    await new Promise((resolve, reject) => {
      const python = spawn('python3', args);
      python.on('close', (code) => {
        if (code === 0) {
          resolve(outputPath);
        } else {
          reject(new Error('Failed to draw detections'));
        }
      });
    });

    return outputPath;
  }

  /**
   * Get supported classes
   */
  getSupportedClasses(): string[] {
    // COCO classes for YOLOv8
    return [
      'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck',
      'boat', 'traffic light', 'fire hydrant', 'stop sign', 'parking meter', 'bench',
      'bird', 'cat', 'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra',
      'giraffe', 'backpack', 'umbrella', 'handbag', 'tie', 'suitcase', 'frisbee',
      'skis', 'snowboard', 'sports ball', 'kite', 'baseball bat', 'baseball glove',
      'skateboard', 'surfboard', 'tennis racket', 'bottle', 'wine glass', 'cup',
      'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple', 'sandwich', 'orange',
      'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake', 'chair', 'couch',
      'potted plant', 'bed', 'dining table', 'toilet', 'tv', 'laptop', 'mouse',
      'remote', 'keyboard', 'cell phone', 'microwave', 'oven', 'toaster', 'sink',
      'refrigerator', 'book', 'clock', 'vase', 'scissors', 'teddy bear', 'hair drier',
      'toothbrush',
    ];
  }

  /**
   * Dispose of resources
   */
  async dispose(): Promise<void> {
    await super.dispose();
  }
}

/**
 * Create YOLO detector with default configuration
 */
export function createYOLODetector(
  config?: Partial<ObjectDetectionConfig>
): YOLODetector {
  return new YOLODetector(config);
}
