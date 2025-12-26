import { ExperimentManifest, validateManifest, RESEARCH_TRACK_PREFIX, ExperimentStatus } from './types';

describe('Experiment Manifest Validation', () => {
  const validManifest: ExperimentManifest = {
    id: `${RESEARCH_TRACK_PREFIX}test-001`,
    owner: 'researcher@summit.com',
    hypothesis: 'New graph algo is faster',
    startDate: '2025-01-01',
    durationDays: 7,
    status: ExperimentStatus.PROPOSED,
    metrics: [{ name: 'execution_time', type: 'latency', description: 'ms to run' }],
    exitCriteria: {
      success: 'execution_time < 100ms',
      failure: 'execution_time > 200ms'
    },
    risks: ['high memory usage']
  };

  it('validates a correct manifest', () => {
    const errors = validateManifest(validManifest);
    expect(errors).toHaveLength(0);
  });

  it('fails if ID does not have prefix', () => {
    const invalid = { ...validManifest, id: 'wrong-prefix' };
    const errors = validateManifest(invalid);
    expect(errors).toContain(`ID must start with ${RESEARCH_TRACK_PREFIX}`);
  });

  it('fails if hypothesis is missing', () => {
    const invalid = { ...validManifest, hypothesis: '' };
    const errors = validateManifest(invalid);
    expect(errors).toContain('Hypothesis is required');
  });

  it('fails if metrics are missing', () => {
    const invalid = { ...validManifest, metrics: [] };
    const errors = validateManifest(invalid);
    expect(errors).toContain('At least one metric is required');
  });
});
