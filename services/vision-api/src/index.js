"use strict";
/**
 * Vision API Service
 * Unified Computer Vision API for IntelGraph Platform
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const multer_1 = __importDefault(require("multer"));
const object_detection_1 = require("@intelgraph/object-detection");
const face_analysis_1 = require("@intelgraph/face-analysis");
const ocr_1 = require("@intelgraph/ocr");
const satellite_imagery_1 = require("@intelgraph/satellite-imagery");
const video_analysis_1 = require("@intelgraph/video-analysis");
const image_forensics_1 = require("@intelgraph/image-forensics");
const dotenv = __importStar(require("dotenv"));
const fs_1 = require("fs");
dotenv.config();
const app = (0, express_1.default)();
exports.app = app;
const PORT = process.env.VISION_API_PORT || 8080;
const UPLOAD_DIR = process.env.UPLOAD_DIR || '/tmp/vision-uploads';
// Middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// File upload configuration
const upload = (0, multer_1.default)({
    dest: UPLOAD_DIR,
    limits: {
        fileSize: 100 * 1024 * 1024, // 100MB
    },
});
// Initialize CV models
let objectDetector;
let faceAnalyzer;
let ocrEngine;
let satelliteAnalyzer;
let videoAnalyzer;
let forensicsAnalyzer;
/**
 * Initialize all CV models
 */
async function initializeModels() {
    console.log('Initializing computer vision models...');
    objectDetector = (0, object_detection_1.createYOLODetector)({
        model_type: 'yolov8',
        model_size: 'medium',
        device: 'auto',
    });
    faceAnalyzer = new face_analysis_1.FaceAnalyzer({ device: 'auto' });
    ocrEngine = new ocr_1.OCREngine('tesseract', { device: 'cpu' });
    satelliteAnalyzer = new satellite_imagery_1.SatelliteAnalyzer({ device: 'auto' });
    videoAnalyzer = new video_analysis_1.VideoAnalyzer({ device: 'auto' });
    forensicsAnalyzer = new image_forensics_1.ForensicsAnalyzer({ device: 'auto' });
    await Promise.all([
        objectDetector.initialize(),
        faceAnalyzer.initialize(),
        ocrEngine.initialize(),
        satelliteAnalyzer.initialize(),
        videoAnalyzer.initialize(),
        forensicsAnalyzer.initialize(),
    ]);
    console.log('All models initialized successfully');
}
// ==================== Object Detection Routes ====================
app.post('/api/v1/detect/objects', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image file provided' });
        }
        const options = {
            confidenceThreshold: parseFloat(req.body.confidence_threshold || '0.5'),
            nmsThreshold: parseFloat(req.body.nms_threshold || '0.4'),
            maxDetections: parseInt(req.body.max_detections || '100'),
            classes: req.body.classes ? req.body.classes.split(',') : undefined,
        };
        const result = await objectDetector.detect(req.file.path, options);
        // Clean up uploaded file
        await fs_1.promises.unlink(req.file.path);
        res.json(result);
    }
    catch (error) {
        console.error('Object detection error:', error);
        res.status(500).json({ error: error.message });
    }
});
app.post('/api/v1/detect/objects/batch', upload.array('images', 10), async (req, res) => {
    try {
        const files = req.files;
        if (!files || files.length === 0) {
            return res.status(400).json({ error: 'No image files provided' });
        }
        const imagePaths = files.map(f => f.path);
        const results = await objectDetector.processBatch(imagePaths);
        // Clean up uploaded files
        await Promise.all(imagePaths.map(p => fs_1.promises.unlink(p)));
        res.json({ results });
    }
    catch (error) {
        console.error('Batch detection error:', error);
        res.status(500).json({ error: error.message });
    }
});
// ==================== Face Analysis Routes ====================
app.post('/api/v1/face/detect', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image file provided' });
        }
        const options = {
            minFaceSize: parseInt(req.body.min_face_size || '20'),
            confidenceThreshold: parseFloat(req.body.confidence_threshold || '0.7'),
            extractEmbeddings: req.body.extract_embeddings === 'true',
            analyzeDemographics: req.body.analyze_demographics === 'true',
            detectEmotions: req.body.detect_emotions === 'true',
        };
        const result = await faceAnalyzer.detectFaces(req.file.path, options);
        await fs_1.promises.unlink(req.file.path);
        res.json(result);
    }
    catch (error) {
        console.error('Face detection error:', error);
        res.status(500).json({ error: error.message });
    }
});
app.post('/api/v1/face/compare', upload.array('images', 2), async (req, res) => {
    try {
        const files = req.files;
        if (!files || files.length !== 2) {
            return res.status(400).json({ error: 'Exactly 2 image files required' });
        }
        const [result1, result2] = await Promise.all([
            faceAnalyzer.detectFaces(files[0].path, { extractEmbeddings: true }),
            faceAnalyzer.detectFaces(files[1].path, { extractEmbeddings: true }),
        ]);
        if (result1.faces.length === 0 || result2.faces.length === 0) {
            return res.status(400).json({ error: 'No faces detected in one or both images' });
        }
        const similarity = await faceAnalyzer.compareFaces(result1.faces[0], result2.faces[0]);
        await Promise.all(files.map(f => fs_1.promises.unlink(f.path)));
        res.json({
            similarity,
            is_same_person: similarity > 0.6,
            confidence: similarity,
        });
    }
    catch (error) {
        console.error('Face comparison error:', error);
        res.status(500).json({ error: error.message });
    }
});
// ==================== OCR Routes ====================
app.post('/api/v1/ocr/extract', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image file provided' });
        }
        const options = {
            languages: req.body.languages ? req.body.languages.split(',') : ['eng'],
            confidenceThreshold: parseFloat(req.body.confidence_threshold || '0.6'),
            wordLevel: req.body.word_level !== 'false',
        };
        const result = await ocrEngine.extractText(req.file.path, options);
        await fs_1.promises.unlink(req.file.path);
        res.json(result);
    }
    catch (error) {
        console.error('OCR error:', error);
        res.status(500).json({ error: error.message });
    }
});
app.post('/api/v1/ocr/document', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image file provided' });
        }
        const documentType = req.body.document_type || 'generic';
        const result = await ocrEngine.extractStructuredData(req.file.path, documentType);
        await fs_1.promises.unlink(req.file.path);
        res.json(result);
    }
    catch (error) {
        console.error('Document analysis error:', error);
        res.status(500).json({ error: error.message });
    }
});
// ==================== Satellite Imagery Routes ====================
app.post('/api/v1/satellite/analyze', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image file provided' });
        }
        const result = await satelliteAnalyzer.processImage(req.file.path);
        await fs_1.promises.unlink(req.file.path);
        res.json(result);
    }
    catch (error) {
        console.error('Satellite analysis error:', error);
        res.status(500).json({ error: error.message });
    }
});
app.post('/api/v1/satellite/change-detection', upload.array('images', 2), async (req, res) => {
    try {
        const files = req.files;
        if (!files || files.length !== 2) {
            return res.status(400).json({ error: 'Exactly 2 image files required (before and after)' });
        }
        const result = await satelliteAnalyzer.detectChanges(files[0].path, files[1].path);
        await Promise.all(files.map(f => fs_1.promises.unlink(f.path)));
        res.json(result);
    }
    catch (error) {
        console.error('Change detection error:', error);
        res.status(500).json({ error: error.message });
    }
});
// ==================== Video Analysis Routes ====================
app.post('/api/v1/video/analyze', upload.single('video'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No video file provided' });
        }
        const options = {
            detectActions: req.body.detect_actions === 'true',
            extractKeyFrames: req.body.extract_key_frames === 'true',
            trackObjects: req.body.track_objects === 'true',
            analyzeCrowd: req.body.analyze_crowd === 'true',
            detectAnomalies: req.body.detect_anomalies === 'true',
        };
        const result = await videoAnalyzer.analyzeVideo(req.file.path, options);
        await fs_1.promises.unlink(req.file.path);
        res.json(result);
    }
    catch (error) {
        console.error('Video analysis error:', error);
        res.status(500).json({ error: error.message });
    }
});
// ==================== Image Forensics Routes ====================
app.post('/api/v1/forensics/analyze', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image file provided' });
        }
        const result = await forensicsAnalyzer.detectManipulation(req.file.path);
        await fs_1.promises.unlink(req.file.path);
        res.json(result);
    }
    catch (error) {
        console.error('Forensics analysis error:', error);
        res.status(500).json({ error: error.message });
    }
});
app.post('/api/v1/forensics/deepfake', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image file provided' });
        }
        const result = await forensicsAnalyzer.detectDeepfake(req.file.path);
        await fs_1.promises.unlink(req.file.path);
        res.json(result);
    }
    catch (error) {
        console.error('Deepfake detection error:', error);
        res.status(500).json({ error: error.message });
    }
});
// ==================== Health & Status Routes ====================
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        models: {
            object_detection: objectDetector ? 'ready' : 'not_initialized',
            face_analysis: faceAnalyzer ? 'ready' : 'not_initialized',
            ocr: ocrEngine ? 'ready' : 'not_initialized',
            satellite: satelliteAnalyzer ? 'ready' : 'not_initialized',
            video: videoAnalyzer ? 'ready' : 'not_initialized',
            forensics: forensicsAnalyzer ? 'ready' : 'not_initialized',
        },
    });
});
app.get('/api/v1/models/info', (req, res) => {
    res.json({
        object_detection: objectDetector?.getModelInfo(),
        face_analysis: faceAnalyzer?.getModelInfo(),
        ocr: ocrEngine?.getModelInfo(),
        satellite: satelliteAnalyzer?.getModelInfo(),
        video: videoAnalyzer?.getModelInfo(),
        forensics: forensicsAnalyzer?.getModelInfo(),
    });
});
// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: err.message,
    });
});
// Start server
async function start() {
    try {
        // Create upload directory
        await fs_1.promises.mkdir(UPLOAD_DIR, { recursive: true });
        // Initialize models
        await initializeModels();
        app.listen(PORT, () => {
            console.log(`Vision API server listening on port ${PORT}`);
            console.log(`Upload directory: ${UPLOAD_DIR}`);
        });
    }
    catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}
start();
