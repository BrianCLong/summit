/**
 * CLIP/ViT Vision Pipeline
 * Generates vision embeddings using CLIP (Contrastive Language-Image Pre-training)
 * and ViT (Vision Transformer) models for cross-modal OSINT fusion.
 */

import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import pino from 'pino';

import type {
  ImageEmbedding,
  DetectedObject,
  DetectedFace,
  BoundingBox,
  EmbeddingModel,
  ProvenanceInfo,
} from './types.js';

const logger = pino({ name: 'clip-pipeline' });

// CLIP Model Configurations
const CLIP_MODELS: Record<string, CLIPModelConfig> = {
  'clip-vit-base-patch32': {
    name: 'ViT-B/32',
    dimension: 512,
    patchSize: 32,
    imageSize: 224,
    endpoint: '/api/v1/clip/embed',
  },
  'clip-vit-large-patch14': {
    name: 'ViT-L/14',
    dimension: 768,
    patchSize: 14,
    imageSize: 224,
    endpoint: '/api/v1/clip/embed',
  },
  'openai-clip': {
    name: 'openai/clip-vit-large-patch14',
    dimension: 768,
    patchSize: 14,
    imageSize: 224,
    endpoint: '/api/v1/clip/embed',
  },
};

interface CLIPModelConfig {
  name: string;
  dimension: number;
  patchSize: number;
  imageSize: number;
  endpoint: string;
}

export interface CLIPPipelineConfig {
  model: EmbeddingModel;
  visionApiUrl: string;
  batchSize: number;
  maxConcurrency: number;
  enableObjectDetection: boolean;
  enableFaceDetection: boolean;
  enableOCR: boolean;
  cacheEnabled: boolean;
  cachePath?: string;
  timeoutMs: number;
}

interface ImageProcessingResult {
  embedding: number[];
  objects?: DetectedObject[];
  faces?: DetectedFace[];
  ocrText?: string;
  processingTime: number;
}

export class CLIPPipeline {
  private config: CLIPPipelineConfig;
  private modelConfig: CLIPModelConfig;
  private processingQueue: Map<string, Promise<ImageProcessingResult>> = new Map();
  private cache: Map<string, ImageEmbedding> = new Map();

  constructor(config: Partial<CLIPPipelineConfig> = {}) {
    this.config = {
      model: 'clip-vit-large-patch14',
      visionApiUrl: process.env.VISION_API_URL || 'http://localhost:8080',
      batchSize: 8,
      maxConcurrency: 4,
      enableObjectDetection: true,
      enableFaceDetection: true,
      enableOCR: false,
      cacheEnabled: true,
      cachePath: process.env.EMBEDDING_CACHE_PATH,
      timeoutMs: 30000,
      ...config,
    };

    const modelKey = this.config.model as string;
    this.modelConfig = CLIP_MODELS[modelKey] || CLIP_MODELS['clip-vit-large-patch14'];

    logger.info('CLIP Pipeline initialized', {
      model: this.config.model,
      dimension: this.modelConfig.dimension,
      visionApiUrl: this.config.visionApiUrl,
    });
  }

  /**
   * Generate CLIP embedding for a single image
   */
  async embedImage(
    imagePath: string,
    investigationId: string,
    sourceId?: string,
  ): Promise<ImageEmbedding> {
    const startTime = Date.now();
    const imageId = sourceId || this.generateImageId(imagePath);

    // Check cache first
    if (this.config.cacheEnabled) {
      const cached = await this.getCachedEmbedding(imageId);
      if (cached) {
        logger.debug('Cache hit for image embedding', { imageId });
        return cached;
      }
    }

    try {
      // Validate image exists
      await this.validateImage(imagePath);

      // Get image metadata
      const imageInfo = await this.getImageInfo(imagePath);

      // Process image (embedding + optional detections)
      const result = await this.processImage(imagePath);

      const embedding: ImageEmbedding = {
        id: imageId,
        vector: result.embedding,
        dimension: this.modelConfig.dimension,
        model: this.config.model,
        modality: 'image',
        timestamp: new Date(),
        metadata: {
          sourceId: imageId,
          sourceUri: imagePath,
          investigationId,
          confidence: this.calculateConfidence(result),
          processingTime: Date.now() - startTime,
          provenance: this.buildProvenance(startTime),
        },
        imagePath,
        width: imageInfo.width,
        height: imageInfo.height,
        format: imageInfo.format,
        clipVector: result.embedding,
        objects: result.objects,
        faces: result.faces,
        ocrText: result.ocrText,
      };

      // Cache the embedding
      if (this.config.cacheEnabled) {
        await this.cacheEmbedding(imageId, embedding);
      }

      logger.info('Image embedding generated', {
        imageId,
        dimension: embedding.dimension,
        objectCount: result.objects?.length || 0,
        faceCount: result.faces?.length || 0,
        processingTimeMs: Date.now() - startTime,
      });

      return embedding;
    } catch (error) {
      logger.error('Failed to generate image embedding', {
        imagePath,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Batch process multiple images
   */
  async embedImageBatch(
    imagePaths: string[],
    investigationId: string,
  ): Promise<ImageEmbedding[]> {
    const startTime = Date.now();

    logger.info('Starting batch image embedding', {
      imageCount: imagePaths.length,
      batchSize: this.config.batchSize,
    });

    const results: ImageEmbedding[] = [];
    const errors: Array<{ path: string; error: string }> = [];

    // Process in batches with concurrency control
    for (let i = 0; i < imagePaths.length; i += this.config.batchSize) {
      const batch = imagePaths.slice(i, i + this.config.batchSize);

      const batchPromises = batch.map(async (imagePath, index) => {
        try {
          return await this.embedImage(imagePath, investigationId);
        } catch (error) {
          errors.push({
            path: imagePath,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          return null;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults.filter((r): r is ImageEmbedding => r !== null));
    }

    logger.info('Batch image embedding completed', {
      totalImages: imagePaths.length,
      successCount: results.length,
      errorCount: errors.length,
      totalTimeMs: Date.now() - startTime,
    });

    return results;
  }

  /**
   * Generate embedding for image-text pair (for cross-modal alignment)
   */
  async embedImageTextPair(
    imagePath: string,
    text: string,
    investigationId: string,
  ): Promise<{ imageEmbedding: number[]; textEmbedding: number[]; similarity: number }> {
    const startTime = Date.now();

    try {
      // Generate image embedding
      const imageEmbedding = await this.processImage(imagePath);

      // Generate text embedding using CLIP text encoder
      const textEmbedding = await this.embedTextWithCLIP(text);

      // Calculate cosine similarity
      const similarity = this.cosineSimilarity(imageEmbedding.embedding, textEmbedding);

      logger.debug('Image-text pair embedded', {
        imagePath,
        textLength: text.length,
        similarity,
        processingTimeMs: Date.now() - startTime,
      });

      return {
        imageEmbedding: imageEmbedding.embedding,
        textEmbedding,
        similarity,
      };
    } catch (error) {
      logger.error('Failed to embed image-text pair', {
        imagePath,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Find similar images using embedding similarity
   */
  async findSimilarImages(
    queryEmbedding: number[],
    candidateEmbeddings: ImageEmbedding[],
    topK: number = 10,
    threshold: number = 0.7,
  ): Promise<Array<{ embedding: ImageEmbedding; similarity: number }>> {
    const similarities = candidateEmbeddings.map((candidate) => ({
      embedding: candidate,
      similarity: this.cosineSimilarity(queryEmbedding, candidate.vector),
    }));

    return similarities
      .filter((s) => s.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  }

  /**
   * Process image through vision API
   */
  private async processImage(imagePath: string): Promise<ImageProcessingResult> {
    const startTime = Date.now();

    // Read image file
    const imageBuffer = await fs.readFile(imagePath);
    const base64Image = imageBuffer.toString('base64');
    const mimeType = this.getMimeType(imagePath);

    // Prepare requests for parallel processing
    const requests: Promise<any>[] = [];

    // CLIP embedding request
    requests.push(this.callVisionAPI('/api/v1/clip/embed', {
      image: `data:${mimeType};base64,${base64Image}`,
      model: this.modelConfig.name,
    }));

    // Optional object detection
    if (this.config.enableObjectDetection) {
      requests.push(this.callVisionAPI('/api/v1/detect/objects', {
        image: `data:${mimeType};base64,${base64Image}`,
        confidence_threshold: 0.5,
      }).catch(() => ({ detections: [] })));
    }

    // Optional face detection
    if (this.config.enableFaceDetection) {
      requests.push(this.callVisionAPI('/api/v1/face/detect', {
        image: `data:${mimeType};base64,${base64Image}`,
        extract_embeddings: true,
      }).catch(() => ({ faces: [] })));
    }

    // Optional OCR
    if (this.config.enableOCR) {
      requests.push(this.callVisionAPI('/api/v1/ocr/extract', {
        image: `data:${mimeType};base64,${base64Image}`,
      }).catch(() => ({ text: '' })));
    }

    const [clipResult, objectResult, faceResult, ocrResult] = await Promise.all(requests);

    // Parse results
    const embedding = this.parseClipEmbedding(clipResult);
    const objects = this.config.enableObjectDetection
      ? this.parseObjectDetections(objectResult)
      : undefined;
    const faces = this.config.enableFaceDetection
      ? this.parseFaceDetections(faceResult)
      : undefined;
    const ocrText = this.config.enableOCR ? ocrResult?.text : undefined;

    return {
      embedding,
      objects,
      faces,
      ocrText,
      processingTime: Date.now() - startTime,
    };
  }

  /**
   * Embed text using CLIP text encoder
   */
  private async embedTextWithCLIP(text: string): Promise<number[]> {
    const response = await this.callVisionAPI('/api/v1/clip/embed-text', {
      text,
      model: this.modelConfig.name,
    });

    return this.parseClipEmbedding(response);
  }

  /**
   * Call Vision API endpoint
   */
  private async callVisionAPI(endpoint: string, body: Record<string, unknown>): Promise<any> {
    const url = `${this.config.visionApiUrl}${endpoint}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Vision API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Parse CLIP embedding from API response
   */
  private parseClipEmbedding(response: any): number[] {
    if (response?.embedding) {
      return response.embedding;
    }
    if (response?.data?.[0]?.embedding) {
      return response.data[0].embedding;
    }
    throw new Error('Invalid CLIP embedding response');
  }

  /**
   * Parse object detections from API response
   */
  private parseObjectDetections(response: any): DetectedObject[] {
    if (!response?.detections) return [];

    return response.detections.map((det: any) => ({
      label: det.class || det.label,
      confidence: det.confidence || det.score,
      boundingBox: {
        x: det.bbox?.[0] || det.x,
        y: det.bbox?.[1] || det.y,
        width: det.bbox?.[2] || det.width,
        height: det.bbox?.[3] || det.height,
      },
    }));
  }

  /**
   * Parse face detections from API response
   */
  private parseFaceDetections(response: any): DetectedFace[] {
    if (!response?.faces) return [];

    return response.faces.map((face: any, index: number) => ({
      faceId: face.id || `face-${index}`,
      confidence: face.confidence || face.score,
      boundingBox: {
        x: face.bbox?.[0] || face.x,
        y: face.bbox?.[1] || face.y,
        width: face.bbox?.[2] || face.width,
        height: face.bbox?.[3] || face.height,
      },
      embedding: face.embedding,
      landmarks: face.landmarks,
    }));
  }

  /**
   * Validate image file
   */
  private async validateImage(imagePath: string): Promise<void> {
    try {
      await fs.access(imagePath);
      const stats = await fs.stat(imagePath);

      if (!stats.isFile()) {
        throw new Error('Path is not a file');
      }

      // Check file size (max 100MB)
      const maxSize = 100 * 1024 * 1024;
      if (stats.size > maxSize) {
        throw new Error(`Image too large: ${stats.size} bytes (max: ${maxSize})`);
      }

      // Validate extension
      const ext = path.extname(imagePath).toLowerCase();
      const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff'];
      if (!validExtensions.includes(ext)) {
        throw new Error(`Invalid image extension: ${ext}`);
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('ENOENT')) {
        throw new Error(`Image not found: ${imagePath}`);
      }
      throw error;
    }
  }

  /**
   * Get image metadata
   */
  private async getImageInfo(imagePath: string): Promise<{
    width: number;
    height: number;
    format: string;
  }> {
    // Basic implementation - in production, use sharp or similar
    const ext = path.extname(imagePath).toLowerCase().slice(1);
    const stats = await fs.stat(imagePath);

    // Placeholder dimensions - would need image library to read actual dimensions
    return {
      width: 0, // Would be read from image metadata
      height: 0,
      format: ext,
    };
  }

  /**
   * Generate unique image ID
   */
  private generateImageId(imagePath: string): string {
    return createHash('sha256')
      .update(imagePath + Date.now())
      .digest('hex')
      .slice(0, 16);
  }

  /**
   * Calculate embedding confidence score
   */
  private calculateConfidence(result: ImageProcessingResult): number {
    let confidence = 0.8; // Base confidence

    // Boost confidence if objects detected
    if (result.objects && result.objects.length > 0) {
      const avgObjectConf = result.objects.reduce((sum, o) => sum + o.confidence, 0) /
        result.objects.length;
      confidence = Math.max(confidence, avgObjectConf);
    }

    // Boost confidence if faces detected
    if (result.faces && result.faces.length > 0) {
      const avgFaceConf = result.faces.reduce((sum, f) => sum + f.confidence, 0) /
        result.faces.length;
      confidence = Math.max(confidence, avgFaceConf);
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Build provenance information
   */
  private buildProvenance(startTime: number): ProvenanceInfo {
    return {
      extractorName: 'CLIPPipeline',
      extractorVersion: '1.0.0',
      modelName: this.modelConfig.name,
      modelVersion: '1.0',
      processingParams: {
        model: this.config.model,
        enableObjectDetection: this.config.enableObjectDetection,
        enableFaceDetection: this.config.enableFaceDetection,
        enableOCR: this.config.enableOCR,
      },
      errors: [],
      warnings: [],
    };
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have same dimension');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }

  /**
   * Get MIME type from file extension
   */
  private getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.bmp': 'image/bmp',
      '.tiff': 'image/tiff',
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }

  /**
   * Cache embedding
   */
  private async cacheEmbedding(imageId: string, embedding: ImageEmbedding): Promise<void> {
    this.cache.set(imageId, embedding);

    if (this.config.cachePath) {
      try {
        const cachePath = path.join(this.config.cachePath, `${imageId}.json`);
        await fs.mkdir(path.dirname(cachePath), { recursive: true });
        await fs.writeFile(cachePath, JSON.stringify(embedding));
      } catch (error) {
        logger.warn('Failed to write cache file', {
          imageId,
          error: error instanceof Error ? error.message : 'Unknown',
        });
      }
    }
  }

  /**
   * Get cached embedding
   */
  private async getCachedEmbedding(imageId: string): Promise<ImageEmbedding | null> {
    // Check in-memory cache first
    const cached = this.cache.get(imageId);
    if (cached) return cached;

    // Check file cache
    if (this.config.cachePath) {
      try {
        const cachePath = path.join(this.config.cachePath, `${imageId}.json`);
        const data = await fs.readFile(cachePath, 'utf-8');
        const embedding = JSON.parse(data) as ImageEmbedding;
        this.cache.set(imageId, embedding);
        return embedding;
      } catch {
        return null;
      }
    }

    return null;
  }

  /**
   * Clear cache
   */
  async clearCache(): Promise<void> {
    this.cache.clear();
    logger.info('Cache cleared');
  }

  /**
   * Get pipeline statistics
   */
  getStats(): {
    model: string;
    dimension: number;
    cacheSize: number;
    config: CLIPPipelineConfig;
  } {
    return {
      model: this.config.model,
      dimension: this.modelConfig.dimension,
      cacheSize: this.cache.size,
      config: this.config,
    };
  }
}

export default CLIPPipeline;
