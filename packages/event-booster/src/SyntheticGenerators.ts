import { EventRecord, EventPayload } from './types.js';

/** Shared configuration for all synthetic generators. */
interface GeneratorBaseOptions {
  startTimestamp?: number;
  intervalMs?: number;
  basePayload?: EventPayload;
  tags?: string[];
  random?: () => number;
}

/** Options for {@link generateUniformEvents}. */
export interface UniformGeneratorOptions extends GeneratorBaseOptions {
  signal?: number;
}

/** Options for {@link generateBurstEvents}. */
export interface BurstGeneratorOptions extends GeneratorBaseOptions {
  bursts: number;
  burstSize: number;
  /** Multiplier applied to the base signal for each burst. */
  amplitude?: number;
  /** Signal value for idle periods. */
  baselineSignal?: number;
}

/** Options for {@link generateSeasonalEvents}. */
export interface SeasonalGeneratorOptions extends GeneratorBaseOptions {
  periods: number;
  pointsPerPeriod: number;
  amplitude?: number;
  baselineSignal?: number;
  phaseOffset?: number;
}

/** Options for {@link generateAnomalyEvents}. */
export interface AnomalyGeneratorOptions extends GeneratorBaseOptions {
  count: number;
  anomalyRate?: number;
  baselineSignal?: number;
  anomalySignal?: number;
}

const defaultRandom = (): number => Math.random();

const createEvent = (
  id: string,
  timestamp: number,
  signal: number,
  basePayload: EventPayload,
  tags?: string[],
): EventRecord => ({
  id,
  timestamp,
  payload: { ...basePayload, signal },
  tags: tags ? [...tags] : undefined,
});

const resolveStartTimestamp = (provided?: number): number =>
  provided ?? Date.now();

const resolveInterval = (provided?: number): number =>
  Math.max(1, provided ?? 1000);

/**
 * Generates a uniform stream of events spaced by {@link UniformGeneratorOptions.intervalMs}.
 */
export const generateUniformEvents = (
  count: number,
  options: UniformGeneratorOptions = {},
): EventRecord[] => {
  const random = options.random ?? defaultRandom;
  const start = resolveStartTimestamp(options.startTimestamp);
  const interval = resolveInterval(options.intervalMs);
  const basePayload = options.basePayload ?? {};
  const tags = options.tags;
  const signal = options.signal ?? 1;

  return Array.from({ length: Math.max(0, count) }, (_, index) => {
    const jitter = (random() - 0.5) * interval * 0.05;
    return createEvent(
      `uniform-${index}`,
      start + index * interval + jitter,
      signal,
      basePayload,
      tags,
    );
  });
};

/**
 * Produces bursts of heightened activity separated by idle windows.
 */
export const generateBurstEvents = (
  options: BurstGeneratorOptions,
): EventRecord[] => {
  const random = options.random ?? defaultRandom;
  const start = resolveStartTimestamp(options.startTimestamp);
  const interval = resolveInterval(options.intervalMs);
  const basePayload = options.basePayload ?? {};
  const tags = options.tags;
  const amplitude = options.amplitude ?? 3;
  const baseline = options.baselineSignal ?? 1;

  const events: EventRecord[] = [];
  let timestamp = start;
  for (let burst = 0; burst < options.bursts; burst += 1) {
    for (let item = 0; item < options.burstSize; item += 1) {
      const signal = baseline * amplitude;
      events.push(
        createEvent(
          `burst-${burst}-${item}`,
          timestamp + item * interval,
          signal,
          basePayload,
          tags,
        ),
      );
    }
    timestamp += options.burstSize * interval;
    // Idle gap with slight randomisation to mimic real traffic.
    const idleGap = interval * (2 + random());
    timestamp += idleGap;
  }

  return events;
};

/**
 * Generates a seasonal waveform using a sine wave for the signal attribute.
 */
export const generateSeasonalEvents = (
  options: SeasonalGeneratorOptions,
): EventRecord[] => {
  const random = options.random ?? defaultRandom;
  const start = resolveStartTimestamp(options.startTimestamp);
  const interval = resolveInterval(options.intervalMs);
  const basePayload = options.basePayload ?? {};
  const tags = options.tags;
  const amplitude = options.amplitude ?? 5;
  const baseline = options.baselineSignal ?? 1;
  const phaseOffset = options.phaseOffset ?? 0;

  const events: EventRecord[] = [];
  let index = 0;
  for (let period = 0; period < options.periods; period += 1) {
    for (let point = 0; point < options.pointsPerPeriod; point += 1) {
      const phase =
        (2 * Math.PI * point) / options.pointsPerPeriod + phaseOffset;
      const signal = baseline + Math.sin(phase) * amplitude;
      const jitter = (random() - 0.5) * interval * 0.1;
      events.push(
        createEvent(
          `seasonal-${period}-${point}`,
          start + index * interval + jitter,
          signal,
          basePayload,
          tags,
        ),
      );
      index += 1;
    }
  }

  return events;
};

/**
 * Injects sporadic anomalies into a mostly stable stream.
 */
export const generateAnomalyEvents = (
  options: AnomalyGeneratorOptions,
): EventRecord[] => {
  const random = options.random ?? defaultRandom;
  const start = resolveStartTimestamp(options.startTimestamp);
  const interval = resolveInterval(options.intervalMs);
  const basePayload = options.basePayload ?? {};
  const tags = options.tags;
  const baseline = options.baselineSignal ?? 1;
  const anomaly = options.anomalySignal ?? baseline * 10;
  const rate = Math.min(1, Math.max(0, options.anomalyRate ?? 0.05));

  return Array.from({ length: Math.max(0, options.count) }, (_, index) => {
    const isAnomaly = random() < rate;
    const signal = isAnomaly ? anomaly : baseline;
    return createEvent(
      `anomaly-${index}`,
      start + index * interval,
      signal,
      { ...basePayload, isAnomaly },
      tags,
    );
  });
};
