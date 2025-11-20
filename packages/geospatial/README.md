# @intelgraph/geospatial

Geospatial intelligence data structures and ingestion for IntelGraph platform.

## Features

- **Data Ingestion**: Import data from multiple geospatial formats
  - GeoJSON parsing and export
  - KML (Keyhole Markup Language) support
  - Shapefile parsing

- **Core Types**: Comprehensive TypeScript types for GEOINT
  - Geographic points with elevation and metadata
  - Intelligence-enriched features and collections
  - Geofencing definitions
  - Movement tracks and spatial clusters
  - Routing and isochrone types

- **Distance Utilities**: Advanced distance calculations
  - Haversine distance (fast)
  - Vincenty distance (accurate)
  - 3D distance with elevation
  - Bearing and destination calculations
  - Centroid computation

## Installation

```bash
pnpm install @intelgraph/geospatial
```

## Usage

### Parsing GeoJSON

```typescript
import { GeoJSONParser } from '@intelgraph/geospatial';

const geojsonString = '{"type": "FeatureCollection", ...}';
const collection = GeoJSONParser.parse(geojsonString);
```

### Parsing KML

```typescript
import { KMLParser } from '@intelgraph/geospatial';

const kmlString = '<?xml version="1.0"?><kml>...</kml>';
const collection = KMLParser.parse(kmlString);
```

### Parsing Shapefiles

```typescript
import { ShapefileParser } from '@intelgraph/geospatial';

const buffer = await fetch('data.shp').then(r => r.arrayBuffer());
const collection = await ShapefileParser.parse(buffer);
```

### Distance Calculations

```typescript
import { haversineDistance, bearing } from '@intelgraph/geospatial';

const point1 = { latitude: 40.7128, longitude: -74.0060 }; // NYC
const point2 = { latitude: 34.0522, longitude: -118.2437 }; // LA

const distance = haversineDistance(point1, point2); // meters
const bearingDeg = bearing(point1, point2); // degrees
```

## License

MIT
