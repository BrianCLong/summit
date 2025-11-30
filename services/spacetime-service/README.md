# Spacetime Service

Temporal-geospatial indexing and query engine for the IntelGraph intelligence platform.

## Overview

The Spacetime Service provides efficient spatial and temporal queries for intelligence analysis, supporting:

- **Co-presence detection**: Find when and where multiple entities were at the same place
- **Region monitoring**: Track entities entering, dwelling in, or exiting geographic areas
- **Trajectory reconstruction**: Build movement paths from point observations
- **Dwell detection**: Identify stationary periods within defined areas

## Features

- **High-performance indexes**: R-tree for spatial queries, interval tree for temporal queries
- **Geohash support**: Grid-based spatial indexing for proximity queries
- **Policy-aware**: All queries respect tenant isolation and policy labels
- **Query guards**: Prevents resource exhaustion with configurable limits
- **Derived events**: Emits co-presence and dwell events for Graph Core integration
- **Deterministic**: All calculations use UTC timestamps and WGS84 coordinates

## Installation

```bash
pnpm add @intelgraph/spacetime-service
```

## Quick Start

```typescript
import {
  createSpacetimeService,
  type TimeEvent,
  type PolicyContext,
} from '@intelgraph/spacetime-service';

// Create service
const service = createSpacetimeService();

// Define policy context (required for all queries)
const context: PolicyContext = {
  tenantId: 'my-tenant',
  policyLabels: [],
};

// Ingest observations
await service.ingestTimeEvent({
  id: 'event-1',
  entityId: 'entity-1',
  timestamp: Date.now(),
  location: { latitude: 40.7128, longitude: -74.006 },
  eventType: 'observation',
  attributes: {},
  tenantId: 'my-tenant',
  policyLabels: [],
  provenance: { source: 'gps', chain: [], confidence: 0.95 },
  createdAt: Date.now(),
});

// Find co-presence
const episodes = service.findCoPresence({
  entityIds: ['entity-1', 'entity-2'],
  timeWindow: { start: Date.now() - 86400000, end: Date.now() },
  radius: 100, // meters
  minOverlapDuration: 60000, // 1 minute
  minConfidence: 0.5,
  context,
});
```

## API Reference

### Data Ingestion

#### `ingestTimeEvent(event: TimeEvent): Promise<void>`
Ingest a point-in-time observation with location.

#### `ingestInterval(interval: Interval): Promise<void>`
Ingest a time interval (e.g., "entity was at location from X to Y").

#### `ingestGeoPoint(point: GeoPoint): Promise<void>`
Ingest a geographic point observation.

#### `ingestTrajectory(trajectory: Trajectory): Promise<void>`
Ingest a complete movement trajectory.

### Query APIs

#### `findCoPresence(query: CoPresenceQuery): CoPresenceEpisode[]`
Find episodes where specified entities were at the same place at the same time.

```typescript
const episodes = service.findCoPresence({
  entityIds: ['alice', 'bob', 'charlie'],
  timeWindow: { start: startTime, end: endTime },
  radius: 50, // meters
  minOverlapDuration: 300000, // 5 minutes
  minConfidence: 0.7,
  context,
});
```

#### `findEntitiesInRegion(query: EntitiesInRegionQuery): EntityInRegionResult[]`
Find entities present within a geographic region.

```typescript
const results = service.findEntitiesInRegion({
  shape: {
    type: 'Polygon',
    coordinates: [[[-74.01, 40.70], [-73.99, 40.70], [-73.99, 40.72], [-74.01, 40.72], [-74.01, 40.70]]],
  },
  timeRange: { start: startTime, end: endTime },
  limit: 100,
  offset: 0,
  context,
});
```

#### `getTrajectory(query: TrajectoryQuery): Trajectory | null`
Reconstruct movement trajectory for an entity.

```typescript
const trajectory = service.getTrajectory({
  entityId: 'target-entity',
  timeRange: { start: startTime, end: endTime },
  simplifyTolerance: 10, // meters (Douglas-Peucker)
  includeSpeed: true,
  includeHeading: true,
  context,
});
```

#### `detectDwell(query: DwellQuery): DwellEpisode[]`
Detect periods where entity remained stationary in an area.

```typescript
const dwells = service.detectDwell({
  entityId: 'target-entity',
  area: {
    type: 'Polygon',
    coordinates: [/* polygon coordinates */],
  },
  minDuration: 600000, // 10 minutes
  maxGapDuration: 120000, // 2 minutes
  context,
});
```

### Summary APIs

#### `getSpacetimeSummary(entityId, timeRange, context): SpacetimeSummary`
Get aggregated statistics for an entity's spatiotemporal behavior.

```typescript
const summary = service.getSpacetimeSummary('entity-1', timeRange, context);
// Returns: totalObservations, uniqueLocations, totalDistance, dwellCount, etc.
```

#### `getCoPresencePartners(entityId, timeRange, radius, context)`
Find entities that had co-presence episodes with a target entity.

## Configuration

```typescript
const service = createSpacetimeService({
  // Query guards
  maxQueryAreaSqMeters: 1_000_000_000_000, // ~1M km²
  maxTimeSpanMs: 365 * 24 * 60 * 60 * 1000, // 1 year
  maxResultCardinality: 10_000,
  maxEntitiesPerQuery: 1000,

  // Index configuration
  geohashPrecision: 7, // ~150m cells

  // Behavior
  defaultConfidenceThreshold: 0.5,
  enableQueryLogging: true,
  retentionPolicyDays: 365,
});
```

## Storage Adapters

The service uses an adapter pattern for persistence:

```typescript
import { createSpacetimeService, InMemoryStorageAdapter } from '@intelgraph/spacetime-service';

// Built-in in-memory adapter (for testing/development)
const memoryService = createSpacetimeService(config, new InMemoryStorageAdapter());

// Custom adapter (implement StorageAdapter interface)
const customService = createSpacetimeService(config, myPostgresAdapter);
```

## Derived Events

The service can emit derived events for Graph Core integration:

```typescript
const emitter = {
  emit: (event: DerivedEventReference) => {
    // Send to Graph Core, message queue, etc.
    console.log('Derived event:', event.type, event.sourceEntityIds);
  },
};

const service = createSpacetimeService(config, storage, emitter);
```

Event types emitted:
- `co_presence`: When co-presence episodes are detected
- `dwell`: When dwell episodes are detected

## Coordinate Systems

- All coordinates use **WGS84 (EPSG:4326)**
- Latitudes: -90 to 90
- Longitudes: -180 to 180
- Elevations: meters above sea level (optional)
- Distances: meters
- Timestamps: UTC milliseconds (Unix epoch)
- Durations: milliseconds

## Query Guards

Built-in guards prevent resource exhaustion:

| Guard | Default | Description |
|-------|---------|-------------|
| `maxQueryAreaSqMeters` | 1M km² | Maximum query region area |
| `maxTimeSpanMs` | 1 year | Maximum time window span |
| `maxResultCardinality` | 10,000 | Maximum results returned |
| `maxEntitiesPerQuery` | 1,000 | Maximum entities in co-presence query |

Guards throw `QueryGuardError` when exceeded.

## Testing

```bash
# Run unit tests
pnpm test

# Run with coverage
pnpm test:coverage

# Run in watch mode
pnpm test:watch
```

## Architecture

```
spacetime-service/
├── src/
│   ├── types/           # Zod schemas and TypeScript types
│   ├── indexes/         # TimeIndex, GeoIndex, SpacetimeIndex
│   ├── queries/         # Query implementations
│   ├── services/        # SpacetimeService, QueryGuards
│   ├── utils/           # Geo and time utilities
│   └── __tests__/       # Unit and property-based tests
```

### Index Structure

- **TimeIndex**: AVL interval tree for temporal range queries
- **GeoIndex**: R-tree + geohash for spatial queries
- **SpacetimeIndex**: Combined index coordinating both

## Performance Considerations

1. **Bulk ingestion**: Use `bulkInsert` methods for batch loading
2. **Query selectivity**: Spatial filters are typically more selective; the service optimizes query order
3. **Geohash precision**: Lower precision = larger cells = fewer index lookups but coarser filtering
4. **Trajectory simplification**: Use `simplifyTolerance` to reduce point count for display

## Integration with IntelGraph

The Spacetime Service integrates with other IntelGraph components:

- **Graph Core**: Receives derived events (co-presence, dwell) as entity references
- **Analytics**: Provides spacetime summaries via stable API
- **Copilot**: Supports natural language queries about entity movements
- **Retention Service**: Coordinates data retention policies

## License

MIT
