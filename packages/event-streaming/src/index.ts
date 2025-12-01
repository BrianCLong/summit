/**
 * @intelgraph/event-streaming
 *
 * Real-time event streaming and complex event processing
 */

export {
  StreamProcessor,
  PipelineBuilder
} from './processing/StreamProcessor.js';
export type {
  StreamEvent,
  StreamOperator,
  StreamPipeline
} from './processing/StreamProcessor.js';

export {
  WindowedAggregator,
  WindowType,
  Aggregators
} from './windowing/WindowedAggregator.js';
export type {
  WindowConfig,
  Window,
  AggregateFunction
} from './windowing/WindowedAggregator.js';
