import { ArchitectureSelector, TaskSignalFeatures } from '../../src/orchestration/architectureSelector';

describe('ArchitectureSelector', () => {
  const selector = new ArchitectureSelector();

  const baseFeatures: TaskSignalFeatures = {
    id: 't1',
    decomposabilityScore: 0.5,
    estimatedToolCount: 4,
    sequentialDependencyScore: 0.5,
    riskScore: 0.5,
    timeCriticalityScore: 0.5,
  };

  it('prefers SINGLE_AGENT for high sequential dependency', () => {
    const architecture = selector.predictOptimalArchitecture({
      ...baseFeatures,
      sequentialDependencyScore: 0.9,
    });

    expect(architecture).toBe('SINGLE_AGENT');
  });

  it('prefers CENTRALIZED for decomposable tasks with modest tool count', () => {
    const architecture = selector.predictOptimalArchitecture({
      ...baseFeatures,
      decomposabilityScore: 0.8,
      estimatedToolCount: 6,
      sequentialDependencyScore: 0.3,
    });

    expect(architecture).toBe('CENTRALIZED');
  });

  it('prefers HYBRID for very high tool count', () => {
    const architecture = selector.predictOptimalArchitecture({
      ...baseFeatures,
      estimatedToolCount: 20,
      decomposabilityScore: 0.6,
    });

    expect(architecture).toBe('HYBRID');
  });

  it('recommends a different architecture when error amplification is high', () => {
    const metrics = selector.monitorErrorAmplification('CENTRALIZED', [
      { stepIndex: 0, success: false },
      { stepIndex: 1, success: false },
      { stepIndex: 2, success: true },
      { stepIndex: 3, success: false },
    ]);

    expect(metrics.totalSteps).toBe(4);
    expect(metrics.errorSteps).toBe(3);
    expect(metrics.recommendation).toBeDefined();
  });
});
