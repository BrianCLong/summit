/**
 * Authenticity Service
 * Verification workflows, provenance tracking, and authenticity certification
 */

import express from 'express';
import cors from 'cors';
import { ContentVerifier } from '@intelgraph/content-verification';
import { ProvenanceTracker, MetadataAnalyzer } from '@intelgraph/media-manipulation';

const app = express();
const port = process.env.PORT || 3101;

// Middleware
app.use(cors());
app.use(express.json({ limit: '100mb' }));

// Initialize verifiers
const contentVerifier = new ContentVerifier();
const provenanceTracker = new ProvenanceTracker();
const metadataAnalyzer = new MetadataAnalyzer();

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'authenticity-service', timestamp: new Date() });
});

/**
 * POST /api/verify/comprehensive
 * Comprehensive authenticity verification
 */
app.post('/api/verify/comprehensive', async (req, res) => {
  try {
    const { content, media, metadata } = req.body;

    const results: any = {
      content: null,
      provenance: null,
      metadata: null,
      overallAuthenticity: 0,
    };

    // Verify content if provided
    if (content?.text) {
      results.content = await contentVerifier.verifyContent(content);
    }

    // Check provenance if media provided
    if (media) {
      const mediaBuffer = Buffer.from(media, 'base64');
      results.provenance = await provenanceTracker.verifyProvenance(mediaBuffer, metadata);
      results.metadata = await metadataAnalyzer.analyzeExif(mediaBuffer);
    }

    // Calculate overall authenticity
    const scores: number[] = [];
    if (results.content) scores.push(results.content.confidence);
    if (results.provenance) scores.push(results.provenance.authenticity);
    if (results.metadata) scores.push(results.metadata.trustScore);

    results.overallAuthenticity = scores.length > 0
      ? scores.reduce((a, b) => a + b, 0) / scores.length
      : 0;

    res.json({
      success: true,
      data: results,
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
 * POST /api/verify/provenance
 * Verify media provenance chain
 */
app.post('/api/verify/provenance', async (req, res) => {
  try {
    const { media, metadata } = req.body;

    const mediaBuffer = Buffer.from(media, 'base64');
    const result = await provenanceTracker.verifyProvenance(mediaBuffer, metadata);

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
 * POST /api/verify/metadata
 * Analyze and verify metadata
 */
app.post('/api/verify/metadata', async (req, res) => {
  try {
    const { media } = req.body;

    const mediaBuffer = Buffer.from(media, 'base64');
    const exifAnalysis = await metadataAnalyzer.analyzeExif(mediaBuffer);
    const tamperingDetection = await metadataAnalyzer.detectTampering(mediaBuffer);

    res.json({
      success: true,
      data: {
        exifAnalysis,
        tamperingDetection,
      },
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
 * POST /api/verify/fact-check
 * Fact-check content claims
 */
app.post('/api/verify/fact-check', async (req, res) => {
  try {
    const { text, source, claims } = req.body;

    const result = await contentVerifier.verifyContent({
      text,
      source,
      claims,
    });

    res.json({
      success: true,
      data: {
        factChecks: result.factChecks,
        credibility: result.credibility,
        isAuthentic: result.isAuthentic,
      },
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
 * POST /api/verify/source-credibility
 * Assess source credibility
 */
app.post('/api/verify/source-credibility', async (req, res) => {
  try {
    const { source } = req.body;

    // Create a minimal content object to use the verifier
    const result = await contentVerifier.verifyContent({
      text: '',
      source,
    });

    res.json({
      success: true,
      data: result.credibility,
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
 * POST /api/create/provenance-record
 * Create a provenance record for media
 */
app.post('/api/create/provenance-record', async (req, res) => {
  try {
    const { media, actor, action, previousHash } = req.body;

    const mediaBuffer = Buffer.from(media, 'base64');
    const record = await provenanceTracker.createProvenanceRecord(mediaBuffer, {
      actor,
      action,
      previousHash,
    });

    res.json({
      success: true,
      data: record,
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
 * POST /api/verify/scientific-claim
 * Verify scientific claims
 */
app.post('/api/verify/scientific-claim', async (req, res) => {
  try {
    const { claim } = req.body;

    const result = await contentVerifier.verifyScientificClaim(claim);

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
 * POST /api/verify/statistical-claim
 * Verify statistical claims
 */
app.post('/api/verify/statistical-claim', async (req, res) => {
  try {
    const { claim } = req.body;

    const result = await contentVerifier.verifyStatisticalClaim(claim);

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
 * POST /api/reverse-image-search
 * Perform reverse image search
 */
app.post('/api/reverse-image-search', async (req, res) => {
  try {
    const { media } = req.body;

    const mediaBuffer = Buffer.from(media, 'base64');
    const result = await provenanceTracker.reverseImageSearch(mediaBuffer);

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
    service: 'Authenticity Service',
    version: '0.1.0',
    capabilities: [
      {
        name: 'Comprehensive Verification',
        endpoint: '/api/verify/comprehensive',
        description: 'Full authenticity verification across all modalities',
      },
      {
        name: 'Provenance Verification',
        endpoint: '/api/verify/provenance',
        description: 'Verify media provenance chain',
      },
      {
        name: 'Metadata Analysis',
        endpoint: '/api/verify/metadata',
        description: 'EXIF and metadata verification',
      },
      {
        name: 'Fact-Checking',
        endpoint: '/api/verify/fact-check',
        description: 'Automated fact-checking of claims',
      },
      {
        name: 'Source Credibility',
        endpoint: '/api/verify/source-credibility',
        description: 'Assess source trustworthiness',
      },
      {
        name: 'Scientific Claim Verification',
        endpoint: '/api/verify/scientific-claim',
        description: 'Verify scientific claims',
      },
      {
        name: 'Statistical Claim Verification',
        endpoint: '/api/verify/statistical-claim',
        description: 'Verify statistical claims',
      },
      {
        name: 'Reverse Image Search',
        endpoint: '/api/reverse-image-search',
        description: 'Find image sources and previous uses',
      },
    ],
  });
});

// Start server
app.listen(port, () => {
  console.log(`Authenticity Service running on port ${port}`);
  console.log(`Health check: http://localhost:${port}/health`);
  console.log(`Capabilities: http://localhost:${port}/api/capabilities`);
});

export default app;
