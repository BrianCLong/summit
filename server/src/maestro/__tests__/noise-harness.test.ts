import { applyNoise } from '../noise-harness.js';

describe('Noise harness', () => {
  it('deterministically applies field drift and overrides', () => {
    const result = applyNoise(
      { alpha: 'one', bravo: 'two', charlie: 'three' },
      {
        id: 'scenario-1',
        dropFieldProbability: 0,
        renameFieldProbability: 1,
        adversarialOverrides: { delta: 'four' },
        seed: 10,
      },
    );

    expect(result.payload.delta).toBe('four');
    expect(result.signals.some((signal) => signal.type === 'field_renamed')).toBe(true);
    expect(result.signals.some((signal) => signal.type === 'adversarial_override')).toBe(true);
  });
});
