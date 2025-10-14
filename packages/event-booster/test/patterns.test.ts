/** @jest-environment node */
import {
  createAmplifyPattern,
  createNoisePattern,
  createTemporalShiftPattern,
} from '../src/patterns.js';
import { BoostContext, EventRecord } from '../src/types.js';

const buildContext = (events: EventRecord[], random: () => number = () => 0.5): BoostContext => ({
  index: 0,
  events,
  options: Object.freeze({}),
  random,
});

describe('patterns', () => {
  it('amplifies string signals and enforces minimum thresholds', () => {
    const event: EventRecord = {
      id: 'base',
      timestamp: 0,
      payload: { signal: '4' },
    };
    const pattern = createAmplifyPattern({ name: 'amp', intensities: [0.5, 2], minimumSignal: 1 });
    const derivatives = pattern.boost(event, buildContext([event]));
    expect(derivatives).toHaveLength(2);
    expect(derivatives[0].payload.signal).toBe(2);
    expect(derivatives[1].payload.signal).toBe(8);

    const lowPattern = createAmplifyPattern({ name: 'amp-low', intensities: [0.1], minimumSignal: 1 });
    expect(lowPattern.boost(event, buildContext([event]))).toHaveLength(0);
  });

  it('clones events across temporal offsets', () => {
    const event: EventRecord = {
      id: 'base',
      timestamp: 1_000,
      payload: { signal: 2 },
    };
    const pattern = createTemporalShiftPattern({ name: 'shift', offsetsMs: [-1_000, 1_000], decay: 500 });
    const derivatives = pattern.boost(event, buildContext([event]));
    expect(derivatives.map((item) => item.timestamp)).toEqual([0, 2_000]);
    expect(derivatives[0].boostScore).toBeCloseTo(Math.exp(-2));
  });

  it('injects bounded noise into signals', () => {
    const event: EventRecord = {
      id: 'base',
      timestamp: 0,
      payload: { signal: 10 },
    };
    const pattern = createNoisePattern({ name: 'noise', maxNoise: 0.1 });
    const derivatives = pattern.boost(event, buildContext([event], () => 0.75));
    expect(derivatives).toHaveLength(1);
    expect(derivatives[0].payload.noise).toBeCloseTo(0.05, 5);
    expect(derivatives[0].payload.signal).toBeCloseTo(10.5);
  });
});
