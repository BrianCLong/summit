import {
  listSnapshots,
  computeLineageDiff,
  generateReplayManifest,
  getSnapshotById,
} from '../provenance/eltm-service.js';

describe('Event Lineage Time Machine service', () => {
  it('orders snapshots chronologically for the time slider', () => {
    const summaries = listSnapshots();
    const timestamps = summaries.map((summary) => new Date(summary.capturedAt).valueOf());
    const sorted = [...timestamps].sort((a, b) => a - b);
    expect(timestamps).toEqual(sorted);
  });

  it('identifies only real lineage deltas between consecutive runs', () => {
    const diff = computeLineageDiff('eltm-run-20250301-1200Z', 'eltm-run-20250302-1200Z');

    expect(diff.nodeDiff.removed).toHaveLength(0);
    expect(diff.edgeDiff.removed).toHaveLength(0);

    const addedNodeIds = diff.nodeDiff.added.map((node) => node.id);
    expect(addedNodeIds).toEqual(expect.arrayContaining(['dataset-enriched-events', 'transform-enrich-events']));

    const changedIds = diff.nodeDiff.changed.map((change) => change.nodeId);
    expect(changedIds).toEqual(
      expect.arrayContaining([
        'dataset-raw-events',
        'transform-normalize-events',
        'dataset-clean-events',
        'transform-train-metrics',
        'dataset-daily-metrics',
      ]),
    );

    expect(diff.sourceNodeStatus['policy-gdpr']).toBe('unchanged');
    expect(diff.targetNodeStatus['policy-gdpr']).toBe('unchanged');
    expect(diff.targetNodeStatus['dataset-enriched-events']).toBe('added');
  });

  it('generates deterministic replay manifests with locked inputs and parameters', () => {
    const manifestA = generateReplayManifest('eltm-run-20250302-1200Z');
    const manifestB = generateReplayManifest('eltm-run-20250302-1200Z');

    expect(manifestA.artifactChecksum).toBe(manifestB.artifactChecksum);
    expect(manifestA.inputs.every((input) => input.locked)).toBe(true);
    expect(manifestA.parameters.every((param) => param.locked)).toBe(true);

    const snapshot = getSnapshotById('eltm-run-20250302-1200Z');
    expect(snapshot?.manifestChecksum).toBe(manifestA.artifactChecksum);
  });
});
