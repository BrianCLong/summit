/**
 * @intelgraph/narrative-tracking
 * Narrative extraction and tracking for influence operations detection
 */

export { NarrativeExtractor } from './extraction/NarrativeExtractor.js';
export { FramingAnalyzer } from './framing/FramingAnalyzer.js';
export { NarrativeTracker } from './tracking/NarrativeTracker.js';
export { CounterNarrativeDetector } from './detection/CounterNarrativeDetector.js';

export type {
  Narrative,
  StoryArc,
  NarrativeFraming,
  FramingDevice,
  NarrativeActor,
  NarrativeEvent,
  CounterNarrative,
  NarrativeEvolution,
  NarrativeVersion,
  DivergencePoint,
  ConvergencePoint,
  NarrativeCluster,
} from './extraction/types.js';
