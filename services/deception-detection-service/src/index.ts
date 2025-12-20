/**
 * Deception Detection Service
 * REST API for comprehensive deception detection capabilities
 */

import express from 'express';
import cors from 'cors';
import { UnifiedDeceptionDetector } from '@intelgraph/deception-detector';
import { DeepfakeDetector } from '@intelgraph/deepfake-detection';
import { MediaManipulationDetector } from '@intelgraph/media-manipulation';
import { DisinformationDetector } from '@intelgraph/disinformation-detection';
import { FakeAccountDetector } from '@intelgraph/fake-account-detection';
import { SyntheticMediaDetector } from '@intelgraph/synthetic-media';
import { ContentVerifier } from '@intelgraph/content-verification';

const app = express();
const port = process.env.PORT || 3100;

// Middleware
app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Initialize detectors
const unifiedDetector = new UnifiedDeceptionDetector();
const deepfakeDetector = new DeepfakeDetector();
const mediaManipulationDetector = new MediaManipulationDetector();
const disinformationDetector = new DisinformationDetector();
const fakeAccountDetector = new FakeAccountDetector();
const syntheticMediaDetector = new SyntheticMediaDetector();
const contentVerifier = new ContentVerifier();

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'deception-detection', timestamp: new Date() });
});

// API Routes

/**
 * POST /api/detect/comprehensive
 * Comprehensive multi-modal deception analysis
 */
app.post('/api/detect/comprehensive', async (req, res) => {
  try {
    const { media, text, account, network, metadata } = req.body;

    const result = await unifiedDetector.analyzeComprehensive({
      media,
      text,
      account,
      network,
      metadata,
    });

    res.json({
      success: true,
      data: result,
      timestamp: new Date(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/detect/deepfake
 * Deepfake detection for images, videos, and audio
 */
app.post('/api/detect/deepfake', async (req, res) => {
  try {
    const { type, buffer, metadata } = req.body;

    const result = await deepfakeDetector.detectDeepfake({
      type,
      buffer,
      metadata,
    });

    res.json({
      success: true,
      data: result,
      timestamp: new Date(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/detect/manipulation
 * Media manipulation detection
 */
app.post('/api/detect/manipulation', async (req, res) => {
  try {
    const { imageBuffer } = req.body;

    const result = await mediaManipulationDetector.detectManipulation(
      Buffer.from(imageBuffer, 'base64'),
    );

    res.json({
      success: true,
      data: result,
      timestamp: new Date(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/detect/disinformation
 * Disinformation campaign detection
 */
app.post('/api/detect/disinformation', async (req, res) => {
  try {
    const { content, accounts, network } = req.body;

    const result = await disinformationDetector.analyzeCampaign({
      content,
      accounts,
      network,
    });

    res.json({
      success: true,
      data: result,
      timestamp: new Date(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/detect/fake-account
 * Fake account detection
 */
app.post('/api/detect/fake-account', async (req, res) => {
  try {
    const { account } = req.body;

    const result = await fakeAccountDetector.analyzeAccount(account);

    res.json({
      success: true,
      data: result,
      timestamp: new Date(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/detect/synthetic-media
 * Synthetic media detection (AI-generated content)
 */
app.post('/api/detect/synthetic-media', async (req, res) => {
  try {
    const { type, content, metadata } = req.body;

    const result = await syntheticMediaDetector.detect({
      type,
      content,
      metadata,
    });

    res.json({
      success: true,
      data: result,
      timestamp: new Date(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/verify/content
 * Content authenticity verification and fact-checking
 */
app.post('/api/verify/content', async (req, res) => {
  try {
    const { text, source, claims, metadata } = req.body;

    const result = await contentVerifier.verifyContent({
      text,
      source,
      claims,
      metadata,
    });

    res.json({
      success: true,
      data: result,
      timestamp: new Date(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/analyze/behavior
 * Behavioral deception analysis
 */
app.post('/api/analyze/behavior', async (req, res) => {
  try {
    const { writings, timeline, interactions } = req.body;

    const result = unifiedDetector.analyzeBehavioralDeception({
      writings,
      timeline,
      interactions,
    });

    res.json({
      success: true,
      data: result,
      timestamp: new Date(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/analyze/misinformation-spread
 * Misinformation spread analysis
 */
app.post('/api/analyze/misinformation-spread', async (req, res) => {
  try {
    const { content, network, timeline } = req.body;

    const result = unifiedDetector.analyzeMisinformationSpread({
      content,
      network,
      timeline,
    });

    res.json({
      success: true,
      data: result,
      timestamp: new Date(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/detect/platform-manipulation
 * Platform manipulation detection
 */
app.post('/api/detect/platform-manipulation', async (req, res) => {
  try {
    const { metrics, accounts, activity } = req.body;

    const result = unifiedDetector.detectPlatformManipulation({
      metrics,
      accounts,
      activity,
    });

    res.json({
      success: true,
      data: result,
      timestamp: new Date(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/capabilities
 * List service capabilities
 */
app.get('/api/capabilities', (req, res) => {
  res.json({
    service: 'Deception Detection Service',
    version: '0.1.0',
    capabilities: [
      {
        name: 'Deepfake Detection',
        endpoint: '/api/detect/deepfake',
        description: 'Detect deepfakes in images, videos, and audio',
        features: [
          'Facial manipulation detection',
          'Voice synthesis identification',
          'Video artifact analysis',
          'Temporal consistency checking',
        ],
      },
      {
        name: 'Media Manipulation Detection',
        endpoint: '/api/detect/manipulation',
        description: 'Detect photo editing and media tampering',
        features: [
          'Clone detection',
          'Splicing detection',
          'EXIF analysis',
          'Compression analysis',
        ],
      },
      {
        name: 'Disinformation Campaign Detection',
        endpoint: '/api/detect/disinformation',
        description: 'Identify coordinated disinformation campaigns',
        features: [
          'Bot network detection',
          'Coordination analysis',
          'Narrative tracking',
          'Influence mapping',
        ],
      },
      {
        name: 'Fake Account Detection',
        endpoint: '/api/detect/fake-account',
        description: 'Identify bots, sockpuppets, and fake accounts',
        features: [
          'Bot scoring',
          'Behavior analysis',
          'Profile authenticity',
          'Network analysis',
        ],
      },
      {
        name: 'Synthetic Media Detection',
        endpoint: '/api/detect/synthetic-media',
        description: 'Detect AI-generated content',
        features: [
          'AI text detection',
          'GAN-generated image detection',
          'Neural codec detection',
          'Generator identification',
        ],
      },
      {
        name: 'Content Verification',
        endpoint: '/api/verify/content',
        description: 'Fact-checking and authenticity verification',
        features: [
          'Fact-checking',
          'Source credibility assessment',
          'Citation verification',
          'Context analysis',
        ],
      },
      {
        name: 'Comprehensive Analysis',
        endpoint: '/api/detect/comprehensive',
        description: 'Multi-modal deception analysis',
        features: [
          'All detection methods',
          'Integrated scoring',
          'Severity assessment',
          'Actionable recommendations',
        ],
      },
    ],
  });
});

// Start server
app.listen(port, () => {
  console.log(`Deception Detection Service running on port ${port}`);
  console.log(`Health check: http://localhost:${port}/health`);
  console.log(`Capabilities: http://localhost:${port}/api/capabilities`);
});

export default app;
