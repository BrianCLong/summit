# @intelgraph/spatial-analysis

Advanced spatial analysis algorithms for IntelGraph GEOINT platform.

## Features

### Geometric Analysis
- Point-in-polygon queries
- Polygon intersection and union
- Buffer generation
- Area and perimeter calculations

### Clustering
- **DBSCAN**: Density-based spatial clustering
- **Proximity Analysis**: K-nearest neighbors, radius searches
- **Spatial Indexing**: Optimized spatial queries

### Hotspot Detection
- **Getis-Ord Gi***: Statistical hotspot analysis
- **Kernel Density Estimation**: Density surface generation
- Hot spot and cold spot identification

### Movement Pattern Analysis
- Movement metrics (speed, distance, tortuosity)
- Stop detection
- Pattern classification (linear, circular, random, stationary)
- Track smoothing
- Periodicity detection

## Installation

```bash
pnpm install @intelgraph/spatial-analysis
```

## Usage

### Point-in-Polygon

```typescript
import { isPointInPolygon } from '@intelgraph/spatial-analysis';

const point = { latitude: 40.7128, longitude: -74.0060 };
const polygon = [[[-74.1, 40.7], [-73.9, 40.7], [-73.9, 40.8], [-74.1, 40.8], [-74.1, 40.7]]];

const inside = isPointInPolygon(point, polygon);
```

### DBSCAN Clustering

```typescript
import { dbscan } from '@intelgraph/spatial-analysis';

const points = [
  { latitude: 40.7128, longitude: -74.0060 },
  { latitude: 40.7138, longitude: -74.0070 },
  // ... more points
];

const clusters = dbscan(points, 100, 3); // 100m epsilon, 3 min points
```

### Hotspot Detection

```typescript
import { detectHotspots } from '@intelgraph/spatial-analysis';

const incidentPoints = [
  { latitude: 40.7128, longitude: -74.0060, value: 5 },
  { latitude: 40.7138, longitude: -74.0070, value: 8 },
  // ... more points with incident counts
];

const hotspots = detectHotspots(incidentPoints, 500); // 500m distance threshold
```

### Movement Analysis

```typescript
import { MovementAnalyzer } from '@intelgraph/spatial-analysis';

const track = {
  id: 'track1',
  entityId: 'entity1',
  points: [
    { latitude: 40.7128, longitude: -74.0060, timestamp: new Date('2025-01-01T10:00:00Z') },
    { latitude: 40.7138, longitude: -74.0070, timestamp: new Date('2025-01-01T10:05:00Z') },
    // ... more track points
  ],
  startTime: new Date('2025-01-01T10:00:00Z'),
  endTime: new Date('2025-01-01T12:00:00Z'),
};

const metrics = MovementAnalyzer.calculateMetrics(track);
const pattern = MovementAnalyzer.classifyPattern(track);
```

## License

MIT
