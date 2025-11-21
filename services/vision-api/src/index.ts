/**
 * Vision API Service
 * Unified Computer Vision API for IntelGraph Platform
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import multer from 'multer';
import { createYOLODetector } from '@intelgraph/object-detection';
import { FaceAnalyzer } from '@intelgraph/face-analysis';
import { OCREngine } from '@intelgraph/ocr';
import { SatelliteAnalyzer } from '@intelgraph/satellite-imagery';
import { VideoAnalyzer } from '@intelgraph/video-analysis';
import { ForensicsAnalyzer } from '@intelgraph/image-forensics';
import * as dotenv from 'dotenv';
import { promises as fs } from 'fs';
import path from 'path';

dotenv.config();

const app = express();
const PORT = process.env.VISION_API_PORT || 8080;
const UPLOAD_DIR = process.env.UPLOAD_DIR || '/tmp/vision-uploads';

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// File upload configuration
const upload = multer({
  dest: UPLOAD_DIR,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
  },
});

// Initialize CV models
let objectDetector: any;
let faceAnalyzer: FaceAnalyzer;
let ocrEngine: OCREngine;
let satelliteAnalyzer: SatelliteAnalyzer;
let videoAnalyzer: VideoAnalyzer;
let forensicsAnalyzer: ForensicsAnalyzer;

/**
 * Initialize all CV models
 */
async function initializeModels() {
  console.log('Initializing computer vision models...');

  objectDetector = createYOLODetector({
    model_type: 'yolov8',
    model_size: 'medium',
    device: 'auto',
  });

  faceAnalyzer = new FaceAnalyzer({ device: 'auto' });
  ocrEngine = new OCREngine('tesseract', { device: 'cpu' });
  satelliteAnalyzer = new SatelliteAnalyzer({ device: 'auto' });
  videoAnalyzer = new VideoAnalyzer({ device: 'auto' });
  forensicsAnalyzer = new ForensicsAnalyzer({ device: 'auto' });

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

app.post('/api/v1/detect/objects', upload.single('image'), async (req: Request, res: Response) => {
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
    await fs.unlink(req.file.path);

    res.json(result);
  } catch (error: any) {
    console.error('Object detection error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/v1/detect/objects/batch', upload.array('images', 10), async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No image files provided' });
    }

    const imagePaths = files.map(f => f.path);
    const results = await objectDetector.processBatch(imagePaths);

    // Clean up uploaded files
    await Promise.all(imagePaths.map(p => fs.unlink(p)));

    res.json({ results });
  } catch (error: any) {
    console.error('Batch detection error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== Face Analysis Routes ====================

app.post('/api/v1/face/detect', upload.single('image'), async (req: Request, res: Response) => {
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

    await fs.unlink(req.file.path);

    res.json(result);
  } catch (error: any) {
    console.error('Face detection error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/v1/face/compare', upload.array('images', 2), async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
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

    await Promise.all(files.map(f => fs.unlink(f.path)));

    res.json({
      similarity,
      is_same_person: similarity > 0.6,
      confidence: similarity,
    });
  } catch (error: any) {
    console.error('Face comparison error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== OCR Routes ====================

app.post('/api/v1/ocr/extract', upload.single('image'), async (req: Request, res: Response) => {
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

    await fs.unlink(req.file.path);

    res.json(result);
  } catch (error: any) {
    console.error('OCR error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/v1/ocr/document', upload.single('image'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const documentType = req.body.document_type || 'generic';
    const result = await ocrEngine.extractStructuredData(req.file.path, documentType);

    await fs.unlink(req.file.path);

    res.json(result);
  } catch (error: any) {
    console.error('Document analysis error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== Satellite Imagery Routes ====================

app.post('/api/v1/satellite/analyze', upload.single('image'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const result = await satelliteAnalyzer.processImage(req.file.path);

    await fs.unlink(req.file.path);

    res.json(result);
  } catch (error: any) {
    console.error('Satellite analysis error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/v1/satellite/change-detection', upload.array('images', 2), async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length !== 2) {
      return res.status(400).json({ error: 'Exactly 2 image files required (before and after)' });
    }

    const result = await satelliteAnalyzer.detectChanges(files[0].path, files[1].path);

    await Promise.all(files.map(f => fs.unlink(f.path)));

    res.json(result);
  } catch (error: any) {
    console.error('Change detection error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== Video Analysis Routes ====================

app.post('/api/v1/video/analyze', upload.single('video'), async (req: Request, res: Response) => {
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

    await fs.unlink(req.file.path);

    res.json(result);
  } catch (error: any) {
    console.error('Video analysis error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== Image Forensics Routes ====================

app.post('/api/v1/forensics/analyze', upload.single('image'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const result = await forensicsAnalyzer.detectManipulation(req.file.path);

    await fs.unlink(req.file.path);

    res.json(result);
  } catch (error: any) {
    console.error('Forensics analysis error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/v1/forensics/deepfake', upload.single('image'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const result = await forensicsAnalyzer.detectDeepfake(req.file.path);

    await fs.unlink(req.file.path);

    res.json(result);
  } catch (error: any) {
    console.error('Deepfake detection error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== Health & Status Routes ====================

app.get('/health', (req: Request, res: Response) => {
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

app.get('/api/v1/models/info', (req: Request, res: Response) => {
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
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
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
    await fs.mkdir(UPLOAD_DIR, { recursive: true });

    // Initialize models
    await initializeModels();

    app.listen(PORT, () => {
      console.log(`Vision API server listening on port ${PORT}`);
      console.log(`Upload directory: ${UPLOAD_DIR}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();

export { app };
