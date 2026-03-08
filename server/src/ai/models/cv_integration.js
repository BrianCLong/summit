"use strict";
/**
 * Computer Vision Integration Module
 * Bridges new CV packages with existing Python models
 *
 * NOTE: These packages are optional and may not be built yet.
 * The imports are suppressed with @ts-expect-error to allow gradual integration.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.cvService = exports.CVServiceManager = void 0;
exports.cvMiddleware = cvMiddleware;
// @ts-expect-error - Optional package, may not be built yet
const object_detection_1 = require("@intelgraph/object-detection");
// @ts-expect-error - Optional package, may not be built yet
const face_analysis_1 = require("@intelgraph/face-analysis");
// @ts-expect-error - Optional package, may not be built yet
const ocr_1 = require("@intelgraph/ocr");
// @ts-expect-error - Optional package, may not be built yet
const satellite_imagery_1 = require("@intelgraph/satellite-imagery");
// @ts-expect-error - Optional package, may not be built yet
const video_analysis_1 = require("@intelgraph/video-analysis");
// @ts-expect-error - Optional package, may not be built yet
const image_forensics_1 = require("@intelgraph/image-forensics");
/**
 * Computer Vision Service Manager
 * Manages all CV models and provides unified interface
 */
class CVServiceManager {
    static instance;
    objectDetector;
    faceAnalyzer;
    ocrEngine;
    satelliteAnalyzer;
    videoAnalyzer;
    forensicsAnalyzer;
    initialized = false;
    constructor() { }
    /**
     * Get singleton instance
     */
    static getInstance() {
        if (!CVServiceManager.instance) {
            CVServiceManager.instance = new CVServiceManager();
        }
        return CVServiceManager.instance;
    }
    /**
     * Initialize all CV models
     */
    async initialize(config) {
        if (this.initialized) {
            return;
        }
        const device = config?.device || 'auto';
        try {
            console.log('Initializing CV models...');
            // Initialize models based on configuration
            if (config?.enableObjectDetection !== false) {
                this.objectDetector = (0, object_detection_1.createYOLODetector)({
                    model_type: 'yolov8',
                    model_size: 'medium',
                    device,
                });
                await this.objectDetector.initialize();
                console.log('✓ Object detector initialized');
            }
            if (config?.enableFaceAnalysis !== false) {
                this.faceAnalyzer = new face_analysis_1.FaceAnalyzer({ device });
                await this.faceAnalyzer.initialize();
                console.log('✓ Face analyzer initialized');
            }
            if (config?.enableOCR !== false) {
                this.ocrEngine = new ocr_1.OCREngine('tesseract', { device: 'cpu' });
                await this.ocrEngine.initialize();
                console.log('✓ OCR engine initialized');
            }
            if (config?.enableSatellite !== false) {
                this.satelliteAnalyzer = new satellite_imagery_1.SatelliteAnalyzer({ device });
                await this.satelliteAnalyzer.initialize();
                console.log('✓ Satellite analyzer initialized');
            }
            if (config?.enableVideo !== false) {
                this.videoAnalyzer = new video_analysis_1.VideoAnalyzer({ device });
                await this.videoAnalyzer.initialize();
                console.log('✓ Video analyzer initialized');
            }
            if (config?.enableForensics !== false) {
                this.forensicsAnalyzer = new image_forensics_1.ForensicsAnalyzer({ device });
                await this.forensicsAnalyzer.initialize();
                console.log('✓ Forensics analyzer initialized');
            }
            this.initialized = true;
            console.log('All CV models initialized successfully');
        }
        catch (error) {
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
    isInitialized() {
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
    async dispose() {
        if (this.objectDetector)
            await this.objectDetector.dispose();
        if (this.faceAnalyzer)
            await this.faceAnalyzer.dispose();
        if (this.ocrEngine)
            await this.ocrEngine.dispose();
        if (this.satelliteAnalyzer)
            await this.satelliteAnalyzer.dispose();
        if (this.videoAnalyzer)
            await this.videoAnalyzer.dispose();
        if (this.forensicsAnalyzer)
            await this.forensicsAnalyzer.dispose();
        this.initialized = false;
        console.log('All CV models disposed');
    }
}
exports.CVServiceManager = CVServiceManager;
/**
 * Export singleton instance
 */
exports.cvService = CVServiceManager.getInstance();
/**
 * Express middleware for CV services
 */
function cvMiddleware(req, res, next) {
    req.cvService = exports.cvService;
    next();
}
