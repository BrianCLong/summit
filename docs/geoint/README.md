# IntelGraph GEOINT Platform

Military-grade Geospatial Intelligence and Mapping System

## Quick Start

### Installation

```bash
# Install packages
pnpm install

# Start geocoding API
cd services/geocoding-api
pnpm dev

# Start client with maps
cd client
pnpm dev
```

### Basic Usage

```tsx
import { GeospatialDashboard } from '@/components/Map';

function App() {
  return (
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
  );
}
```

## Features

✅ **Geospatial Data Ingestion**
- GeoJSON, KML, Shapefile support
- Multiple coordinate systems
- Metadata enrichment

✅ **Spatial Analysis**
- DBSCAN clustering
- Hotspot detection (Getis-Ord Gi*)
- Point-in-polygon queries
- Distance calculations
- Movement pattern analysis

✅ **Geocoding Services**
- Address geocoding
- Reverse geocoding
- Batch processing
- IP geolocation

✅ **Interactive Maps**
- Leaflet integration
- Marker clusters
- Heatmaps
- GeoJSON layers
- Layer controls
- Real-time updates

✅ **Advanced Visualizations**
- Choropleth maps
- Time-based animations
- 3D terrain support
- Flow maps

## Documentation

- [Geospatial Analysis Guide](./GEOSPATIAL_ANALYSIS.md)
- [API Reference](#api-reference)
- [Examples](#examples)

## Packages

| Package | Description |
|---------|-------------|
| `@intelgraph/geospatial` | Core geospatial data structures and parsers |
| `@intelgraph/spatial-analysis` | Advanced spatial analysis algorithms |
| `@intelgraph/geocoding-api` | Geocoding and IP geolocation service |

## Architecture

```
packages/
├── geospatial/          # Core geospatial package
│   ├── src/
│   │   ├── types/       # TypeScript types
│   │   ├── parsers/     # Format parsers (GeoJSON, KML, Shapefile)
│   │   └── utils/       # Distance calculations
│   └── package.json
│
├── spatial-analysis/    # Spatial analysis algorithms
│   ├── src/
│   │   ├── algorithms/  # Point-in-polygon, geometric queries
│   │   ├── clustering/  # DBSCAN, proximity analysis
│   │   ├── hotspot/     # Getis-Ord hotspot detection
│   │   └── temporal/    # Movement pattern analysis
│   └── package.json
│
services/
└── geocoding-api/       # Geocoding REST API
    ├── src/
    │   ├── routes/      # API endpoints
    │   ├── services/    # Geocoding & IP geolocation
    │   └── server.ts
    └── package.json

client/
└── src/
    └── components/
        └── Map/         # Map components
            ├── MapContainer.tsx
            ├── layers/  # Marker, Heatmap, GeoJSON layers
            ├── controls/# Layer controls
            └── GeospatialDashboard.tsx
```

## License

MIT
