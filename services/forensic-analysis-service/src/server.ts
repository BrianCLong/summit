import express from 'express';
import cors from 'cors';
import { ExtractionResult, AnalysisReport } from '@intelgraph/metadata-extractor';
import { AttributionAnalyzer } from './analyzers/attribution.js';
import { EnrichmentEngine } from './engines/enrichment.js';
import { ForensicIntelligence } from './intelligence/forensic.js';

const app = express();
const port = process.env.PORT || 3101;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Initialize analyzers and engines
const attributionAnalyzer = new AttributionAnalyzer();
const enrichmentEngine = new EnrichmentEngine();
const forensicIntel = new ForensicIntelligence();

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'forensic-analysis-service',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
  });
});

/**
 * Perform attribution analysis
 */
app.post('/api/analyze/attribution', async (req, res) => {
  try {
    const { results } = req.body;

    if (!Array.isArray(results) || results.length === 0) {
      return res.status(400).json({ error: 'No extraction results provided' });
    }

    const attributions = await attributionAnalyzer.analyze(results);

    res.json({
      success: true,
      attributions,
    });
  } catch (error) {
    console.error('Attribution analysis error:', error);
    res.status(500).json({
      error: 'Attribution analysis failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Enrich metadata with external sources
 */
app.post('/api/enrich', async (req, res) => {
  try {
    const { results } = req.body;

    if (!Array.isArray(results) || results.length === 0) {
      return res.status(400).json({ error: 'No extraction results provided' });
    }

    const enriched = await enrichmentEngine.enrich(results);

    res.json({
      success: true,
      enriched,
    });
  } catch (error) {
    console.error('Enrichment error:', error);
    res.status(500).json({
      error: 'Enrichment failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Generate intelligence report
 */
app.post('/api/intelligence/report', async (req, res) => {
  try {
    const { results, options } = req.body;

    if (!Array.isArray(results) || results.length === 0) {
      return res.status(400).json({ error: 'No extraction results provided' });
    }

    const report = await forensicIntel.generateReport(results, options);

    res.json({
      success: true,
      report,
    });
  } catch (error) {
    console.error('Intelligence report error:', error);
    res.status(500).json({
      error: 'Intelligence report generation failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Detect relationships between artifacts
 */
app.post('/api/analyze/relationships', async (req, res) => {
  try {
    const { results } = req.body;

    if (!Array.isArray(results) || results.length === 0) {
      return res.status(400).json({ error: 'No extraction results provided' });
    }

    const relationships = await forensicIntel.detectRelationships(results);

    res.json({
      success: true,
      relationships,
    });
  } catch (error) {
    console.error('Relationship detection error:', error);
    res.status(500).json({
      error: 'Relationship detection failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Complete forensic analysis
 */
app.post('/api/analyze/complete', async (req, res) => {
  try {
    const { results, options } = req.body;

    if (!Array.isArray(results) || results.length === 0) {
      return res.status(400).json({ error: 'No extraction results provided' });
    }

    // Enrich metadata
    const enriched = await enrichmentEngine.enrich(results);

    // Attribution analysis
    const attributions = await attributionAnalyzer.analyze(enriched);

    // Relationship detection
    const relationships = await forensicIntel.detectRelationships(enriched);

    // Generate intelligence report
    const report = await forensicIntel.generateReport(enriched, {
      ...options,
      attributions,
      relationships,
    });

    res.json({
      success: true,
      enriched,
      attributions,
      relationships,
      report,
    });
  } catch (error) {
    console.error('Complete analysis error:', error);
    res.status(500).json({
      error: 'Complete analysis failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Forensic Analysis Service running on port ${port}`);
});

export default app;
