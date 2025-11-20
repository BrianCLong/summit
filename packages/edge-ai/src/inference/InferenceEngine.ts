import EventEmitter from 'eventemitter3';
import { pino, type Logger } from 'pino';

export enum ModelFormat {
  ONNX = 'onnx',
  TENSORFLOW_LITE = 'tflite',
  TENSORFLOW_JS = 'tfjs',
  PYTORCH = 'pytorch',
  CUSTOM = 'custom'
}

export enum Precision {
  FP32 = 'fp32',
  FP16 = 'fp16',
  INT8 = 'int8',
  MIXED = 'mixed'
}

export interface ModelMetadata {
  id: string;
  name: string;
  version: string;
  format: ModelFormat;
  precision: Precision;
  inputShape: number[];
  outputShape: number[];
  size: number; // bytes
  accelerator?: 'cpu' | 'gpu' | 'tpu' | 'npu';
  tags?: Record<string, string>;
}

export interface InferenceRequest {
  id: string;
  modelId: string;
  input: unknown;
  options?: {
    batchSize?: number;
    timeout?: number;
    priority?: 'high' | 'medium' | 'low';
  };
  timestamp: Date;
}

export interface InferenceResult {
  requestId: string;
  modelId: string;
  output: unknown;
  confidence?: number;
  latency: number; // milliseconds
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface InferenceStats {
  totalInferences: number;
  successfulInferences: number;
  failedInferences: number;
  avgLatency: number;
  p50Latency: number;
  p95Latency: number;
  p99Latency: number;
  throughput: number; // inferences per second
}

/**
 * Edge Inference Engine
 * Manages ML model inference at the edge with support for multiple formats
 */
export class InferenceEngine extends EventEmitter {
  private logger: Logger;
  private models: Map<string, ModelMetadata> = new Map();
  private modelCache: Map<string, unknown> = new Map();
  private inferenceQueue: InferenceRequest[] = [];
  private stats: Map<string, number[]> = new Map(); // modelId -> latencies
  private isProcessing = false;
  private maxCacheSize: number;
  private maxBatchSize: number;

  constructor(options?: {
    maxCacheSize?: number;
    maxBatchSize?: number;
    logger?: Logger;
  }) {
    super();
    this.maxCacheSize = options?.maxCacheSize || 1024 * 1024 * 1024; // 1GB default
    this.maxBatchSize = options?.maxBatchSize || 32;
    this.logger = options?.logger || pino({ name: 'InferenceEngine' });
  }

  /**
   * Register a model for inference
   */
  async registerModel(metadata: ModelMetadata, modelData?: unknown): Promise<void> {
    this.models.set(metadata.id, metadata);

    if (modelData) {
      await this.loadModel(metadata.id, modelData);
    }

    this.logger.info({ modelId: metadata.id, name: metadata.name }, 'Model registered');
    this.emit('model-registered', { modelId: metadata.id, metadata });
  }

  /**
   * Load model into cache
   */
  async loadModel(modelId: string, modelData: unknown): Promise<void> {
    const metadata = this.models.get(modelId);
    if (!metadata) {
      throw new Error(`Model ${modelId} not found`);
    }

    // Check cache size
    const currentCacheSize = this.getCurrentCacheSize();
    if (currentCacheSize + metadata.size > this.maxCacheSize) {
      await this.evictLRUModel();
    }

    this.modelCache.set(modelId, modelData);
    this.logger.info({ modelId }, 'Model loaded into cache');
    this.emit('model-loaded', { modelId });
  }

  /**
   * Unload model from cache
   */
  async unloadModel(modelId: string): Promise<void> {
    this.modelCache.delete(modelId);
    this.logger.info({ modelId }, 'Model unloaded from cache');
    this.emit('model-unloaded', { modelId });
  }

  /**
   * Submit inference request
   */
  async infer(
    modelId: string,
    input: unknown,
    options?: InferenceRequest['options']
  ): Promise<InferenceResult> {
    const request: InferenceRequest = {
      id: this.generateRequestId(),
      modelId,
      input,
      options,
      timestamp: new Date()
    };

    return new Promise((resolve, reject) => {
      this.inferenceQueue.push(request);

      // Set up listeners for this request
      const onResult = (result: InferenceResult) => {
        if (result.requestId === request.id) {
          this.off('inference-result', onResult);
          this.off('inference-error', onError);
          resolve(result);
        }
      };

      const onError = (error: { requestId: string; error: Error }) => {
        if (error.requestId === request.id) {
          this.off('inference-result', onResult);
          this.off('inference-error', onError);
          reject(error.error);
        }
      };

      this.on('inference-result', onResult);
      this.on('inference-error', onError);

      // Start processing if not already running
      if (!this.isProcessing) {
        this.processQueue();
      }
    });
  }

  /**
   * Process inference queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.inferenceQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      while (this.inferenceQueue.length > 0) {
        // Sort by priority
        this.inferenceQueue.sort((a, b) => {
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          const aPriority = priorityOrder[a.options?.priority || 'medium'];
          const bPriority = priorityOrder[b.options?.priority || 'medium'];
          return bPriority - aPriority;
        });

        const request = this.inferenceQueue.shift()!;

        try {
          const result = await this.executeInference(request);
          this.emit('inference-result', result);

          // Track stats
          this.recordInferenceStats(request.modelId, result.latency);
        } catch (error) {
          this.logger.error({ error, requestId: request.id }, 'Inference failed');
          this.emit('inference-error', { requestId: request.id, error });
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Execute a single inference
   */
  private async executeInference(request: InferenceRequest): Promise<InferenceResult> {
    const startTime = Date.now();

    const metadata = this.models.get(request.modelId);
    if (!metadata) {
      throw new Error(`Model ${request.modelId} not found`);
    }

    // Check if model is loaded
    if (!this.modelCache.has(request.modelId)) {
      throw new Error(`Model ${request.modelId} not loaded. Please load the model first.`);
    }

    const model = this.modelCache.get(request.modelId);

    // Simulate inference execution
    // In a real implementation, this would call the appropriate inference backend
    // based on the model format (ONNX, TFLite, etc.)
    const output = await this.runModelInference(model, request.input, metadata);

    const latency = Date.now() - startTime;

    const result: InferenceResult = {
      requestId: request.id,
      modelId: request.modelId,
      output,
      latency,
      timestamp: new Date()
    };

    this.logger.debug(
      { requestId: request.id, modelId: request.modelId, latency },
      'Inference completed'
    );

    return result;
  }

  /**
   * Run model inference (placeholder for actual inference logic)
   */
  private async runModelInference(
    model: unknown,
    input: unknown,
    metadata: ModelMetadata
  ): Promise<unknown> {
    // This is a placeholder. In a real implementation, you would:
    // 1. For ONNX: use onnxruntime-node
    // 2. For TFLite: use TensorFlow Lite runtime
    // 3. For TFJS: use @tensorflow/tfjs-node
    // 4. Handle input preprocessing and output postprocessing

    return {
      prediction: 'placeholder_result',
      confidence: 0.95,
      metadata: {
        format: metadata.format,
        precision: metadata.precision
      }
    };
  }

  /**
   * Batch inference for multiple inputs
   */
  async batchInfer(
    modelId: string,
    inputs: unknown[],
    options?: InferenceRequest['options']
  ): Promise<InferenceResult[]> {
    const batchSize = Math.min(inputs.length, this.maxBatchSize);
    const results: InferenceResult[] = [];

    for (let i = 0; i < inputs.length; i += batchSize) {
      const batch = inputs.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(input => this.infer(modelId, input, options))
      );
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Get inference statistics for a model
   */
  getModelStats(modelId: string): InferenceStats {
    const latencies = this.stats.get(modelId) || [];

    if (latencies.length === 0) {
      return {
        totalInferences: 0,
        successfulInferences: 0,
        failedInferences: 0,
        avgLatency: 0,
        p50Latency: 0,
        p95Latency: 0,
        p99Latency: 0,
        throughput: 0
      };
    }

    const sorted = [...latencies].sort((a, b) => a - b);
    const sum = latencies.reduce((a, b) => a + b, 0);

    return {
      totalInferences: latencies.length,
      successfulInferences: latencies.length,
      failedInferences: 0,
      avgLatency: sum / latencies.length,
      p50Latency: sorted[Math.floor(sorted.length * 0.5)],
      p95Latency: sorted[Math.floor(sorted.length * 0.95)],
      p99Latency: sorted[Math.floor(sorted.length * 0.99)],
      throughput: latencies.length / (sum / 1000) // inferences per second
    };
  }

  /**
   * Get all registered models
   */
  getModels(): ModelMetadata[] {
    return Array.from(this.models.values());
  }

  /**
   * Get loaded models
   */
  getLoadedModels(): string[] {
    return Array.from(this.modelCache.keys());
  }

  /**
   * Clear model cache
   */
  clearCache(): void {
    this.modelCache.clear();
    this.logger.info('Model cache cleared');
    this.emit('cache-cleared');
  }

  /**
   * Record inference stats
   */
  private recordInferenceStats(modelId: string, latency: number): void {
    if (!this.stats.has(modelId)) {
      this.stats.set(modelId, []);
    }

    const latencies = this.stats.get(modelId)!;
    latencies.push(latency);

    // Keep only last 1000 latencies
    if (latencies.length > 1000) {
      latencies.shift();
    }
  }

  /**
   * Evict least recently used model from cache
   */
  private async evictLRUModel(): Promise<void> {
    // Simple implementation: evict first model
    const modelId = this.modelCache.keys().next().value;
    if (modelId) {
      await this.unloadModel(modelId);
    }
  }

  /**
   * Get current cache size
   */
  private getCurrentCacheSize(): number {
    let size = 0;
    for (const modelId of this.modelCache.keys()) {
      const metadata = this.models.get(modelId);
      if (metadata) {
        size += metadata.size;
      }
    }
    return size;
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Shutdown inference engine
   */
  async shutdown(): Promise<void> {
    this.inferenceQueue = [];
    this.clearCache();
    this.removeAllListeners();
    this.logger.info('InferenceEngine shut down');
  }
}
