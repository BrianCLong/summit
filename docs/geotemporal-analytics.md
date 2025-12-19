# Geo-Temporal Analytics Module

> **Version**: 1.0.0
> **Last Updated**: 2025-11-22
> **Module**: `@intelgraph/geospatial`
> **Service**: `geotemporal-api`

## Overview

The Geo-Temporal Analytics module provides advanced spatial-temporal analysis capabilities for entity movement patterns, including:

- **Trajectory Analysis** - Path reconstruction and movement metrics
- **Stay-Point Detection** - Identifying locations where entities dwell
- **Co-Presence Detection** - Finding when/where entities were co-located
- **Convoy Detection** - Discovering groups moving together over time

## Architecture

### Stack

- **Backend**: TypeScript + Node.js (ESM)
- **Database**: Neo4j (graph database for geo-observations)
- **API**: Express REST endpoints
- **Package**: `@intelgraph/geospatial` (shared library)
- **Service**: `geotemporal-api` (HTTP API service)

### Data Model

#### Graph Schema (Neo4j)

```cypher
// Nodes
(:Entity {entityId, entityType})
(:Location {id, latitude, longitude, name, countryCode, city, accuracyMeters, elevation})
(:Observation {id, startTime, endTime, sourceSystem, confidence, tags, metadata})

// Relationships
(:Entity)-[:OBSERVED_AT]->(:Observation)
(:Observation)-[:AT_LOCATION]->(:Location)
```

#### Key Types

```typescript
// Geo-temporal observation
interface GeoObservation {
  id: string;
  entityId: string;
  entityType: 'PERSON' | 'DEVICE' | 'VEHICLE' | 'VESSEL' | 'AIRCRAFT' | 'OTHER';
  location: Location;
  startTime: string; // ISO 8601
  endTime: string;
  sourceSystem?: string;
  confidence?: number; // 0-1
  tags?: string[];
}

// Trajectory point
interface TrajectoryPoint {
  observationId: string;
  entityId: string;
  latitude: number;
  longitude: number;
  startTime: string;
  endTime: string;
}

// Stay point
interface StayPoint {
  id: string;
  entityId: string;
  latitude: number;
  longitude: number;
  startTime: string;
  endTime: string;
  radiusMeters: number;
  numObservations: number;
  durationMinutes: number;
}

// Co-presence interval
interface CoPresenceInterval {
  id: string;
  entities: string[];
  startTime: string;
  endTime: string;
  maxDistanceMeters: number;
  overlapDurationMinutes: number;
}

// Convoy
interface Convoy {
  id: string;
  entities: string[];
  startTime: string;
  endTime: string;
  numSteps: number;
  trajectory: Array<{
    stepTime: string;
    centroidLatitude: number;
    centroidLongitude: number;
    entityCount: number;
  }>;
}
```

## Core Algorithms

### 1. Trajectory Building

Constructs ordered movement paths from geo-observations.

**Input**: Unsorted observations for an entity
**Output**: Time-sorted trajectory points

**Algorithm**:
1. Sort observations by `startTime` (ascending), then `endTime`
2. Extract lat/lon for each observation
3. Return ordered sequence of trajectory points

**Usage**:
```typescript
import { buildTrajectory } from '@intelgraph/geospatial';

const trajectory = buildTrajectory(observations);
```

### 2. Stay-Point Detection

Identifies locations where an entity remained stationary.

**Parameters**:
- `radiusMeters` (R): Maximum radius to consider a stay
- `minDurationMinutes` (D): Minimum time to qualify as a stay

**Algorithm**:
1. For each starting point `i` in trajectory:
   - Find longest consecutive window where all points are within `R` meters
   - Calculate time span of window
   - If span ≥ `D` minutes, emit a stay point with:
     - Centroid = mean lat/lon of window points
     - Duration = time span
     - numObservations = window size
2. Advance `i` past detected stay window

**Usage**:
```typescript
import { detectStayPoints } from '@intelgraph/geospatial';

const stayPoints = detectStayPoints(trajectory, {
  radiusMeters: 100,
  minDurationMinutes: 30,
});
```

**Example**: Entity remains within 50m of a cafe for 45 minutes → Stay point detected

### 3. Co-Presence/Rendezvous Detection

Finds when multiple entities were co-located in space and time.

**Parameters**:
- `maxDistanceMeters` (R): Maximum distance between entities
- `minOverlapMinutes` (W): Minimum temporal overlap

**Algorithm** (pairwise):
1. Group observations by entity
2. For each entity pair (A, B):
   - For each observation pair (obsA, obsB):
     - Check temporal overlap: `overlap = min(endA, endB) - max(startA, startB)`
     - If overlap ≥ W:
       - Calculate spatial distance
       - If distance ≤ R: emit co-presence interval
3. Merge overlapping/adjacent intervals for same entity pair

**Usage**:
```typescript
import { detectCoPresence } from '@intelgraph/geospatial';

const intervals = detectCoPresence(observations, {
  maxDistanceMeters: 100,
  minOverlapMinutes: 15,
});
```

**Example**: Person A and Person B both at Grand Central Terminal from 10:15-10:45 AM

### 4. Convoy Detection

Discovers groups of entities moving together over multiple time steps.

**Parameters**:
- `maxDistanceMeters` (R): Maximum distance between group members
- `minGroupSize`: Minimum entities to form a convoy
- `minSteps` (K): Minimum consecutive time steps
- `stepDurationMinutes`: Time discretization interval (default: 15)

**Algorithm**:
1. Discretize time into fixed-duration steps
2. For each time step:
   - Cluster entities by spatial proximity (≤ R meters)
3. Track cluster persistence across consecutive steps
4. Emit convoy if:
   - Group size ≥ `minGroupSize`
   - Persists for ≥ `minSteps` consecutive steps

**Usage**:
```typescript
import { detectConvoys } from '@intelgraph/geospatial';

const convoys = detectConvoys(observations, {
  maxDistanceMeters: 300,
  minGroupSize: 3,
  minSteps: 4,
  stepDurationMinutes: 15,
});
```

**Example**: 5 vehicles travel together on highway for 1 hour → Convoy detected

## API Endpoints

Base URL: `http://localhost:4100/api/geotemporal`

### GET `/entities/:entityId/trajectory`

Get trajectory for an entity.

**Query Parameters**:
- `from` (optional): ISO 8601 start time
- `to` (optional): ISO 8601 end time

**Response**:
```json
{
  "entityId": "E1",
  "trajectory": [
    {
      "observationId": "obs-1",
      "entityId": "E1",
      "latitude": 40.7128,
      "longitude": -74.0060,
      "startTime": "2025-01-01T10:00:00Z",
      "endTime": "2025-01-01T10:15:00Z"
    }
  ],
  "count": 1
}
```

### GET `/entities/:entityId/trajectory/analysis`

Get trajectory with computed metrics (distance, speed).

**Query Parameters**: Same as `/trajectory`

**Response**:
```json
{
  "entityId": "E1",
  "points": [...],
  "totalDistanceMeters": 12453.7,
  "totalDurationMinutes": 120,
  "averageSpeedMetersPerSecond": 1.73,
  "startTime": "2025-01-01T10:00:00Z",
  "endTime": "2025-01-01T12:00:00Z"
}
```

### GET `/entities/:entityId/staypoints`

Detect stay points for an entity.

**Query Parameters**:
- `from` (required): ISO 8601 start time
- `to` (required): ISO 8601 end time
- `radiusMeters` (required): Numeric, e.g., `100`
- `minDurationMinutes` (required): Numeric, e.g., `30`

**Response**:
```json
{
  "entityId": "E1",
  "stayPoints": [
    {
      "id": "sp-1",
      "entityId": "E1",
      "latitude": 40.7128,
      "longitude": -74.0060,
      "startTime": "2025-01-01T10:00:00Z",
      "endTime": "2025-01-01T11:00:00Z",
      "radiusMeters": 100,
      "numObservations": 6,
      "durationMinutes": 60
    }
  ],
  "count": 1,
  "parameters": {
    "radiusMeters": 100,
    "minDurationMinutes": 30
  }
}
```

### POST `/copresence`

Detect co-presence intervals between entities.

**Request Body**:
```json
{
  "entityIds": ["E1", "E2", "E3"],
  "timeRange": {
    "from": "2025-01-01T10:00:00Z",
    "to": "2025-01-01T12:00:00Z"
  },
  "params": {
    "maxDistanceMeters": 100,
    "minOverlapMinutes": 15
  }
}
```

**Response**:
```json
{
  "entityIds": ["E1", "E2", "E3"],
  "timeRange": {...},
  "parameters": {...},
  "intervals": [
    {
      "id": "cp-1",
      "entities": ["E1", "E2"],
      "startTime": "2025-01-01T10:15:00Z",
      "endTime": "2025-01-01T10:45:00Z",
      "maxDistanceMeters": 87.3,
      "overlapDurationMinutes": 30,
      "centroidLatitude": 40.7128,
      "centroidLongitude": -74.0060
    }
  ],
  "count": 1
}
```

### POST `/convoys`

Detect convoys (groups moving together).

**Request Body**:
```json
{
  "entityIds": ["E1", "E2", "E3"], // optional, empty = all entities in timeRange
  "timeRange": {
    "from": "2025-01-01T10:00:00Z",
    "to": "2025-01-01T12:00:00Z"
  },
  "params": {
    "maxDistanceMeters": 300,
    "minGroupSize": 3,
    "minSteps": 4,
    "stepDurationMinutes": 15
  }
}
```

**Response**:
```json
{
  "entityIds": ["E1", "E2", "E3"],
  "timeRange": {...},
  "parameters": {...},
  "convoys": [
    {
      "id": "convoy-1",
      "entities": ["E1", "E2", "E3"],
      "startTime": "2025-01-01T10:00:00Z",
      "endTime": "2025-01-01T11:00:00Z",
      "numSteps": 4,
      "avgDistanceMeters": 125.4,
      "trajectory": [
        {
          "stepTime": "2025-01-01T10:00:00Z",
          "centroidLatitude": 40.7128,
          "centroidLongitude": -74.0060,
          "entityCount": 3
        }
      ]
    }
  ],
  "count": 1
}
```

## Usage Examples

### From TypeScript/Node.js

```typescript
import {
  Neo4jGeoGraphRepository,
  GeoTemporalService,
  InMemoryGeoGraphRepository,
} from '@intelgraph/geospatial';
import neo4j from 'neo4j-driver';

// With Neo4j
const driver = neo4j.driver('bolt://localhost:7687', neo4j.auth.basic('neo4j', 'password'));
const repository = new Neo4jGeoGraphRepository(driver, 'neo4j');
const service = new GeoTemporalService(repository);

// Get trajectory
const trajectory = await service.getTrajectory('E1', {
  from: '2025-01-01T00:00:00Z',
  to: '2025-01-02T00:00:00Z',
});

// Detect stay points
const stayPoints = await service.getStayPoints(
  'E1',
  { from: '2025-01-01T00:00:00Z', to: '2025-01-02T00:00:00Z' },
  { radiusMeters: 100, minDurationMinutes: 30 },
);

// Detect co-presence
const copresence = await service.getCoPresence(
  ['E1', 'E2'],
  { from: '2025-01-01T00:00:00Z', to: '2025-01-02T00:00:00Z' },
  { maxDistanceMeters: 100, minOverlapMinutes: 15 },
);
```

### From cURL

```bash
# Get trajectory
curl "http://localhost:4100/api/geotemporal/entities/E1/trajectory?from=2025-01-01T00:00:00Z&to=2025-01-02T00:00:00Z"

# Detect stay points
curl "http://localhost:4100/api/geotemporal/entities/E1/staypoints?from=2025-01-01T00:00:00Z&to=2025-01-02T00:00:00Z&radiusMeters=100&minDurationMinutes=30"

# Detect co-presence
curl -X POST http://localhost:4100/api/geotemporal/copresence \
  -H "Content-Type: application/json" \
  -d '{
    "entityIds": ["E1", "E2"],
    "timeRange": {
      "from": "2025-01-01T00:00:00Z",
      "to": "2025-01-02T00:00:00Z"
    },
    "params": {
      "maxDistanceMeters": 100,
      "minOverlapMinutes": 15
    }
  }'
```

## Performance Considerations

### Indexing

For Neo4j, create indexes on:
```cypher
CREATE INDEX entity_id IF NOT EXISTS FOR (e:Entity) ON (e.entityId);
CREATE INDEX obs_time IF NOT EXISTS FOR (obs:Observation) ON (obs.startTime, obs.endTime);
CREATE INDEX location_coords IF NOT EXISTS FOR (loc:Location) ON (loc.latitude, loc.longitude);
```

### Query Optimization

1. **Time Range Limits**:
   - Max time window: 1 year (configurable via `GeoTemporalService`)
   - Always provide `from` and `to` for co-presence and convoy queries

2. **Entity Limits**:
   - Max entities per query: 100 (configurable)
   - For large-scale analysis, batch requests or use background jobs

3. **Downsampling**:
   - For long trajectories, consider pre-aggregating observations
   - Use larger `stepDurationMinutes` for convoy detection over long periods

### Recommended Configurations

| Use Case | radiusMeters | minDurationMinutes | maxDistanceMeters | minSteps |
|----------|--------------|-------------------|-------------------|----------|
| Pedestrian stay-points | 50-100 | 10-30 | - | - |
| Vehicle stops | 100-500 | 5-15 | - | - |
| Person-to-person rendezvous | 50-200 | 10-30 | - | - |
| Vehicle convoys | 500-1000 | - | - | 3-5 |
| Pedestrian group movement | 100-300 | - | - | 3-5 |

## Security & Access Control

- All API endpoints should be protected by authentication (not shown in examples)
- Use RBAC/ABAC policies to restrict access to entity observations
- Audit all geo-temporal queries for compliance
- Redact or anonymize sensitive location data per policy

## Testing

```bash
# Run tests for geospatial package
cd packages/geospatial
pnpm test

# Run specific test suites
pnpm test geotemporal-algorithms
pnpm test GeoTemporalService
```

## Deployment

### Environment Variables

```bash
# Neo4j connection
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your-password
NEO4J_DATABASE=neo4j

# Service configuration
PORT=4100
NODE_ENV=production
```

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY packages/geospatial ./packages/geospatial
COPY services/geotemporal-api ./services/geotemporal-api
RUN pnpm install --frozen-lockfile
RUN pnpm build
CMD ["node", "services/geotemporal-api/dist/index.js"]
```

## Future Enhancements

- [ ] Multi-entity co-presence (>2 entities)
- [ ] Geofence event detection
- [ ] Pattern recognition (circular, linear, random movement)
- [ ] GraphQL API support
- [ ] Real-time streaming analytics (Kafka integration)
- [ ] Spatial clustering (DBSCAN, K-means)
- [ ] Predictive trajectory forecasting

## References

- **Haversine Formula**: Distance calculation between lat/lon points
- **Convoy Mining**: [Jeung et al. 2008 - Discovery of Convoys in Trajectory Databases](https://dl.acm.org/doi/10.14778/1453856.1453971)
- **Stay-Point Detection**: [Zheng et al. 2008 - Understanding Mobility Based on GPS Data](https://www.microsoft.com/en-us/research/publication/understanding-mobility-based-on-gps-data/)

---

**For questions or issues, contact**: IntelGraph Engineering Team
