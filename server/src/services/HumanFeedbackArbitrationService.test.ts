import { HumanFeedbackArbitrationService } from './HumanFeedbackArbitrationService';

describe('HumanFeedbackArbitrationService', () => {
  it('reduces disagreements after adjudication', () => {
    const service = new HumanFeedbackArbitrationService();
    const dataset = service.createDataset({ name: 'Case Review' });
    service.ingestLabels(dataset.id, [
      { sampleId: 'doc-1', annotatorId: 'ann-a', label: 'approve' },
      { sampleId: 'doc-1', annotatorId: 'ann-b', label: 'reject' },
      { sampleId: 'doc-2', annotatorId: 'ann-a', label: 'approve' },
      { sampleId: 'doc-2', annotatorId: 'ann-b', label: 'approve' },
    ]);

    const before = service.computeMetrics(dataset.id);
    expect(before.unresolvedDisagreements).toBe(1);

    const adjudicated = service.adjudicate(dataset.id, {
      sampleId: 'doc-1',
      label: 'approve',
      adjudicator: 'lead-reviewer',
      rationale: 'Manual override after review',
    });

    expect(adjudicated.metrics.unresolvedDisagreements).toBe(0);
    const gold = service.getGold(dataset.id);
    expect(gold).toHaveLength(1);
    expect(gold[0].label).toBe('approve');
  });

  it('raises drift alerts when annotator distribution shifts', () => {
    const service = new HumanFeedbackArbitrationService();
    const dataset = service.createDataset({ name: 'Bias Monitoring' });

    service.ingestLabels(
      dataset.id,
      Array.from({ length: 5 }, (_, index) => ({
        sampleId: `seed-${index}`,
        annotatorId: 'ann-a',
        label: 'approve',
      })),
    );

    service.ingestLabels(
      dataset.id,
      Array.from({ length: 10 }, (_, index) => ({
        sampleId: `shift-${index}`,
        annotatorId: 'ann-a',
        label: 'reject',
      })),
    );

    const alerts = service.getBiasAlerts(dataset.id).filter((alert) => alert.annotatorId === 'ann-a');
    expect(alerts.some((alert) => alert.type === 'drift' && !alert.resolved)).toBe(true);
  });

  it('round-trips dataset exports and imports', () => {
    const service = new HumanFeedbackArbitrationService();
    const dataset = service.createDataset({ name: 'Export Suite', labelOptions: ['yes', 'no'] });
    service.ingestLabels(dataset.id, [
      { sampleId: 'item-1', annotatorId: 'ann-a', label: 'yes' },
      { sampleId: 'item-1', annotatorId: 'ann-b', label: 'no' },
      { sampleId: 'item-2', annotatorId: 'ann-a', label: 'yes' },
      { sampleId: 'item-2', annotatorId: 'ann-b', label: 'yes' },
    ]);
    service.adjudicate(dataset.id, {
      sampleId: 'item-1',
      label: 'yes',
      adjudicator: 'qa-lead',
    });

    const exported = service.exportDataset(dataset.id);
    const importer = new HumanFeedbackArbitrationService();
    importer.importDataset(exported);
    const importedMetrics = importer.computeMetrics(dataset.id);

    expect(importedMetrics.annotatedSamples).toBe(2);
    expect(importer.getGold(dataset.id)).toHaveLength(1);
    expect(importer.getDisagreements(dataset.id).length).toBeGreaterThan(0);
  });
});
