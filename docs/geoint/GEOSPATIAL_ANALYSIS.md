# Geospatial Intelligence and Mapping System

## Overview

The IntelGraph GEOINT (Geospatial Intelligence) platform provides military-grade spatial analysis capabilities with advanced visualization, clustering, hotspot detection, and real-time tracking.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  Client Applications                         │
│  ┌────────────────┐  ┌────────────────┐  ┌───────────────┐ │
│  │ Map Dashboard  │  │ Analysis Tools │  │ Mobile Apps   │ │
│  └────────────────┘  └────────────────┘  └───────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                  API Services Layer                          │
│  ┌────────────────┐  ┌────────────────┐  ┌───────────────┐ │
│  │ Geocoding API  │  │ Spatial API    │  │ Routing API   │ │
│  └────────────────┘  └────────────────┘  └───────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                 Core Packages Layer                          │
│  ┌──────────────────────┐  ┌──────────────────────────────┐ │
│  │ @intelgraph/         │  │ @intelgraph/                 │ │
│  │ geospatial           │  │ spatial-analysis             │ │
│  │                      │  │                              │ │
│  │ • Data Structures    │  │ • DBSCAN Clustering          │ │
│  │ • Format Parsers     │  │ • Hotspot Detection          │ │
│  │ • Distance Utils     │  │ • Movement Analysis          │ │
│  └──────────────────────┘  └──────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│              External Data Sources                           │
│  • OpenStreetMap    • Satellite Imagery   • IP GeoIP        │
│  • Terrain Data     • Address Data        • Custom Sources  │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Geospatial Data Package (@intelgraph/geospatial)

#### Features
- **Multi-format Data Ingestion**
  - GeoJSON parsing and export
  - KML (Keyhole Markup Language) support
  - Shapefile parsing (via shpjs)
  - Custom IntelGraph format with metadata

- **Core Data Types**
  ```typescript
  interface GeoPoint {
    latitude: number;
    longitude: number;
    elevation?: number;
    timestamp?: Date;
    accuracy?: number;
    metadata?: Record<string, unknown>;
  }

  interface IntelFeature extends Feature {
    properties: {
      entityId?: string;
      entityType?: string;
      classification?: string;
      confidence?: number;
      tags?: string[];
    };
  }
  ```

- **Distance Calculations**
  - Haversine distance (fast, ±0.3% accuracy)
  - Vincenty distance (precise, ±0.01% accuracy)
  - 3D distance with elevation
  - Bearing calculations
  - Destination point calculations

#### Usage Examples

```typescript
import { GeoJSONParser, haversineDistance } from '@intelgraph/geospatial';

// Parse GeoJSON
const collection = GeoJSONParser.parse(geojsonString);

// Calculate distance
const nyc = { latitude: 40.7128, longitude: -74.0060 };
const la = { latitude: 34.0522, longitude: -118.2437 };
const distance = haversineDistance(nyc, la); // ~3935 km
```

### 2. Spatial Analysis Package (@intelgraph/spatial-analysis)

#### Point-in-Polygon Queries
```typescript
import { isPointInPolygon, pointsWithinRadius } from '@intelgraph/spatial-analysis';

// Check if point is in polygon
const point = { latitude: 40.7128, longitude: -74.0060 };
const polygon = [[[-74.1, 40.7], [-73.9, 40.7], [-73.9, 40.8], [-74.1, 40.8]]];
const inside = isPointInPolygon(point, polygon);

// Find all points within radius
const nearbyPoints = pointsWithinRadius(points, center, 1000); // 1000m radius
```

#### DBSCAN Clustering
Density-based spatial clustering for identifying groups of related incidents.

```typescript
import { dbscan, findOptimalEpsilon } from '@intelgraph/spatial-analysis';

const points = [
  { latitude: 40.7128, longitude: -74.0060 },
  { latitude: 40.7138, longitude: -74.0070 },
  // ... more points
];

// Find optimal parameters
const epsilon = findOptimalEpsilon(points, 4);

// Perform clustering
const clusters = dbscan(points, epsilon, 3);
// Returns: Array of clusters with centroids, radius, density
```

**Cluster Analysis:**
- **Core Points**: Points with at least minPoints neighbors within epsilon
- **Border Points**: Points within epsilon of core points
- **Noise**: Points that don't belong to any cluster
- **Density**: Points per square meter within cluster

#### Hotspot Detection (Getis-Ord Gi*)
Statistical analysis to identify significant spatial clusters.

```typescript
import { detectHotspots } from '@intelgraph/spatial-analysis';

const incidentPoints = [
  { latitude: 40.7128, longitude: -74.0060, value: 5 },
  { latitude: 40.7138, longitude: -74.0070, value: 8 },
  // ... more incident locations with counts
];

const hotspots = detectHotspots(incidentPoints, 500, 0.05);
// distanceThreshold: 500m, significanceLevel: 0.05 (95% confidence)

hotspots.forEach(hotspot => {
  console.log(`Location: ${hotspot.location.latitude}, ${hotspot.location.longitude}`);
  console.log(`Z-Score: ${hotspot.zScore}`);
  console.log(`P-Value: ${hotspot.pValue}`);
  console.log(`Significance: ${hotspot.significance}`); // high, medium, low, none
});
```

**Interpretation:**
- **Z-Score > +1.96**: Statistically significant hot spot (95% confidence)
- **Z-Score < -1.96**: Statistically significant cold spot (95% confidence)
- **Z-Score > +2.58**: Highly significant (99% confidence)

#### Movement Pattern Analysis
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

// Calculate metrics
const metrics = MovementAnalyzer.calculateMetrics(track);
console.log(`Total Distance: ${metrics.totalDistance}m`);
console.log(`Average Speed: ${metrics.averageSpeed}m/s`);
console.log(`Tortuosity: ${metrics.tortuosity}`); // 1.0 = direct path

// Classify pattern
const pattern = MovementAnalyzer.classifyPattern(track);
console.log(`Pattern: ${pattern.type}`); // linear, circular, random, stationary
console.log(`Confidence: ${pattern.confidence}`);

// Detect stops
const stops = MovementAnalyzer.detectStops(track.points, 50, 300);
// 50m threshold, 300s minimum duration
```

### 3. Geocoding API Service

RESTful API for address geocoding and IP geolocation.

#### Endpoints

**Geocode Address**
```http
GET /api/geocoding/geocode?address=1600+Amphitheatre+Parkway,+Mountain+View,+CA

Response:
{
  "query": "1600 Amphitheatre Parkway, Mountain View, CA",
  "results": [{
    "location": {
      "latitude": 37.4224764,
      "longitude": -122.0842499
    },
    "formattedAddress": "1600 Amphitheatre Pkwy, Mountain View, CA 94043, USA",
    "addressComponents": {
      "streetNumber": "1600",
      "street": "Amphitheatre Parkway",
      "city": "Mountain View",
      "state": "California",
      "country": "United States",
      "postalCode": "94043"
    },
    "confidence": 0.9,
    "source": "nominatim"
  }],
  "count": 1
}
```

**Reverse Geocode**
```http
GET /api/geocoding/reverse?lat=37.4224764&lon=-122.0842499

Response:
{
  "query": { "latitude": 37.4224764, "longitude": -122.0842499 },
  "results": [{
    "location": { "latitude": 37.4224764, "longitude": -122.0842499 },
    "formattedAddress": "1600 Amphitheatre Pkwy, Mountain View, CA 94043",
    "addressComponents": { ... },
    "confidence": 0.9,
    "source": "nominatim",
    "distance": 0
  }]
}
```

**Batch Geocoding**
```http
POST /api/geocoding/batch
Content-Type: application/json

{
  "addresses": [
    "1600 Amphitheatre Parkway, Mountain View, CA",
    "1 Apple Park Way, Cupertino, CA"
  ]
}
```

**IP Geolocation**
```http
GET /api/geocoding/ip/8.8.8.8

Response:
{
  "ip": "8.8.8.8",
  "location": {
    "latitude": 37.386,
    "longitude": -122.0838,
    "country": "US",
    "region": "CA",
    "city": "Mountain View",
    "timezone": "America/Los_Angeles"
  }
}
```

#### Configuration

```bash
# .env
PORT=3003
GEOCODING_PROVIDER=nominatim  # or google, mapbox
GEOCODING_API_KEY=your_api_key_here  # for Google/Mapbox
```

#### Providers
- **Nominatim (OpenStreetMap)**: Free, no API key required
- **Google Maps**: High accuracy, requires API key
- **Mapbox**: Good balance, requires API key

### 4. Map Components (React/Leaflet)

#### MapContainer
Base container with Leaflet integration.

```tsx
import { MapContainer } from '@/components/Map/MapContainer';

<MapContainer
  center={{ latitude: 38.9072, longitude: -77.0369 }}
  zoom={10}
  height="600px"
  onMapReady={(map) => console.log('Map ready', map)}
/>
```

#### Marker Layers
```tsx
import { Marker, MarkerClusterLayer } from '@/components/Map/layers/MarkerLayer';

// Single marker
<Marker
  position={{ latitude: 40.7128, longitude: -74.0060 }}
  title="New York City"
  popup="<strong>NYC</strong><br/>Population: 8.3M"
  onClick={() => console.log('Marker clicked')}
/>

// Clustered markers
<MarkerClusterLayer
  markers={locations.map(loc => ({
    id: loc.id,
    position: loc.position,
    data: loc
  }))}
  onMarkerClick={(id) => handleMarkerClick(id)}
/>
```

#### Heatmap Layer
```tsx
import { HeatmapLayer } from '@/components/Map/layers/HeatmapLayer';

<HeatmapLayer
  points={incidents.map(i => ({
    latitude: i.lat,
    longitude: i.lon,
    intensity: i.severity / 10
  }))}
  radius={25}
  blur={15}
  gradient={{
    0.0: 'blue',
    0.5: 'yellow',
    1.0: 'red'
  }}
/>
```

#### GeoJSON Layer
```tsx
import { GeoJSONLayer, ChoroplethLayer } from '@/components/Map/layers/GeoJSONLayer';

// Basic GeoJSON
<GeoJSONLayer
  data={geojsonData}
  style={{ color: '#3388ff', weight: 2 }}
  onFeatureClick={(feature) => console.log(feature)}
/>

// Choropleth (thematic map)
<ChoroplethLayer
  data={regionData}
  valueProperty="population"
  colorScale={(value) => value > 1000000 ? 'red' : 'blue'}
/>
```

#### Geospatial Dashboard
Comprehensive dashboard with stats, layers, and controls.

```tsx
import { GeospatialDashboard } from '@/components/Map/GeospatialDashboard';

<GeospatialDashboard
  data={{
    incidents: [...],
    entities: [...],
    geofences: {...},
    hotspots: [...]
  }}
  onIncidentClick={(id) => console.log('Incident:', id)}
  onEntityClick={(id) => console.log('Entity:', id)}
/>
```

## Advanced Use Cases

### 1. Crime Analysis
```typescript
// Detect crime hotspots
const crimePoints = incidents.map(i => ({
  latitude: i.location.lat,
  longitude: i.location.lon,
  value: i.severity
}));

const hotspots = detectHotspots(crimePoints, 500);
const highPriority = hotspots.filter(h => h.significance === 'high' && h.zScore > 0);

// Cluster related incidents
const clusters = dbscan(crimePoints, 200, 3);
console.log(`Found ${clusters.length} crime clusters`);
```

### 2. Asset Tracking
```typescript
// Track vehicle movements
const vehicleTrack = {
  id: 'vehicle-001',
  entityId: 'patrol-car-12',
  points: gpsData.map(d => ({
    latitude: d.lat,
    longitude: d.lon,
    timestamp: new Date(d.timestamp)
  })),
  startTime: new Date(gpsData[0].timestamp),
  endTime: new Date(gpsData[gpsData.length - 1].timestamp)
};

const metrics = MovementAnalyzer.calculateMetrics(vehicleTrack);
const stops = metrics.stops;

console.log(`Vehicle traveled ${metrics.totalDistance}m`);
console.log(`Average speed: ${metrics.averageSpeed}m/s`);
console.log(`Stops: ${stops.length}`);
```

### 3. Geofencing & Alerts
```typescript
// Define geofence
const geofence = {
  id: 'secure-zone-1',
  name: 'Restricted Area',
  geometry: {
    type: 'Polygon',
    coordinates: [[
      [-77.1, 38.9],
      [-77.0, 38.9],
      [-77.0, 39.0],
      [-77.1, 39.0],
      [-77.1, 38.9]
    ]]
  },
  type: 'entry',
  enabled: true
};

// Check if entity is in geofence
const entityPosition = { latitude: 38.95, longitude: -77.05 };
const isInside = isPointInPolygon(entityPosition, geofence.geometry.coordinates);

if (isInside) {
  console.log('ALERT: Entity entered restricted area!');
}
```

### 4. Proximity Analysis
```typescript
// Find entities near incident
const incidentLocation = { latitude: 40.7128, longitude: -74.0060 };
const nearbyEntities = pointsWithinRadius(
  entityLocations,
  incidentLocation,
  1000 // 1km radius
);

console.log(`${nearbyEntities.length} entities within 1km of incident`);

// Find k-nearest assets
const nearest = kNearestNeighbors(incidentLocation, assetLocations, 5);
nearest.forEach((asset, i) => {
  console.log(`Asset ${i + 1}: ${asset.distance}m away`);
});
```

## Performance Optimization

### Spatial Indexing
```typescript
import { SpatialIndex } from '@intelgraph/spatial-analysis';

// Create spatial index for fast proximity queries
const index = new SpatialIndex(points, 1000); // 1km cell size

// Fast radius search
const nearby = index.neighborsWithinRadius(target, 500);
```

### Clustering for Large Datasets
Use marker clustering to handle thousands of points:
```tsx
<MarkerClusterLayer
  markers={largeDataset} // Can handle 10k+ markers
  onMarkerClick={handleClick}
/>
```

### Data Simplification
```typescript
import { simplifyPolygon } from '@intelgraph/spatial-analysis';

// Reduce polygon complexity
const simplified = simplifyPolygon(complexPolygon, 0.01); // tolerance
```

## Security Considerations

1. **Data Classification**: All geospatial features support classification metadata
2. **Access Control**: Implement role-based access to sensitive location data
3. **PII Protection**: Anonymize precise locations when displaying aggregated data
4. **Audit Logging**: Track all geofence breaches and location queries
5. **Data Encryption**: Encrypt location data at rest and in transit

## Integration with Graph Analytics

```typescript
// Combine geospatial clustering with entity relationships
const spatialClusters = dbscan(entityLocations, 200, 3);

spatialClusters.forEach(cluster => {
  // Find relationships between entities in same spatial cluster
  const entityIds = cluster.points.map(p => p.entityId);
  const relationships = findRelationships(entityIds);

  console.log(`Cluster ${cluster.id}: ${entityIds.length} entities`);
  console.log(`Found ${relationships.length} relationships`);
});
```

## API Rate Limits

- **Geocoding API**: 100 requests per 15 minutes (configurable)
- **Batch Geocoding**: Maximum 100 addresses per request
- **IP Geolocation**: Unlimited (local database)

## Deployment

### Docker
```dockerfile
# services/geocoding-api/Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3003
CMD ["npm", "start"]
```

### Environment Variables
```bash
# Production configuration
NODE_ENV=production
PORT=3003
GEOCODING_PROVIDER=google
GEOCODING_API_KEY=your_production_key
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
```

## Future Enhancements

1. **3D Terrain Visualization**: Cesium.js integration for 3D maps
2. **Real-time Tracking**: WebSocket-based live location updates
3. **Route Optimization**: Multi-stop routing with constraints
4. **Predictive Analytics**: Machine learning for location prediction
5. **Satellite Imagery**: Integration with satellite data providers
6. **Temporal Analysis**: Time-series analysis of movement patterns

## References

- [Leaflet Documentation](https://leafletjs.com/)
- [Turf.js Documentation](https://turfjs.org/)
- [GeoJSON Specification](https://geojson.org/)
- [Getis-Ord Statistics](https://pro.arcgis.com/en/pro-app/latest/tool-reference/spatial-statistics/h-how-hot-spot-analysis-getis-ord-gi-spatial-stati.htm)
- [DBSCAN Algorithm](https://en.wikipedia.org/wiki/DBSCAN)

## Support

For issues, questions, or feature requests, please contact the IntelGraph GEOINT team.
