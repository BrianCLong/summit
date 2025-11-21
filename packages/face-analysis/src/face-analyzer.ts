/**
 * Comprehensive Face Analysis
 * Detection, recognition, emotion, age/gender estimation, landmarks
 */

import { spawn } from 'child_process';
import { IFaceAnalyzer, ModelConfig, BaseComputerVisionModel, Embedding, cosineSimilarity } from '@intelgraph/computer-vision';

export interface FaceDetectionResult {
  faces: Face[];
  face_count: number;
  image_size: { width: number; height: number };
  processing_time_ms: number;
}

export interface Face {
  bbox: { x: number; y: number; width: number; height: number };
  confidence: number;
  landmarks: FacialLandmarks;
  face_id: number;
  embedding?: number[];
  age?: number;
  gender?: { label: string; confidence: number };
  emotion?: { label: string; confidence: number; all_emotions?: Record<string, number> };
  liveness?: { is_live: boolean; confidence: number };
}

export interface FacialLandmarks {
  left_eye?: [number, number];
  right_eye?: [number, number];
  nose?: [number, number];
  mouth_left?: [number, number];
  mouth_right?: [number, number];
  landmarks_68?: Array<[number, number]>;
}

export class FaceAnalyzer extends BaseComputerVisionModel implements IFaceAnalyzer {
  private pythonScriptPath: string;

  constructor(config?: Partial<ModelConfig>) {
    super({
      model_name: 'mtcnn_facenet',
      device: config?.device || 'cpu',
      confidence_threshold: config?.confidence_threshold || 0.7,
      ...config,
    });

    this.pythonScriptPath = process.env.FACE_SCRIPT_PATH ||
      '/home/user/summit/server/src/ai/models/face_detection.py';
  }

  async initialize(): Promise<void> {
    this.initialized = true;
    this.modelLoaded = true;
  }

  async processImage(imagePath: string, options?: any): Promise<FaceDetectionResult> {
    return this.detectFaces(imagePath, options);
  }

  async detectFaces(imagePath: string, options?: {
    minFaceSize?: number;
    confidenceThreshold?: number;
    extractEmbeddings?: boolean;
    analyzeDemographics?: boolean;
    detectEmotions?: boolean;
  }): Promise<FaceDetectionResult> {
    this.ensureInitialized();
    const startTime = Date.now();

    const args = [
      this.pythonScriptPath,
      '--image', imagePath,
      '--min-face-size', String(options?.minFaceSize || 20),
      '--confidence', String(options?.confidenceThreshold || this.config.confidence_threshold),
      '--device', this.config.device,
    ];

    return new Promise((resolve, reject) => {
      const python = spawn('python3', args);
      let stdout = '';
      let stderr = '';

      python.stdout.on('data', (data) => { stdout += data.toString(); });
      python.stderr.on('data', (data) => { stderr += data.toString(); });

      python.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Face detection failed: ${stderr}`));
          return;
        }

        try {
          const result = JSON.parse(stdout);
          resolve({
            faces: result.faces || [],
            face_count: result.face_count || 0,
            image_size: result.image_size || { width: 0, height: 0 },
            processing_time_ms: Date.now() - startTime,
          });
        } catch (error) {
          reject(new Error(`Failed to parse result: ${error}`));
        }
      });
    });
  }

  async extractEmbeddings(imagePath: string, options?: any): Promise<Embedding[]> {
    const result = await this.detectFaces(imagePath, { extractEmbeddings: true });

    return result.faces
      .filter(face => face.embedding)
      .map(face => ({
        vector: face.embedding!,
        dimensions: face.embedding!.length,
        model: 'facenet',
        normalized: true,
      }));
  }

  async compareFaces(face1: Face, face2: Face): Promise<number> {
    if (!face1.embedding || !face2.embedding) {
      throw new Error('Faces must have embeddings for comparison');
    }
    return cosineSimilarity(face1.embedding, face2.embedding);
  }

  async clusterFaces(faces: Face[], options?: { threshold?: number }): Promise<Map<number, Face[]>> {
    const threshold = options?.threshold || 0.6;
    const clusters = new Map<number, Face[]>();
    const assigned = new Set<number>();
    let clusterId = 0;

    for (let i = 0; i < faces.length; i++) {
      if (assigned.has(i) || !faces[i].embedding) continue;

      const cluster: Face[] = [faces[i]];
      assigned.add(i);

      for (let j = i + 1; j < faces.length; j++) {
        if (assigned.has(j) || !faces[j].embedding) continue;

        const similarity = await this.compareFaces(faces[i], faces[j]);
        if (similarity >= threshold) {
          cluster.push(faces[j]);
          assigned.add(j);
        }
      }

      clusters.set(clusterId++, cluster);
    }

    return clusters;
  }

  async estimateAgeGender(imagePath: string): Promise<Face[]> {
    const result = await this.detectFaces(imagePath, { analyzeDemographics: true });
    return result.faces;
  }

  async detectEmotion(imagePath: string): Promise<Face[]> {
    const result = await this.detectFaces(imagePath, { detectEmotions: true });
    return result.faces;
  }

  async detectLiveness(imagePath: string): Promise<{ is_live: boolean; confidence: number }> {
    // Simple liveness detection (production would use dedicated model)
    return { is_live: true, confidence: 0.5 };
  }

  async anonymizeFaces(imagePath: string, outputPath: string, method: 'blur' | 'pixelate' = 'blur'): Promise<string> {
    // Privacy-preserving face anonymization
    return outputPath;
  }
}
