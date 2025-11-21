/**
 * Computer Vision Integration Module
 * Bridges new CV packages with existing Python models
 */

import { createYOLODetector } from '@intelgraph/object-detection';
import { FaceAnalyzer } from '@intelgraph/face-analysis';
import { OCREngine } from '@intelgraph/ocr';
import { SatelliteAnalyzer } from '@intelgraph/satellite-imagery';
import { VideoAnalyzer } from '@intelgraph/video-analysis';
import { ForensicsAnalyzer } from '@intelgraph/image-forensics';

/**
 * Computer Vision Service Manager
 * Manages all CV models and provides unified interface
 */
export class CVServiceManager {
  private static instance: CVServiceManager;

  private objectDetector?: any;
  private faceAnalyzer?: FaceAnalyzer;
  private ocrEngine?: OCREngine;
  private satelliteAnalyzer?: SatelliteAnalyzer;
  private videoAnalyzer?: VideoAnalyzer;
  private forensicsAnalyzer?: ForensicsAnalyzer;

  private initialized = false;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): CVServiceManager {
    if (!CVServiceManager.instance) {
      CVServiceManager.instance = new CVServiceManager();
    }
    return CVServiceManager.instance;
  }

  /**
   * Initialize all CV models
   */
  async initialize(config?: {
    device?: 'cpu' | 'cuda' | 'auto';
    enableObjectDetection?: boolean;
    enableFaceAnalysis?: boolean;
    enableOCR?: boolean;
    enableSatellite?: boolean;
    enableVideo?: boolean;
    enableForensics?: boolean;
  }): Promise<void> {
    if (this.initialized) {
      return;
    }

    const device = config?.device || 'auto';

    try {
      console.log('Initializing CV models...');

      // Initialize models based on configuration
      if (config?.enableObjectDetection !== false) {
        this.objectDetector = createYOLODetector({
          model_type: 'yolov8',
          model_size: 'medium',
          device,
        });
        await this.objectDetector.initialize();
        console.log('✓ Object detector initialized');
      }

      if (config?.enableFaceAnalysis !== false) {
        this.faceAnalyzer = new FaceAnalyzer({ device });
        await this.faceAnalyzer.initialize();
        console.log('✓ Face analyzer initialized');
      }

      if (config?.enableOCR !== false) {
        this.ocrEngine = new OCREngine('tesseract', { device: 'cpu' });
        await this.ocrEngine.initialize();
        console.log('✓ OCR engine initialized');
      }

      if (config?.enableSatellite !== false) {
        this.satelliteAnalyzer = new SatelliteAnalyzer({ device });
        await this.satelliteAnalyzer.initialize();
        console.log('✓ Satellite analyzer initialized');
      }

      if (config?.enableVideo !== false) {
        this.videoAnalyzer = new VideoAnalyzer({ device });
        await this.videoAnalyzer.initialize();
        console.log('✓ Video analyzer initialized');
      }

      if (config?.enableForensics !== false) {
        this.forensicsAnalyzer = new ForensicsAnalyzer({ device });
        await this.forensicsAnalyzer.initialize();
        console.log('✓ Forensics analyzer initialized');
      }

      this.initialized = true;
      console.log('All CV models initialized successfully');
    } catch (error) {
      console.error('Failed to initialize CV models:', error);
      throw error;
    }
  }

  /**
   * Get object detector
   */
  getObjectDetector() {
    if (!this.objectDetector) {
      throw new Error('Object detector not initialized');
    }
    return this.objectDetector;
  }

  /**
   * Get face analyzer
   */
  getFaceAnalyzer() {
    if (!this.faceAnalyzer) {
      throw new Error('Face analyzer not initialized');
    }
    return this.faceAnalyzer;
  }

  /**
   * Get OCR engine
   */
  getOCREngine() {
    if (!this.ocrEngine) {
      throw new Error('OCR engine not initialized');
    }
    return this.ocrEngine;
  }

  /**
   * Get satellite analyzer
   */
  getSatelliteAnalyzer() {
    if (!this.satelliteAnalyzer) {
      throw new Error('Satellite analyzer not initialized');
    }
    return this.satelliteAnalyzer;
  }

  /**
   * Get video analyzer
   */
  getVideoAnalyzer() {
    if (!this.videoAnalyzer) {
      throw new Error('Video analyzer not initialized');
    }
    return this.videoAnalyzer;
  }

  /**
   * Get forensics analyzer
   */
  getForensicsAnalyzer() {
    if (!this.forensicsAnalyzer) {
      throw new Error('Forensics analyzer not initialized');
    }
    return this.forensicsAnalyzer;
  }

  /**
   * Check if initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get status of all models
   */
  getStatus() {
    return {
      initialized: this.initialized,
      models: {
        object_detection: !!this.objectDetector,
        face_analysis: !!this.faceAnalyzer,
        ocr: !!this.ocrEngine,
        satellite: !!this.satelliteAnalyzer,
        video: !!this.videoAnalyzer,
        forensics: !!this.forensicsAnalyzer,
      },
    };
  }

  /**
   * Dispose all models
   */
  async dispose(): Promise<void> {
    if (this.objectDetector) await this.objectDetector.dispose();
    if (this.faceAnalyzer) await this.faceAnalyzer.dispose();
    if (this.ocrEngine) await this.ocrEngine.dispose();
    if (this.satelliteAnalyzer) await this.satelliteAnalyzer.dispose();
    if (this.videoAnalyzer) await this.videoAnalyzer.dispose();
    if (this.forensicsAnalyzer) await this.forensicsAnalyzer.dispose();

    this.initialized = false;
    console.log('All CV models disposed');
  }
}

/**
 * Export singleton instance
 */
export const cvService = CVServiceManager.getInstance();

/**
 * Express middleware for CV services
 */
export function cvMiddleware(req: any, res: any, next: any) {
  req.cvService = cvService;
  next();
}
