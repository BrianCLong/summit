/** @jest-environment node */
import {
  generateAnomalyEvents,
  generateBurstEvents,
  generateSeasonalEvents,
  generateUniformEvents,
} from '../src/SyntheticGenerators.js';

const constantRandom = () => 0.5;

describe('SyntheticGenerators', () => {
  it('creates uniformly spaced events with jitter', () => {
    const events = generateUniformEvents(3, {
      startTimestamp: 1_000,
      intervalMs: 1_000,
      signal: 2,
      random: constantRandom,
      tags: ['uniform'],
    });
    expect(events).toHaveLength(3);
    expect(events[0].payload.signal).toBe(2);
    expect(events[1].timestamp).toBeGreaterThan(events[0].timestamp);
    expect(events.every((event) => event.tags?.includes('uniform'))).toBe(true);
  });

  it('builds burst sequences with idle gaps', () => {
    const events = generateBurstEvents({
      bursts: 2,
      burstSize: 2,
      startTimestamp: 0,
      intervalMs: 1_000,
      random: constantRandom,
      baselineSignal: 1,
      amplitude: 4,
    });
    expect(events).toHaveLength(4);
    expect(events[0].payload.signal).toBe(4);
    expect(events[1].timestamp).toBe(1_000);
    expect(events[2].timestamp).toBeGreaterThan(2_000);
  });

  it('generates seasonal oscillations', () => {
    const events = generateSeasonalEvents({
      periods: 1,
      pointsPerPeriod: 4,
      startTimestamp: 0,
      intervalMs: 1_000,
      amplitude: 2,
      baselineSignal: 5,
      random: constantRandom,
    });
    const signals = events.map((event) => event.payload.signal as number);
    expect(Math.max(...signals)).toBeGreaterThan(6);
    expect(Math.min(...signals)).toBeLessThan(4);
  });

  it('injects anomalies at the configured rate', () => {
    const events = generateAnomalyEvents({
      count: 5,
      anomalyRate: 1,
      baselineSignal: 1,
      anomalySignal: 10,
      startTimestamp: 0,
      intervalMs: 1,
      random: () => 0,
    });
    expect(events.every((event) => event.payload.isAnomaly === true)).toBe(
      true,
    );
    expect(events[0].payload.signal).toBe(10);
  });
});
