import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { globalRegistry } from '@intelgraph/metadata-extractor';
import { OfficeExtractor, PDFExtractor, ArchiveExtractor } from '@intelgraph/document-metadata';
import { EXIFExtractor } from '@intelgraph/image-metadata';
import { EmailExtractor } from '@intelgraph/communication-metadata';
import { PcapExtractor } from '@intelgraph/network-metadata';
import { TimelineBuilder, TimelineAnalyzer } from '@intelgraph/timeline-analyzer';

const app = express();
const port = process.env.PORT || 3100;

// Middleware
app.use(cors());
app.use(express.json());

// File upload configuration
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
  },
});

// Register all extractors
globalRegistry.register(new OfficeExtractor());
globalRegistry.register(new PDFExtractor());
globalRegistry.register(new ArchiveExtractor());
globalRegistry.register(new EXIFExtractor());
globalRegistry.register(new EmailExtractor());
globalRegistry.register(new PcapExtractor());

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'metadata-service',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
  });
});

/**
 * List available extractors
 */
app.get('/api/extractors', (req, res) => {
  const extractors = globalRegistry.getAllExtractors().map(e => ({
    name: e.name,
    supportedTypes: e.supportedTypes,
  }));

  res.json({
    extractors,
    count: extractors.length,
  });
});

/**
 * Extract metadata from a single file
 */
app.post('/api/extract', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const mimeType = req.file.mimetype;
    const buffer = req.file.buffer;

    // Find appropriate extractor
    const extractor = globalRegistry.findExtractor(buffer, mimeType);

    if (!extractor) {
      return res.status(400).json({
        error: 'No suitable extractor found for this file type',
        mimeType,
      });
    }

    // Extract metadata
    const config = {
      deepScan: req.body.deepScan === 'true',
      detectSteganography: req.body.detectSteganography === 'true',
      extractEmbedded: req.body.extractEmbedded !== 'false',
    };

    const result = await extractor.extract(buffer, config);

    res.json({
      success: true,
      extractor: extractor.name,
      result,
    });
  } catch (error) {
    console.error('Extraction error:', error);
    res.status(500).json({
      error: 'Extraction failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Extract metadata from multiple files
 */
app.post('/api/extract/batch', upload.array('files', 100), async (req, res) => {
  try {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }

    const config = {
      deepScan: req.body.deepScan === 'true',
      detectSteganography: req.body.detectSteganography === 'true',
      extractEmbedded: req.body.extractEmbedded !== 'false',
    };

    const results = [];

    for (const file of req.files) {
      try {
        const mimeType = file.mimetype;
        const buffer = file.buffer;

        const extractionResults = await globalRegistry.extractAll(buffer, mimeType, config);

        results.push({
          filename: file.originalname,
          success: true,
          results: extractionResults,
        });
      } catch (error) {
        results.push({
          filename: file.originalname,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    res.json({
      success: true,
      totalFiles: req.files.length,
      results,
    });
  } catch (error) {
    console.error('Batch extraction error:', error);
    res.status(500).json({
      error: 'Batch extraction failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Build timeline from extracted metadata
 */
app.post('/api/timeline/build', async (req, res) => {
  try {
    const { results } = req.body;

    if (!Array.isArray(results) || results.length === 0) {
      return res.status(400).json({ error: 'No extraction results provided' });
    }

    const builder = new TimelineBuilder();
    builder.addResults(results);
    const timeline = builder.build();

    res.json({
      success: true,
      timeline,
    });
  } catch (error) {
    console.error('Timeline build error:', error);
    res.status(500).json({
      error: 'Timeline build failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Analyze timeline
 */
app.post('/api/timeline/analyze', async (req, res) => {
  try {
    const { timeline } = req.body;

    if (!timeline) {
      return res.status(400).json({ error: 'No timeline provided' });
    }

    const analyzer = new TimelineAnalyzer();
    const analysis = analyzer.analyze(timeline);

    res.json({
      success: true,
      analysis,
    });
  } catch (error) {
    console.error('Timeline analysis error:', error);
    res.status(500).json({
      error: 'Timeline analysis failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Complete workflow: extract, build timeline, and analyze
 */
app.post('/api/workflow/complete', upload.array('files', 100), async (req, res) => {
  try {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }

    const config = {
      deepScan: req.body.deepScan === 'true',
      detectSteganography: req.body.detectSteganography === 'true',
      extractEmbedded: req.body.extractEmbedded !== 'false',
    };

    // Extract metadata from all files
    const allResults = [];

    for (const file of req.files) {
      const mimeType = file.mimetype;
      const buffer = file.buffer;

      const extractionResults = await globalRegistry.extractAll(buffer, mimeType, config);
      allResults.push(...extractionResults);
    }

    // Build timeline
    const builder = new TimelineBuilder();
    builder.addResults(allResults);
    const timeline = builder.build();

    // Analyze timeline
    const analyzer = new TimelineAnalyzer();
    const analysis = analyzer.analyze(timeline);

    res.json({
      success: true,
      filesProcessed: req.files.length,
      extractionsPerformed: allResults.length,
      timeline,
      analysis,
    });
  } catch (error) {
    console.error('Workflow error:', error);
    res.status(500).json({
      error: 'Workflow failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Metadata Service running on port ${port}`);
  console.log(`Registered extractors: ${globalRegistry.getAllExtractors().length}`);
});

export default app;
