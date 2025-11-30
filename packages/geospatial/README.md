# @intelgraph/geospatial

Geospatial intelligence data structures, spatial analytics, and ingestion for the IntelGraph platform.

## Features

- **Data Ingestion**: Import data from multiple geospatial formats
  - GeoJSON parsing and export
  - KML (Keyhole Markup Language) support
  - Shapefile parsing
- **Coordinate Intelligence**
  - WGS84 ⇄ UTM projection conversion
  - MGRS encoding/decoding with precision controls
  - Arbitrary projection conversion powered by `proj4`
- **Core Types**: Comprehensive TypeScript types for GEOINT
  - Geographic points with elevation and metadata
  - Intelligence-enriched features and collections
  - Geofencing definitions
  - Movement tracks and spatial clusters
  - Routing and isochrone types
- **Spatial Analytics**
  - Geofence entry/exit/dwell detection
  - Density-based clustering and heatmap generation
  - Movement pattern analytics (speed, dwell, stops)
  - Terrain mesh generation for 3D visualization
- **Data Services**
  - PostGIS query builders for bounding-box, geofence, and route matching
  - In-memory geocoder with caching and reverse geocoding
  - Routing graph with Dijkstra optimization and geofence avoidance
  - Satellite imagery catalog search with coverage scoring

## Installation

```bash
pnpm install @intelgraph/geospatial
```

## Usage

### Coordinate Conversion

```typescript
import { toUTM, toMGRS, mgrsToPoint } from '@intelgraph/geospatial';

const point = { latitude: 38.8977, longitude: -77.0365 };
const utm = toUTM(point);
const mgrs = toMGRS(point);
const backToLatLon = mgrsToPoint(`${mgrs.zone}${mgrs.band}${mgrs.grid}${mgrs.easting}${mgrs.northing}`);
```

### Parsing GeoJSON

```typescript
import { GeoJSONParser } from '@intelgraph/geospatial';

const geojsonString = '{"type": "FeatureCollection", ...}';
const collection = GeoJSONParser.parse(geojsonString);
```

### Spatial Queries (PostGIS)

```typescript
import { buildSpatialQuery } from '@intelgraph/geospatial';

const query = buildSpatialQuery('intel_events', 'geom', {
  bbox: { minLon: -77.2, minLat: 38.8, maxLon: -76.9, maxLat: 39.1 },
  filters: { classification: 'secret', origin: { latitude: 38.9, longitude: -77.0 } },
  maxDistance: 5000,
  limit: 200,
});
```

### Distance Calculations

```typescript
import { haversineDistance, bearing } from '@intelgraph/geospatial';

const point1 = { latitude: 40.7128, longitude: -74.006 }; // NYC
const point2 = { latitude: 34.0522, longitude: -118.2437 }; // LA

const distance = haversineDistance(point1, point2); // meters
const bearingDeg = bearing(point1, point2); // degrees
```

## License

MIT
