import express from 'express';
import { ETLAssistant } from '../ingest/etl-assistant.js';

const router = express.Router();
const assistant = new ETLAssistant();

router.use(express.json({ limit: '2mb' }));

router.post('/analyze', async (req, res) => {
  try {
    const { sample, format = 'csv', entityId } = req.body ?? {};
    if (!sample) {
      return res.status(400).json({ error: 'sample is required' });
    }
    if (!['csv', 'json'].includes(format)) {
      return res.status(400).json({ error: `Unsupported format: ${format}` });
    }

    const analysis = await assistant.analyzeSample({
      sample,
      format,
      canonicalEntityId: entityId,
    });

    res.json({
      entity: analysis.entity,
      samplePreview: analysis.samplePreview,
      totalRows: analysis.totalRows,
      fieldAnalyses: analysis.fieldAnalyses,
      suggestedMappings: analysis.suggestedMappings,
      requiredFieldIssues: analysis.requiredFieldIssues,
      piiFlags: analysis.piiFlags,
      redactionPresets: analysis.redactionPresets,
      estimatedCompletionMinutes: analysis.estimatedCompletionMinutes,
      licenses: assistant.getSupportedLicenses(),
      coverage: analysis.coverage,
      confidenceScore: analysis.confidenceScore,
      warnings: analysis.warnings,
      mappingConfidence: analysis.mappingConfidence,
      unmappedSourceFields: analysis.unmappedSourceFields,
      dataQuality: analysis.dataQuality,
      analysisDurationMs: analysis.analysisDurationMs,
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to analyze sample' });
  }
});

router.post('/transform-spec', async (req, res) => {
  try {
    const { sample, format = 'csv', entityId, mappings, piiDecisions, licenseId } = req.body ?? {};
    if (!sample) {
      return res.status(400).json({ error: 'sample is required' });
    }
    if (!mappings || typeof mappings !== 'object') {
      return res.status(400).json({ error: 'mappings are required' });
    }

    const spec = await assistant.buildTransformSpec({
      sample,
      format,
      entityId,
      mappings,
      piiDecisions,
      licenseId,
    });

    res.json(spec);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to build transform spec';
    res.status(message.startsWith('Missing required mappings') ? 422 : 500).json({ error: message });
  }
});

router.post('/dry-run', async (req, res) => {
  try {
    const { sample, format = 'csv', entityId, mappings, piiDecisions, licenseId } = req.body ?? {};
    if (!sample) {
      return res.status(400).json({ error: 'sample is required' });
    }
    if (!mappings || typeof mappings !== 'object') {
      return res.status(400).json({ error: 'mappings are required' });
    }

    const spec = await assistant.buildTransformSpec({
      sample,
      format,
      entityId,
      mappings,
      piiDecisions,
      licenseId,
    });
    const dryRun = await assistant.runDryRun(spec, sample, format, piiDecisions);

    res.json({
      spec: dryRun.spec,
      previewRows: dryRun.previewRows,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate dry run';
    res.status(message.startsWith('Missing required mappings') ? 422 : 500).json({ error: message });
  }
});

router.post('/license/check', async (req, res) => {
  try {
    const { licenseId, accepted, piiFlags = [] } = req.body ?? {};
    if (!licenseId) {
      return res.status(400).json({ error: 'licenseId is required' });
    }

    const evaluation = assistant.evaluateLicense({ licenseId, accepted: Boolean(accepted), piiFlags });
    res.json(evaluation);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to evaluate license' });
  }
});

router.get('/licenses', (_req, res) => {
  res.json({ licenses: assistant.getSupportedLicenses() });
});

router.get('/metadata', (_req, res) => {
  res.json(assistant.getMetadata());
});

export default router;
