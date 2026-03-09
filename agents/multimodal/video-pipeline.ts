/**
 * Video Frame Extraction Pipeline
 * Extracts key frames from video and generates temporal embeddings
 * for OSINT video analysis and cross-modal fusion.
 */

import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import pino from 'pino';

import type {
  VideoEmbedding,
  KeyFrame,
  TemporalSegment,
  DetectedObject,
  DetectedFace,
  ProvenanceInfo,
  EmbeddingModel,
} from './types.js';
import { CLIPPipeline } from './clip-pipeline.js';

const logger = pino({ name: 'video-pipeline' });

export interface VideoPipelineConfig {
  clipModel: EmbeddingModel;
  visionApiUrl: string;
  ffmpegPath: string;
  frameExtractionMode: 'uniform' | 'scene_change' | 'keyframe';
  framesPerSecond: number;
  maxFrames: number;
  minSceneChangeThreshold: number;
  enableObjectTracking: boolean;
  enableFaceTracking: boolean;
  enableActivityRecognition: boolean;
  tempDir: string;
  batchSize: number;
  timeoutMs: number;
  cacheEnabled: boolean;
}

interface VideoMetadata {
  duration: number;
  fps: number;
  width: number;
  height: number;
  codec: string;
  bitrate: number;
  totalFrames: number;
}

interface ExtractedFrame {
  framePath: string;
  frameNumber: number;
  timestamp: number;
  isKeyFrame: boolean;
  sceneChangeScore?: number;
}

interface FrameAnalysisResult {
  embedding: number[];
  objects?: DetectedObject[];
  faces?: DetectedFace[];
  sceneType?: string;
  activity?: string;
}

export class VideoPipeline {
  private config: VideoPipelineConfig;
  private clipPipeline: CLIPPipeline;
  private cache: Map<string, VideoEmbedding> = new Map();

  constructor(config: Partial<VideoPipelineConfig> = {}) {
    this.config = {
      clipModel: 'clip-vit-large-patch14',
      visionApiUrl: process.env.VISION_API_URL || 'http://localhost:8080',
      ffmpegPath: process.env.FFMPEG_PATH || 'ffmpeg',
      frameExtractionMode: 'scene_change',
      framesPerSecond: 1,
      maxFrames: 100,
      minSceneChangeThreshold: 0.3,
      enableObjectTracking: true,
      enableFaceTracking: true,
      enableActivityRecognition: false,
      tempDir: process.env.VIDEO_TEMP_DIR || '/tmp/video-frames',
      batchSize: 8,
      timeoutMs: 120000,
      cacheEnabled: true,
      ...config,
    };

    this.clipPipeline = new CLIPPipeline({
      model: this.config.clipModel,
      visionApiUrl: this.config.visionApiUrl,
      enableObjectDetection: this.config.enableObjectTracking,
      enableFaceDetection: this.config.enableFaceTracking,
    });

    logger.info('Video Pipeline initialized', {
      frameExtractionMode: this.config.frameExtractionMode,
      maxFrames: this.config.maxFrames,
      tempDir: this.config.tempDir,
    });
  }

  /**
   * Process video and generate embeddings
   */
  async embedVideo(
    videoPath: string,
    investigationId: string,
    sourceId?: string,
  ): Promise<VideoEmbedding> {
    const startTime = Date.now();
    const videoId = sourceId || this.generateVideoId(videoPath);

    // Check cache
    if (this.config.cacheEnabled) {
      const cached = this.cache.get(videoId);
      if (cached) {
        logger.debug('Cache hit for video embedding', { videoId });
        return cached;
      }
    }

    let frameDir: string | null = null;

    try {
      // Validate video
      await this.validateVideo(videoPath);

      // Get video metadata
      const metadata = await this.getVideoMetadata(videoPath);

      // Create temp directory for frames
      frameDir = path.join(this.config.tempDir, videoId);
      await fs.mkdir(frameDir, { recursive: true });

      // Extract frames
      const frames = await this.extractFrames(videoPath, frameDir, metadata);

      logger.info('Frames extracted', {
        videoId,
        frameCount: frames.length,
        duration: metadata.duration,
      });

      // Analyze frames in batches
      const keyFrames = await this.analyzeFrames(frames, investigationId);

      // Generate temporal segments
      const temporalSegments = this.generateTemporalSegments(keyFrames, metadata);

      // Compute aggregate embedding
      const aggregateVector = this.computeAggregateEmbedding(keyFrames);

      const embedding: VideoEmbedding = {
        id: videoId,
        vector: aggregateVector,
        dimension: aggregateVector.length,
        model: this.config.clipModel,
        modality: 'video',
        timestamp: new Date(),
        metadata: {
          sourceId: videoId,
          sourceUri: videoPath,
          investigationId,
          confidence: this.calculateConfidence(keyFrames),
          processingTime: Date.now() - startTime,
          provenance: this.buildProvenance(startTime, metadata),
        },
        videoPath,
        duration: metadata.duration,
        fps: metadata.fps,
        width: metadata.width,
        height: metadata.height,
        keyFrames,
        aggregateVector,
        temporalSegments,
      };

      // Cache the embedding
      if (this.config.cacheEnabled) {
        this.cache.set(videoId, embedding);
      }

      logger.info('Video embedding generated', {
        videoId,
        duration: metadata.duration,
        keyFrameCount: keyFrames.length,
        segmentCount: temporalSegments.length,
        processingTimeMs: Date.now() - startTime,
      });

      return embedding;
    } catch (error) {
      logger.error('Failed to generate video embedding', {
        videoPath,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    } finally {
      // Cleanup temp frames
      if (frameDir) {
        await this.cleanupFrames(frameDir);
      }
    }
  }

  /**
   * Extract frames from video using FFmpeg
   */
  private async extractFrames(
    videoPath: string,
    outputDir: string,
    metadata: VideoMetadata,
  ): Promise<ExtractedFrame[]> {
    const frames: ExtractedFrame[] = [];

    // Calculate frame extraction parameters
    const totalDuration = metadata.duration;
    let frameCount: number;
    let interval: number;

    if (this.config.frameExtractionMode === 'uniform') {
      frameCount = Math.min(
        this.config.maxFrames,
        Math.ceil(totalDuration * this.config.framesPerSecond),
      );
      interval = totalDuration / frameCount;
    } else {
      frameCount = this.config.maxFrames;
      interval = totalDuration / frameCount;
    }

    // Build FFmpeg command
    const ffmpegArgs = this.buildFFmpegArgs(
      videoPath,
      outputDir,
      this.config.frameExtractionMode,
      interval,
      frameCount,
    );

    // Execute FFmpeg
    await this.executeFFmpeg(ffmpegArgs);

    // Read extracted frames
    const files = await fs.readdir(outputDir);
    const frameFiles = files
      .filter((f) => f.endsWith('.jpg') || f.endsWith('.png'))
      .sort((a, b) => {
        const numA = parseInt(a.match(/\d+/)?.[0] || '0');
        const numB = parseInt(b.match(/\d+/)?.[0] || '0');
        return numA - numB;
      });

    for (let i = 0; i < frameFiles.length; i++) {
      const framePath = path.join(outputDir, frameFiles[i]);
      const frameNumber = i;
      const timestamp = (i / frameFiles.length) * totalDuration;

      frames.push({
        framePath,
        frameNumber,
        timestamp,
        isKeyFrame: i === 0 || i === frameFiles.length - 1,
      });
    }

    return frames.slice(0, this.config.maxFrames);
  }

  /**
   * Build FFmpeg arguments based on extraction mode
   */
  private buildFFmpegArgs(
    inputPath: string,
    outputDir: string,
    mode: string,
    interval: number,
    maxFrames: number,
  ): string[] {
    const outputPattern = path.join(outputDir, 'frame_%04d.jpg');

    switch (mode) {
      case 'scene_change':
        return [
          '-i', inputPath,
          '-vf', `select='gt(scene,${this.config.minSceneChangeThreshold})',showinfo`,
          '-vsync', 'vfr',
          '-frames:v', String(maxFrames),
          '-q:v', '2',
          outputPattern,
        ];

      case 'keyframe':
        return [
          '-i', inputPath,
          '-vf', "select='eq(pict_type,I)'",
          '-vsync', 'vfr',
          '-frames:v', String(maxFrames),
          '-q:v', '2',
          outputPattern,
        ];

      case 'uniform':
      default:
        return [
          '-i', inputPath,
          '-vf', `fps=1/${interval}`,
          '-frames:v', String(maxFrames),
          '-q:v', '2',
          outputPattern,
        ];
    }
  }

  /**
   * Execute FFmpeg command
   */
  private executeFFmpeg(args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const process = spawn(this.config.ffmpegPath, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let stderr = '';

      process.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      const timeout = setTimeout(() => {
        process.kill();
        reject(new Error('FFmpeg timeout'));
      }, this.config.timeoutMs);

      process.on('close', (code) => {
        clearTimeout(timeout);
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`FFmpeg exited with code ${code}: ${stderr}`));
        }
      });

      process.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
  }

  /**
   * Analyze extracted frames using CLIP
   */
  private async analyzeFrames(
    frames: ExtractedFrame[],
    investigationId: string,
  ): Promise<KeyFrame[]> {
    const keyFrames: KeyFrame[] = [];

    // Process frames in batches
    for (let i = 0; i < frames.length; i += this.config.batchSize) {
      const batch = frames.slice(i, i + this.config.batchSize);

      const batchPromises = batch.map(async (frame) => {
        try {
          const imageEmbedding = await this.clipPipeline.embedImage(
            frame.framePath,
            investigationId,
            `frame-${frame.frameNumber}`,
          );

          return {
            frameNumber: frame.frameNumber,
            timestamp: frame.timestamp,
            embedding: imageEmbedding.vector,
            objects: imageEmbedding.objects,
            faces: imageEmbedding.faces,
            sceneType: this.classifyScene(imageEmbedding.objects),
          };
        } catch (error) {
          logger.warn('Failed to analyze frame', {
            frameNumber: frame.frameNumber,
            error: error instanceof Error ? error.message : 'Unknown',
          });
          return null;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      keyFrames.push(
        ...batchResults.filter((r): r is KeyFrame => r !== null),
      );
    }

    return keyFrames;
  }

  /**
   * Generate temporal segments from key frames
   */
  private generateTemporalSegments(
    keyFrames: KeyFrame[],
    metadata: VideoMetadata,
  ): TemporalSegment[] {
    if (keyFrames.length === 0) return [];

    const segments: TemporalSegment[] = [];
    const segmentDuration = metadata.duration / Math.max(keyFrames.length - 1, 1);

    for (let i = 0; i < keyFrames.length - 1; i++) {
      const startFrame = keyFrames[i];
      const endFrame = keyFrames[i + 1];

      // Interpolate embedding between frames
      const segmentEmbedding = this.interpolateEmbeddings(
        startFrame.embedding,
        endFrame.embedding,
        0.5,
      );

      // Determine activity based on detected objects
      const activity = this.detectActivity(startFrame, endFrame);

      segments.push({
        startTime: startFrame.timestamp,
        endTime: endFrame.timestamp,
        embedding: segmentEmbedding,
        activity,
        confidence: this.calculateSegmentConfidence(startFrame, endFrame),
      });
    }

    return segments;
  }

  /**
   * Compute aggregate embedding from key frames
   */
  private computeAggregateEmbedding(keyFrames: KeyFrame[]): number[] {
    if (keyFrames.length === 0) {
      return [];
    }

    if (keyFrames.length === 1) {
      return keyFrames[0].embedding;
    }

    // Weighted average with temporal weighting
    const dimension = keyFrames[0].embedding.length;
    const result = new Array(dimension).fill(0);
    let totalWeight = 0;

    for (let i = 0; i < keyFrames.length; i++) {
      // Weight frames near the beginning and end more heavily
      const position = i / (keyFrames.length - 1);
      const weight = 1 + 0.5 * Math.sin(Math.PI * position);

      for (let j = 0; j < dimension; j++) {
        result[j] += keyFrames[i].embedding[j] * weight;
      }
      totalWeight += weight;
    }

    // Normalize
    for (let j = 0; j < dimension; j++) {
      result[j] /= totalWeight;
    }

    // L2 normalize
    const norm = Math.sqrt(result.reduce((sum, v) => sum + v * v, 0));
    if (norm > 0) {
      for (let j = 0; j < dimension; j++) {
        result[j] /= norm;
      }
    }

    return result;
  }

  /**
   * Interpolate between two embeddings
   */
  private interpolateEmbeddings(
    a: number[],
    b: number[],
    t: number,
  ): number[] {
    const result = new Array(a.length);
    for (let i = 0; i < a.length; i++) {
      result[i] = a[i] * (1 - t) + b[i] * t;
    }

    // Normalize
    const norm = Math.sqrt(result.reduce((sum, v) => sum + v * v, 0));
    if (norm > 0) {
      for (let i = 0; i < a.length; i++) {
        result[i] /= norm;
      }
    }

    return result;
  }

  /**
   * Classify scene based on detected objects
   */
  private classifyScene(objects?: DetectedObject[]): string {
    if (!objects || objects.length === 0) {
      return 'unknown';
    }

    const labels = objects.map((o) => o.label.toLowerCase());

    // Simple scene classification based on detected objects
    if (labels.some((l) => ['car', 'truck', 'bus', 'traffic light', 'road'].includes(l))) {
      return 'street';
    }
    if (labels.some((l) => ['person', 'crowd'].includes(l))) {
      return 'people';
    }
    if (labels.some((l) => ['building', 'house', 'skyscraper'].includes(l))) {
      return 'urban';
    }
    if (labels.some((l) => ['tree', 'grass', 'mountain', 'sky'].includes(l))) {
      return 'outdoor';
    }
    if (labels.some((l) => ['chair', 'table', 'couch', 'bed'].includes(l))) {
      return 'indoor';
    }

    return 'general';
  }

  /**
   * Detect activity between frames
   */
  private detectActivity(startFrame: KeyFrame, endFrame: KeyFrame): string {
    // Simple activity detection based on object changes
    const startObjects = new Set(startFrame.objects?.map((o) => o.label) || []);
    const endObjects = new Set(endFrame.objects?.map((o) => o.label) || []);

    // Check for motion indicators
    const hasVehicles = ['car', 'truck', 'bus', 'motorcycle'].some(
      (v) => startObjects.has(v) || endObjects.has(v),
    );
    const hasPeople = startFrame.faces?.length || endFrame.faces?.length;

    if (hasVehicles) return 'vehicle_activity';
    if (hasPeople) return 'human_activity';

    return 'static';
  }

  /**
   * Calculate segment confidence
   */
  private calculateSegmentConfidence(
    startFrame: KeyFrame,
    endFrame: KeyFrame,
  ): number {
    // Calculate embedding similarity
    const similarity = this.cosineSimilarity(
      startFrame.embedding,
      endFrame.embedding,
    );

    // Higher similarity = more coherent segment = higher confidence
    return 0.5 + similarity * 0.5;
  }

  /**
   * Get video metadata using FFprobe
   */
  private async getVideoMetadata(videoPath: string): Promise<VideoMetadata> {
    return new Promise((resolve, reject) => {
      const args = [
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_format',
        '-show_streams',
        videoPath,
      ];

      const process = spawn('ffprobe', args, {
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let stdout = '';

      process.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      process.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`FFprobe exited with code ${code}`));
          return;
        }

        try {
          const data = JSON.parse(stdout);
          const videoStream = data.streams?.find(
            (s: any) => s.codec_type === 'video',
          );

          if (!videoStream) {
            reject(new Error('No video stream found'));
            return;
          }

          const fps = this.parseFps(videoStream.r_frame_rate);
          const duration = parseFloat(data.format?.duration || videoStream.duration || '0');

          resolve({
            duration,
            fps,
            width: videoStream.width,
            height: videoStream.height,
            codec: videoStream.codec_name,
            bitrate: parseInt(data.format?.bit_rate || '0'),
            totalFrames: Math.ceil(duration * fps),
          });
        } catch (error) {
          reject(new Error(`Failed to parse video metadata: ${error}`));
        }
      });

      process.on('error', (err) => {
        reject(err);
      });
    });
  }

  /**
   * Parse FPS string (e.g., "30000/1001" -> 29.97)
   */
  private parseFps(fpsString: string): number {
    if (fpsString.includes('/')) {
      const [num, den] = fpsString.split('/').map(Number);
      return num / den;
    }
    return parseFloat(fpsString) || 30;
  }

  /**
   * Validate video file
   */
  private async validateVideo(videoPath: string): Promise<void> {
    try {
      await fs.access(videoPath);
      const stats = await fs.stat(videoPath);

      if (!stats.isFile()) {
        throw new Error('Path is not a file');
      }

      // Check file size (max 5GB)
      const maxSize = 5 * 1024 * 1024 * 1024;
      if (stats.size > maxSize) {
        throw new Error(`Video too large: ${stats.size} bytes (max: ${maxSize})`);
      }

      // Validate extension
      const ext = path.extname(videoPath).toLowerCase();
      const validExtensions = ['.mp4', '.avi', '.mov', '.mkv', '.webm', '.m4v', '.wmv', '.flv'];
      if (!validExtensions.includes(ext)) {
        throw new Error(`Invalid video extension: ${ext}`);
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('ENOENT')) {
        throw new Error(`Video not found: ${videoPath}`);
      }
      throw error;
    }
  }

  /**
   * Cleanup extracted frames
   */
  private async cleanupFrames(frameDir: string): Promise<void> {
    try {
      const files = await fs.readdir(frameDir);
      await Promise.all(
        files.map((f) => fs.unlink(path.join(frameDir, f))),
      );
      await fs.rmdir(frameDir);
    } catch (error) {
      logger.warn('Failed to cleanup frames', {
        frameDir,
        error: error instanceof Error ? error.message : 'Unknown',
      });
    }
  }

  /**
   * Generate unique video ID
   */
  private generateVideoId(videoPath: string): string {
    return createHash('sha256')
      .update(videoPath + Date.now())
      .digest('hex')
      .slice(0, 16);
  }

  /**
   * Calculate overall confidence
   */
  private calculateConfidence(keyFrames: KeyFrame[]): number {
    if (keyFrames.length === 0) return 0;

    // Base confidence on number of successfully processed frames
    let confidence = 0.7 + (keyFrames.length / this.config.maxFrames) * 0.2;

    // Boost if objects/faces detected
    const framesWithDetections = keyFrames.filter(
      (f) => (f.objects?.length || 0) > 0 || (f.faces?.length || 0) > 0,
    ).length;
    confidence += (framesWithDetections / keyFrames.length) * 0.1;

    return Math.min(confidence, 1.0);
  }

  /**
   * Build provenance information
   */
  private buildProvenance(
    startTime: number,
    metadata: VideoMetadata,
  ): ProvenanceInfo {
    return {
      extractorName: 'VideoPipeline',
      extractorVersion: '1.0.0',
      modelName: this.config.clipModel,
      modelVersion: '1.0',
      processingParams: {
        frameExtractionMode: this.config.frameExtractionMode,
        maxFrames: this.config.maxFrames,
        framesPerSecond: this.config.framesPerSecond,
        videoDuration: metadata.duration,
        videoFps: metadata.fps,
        videoResolution: `${metadata.width}x${metadata.height}`,
      },
      errors: [],
      warnings: [],
    };
  }

  /**
   * Cosine similarity between vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
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
   * Find similar videos
   */
  async findSimilarVideos(
    queryEmbedding: number[],
    candidateEmbeddings: VideoEmbedding[],
    topK: number = 10,
    threshold: number = 0.7,
  ): Promise<Array<{ embedding: VideoEmbedding; similarity: number }>> {
    const similarities = candidateEmbeddings.map((candidate) => ({
      embedding: candidate,
      similarity: this.cosineSimilarity(queryEmbedding, candidate.aggregateVector),
    }));

    return similarities
      .filter((s) => s.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    logger.info('Video cache cleared');
  }

  /**
   * Get pipeline statistics
   */
  getStats(): {
    model: string;
    cacheSize: number;
    config: VideoPipelineConfig;
  } {
    return {
      model: this.config.clipModel,
      cacheSize: this.cache.size,
      config: this.config,
    };
  }
}

export default VideoPipeline;
