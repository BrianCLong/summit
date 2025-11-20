# GEOINT Platform Guide

## Overview

The GEOINT (Geospatial Intelligence) Platform is a comprehensive system for satellite imagery analysis, automated change detection, object recognition, SAR processing, and geospatial intelligence operations at enterprise scale.

## Table of Contents

1. [Architecture](#architecture)
2. [Core Capabilities](#core-capabilities)
3. [Getting Started](#getting-started)
4. [Satellite Imagery](#satellite-imagery)
5. [Object Detection](#object-detection)
6. [Change Detection](#change-detection)
7. [SAR Processing](#sar-processing)
8. [Geospatial Analysis](#geospatial-analysis)
9. [Intelligence Operations](#intelligence-operations)
10. [API Reference](#api-reference)
11. [Best Practices](#best-practices)

## Architecture

The GEOINT Platform consists of several integrated packages and services:

### Packages

- **satellite-imagery**: Core imagery ingestion, preprocessing, and management
- **object-detection**: AI/ML-powered object detection and recognition
- **change-detection**: Temporal analysis and change detection
- **sar-processing**: Synthetic Aperture Radar processing including InSAR
- **geospatial-analysis**: Terrain analysis, viewshed, and mission planning
- **geoint**: Comprehensive intelligence operations and product generation

### Services

- **imagery-service**: REST API for imagery search, download, and tasking
- **geoint-processor**: Processing service for detection and analysis jobs

## Core Capabilities

### 1. Satellite Imagery Ingestion

Support for multiple commercial and government sources:

- **Commercial**: Maxar, Planet, Airbus Defence and Space
- **Government**: Landsat, Sentinel (ESA Copernicus)
- **Sensor Types**: Electro-optical, SAR, Multispectral, Hyperspectral

```typescript
import { ImageryIngestionService, MaxarProvider } from '@intelgraph/satellite-imagery';

const ingestion = new ImageryIngestionService(config);
ingestion.registerProvider(new MaxarProvider(apiKey));

const results = await ingestion.searchAll({
  area_of_interest: bbox,
  date_range: { start, end },
  max_cloud_cover: 20
});
```

### 2. Image Preprocessing

Advanced preprocessing pipeline:

- Atmospheric correction (FLAASH, QUAC, 6S)
- Geometric correction and orthorectification
- Radiometric calibration
- Pan-sharpening (Brovey, IHS, PCA, Wavelet)
- Cloud and shadow removal
- Resolution enhancement

```typescript
import { ImagePreprocessingPipeline } from '@intelgraph/satellite-imagery';

const pipeline = new ImagePreprocessingPipeline();

const result = await pipeline.preprocess(image, {
  atmospheric_correction: true,
  orthorectification: true,
  pan_sharpening: true,
  cloud_removal: true
});
```

### 3. Object Detection

AI-powered detection and classification:

- **Aircraft**: Fighter, bomber, transport, UAV detection
- **Vehicles**: Car, truck, tank, APC counting and tracking
- **Ships**: Maritime vessel detection and identification
- **Buildings**: Building footprint extraction
- **Infrastructure**: Road, runway, storage tank mapping

```typescript
import { ObjectDetectionService } from '@intelgraph/object-detection';

const detector = new ObjectDetectionService(config);

const result = await detector.detectObjects(image, [
  ObjectType.AIRCRAFT,
  ObjectType.VEHICLE,
  ObjectType.SHIP
]);

console.log(`Detected ${result.total_objects} objects`);
```

### 4. Change Detection

Temporal analysis and automated alerts:

- Building construction/destruction
- Infrastructure changes
- Vegetation monitoring
- Disaster damage assessment
- Military activity tracking

```typescript
import { ChangeDetectionService } from '@intelgraph/change-detection';

const changeDetector = new ChangeDetectionService(config);

const changes = await changeDetector.detectChanges(
  referenceImage,
  comparisonImage
);

console.log(`Detected ${changes.total_changes} changes`);
console.log(`Changed area: ${changes.total_area_changed_sqm} m²`);
```

### 5. SAR Processing

Comprehensive radar imagery analysis:

- **InSAR**: Interferometry for displacement measurement
- **Subsidence Detection**: Ground deformation monitoring
- **Coherent Change Detection**: All-weather change detection
- **GMTI**: Ground moving target indication
- **Maritime Surveillance**: Ship detection and tracking
- **Oil Spill Detection**: Environmental monitoring

```typescript
import { SARProcessingService } from '@intelgraph/sar-processing';

const sarProcessor = new SARProcessingService(config);

// InSAR processing
const pair = await sarProcessor.createInSARPair(masterImage, slaveImage);
const interferogram = await sarProcessor.generateInterferogram(pair, config);
const unwrapped = await sarProcessor.unwrapPhase(interferogram, config);
const displacement = await sarProcessor.calculateDisplacement(unwrapped);

// Maritime surveillance
const surveillance = await sarProcessor.maritimeSurveillance(image, bbox);
console.log(`Detected ${surveillance.ships_detected.length} ships`);
```

### 6. Geospatial Analysis

Advanced terrain and mission planning:

- **Terrain Analysis**: Slope, aspect, roughness calculation
- **Viewshed Analysis**: Visibility calculations
- **Line of Sight**: LOS calculations with obstruction detection
- **Mission Planning**: Route planning with terrain analysis
- **Landing Zone Analysis**: Helicopter LZ suitability assessment

```typescript
import { GeospatialAnalysisService } from '@intelgraph/geospatial-analysis';

const geoAnalysis = new GeospatialAnalysisService();

// Viewshed analysis
const viewshed = await geoAnalysis.calculateViewshed(
  dem,
  observerLocation,
  observerHeight,
  maxDistance
);

// Line of sight
const los = await geoAnalysis.calculateLineOfSight(
  dem,
  observer,
  target,
  observerHeight,
  targetHeight
);

console.log(`Target ${los.visible ? 'visible' : 'not visible'}`);
```

### 7. Intelligence Operations

Comprehensive GEOINT capabilities:

- **Pattern of Life Analysis**: Behavioral pattern identification
- **Facility Utilization**: Activity monitoring and assessment
- **Supply Chain Monitoring**: Logistics and throughput analysis
- **Military Readiness**: Readiness indicator tracking
- **Multi-INT Fusion**: IMINT-SIGINT-HUMINT-OSINT integration

```typescript
import { GEOINTIntelligenceService } from '@intelgraph/geoint';

const intelligence = new GEOINTIntelligenceService(
  objectDetection,
  changeDetection
);

// Pattern of life analysis
const pol = await intelligence.analyzePatternOfLife(
  targetId,
  images,
  location
);

console.log(`Identified ${pol.patterns_identified.length} patterns`);
console.log(`Detected ${pol.anomalies.length} anomalies`);

// Facility utilization
const utilization = await intelligence.assessFacilityUtilization(
  facilityId,
  facilityType,
  location,
  images
);

console.log(`Utilization rate: ${utilization.utilization_rate * 100}%`);
```

### 8. Archive and Discovery

Intelligent imagery management:

- Metadata extraction and indexing
- Geospatial and temporal queries
- Collection coverage analysis
- Quality metrics and trending

```typescript
import { ArchiveManagementSystem } from '@intelgraph/geoint';

const archive = new ArchiveManagementSystem();

// Search catalog
const results = await archive.searchCatalog({
  area_of_interest: bbox,
  date_range: { start, end },
  max_cloud_cover: 20,
  min_resolution: 1.0,
  sort_by: 'acquisition_time',
  sort_order: 'desc'
});

// Calculate coverage
const coverage = await archive.calculateCoverage(bbox, timeRange);
console.log(`Coverage: ${coverage.coverage_percentage}%`);
```

## Getting Started

### Installation

```bash
# Install dependencies
pnpm install

# Build packages
pnpm run build
```

### Configuration

Create a `.env` file with your API keys:

```env
# Commercial imagery providers
MAXAR_API_KEY=your_maxar_key
PLANET_API_KEY=your_planet_key
AIRBUS_API_KEY=your_airbus_key

# Storage
S3_BUCKET=geoint-imagery
AWS_REGION=us-east-1

# Processing
USE_GPU=true
WORKERS=4
```

### Running Services

```bash
# Start imagery service
cd services/imagery-service
pnpm start

# Start GEOINT processor
cd services/geoint-processor
pnpm start
```

## API Reference

### Imagery Service

**Base URL**: `http://localhost:3000/api`

#### Search Imagery

```http
POST /imagery/search
Content-Type: application/json

{
  "area_of_interest": {
    "north": 40.0,
    "south": 39.0,
    "east": -104.0,
    "west": -105.0
  },
  "date_range": {
    "start": "2024-01-01T00:00:00Z",
    "end": "2024-01-31T23:59:59Z"
  },
  "max_cloud_cover": 20
}
```

#### Download Imagery

```http
POST /imagery/download
Content-Type: application/json

{
  "source": "maxar",
  "image_id": "abc123",
  "priority": "priority"
}
```

### GEOINT Processor

**Base URL**: `http://localhost:3001/api`

#### Object Detection

```http
POST /detect
Content-Type: application/json

{
  "image_id": "abc123",
  "object_types": ["aircraft", "vehicle", "ship"]
}
```

#### Change Detection

```http
POST /change-detection
Content-Type: application/json

{
  "reference_image_id": "abc123",
  "comparison_image_id": "def456"
}
```

## Best Practices

### 1. Image Selection

- Choose cloud-free imagery (< 10% cloud cover)
- Ensure sufficient spatial resolution for task
- Consider temporal baseline for change detection
- Verify spectral bands availability

### 2. Preprocessing

- Always apply atmospheric correction for multi-temporal analysis
- Use orthorectification for accurate measurements
- Apply pan-sharpening when high resolution is needed
- Remove clouds for cleaner analysis

### 3. Object Detection

- Set appropriate confidence thresholds (0.7-0.8)
- Use GPU acceleration for large-scale processing
- Apply NMS to remove duplicate detections
- Validate results with ground truth

### 4. Change Detection

- Co-register images before comparison
- Use small temporal baseline for better coherence (InSAR)
- Filter seasonal changes if not relevant
- Validate changes with multiple methods

### 5. Intelligence Analysis

- Collect sufficient temporal data (30+ observations)
- Identify baseline patterns before anomaly detection
- Fuse multiple intelligence sources for validation
- Document confidence levels and limitations

## Performance Optimization

### Parallel Processing

```typescript
// Process multiple images in parallel
const results = await Promise.all(
  images.map(image => detector.detectObjects(image))
);
```

### Batch Processing

```typescript
// Configure batch size for GPU processing
const config = {
  batch_size: 16,
  use_gpu: true
};
```

### Caching

```typescript
// Cache preprocessed imagery
const cachedImage = cache.get(imageId);
if (!cachedImage) {
  const processed = await pipeline.preprocess(image);
  cache.set(imageId, processed);
}
```

## Troubleshooting

### Common Issues

**Issue**: Low detection accuracy
- **Solution**: Adjust confidence threshold, retrain model with local data

**Issue**: InSAR low coherence
- **Solution**: Reduce temporal baseline, use persistent scatterer methods

**Issue**: Slow processing
- **Solution**: Enable GPU, increase batch size, use parallel processing

**Issue**: High false positive rate
- **Solution**: Increase NMS threshold, adjust detection thresholds

## Support

For questions and support:
- Documentation: `/docs/geoint/`
- Issues: GitHub Issues
- Email: geoint-support@intelgraph.com

## License

Proprietary - IntelGraph Corporation
