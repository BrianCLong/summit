# Satellite Imagery Collection Guide

## Overview

This guide covers satellite imagery collection, tasking, acquisition planning, and data management for the GEOINT platform.

## Table of Contents

1. [Imagery Sources](#imagery-sources)
2. [Collection Planning](#collection-planning)
3. [Tasking and Acquisition](#tasking-and-acquisition)
4. [Quality Criteria](#quality-criteria)
5. [Processing Levels](#processing-levels)
6. [Best Practices](#best-practices)

## Imagery Sources

### Commercial Providers

#### Maxar Technologies
- **Satellites**: WorldView-1/2/3/4, GeoEye-1
- **Resolution**: 0.31m - 0.5m panchromatic
- **Revisit**: Daily for most locations
- **Tasking**: Available with priority levels
- **Best For**: High-resolution urban, infrastructure, detailed analysis

#### Planet Labs
- **Satellites**: SkySat, PlanetScope, RapidEye
- **Resolution**: 0.5m - 5m
- **Revisit**: Daily global coverage
- **Tasking**: SkySat tasking available
- **Best For**: Daily monitoring, agriculture, wide-area surveillance

#### Airbus Defence and Space
- **Satellites**: Pléiades 1A/1B, SPOT 6/7, Vision-1
- **Resolution**: 0.5m - 6m
- **Revisit**: Daily capability
- **Tasking**: Available through OneAtlas
- **Best For**: European coverage, defense applications

### Government/Public Sources

#### Landsat 8/9 (USGS/NASA)
- **Resolution**: 15m panchromatic, 30m multispectral
- **Revisit**: 16 days
- **Cost**: Free
- **Best For**: Large-area monitoring, historical analysis, vegetation

#### Sentinel-2 (ESA Copernicus)
- **Resolution**: 10m - 60m multispectral
- **Revisit**: 5 days (2 satellites)
- **Cost**: Free
- **Best For**: Agriculture, land cover, environmental monitoring

#### Sentinel-1 (ESA Copernicus)
- **Type**: C-band SAR
- **Resolution**: 5m - 40m
- **Revisit**: 6 days
- **Cost**: Free
- **Best For**: All-weather monitoring, maritime surveillance, InSAR

## Collection Planning

### Requirements Definition

Define your collection requirements:

```typescript
interface CollectionRequirement {
  // Mission requirements
  priority: 'routine' | 'priority' | 'immediate' | 'flash';
  intelligence_need: string;

  // Spatial requirements
  area_of_interest: BoundingBox | GeoCoordinate[];
  required_coverage: number; // percentage

  // Temporal requirements
  collection_start: Date;
  collection_end: Date;
  revisit_frequency?: number; // days
  time_of_day?: 'morning' | 'afternoon' | 'any';

  // Quality requirements
  max_cloud_cover: number; // percentage
  min_resolution: number; // meters
  max_off_nadir: number; // degrees

  // Sensor requirements
  required_bands?: string[];
  polarization?: string[]; // for SAR
  imagery_type: 'optical' | 'sar' | 'both';
}
```

### Collection Matrix

Plan collections based on requirements:

| Requirement | Landsat | Sentinel-2 | Planet | Maxar | Sentinel-1 |
|------------|---------|------------|--------|-------|------------|
| Daily monitoring | ❌ | ✅ | ✅ | ✅ | ✅ |
| High resolution | ❌ | ❌ | ⚠️ | ✅ | ❌ |
| All-weather | ❌ | ❌ | ❌ | ❌ | ✅ |
| Free access | ✅ | ✅ | ❌ | ❌ | ✅ |
| Multispectral | ✅ | ✅ | ✅ | ✅ | ❌ |
| Tasking | ❌ | ❌ | ⚠️ | ✅ | ❌ |

### Collection Workflow

1. **Define Requirements**: Specify area, time, quality criteria
2. **Search Archive**: Check existing coverage
3. **Identify Gaps**: Find uncovered areas/times
4. **Plan Collection**: Submit tasking requests if needed
5. **Monitor Status**: Track collection progress
6. **Download Data**: Retrieve collected imagery
7. **Quality Check**: Verify data meets requirements

## Tasking and Acquisition

### Submitting Tasking Requests

```typescript
import { ImageryIngestionService } from '@intelgraph/satellite-imagery';

const taskingRequest: TaskingRequest = {
  request_id: 'task-001',
  requester_id: 'analyst-123',
  priority: CollectionPriority.PRIORITY,
  target_area: {
    north: 40.0,
    south: 39.5,
    east: -104.0,
    west: -104.5
  },
  collection_start: new Date('2024-02-01'),
  collection_end: new Date('2024-02-07'),
  required_resolution: 0.5, // meters
  required_imagery_types: [ImageryType.ELECTRO_OPTICAL],
  max_cloud_cover: 10,
  max_off_nadir: 20,
  intelligence_requirements: [
    'Monitor construction activity',
    'Assess facility utilization'
  ],
  status: 'pending',
  created_at: new Date(),
  updated_at: new Date()
};

const taskingId = await ingestion.submitTasking(taskingRequest);
```

### Monitoring Tasking Status

```typescript
const status = await provider.getTaskingStatus(taskingId);

console.log(`Status: ${status.status}`);
console.log(`Collected: ${status.collected_images?.length || 0} images`);
```

### Collection Priority Levels

- **ROUTINE**: Standard collection, 3-7 days
- **PRIORITY**: Elevated priority, 24-48 hours
- **IMMEDIATE**: High priority, 6-12 hours
- **FLASH**: Emergency, best effort ASAP

## Quality Criteria

### Cloud Cover

Recommended maximum cloud cover by use case:

- **Change Detection**: < 5%
- **Object Detection**: < 10%
- **General Analysis**: < 20%
- **Land Cover**: < 30%

### Resolution Requirements

| Application | Minimum GSD | Recommended |
|------------|-------------|-------------|
| Building detection | 1m | 0.5m |
| Vehicle detection | 0.5m | 0.3m |
| Aircraft identification | 0.5m | 0.3m |
| Infrastructure mapping | 2m | 1m |
| Land use classification | 10m | 5m |
| Agriculture monitoring | 10m | 5m |

### Off-Nadir Angle

- **< 15°**: Minimal geometric distortion, best for mensuration
- **15-30°**: Acceptable for most applications
- **> 30°**: Significant distortion, avoid for precise measurements

### Sun Angle

- **Elevation > 30°**: Good illumination
- **Elevation 20-30°**: Acceptable, more shadows
- **Elevation < 20°**: Poor illumination, long shadows

## Processing Levels

### Optical Imagery

- **L0**: Raw sensor data
- **L1A**: Radiometrically corrected
- **L1B**: Radiometric + basic geometric correction
- **L1C**: Top-of-atmosphere reflectance
- **L2A**: Surface reflectance (atmospherically corrected)
- **L3**: Orthorectified, map-projected

### SAR Imagery

- **L0**: Raw radar data
- **L1 SLC**: Single Look Complex
- **L1 GRD**: Ground Range Detected
- **L2**: Geocoded, calibrated
- **L3**: Analysis-ready products

## Best Practices

### 1. Archive Search First

Always search existing archives before tasking:

```typescript
const existing = await ingestion.searchAll({
  area_of_interest: bbox,
  date_range: { start, end },
  max_cloud_cover: 20
});

if (existing.size === 0) {
  // No existing imagery, submit tasking
  await ingestion.submitTasking(request);
}
```

### 2. Plan for Weather

- Check weather forecasts for collection area
- Consider seasonal cloud patterns
- Plan multiple collection windows
- Use SAR for all-weather requirements

### 3. Optimize Resolution vs. Coverage

- Higher resolution = smaller swath width
- Balance detail needs with area coverage
- Use multi-resolution approach:
  - Wide area: Lower resolution (3-5m)
  - Key targets: Higher resolution (0.5-1m)

### 4. Consider Sun Synchronous Orbits

- Morning orbits (10:00-11:00 local): Good for most applications
- Afternoon orbits: Alternative for shadow analysis
- Avoid very early/late: Poor illumination

### 5. Build Temporal Baseline

For change detection and pattern analysis:
- Collect regular baseline imagery (monthly)
- Increase frequency during events
- Maintain consistent collection parameters

### 6. Multi-Source Collection

Combine sources for comprehensive coverage:

```typescript
// Free sources for baseline monitoring
const sentinel2 = await sentinelProvider.search(query);

// Commercial for detailed analysis
const highRes = await maxarProvider.search({
  ...query,
  min_resolution: 0.5
});

// SAR for all-weather
const sar = await sentinelProvider.search({
  ...query,
  imagery_types: [ImageryType.SAR]
});
```

### 7. Automated Quality Filtering

```typescript
async function filterQuality(
  entries: CatalogEntry[],
  criteria: QualityCriteria
): Promise<CatalogEntry[]> {
  return entries.filter(entry => {
    const acq = entry.metadata.acquisition;

    // Cloud cover
    if (acq.cloud_cover_percentage &&
        acq.cloud_cover_percentage > criteria.max_cloud_cover) {
      return false;
    }

    // Resolution
    const gsd = entry.metadata.sensor.resolution.ground_sample_distance;
    if (gsd > criteria.max_resolution) {
      return false;
    }

    // Off-nadir
    if (acq.off_nadir_angle &&
        acq.off_nadir_angle > criteria.max_off_nadir) {
      return false;
    }

    // Sun elevation
    if (acq.sun_elevation &&
        acq.sun_elevation < criteria.min_sun_elevation) {
      return false;
    }

    return true;
  });
}
```

## Data Management

### Storage Organization

Recommended directory structure:

```
imagery/
├── raw/
│   ├── maxar/
│   ├── planet/
│   └── sentinel/
├── preprocessed/
│   ├── l1c/
│   └── l2a/
├── products/
│   ├── ortho/
│   ├── pansharp/
│   └── mosaics/
└── analysis/
    ├── detections/
    ├── changes/
    └── geoint/
```

### Metadata Management

Store comprehensive metadata:

```typescript
interface ImageryRecord {
  // Core metadata
  image_id: string;
  source: string;
  acquisition_time: Date;

  // Location
  bounding_box: BoundingBox;
  center_point: GeoCoordinate;

  // Quality
  cloud_cover: number;
  quality_score: number;

  // Processing
  processing_level: string;
  preprocessing_applied: string[];

  // Storage
  storage_uri: string;
  file_size_bytes: number;

  // Lineage
  parent_images?: string[];
  derived_products?: string[];

  // Access
  access_restrictions: string[];
  distribution_approved: boolean;
}
```

### Retention Policy

Define retention based on value and cost:

- **Raw imagery**: 90 days (re-download if needed)
- **Preprocessed**: 1 year
- **Analysis products**: 3 years
- **Intelligence products**: Indefinite

### Backup and Redundancy

- Store critical imagery in multiple regions
- Maintain offline backups for key datasets
- Version control for processed products

## Cost Optimization

### 1. Use Free Sources When Possible

```typescript
// Try free sources first
const freeResults = await archive.searchCatalog({
  ...query,
  sources: [ImagerySource.LANDSAT, ImagerySource.SENTINEL]
});

// Only use commercial if insufficient
if (freeResults.total_count === 0) {
  const commercialResults = await archive.searchCatalog({
    ...query,
    sources: [ImagerySource.MAXAR, ImagerySource.PLANET]
  });
}
```

### 2. Optimize Tasking

- Minimize area of interest
- Use lower priority for non-urgent needs
- Batch multiple targets in single tasking
- Consider archive imagery first

### 3. Processing Efficiency

- Process only necessary areas (crop to AOI)
- Use appropriate processing levels
- Cache preprocessed imagery
- Batch process when possible

## Troubleshooting

### Issue: No Imagery Available

**Causes**:
- Area not covered by satellite
- Cloud cover too high
- Outside satellite operating period

**Solutions**:
- Expand time range
- Relax cloud cover threshold
- Try different sensor
- Submit tasking request

### Issue: Poor Image Quality

**Causes**:
- High cloud cover
- Poor atmospheric conditions
- Off-nadir angle too large
- Low sun angle

**Solutions**:
- Apply atmospheric correction
- Filter by quality metrics
- Request new collection
- Use SAR for all-weather

### Issue: Geometric Distortion

**Causes**:
- High off-nadir angle
- Terrain effects
- No orthorectification

**Solutions**:
- Apply orthorectification
- Use DEM for terrain correction
- Filter by off-nadir angle
- Collect nadir imagery

## Support

For collection support:
- Email: imagery-support@intelgraph.com
- Documentation: `/docs/imagery/`
- Tasking requests: Use web portal or API

## Appendix

### Recommended Collection Parameters

#### Urban Infrastructure Monitoring
```typescript
{
  resolution: 0.5,
  cloud_cover: 10,
  off_nadir: 20,
  revisit: 7
}
```

#### Agriculture Monitoring
```typescript
{
  resolution: 10,
  cloud_cover: 30,
  off_nadir: 30,
  revisit: 5,
  bands: ['red', 'nir']
}
```

#### Maritime Surveillance
```typescript
{
  imagery_type: 'sar',
  mode: 'stripmap',
  revisit: 6
}
```

#### Disaster Response
```typescript
{
  priority: 'immediate',
  resolution: 1,
  cloud_cover: 50,
  imagery_type: 'both'
}
```
