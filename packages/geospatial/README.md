# @intelgraph/geospatial

Geospatial intelligence with satellite imagery processing, Neo4j graph storage, and agentic change detection for IntelGraph GEOINT operations. Optimized for denied/degraded network environments with air-gapped caching.

## Features

### Satellite Imagery Processing
- **GDAL Pipeline**: Raster operations, reprojection, tiling, and band math
  - Cloud-Optimized GeoTIFF (COG) conversion
  - XYZ tile generation
  - NDVI/NDWI/NDBI index calculation
  - Mosaic and clip operations

- **Raster/Vector Fusion**: Combine satellite imagery with vector features
  - Overlay fusion with spectral extraction
  - Zonal statistics for polygon features
  - Point sampling with aggregation
  - Segmentation-based analysis

### Change Detection
- **Agentic Change Detection Engine**: Autonomous monitoring for denied environments
  - Spectral differencing
  - NDVI-based vegetation change detection
  - Object-based detection using texture analysis
  - Multi-method ensemble with confidence scoring
  - Scheduled monitoring tasks with alerting

### Neo4j Graph Storage
- **GeoRepository**: Spatial-indexed graph storage for geospatial features
  - Automatic spatial relationship creation
  - Bounding box and proximity queries
  - Change event tracking with provenance
  - Scene and feature lifecycle management

### Air-Gapped Operations
- **Encrypted Caching**: LRU/LFU/Priority eviction with AES-256-GCM encryption
  - Compressed storage with checksum validation
  - Scene and tile prefetching for offline operation
  - Export/import for cache synchronization

### Data Ingestion
- **Format Support**: GeoJSON, KML, Shapefile parsing
- **Core Types**: Comprehensive TypeScript types for GEOINT
  - Satellite scenes and spectral bands
  - Raster tiles with statistics
  - Change detection results
  - Graph nodes and relationships

## Installation

```bash
pnpm add @intelgraph/geospatial
```

### Optional Dependencies

For Neo4j integration:
```bash
pnpm add neo4j-driver
```

For GDAL operations, ensure GDAL is installed on your system:
```bash
# Ubuntu/Debian
apt-get install gdal-bin python3-gdal

# macOS
brew install gdal
```

## Usage

### Satellite Scene Processing

```typescript
import {
  GDALPipeline,
  createGDALPipeline,
  SatelliteScene,
} from '@intelgraph/geospatial';

// Initialize GDAL pipeline
const pipeline = createGDALPipeline('/tmp/gdal-work');
await pipeline.initialize();

// Convert to Cloud-Optimized GeoTIFF
const result = await pipeline.convertToCOG(
  '/data/scene.tif',
  '/data/scene_cog.tif',
  { compression: 'DEFLATE', outputSRS: 'EPSG:4326' }
);

// Calculate NDVI
await pipeline.calculateBandIndex(
  '/data/scene.tif',
  '/data/ndvi.tif',
  'ndvi',
  { red: 4, nir: 5 }
);

// Generate XYZ tiles
await pipeline.generateTiles('/data/scene_cog.tif', '/tiles/scene', {
  minZoom: 8,
  maxZoom: 16,
  format: 'webp',
});
```

### Raster/Vector Fusion

```typescript
import {
  RasterVectorFusion,
  createFusionProcessor,
  FusionConfig,
} from '@intelgraph/geospatial';

const config: FusionConfig = {
  vectorLayers: ['facilities', 'infrastructure'],
  rasterBands: ['red', 'green', 'blue', 'nir'],
  fusionMethod: 'zonal_stats',
  outputType: 'enriched_vectors',
  aggregationMethod: 'mean',
};

const fusion = createFusionProcessor(config);

// Listen for progress
fusion.on('progress', (percent, message) => {
  console.log(`${percent}%: ${message}`);
});

// Execute fusion
const result = await fusion.fuse(scene, vectorFeatures, rasterData);

// Access enriched features with spectral signatures
for (const feature of result.features) {
  console.log(feature.properties.spectralSignature);
  console.log(feature.properties.zonalStats);
}
```

### Change Detection

```typescript
import {
  ChangeDetectionEngine,
  createChangeDetectionEngine,
} from '@intelgraph/geospatial';

const engine = createChangeDetectionEngine({
  methods: ['spectral_differencing', 'ndvi_differencing', 'object_based'],
  minConfidence: 0.7,
  minAreaSqMeters: 100,
  maxCloudCover: 20,
  ensembleThreshold: 2, // At least 2 methods must agree
});

// Listen for detected changes
engine.on('change:detected', (change) => {
  console.log(`Detected ${change.type} at ${change.centroid.latitude}, ${change.centroid.longitude}`);
  console.log(`Confidence: ${change.confidence}, Area: ${change.areaSqMeters}m²`);
});

// Listen for alerts
engine.on('alert:triggered', (changes, message) => {
  console.log(`ALERT: ${message}`);
});

// Detect changes between two scenes
const result = await engine.detectChanges(
  beforeScene,
  afterScene,
  beforeRasterData,
  afterRasterData
);

console.log(`Found ${result.changes.length} changes`);

// Create monitoring task for an AOI
const task = engine.createTask(
  aoiPolygon,
  'monitor',
  'priority',
  {
    changeTypes: ['construction', 'vehicle_movement'],
    revisitIntervalHours: 6,
    alertThreshold: 0.8,
  }
);
```

### Neo4j Graph Storage

```typescript
import {
  GeoRepository,
  createGeoRepository,
  Neo4jConfig,
} from '@intelgraph/geospatial';

const config: Neo4jConfig = {
  uri: 'bolt://localhost:7687',
  user: 'neo4j',
  password: 'password',
  database: 'geospatial',
};

const repo = createGeoRepository(config);
await repo.connect();

// Store extracted feature as graph node
const node = await repo.upsertGeoNode(
  extractedFeature,
  'facility',
  {
    id: 'prov-001',
    source: 'sentinel-2',
    method: 'spectral_classification',
    timestamp: new Date(),
    inputIds: [scene.id],
  }
);

// Create spatial relationships automatically
await repo.createSpatialRelationships(node.nodeId, 1000); // 1km radius

// Query by bounding box
const results = await repo.queryByBbox(
  { minLon: -122.5, minLat: 37.5, maxLon: -122.0, maxLat: 38.0 },
  {
    nodeTypes: ['facility', 'infrastructure'],
    minConfidence: 0.8,
    timeRange: { start: new Date('2024-01-01'), end: new Date() },
  }
);

// Store change detection results
await repo.storeChangeDetectionResult(changeResult);

// Query changes in area
const changes = await repo.getChangesInArea(bbox, timeRange, ['construction']);
```

### Air-Gapped Caching

```typescript
import {
  AirgappedCache,
  createAirgappedCache,
} from '@intelgraph/geospatial';

const cache = createAirgappedCache({
  cacheDir: '/data/geospatial-cache',
  maxSizeBytes: 10 * 1024 * 1024 * 1024, // 10GB
  encryptionKey: process.env.CACHE_ENCRYPTION_KEY, // 32-byte hex key
  compressionEnabled: true,
  evictionPolicy: 'priority', // Critical items never evicted
  checksumValidation: true,
});

await cache.initialize();

// Cache satellite scene metadata
await cache.cacheScene(scene);

// Cache raster tiles for offline use
await cache.cacheTile(scene.id, 'nir', nirTile);

// Prefetch area for offline operation
await cache.prefetchArea(scenesInAOI, ['red', 'green', 'blue', 'nir']);

// Retrieve cached data
const cachedScene = await cache.getScene(sceneId);
const cachedTile = await cache.getTile(sceneId, 'nir', x, y, z);

// Export inventory for sync
const inventory = await cache.exportInventory();

// Get cache statistics
const stats = cache.getStats();
console.log(`Cache: ${stats.totalEntries} entries, ${stats.hitCount} hits, ${stats.missCount} misses`);
```

### Legacy: Parsing and Distance

```typescript
import {
  GeoJSONParser,
  KMLParser,
  ShapefileParser,
  haversineDistance,
  bearing,
} from '@intelgraph/geospatial';

// Parse GeoJSON
const collection = GeoJSONParser.parse(geojsonString);

// Parse KML
const kmlCollection = KMLParser.parse(kmlString);

// Parse Shapefile
const shpCollection = await ShapefileParser.parse(buffer);

// Distance calculations
const distance = haversineDistance(point1, point2); // meters
const bearingDeg = bearing(point1, point2); // degrees
```

## Architecture

```
@intelgraph/geospatial
├── types/
│   ├── geospatial.ts    # Core geospatial types
│   └── satellite.ts     # Satellite imagery types
├── processing/
│   ├── gdal-pipeline.ts      # GDAL operations
│   ├── raster-vector-fusion.ts  # Fusion processor
│   ├── change-detection.ts   # Agentic change detection
│   └── airgapped-cache.ts    # Encrypted caching
├── neo4j/
│   └── geo-repository.ts     # Graph storage
├── parsers/
│   ├── geojson-parser.ts
│   ├── kml-parser.ts
│   └── shapefile-parser.ts
└── utils/
    └── distance.ts
```

## Environment Requirements

- **Node.js**: >= 18.0.0
- **GDAL**: >= 3.0 (for raster processing)
- **Neo4j**: >= 5.0 (optional, for graph storage)

## Testing

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test:coverage

# Run benchmarks
pnpm benchmark
```

## License

MIT
