# Event Sourcing & CQRS Toolkit

A lightweight toolkit for building event-driven flows with optimistic concurrency, snapshots, sagas, and eventual consistency primitives.

## Features
- In-memory event store with optimistic concurrency control
- Command bus wiring handlers to event persistence and publication
- Projection helpers for query/read models
- Snapshot store and replay utilities for fast rebuilds
- Saga orchestrator for long-running, event-triggered workflows
- Eventual consistency coordinator to advance projections safely using offsets

## Usage
```ts
import {
  CommandBus,
  EventBus,
  EventReplayer,
  EventualConsistencyCoordinator,
  InMemoryEventStore,
  InMemoryProjection,
  InMemorySnapshotStore,
  SagaOrchestrator,
} from '@ga-graphai/event-sourcing';

const eventStore = new InMemoryEventStore();
const eventBus = new EventBus();
const snapshots = new InMemorySnapshotStore();
const commandBus = new CommandBus(eventStore, eventBus, snapshots);
const projections = new EventualConsistencyCoordinator(eventStore);
const saga = new SagaOrchestrator(eventBus, commandBus);

// Register command handlers, projections, and sagas as needed...
```

Run the package tests with:

```bash
npm test --workspace @ga-graphai/event-sourcing
```
