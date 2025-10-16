export { EventBooster as default, EventBooster } from './EventBooster.js';
export type {
  BoostContext,
  BoostPattern,
  BoostRunResult,
  BoostRunSummary,
  BoostedEvent,
  EventBoosterOptions,
  EventRecord,
  EventPayload,
  HistoryEntry,
} from './types.js';
export {
  createAmplifyPattern,
  createTemporalShiftPattern,
  createNoisePattern,
  defaultPatterns,
} from './patterns.js';
export {
  generateUniformEvents,
  generateBurstEvents,
  generateSeasonalEvents,
  generateAnomalyEvents,
} from './SyntheticGenerators.js';
export {
  runPatternBenchmark,
  benchmarkPatterns,
} from './PerformanceBenchmarks.js';

import EventBooster from './EventBooster.js';
import { defaultPatterns } from './patterns.js';
import { EventBoosterOptions } from './types.js';

/**
 * Creates an {@link EventBooster} instance with the default pattern bundle pre-registered.
 */
export const createDefaultEventBooster = (
  options: EventBoosterOptions = {},
): EventBooster => {
  const providedPatterns = options.initialPatterns ?? [];
  const merged = [...providedPatterns];
  for (const pattern of defaultPatterns) {
    if (!merged.some((existing) => existing.name === pattern.name)) {
      merged.push(pattern);
    }
  }
  return new EventBooster({ ...options, initialPatterns: merged });
};
