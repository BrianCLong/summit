import { Router } from 'express';
import {
  humanFeedbackArbitrationService,
  HFALabelRecord,
} from '../services/HumanFeedbackArbitrationService.js';

const router = Router();

router.get('/datasets', (_req, res) => {
  res.json({ datasets: humanFeedbackArbitrationService.listDatasets() });
});

router.post('/datasets', (req, res) => {
  try {
    const dataset = humanFeedbackArbitrationService.createDataset({
      name: req.body?.name,
      description: req.body?.description,
      labelOptions: req.body?.labelOptions,
    });
    res.status(201).json({ dataset });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

router.get('/datasets/:datasetId', (req, res) => {
  try {
    const dataset = humanFeedbackArbitrationService.getDataset(req.params.datasetId);
    res.json({
      dataset: {
        ...dataset,
        goldDecisions: Array.from(dataset.goldDecisions.values()),
        annotatorBaselines: Array.from(dataset.annotatorBaselines.entries()).map(
          ([annotatorId, distribution]) => ({
            annotatorId,
            distribution: Object.fromEntries(distribution.entries()),
          }),
        ),
      },
      metrics: humanFeedbackArbitrationService.computeMetrics(req.params.datasetId),
      disagreements: humanFeedbackArbitrationService.getDisagreements(req.params.datasetId),
    });
  } catch (error) {
    res.status(404).json({ error: (error as Error).message });
  }
});

router.post('/datasets/:datasetId/labels', (req, res) => {
  try {
    const labels: HFALabelRecord[] = req.body?.labels;
    const metrics = humanFeedbackArbitrationService.ingestLabels(req.params.datasetId, labels);
    res.status(202).json({ metrics });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

router.get('/datasets/:datasetId/metrics', (req, res) => {
  try {
    const metrics = humanFeedbackArbitrationService.computeMetrics(req.params.datasetId);
    res.json({ metrics });
  } catch (error) {
    res.status(404).json({ error: (error as Error).message });
  }
});

router.get('/datasets/:datasetId/disagreements', (req, res) => {
  try {
    const disagreements = humanFeedbackArbitrationService.getDisagreements(req.params.datasetId);
    res.json({ disagreements });
  } catch (error) {
    res.status(404).json({ error: (error as Error).message });
  }
});

router.post('/datasets/:datasetId/adjudicate', (req, res) => {
  try {
    const result = humanFeedbackArbitrationService.adjudicate(req.params.datasetId, {
      sampleId: req.body?.sampleId,
      label: req.body?.label,
      adjudicator: req.body?.adjudicator,
      rationale: req.body?.rationale,
    });
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

router.get('/datasets/:datasetId/gold', (req, res) => {
  try {
    const gold = humanFeedbackArbitrationService.getGold(req.params.datasetId);
    res.json({ gold });
  } catch (error) {
    res.status(404).json({ error: (error as Error).message });
  }
});

router.get('/datasets/:datasetId/bias-alerts', (req, res) => {
  try {
    const alerts = humanFeedbackArbitrationService.getBiasAlerts(req.params.datasetId);
    res.json({ alerts });
  } catch (error) {
    res.status(404).json({ error: (error as Error).message });
  }
});

router.get('/datasets/:datasetId/export', (req, res) => {
  try {
    const payload = humanFeedbackArbitrationService.exportDataset(req.params.datasetId);
    res.json(payload);
  } catch (error) {
    res.status(404).json({ error: (error as Error).message });
  }
});

router.post('/import', (req, res) => {
  try {
    const dataset = humanFeedbackArbitrationService.importDataset(req.body);
    res.status(201).json({ dataset });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

export default router;
