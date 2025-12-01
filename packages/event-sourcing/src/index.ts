/**
 * @intelgraph/event-sourcing
 *
 * Enterprise event sourcing framework with event store, versioning, and replay
 */

export { EventStore } from './store/EventStore.js';
export { SnapshotStore } from './snapshot/SnapshotStore.js';
export { EventReplayer } from './replay/EventReplayer.js';
export type { EventHandler, ReplayProgress } from './replay/EventReplayer.js';
export {
  Aggregate,
  AggregateRepository
} from './aggregate/AggregateRepository.js';
export type { AggregateConstructor } from './aggregate/AggregateRepository.js';
export {
  EventUpcasterChain,
  UpcastHelpers
} from './versioning/EventUpcaster.js';

export type {
  DomainEvent,
  EventMetadata,
  EventDescriptor,
  EventStream,
  EventFilter,
  EventStoreConfig,
  Snapshot,
  AggregateRoot,
  EventUpcaster,
  ReplayOptions,
  EventStoreStats
} from './store/types.js';
