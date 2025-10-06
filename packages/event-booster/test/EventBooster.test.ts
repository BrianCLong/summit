/** @jest-environment node */
import EventBooster, {
  createAmplifyPattern,
  createDefaultEventBooster,
  createTemporalShiftPattern,
  generateUniformEvents,
} from '../src/index.js';
import { BoostRunResult, EventRecord } from '../src/types.js';

const createClock = (...ticks: number[]): (() => number) => {
  let index = 0;
  const fallback = ticks.length > 0 ? ticks[ticks.length - 1] : 0;
  return () => {
    const value = ticks[index] ?? fallback;
    index += 1;
    return value;
  };
};

describe('EventBooster', () => {
  it('registers patterns and prevents duplicates', () => {
    const booster = new EventBooster();
    const pattern = createAmplifyPattern({ name: 'amplify', intensities: [1.5] });
    booster.registerPattern(pattern);
    expect(booster.listPatterns()).toEqual([
      { name: 'amplify', description: expect.stringContaining('Amplifies') },
    ]);
    expect(() => booster.registerPattern(pattern)).toThrow('already registered');
  });

  it('boosts events using an amplify pattern', () => {
    const booster = new EventBooster({ now: createClock(0, 4), performanceBudgetMs: 5 });
    const pattern = createAmplifyPattern({ name: 'amp', intensities: [2, 3] });
    booster.registerPattern(pattern);
    const events: EventRecord[] = [
      { id: 'e1', timestamp: 100, payload: { signal: 2 }, tags: ['raw'] },
      { id: 'e2', timestamp: 200, payload: { signal: 3 } },
    ];

    const result = booster.boost(events, 'amp');
    expect(result.outputCount).toBe(4);
    expect(result.events).toHaveLength(4);
    const derivative = result.events[0];
    expect(derivative.sourceEventId).toBe('e1');
    expect(derivative.payload.signal).toBeCloseTo(4);
    expect(derivative.tags).toContain('amp');
    expect(result.budgetExceeded).toBe(false);
  });

  it('flags performance budget overruns', () => {
    const booster = new EventBooster({
      now: createClock(0, 10),
      performanceBudgetMs: 5,
    });
    const pattern = createTemporalShiftPattern({ name: 'shift', offsetsMs: [0] });
    booster.registerPattern(pattern);
    const events = generateUniformEvents(1, { signal: 5, random: () => 0.5 });
    const result = booster.boost(events, 'shift');
    expect(result.budgetExceeded).toBe(true);
    expect(result.durationMs).toBeGreaterThanOrEqual(10);
  });

  it('throws when boosting without a registered pattern', () => {
    const booster = new EventBooster();
    const events = generateUniformEvents(2, { random: () => 0.3 });
    expect(() => booster.boost(events, 'missing')).toThrow('not registered');
  });

  it('limits history and exposes summaries', () => {
    const booster = new EventBooster({
      now: createClock(0, 1, 0, 1, 0, 1),
      maxHistory: 2,
    });
    const pattern = createTemporalShiftPattern({ name: 'shift', offsetsMs: [0] });
    booster.registerPattern(pattern);
    const events = generateUniformEvents(1, { random: () => 0.5 });
    booster.boost(events, 'shift');
    booster.boost(events, 'shift');
    booster.boost(events, 'shift');
    const history = booster.getHistory();
    expect(history).toHaveLength(2);
    expect(history[0].startedAt).toBe(0);
    expect(booster.getHistory(1)).toHaveLength(1);
    booster.clearHistory();
    expect(booster.getHistory()).toHaveLength(0);
  });

  it('supports generator-based boosting', () => {
    const booster = new EventBooster();
    const pattern = createAmplifyPattern({ name: 'amp', intensities: [1.1] });
    booster.registerPattern(pattern);
    const generator = jest.fn(() => generateUniformEvents(1, { signal: 2, random: () => 0.5 }));
    const result: BoostRunResult = booster.boostFromGenerator(generator, 'amp');
    expect(generator).toHaveBeenCalled();
    expect(result.outputCount).toBe(1);
  });

  it('creates boosters with default patterns preloaded', () => {
    const booster = createDefaultEventBooster();
    expect(booster.listPatterns().length).toBeGreaterThanOrEqual(3);
    const events = generateUniformEvents(1, { signal: 2, random: () => 0.4 });
    const result = booster.boost(events, booster.listPatterns()[0].name);
    expect(result.outputCount).toBeGreaterThan(0);
  });
});
