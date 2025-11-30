# GEOINT Threat Analysis Platform

> **Multi-INT Fusion Platform for Geospatial Intelligence and Cyber Threat Analysis**

## Overview

The GEOINT Threat Analysis Platform is a comprehensive intelligence fusion system that combines Geospatial Intelligence (GEOINT), Human Intelligence (HUMINT), Signals Intelligence (SIGINT), and Cyber Threat Intelligence (CTI) for proactive threat detection and analysis.

### Key Capabilities

- **3D Terrain Analysis**: Viewshed analysis, line-of-sight calculations, terrain mesh generation
- **Satellite Imagery Analysis**: Feature detection, change detection, anomaly identification
- **Threat Actor Profiling**: Geospatial attribution, infrastructure mapping, activity heatmaps
- **IOC Management**: Full lifecycle management with geospatial enrichment and STIX export
- **Multi-INT Fusion**: Correlation engine fusing GEOINT, HUMINT, SIGINT, OSINT, and CYBERINT
- **Real-time Visualization**: React-based dashboard with interactive 3D mapping

### Performance Targets

- **p95 Query Latency**: < 2 seconds for edge queries
- **Bulk Ingestion**: 500+ IOCs per batch with automatic enrichment
- **Spatial Indexing**: H3-based hexagonal indexing for efficient geospatial queries

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        GEOINT Threat Platform                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │   GEOINT     │  │    IOC       │  │   Fusion     │  │   React     │ │
│  │   Service    │  │  Management  │  │   Service    │  │     UI      │ │
│  │              │  │   Service    │  │              │  │             │ │
│  │ • Viewshed   │  │              │  │ • Multi-INT  │  │ • Dashboard │ │
│  │ • LOS        │  │ • Ingest     │  │ • Pattern    │  │ • Heatmaps  │ │
│  │ • Terrain    │  │ • Enrich     │  │ • Attribute  │  │ • 3D Viz    │ │
│  │ • Satellite  │  │ • Correlate  │  │ • Predict    │  │ • Alerts    │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬──────┘ │
│         │                 │                 │                 │        │
│         └─────────────────┼─────────────────┼─────────────────┘        │
│                           │                 │                          │
│                    ┌──────┴─────────────────┴──────┐                   │
│                    │     Neo4j Graph Database      │                   │
│                    │                               │                   │
│                    │  • Spatial Indexes            │                   │
│                    │  • Threat Actor Nodes         │                   │
│                    │  • IOC Relationships          │                   │
│                    │  • Activity Heatmap (H3)      │                   │
│                    └───────────────────────────────┘                   │
└─────────────────────────────────────────────────────────────────────────┘
```

## ODNI ICD 203 Compliance

This platform follows ODNI ICD 203 (Analytic Standards) guidelines:

### Analytic Tradecraft Standards

| Standard | Implementation |
|----------|----------------|
| **Objectivity** | Confidence scores derived from multiple source types with explicit weighting |
| **Independent of Political Consideration** | Automated correlation removes subjective bias |
| **Timeliness** | Real-time ingestion with p95 < 2s query performance |
| **Based on All Available Sources** | Multi-INT fusion across GEOINT, HUMINT, SIGINT, OSINT, CYBERINT |
| **Properly Describes Quality/Reliability** | NATO reliability scale (A-F) and credibility (1-6) tracking |
| **Properly Caveated** | TLP (Traffic Light Protocol) classification on all intelligence |
| **Properly Sourced** | Full provenance tracking with source attribution |
| **Distinguishes Underlying Intelligence** | Clear separation of raw intelligence vs. analytic assessment |
| **Incorporates Alternative Analysis** | Attribution analysis includes alternative hypotheses and false flag detection |

### Intelligence Community Directives (ICD) Alignment

- **ICD 203**: Analytic Standards implementation
- **ICD 206**: Sourcing Requirements for Disseminated Analytic Products
- **ICD 208**: Minimum Analytic Tradecraft Standards for GEOINT
- **ICD 209**: Tearline Production and Dissemination

### Classification Handling

```typescript
// Supported classification levels
type Classification = 'UNCLASSIFIED' | 'CONFIDENTIAL' | 'SECRET' | 'TOP_SECRET';

// Traffic Light Protocol (TLP) for sharing
type TLP = 'RED' | 'AMBER_STRICT' | 'AMBER' | 'GREEN' | 'WHITE' | 'CLEAR';
```

## Quick Start

### Prerequisites

- Node.js >= 18.18
- Neo4j 5.x
- Docker (optional)

### Installation

```bash
# Install dependencies
pnpm install

# Build the service
pnpm build

# Run in development mode
pnpm dev

# Run tests
pnpm test
```

### Environment Variables

```bash
# Server configuration
PORT=4100

# Neo4j connection
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=devpassword

# CORS
CORS_ORIGIN=*
```

## API Reference

### Health Endpoints

```http
GET /health              # Basic health check
GET /health/ready        # Readiness probe (includes Neo4j)
GET /health/live         # Liveness probe
```

### GEOINT Analysis

```http
POST /api/geoint/threat-data
Content-Type: application/json

{
  "bounds": {
    "minLon": -77.5,
    "minLat": 38.5,
    "maxLon": -76.5,
    "maxLat": 39.5
  }
}
```

```http
POST /api/geoint/terrain/viewshed
Content-Type: application/json

{
  "observer": {
    "latitude": 38.9,
    "longitude": -77.0,
    "elevation": 100
  },
  "maxRadius": 5000,
  "resolution": 30
}
```

```http
POST /api/geoint/terrain/los
Content-Type: application/json

{
  "observer": { "latitude": 38.9, "longitude": -77.0, "elevation": 100 },
  "target": { "latitude": 38.95, "longitude": -77.05, "elevation": 50 }
}
```

### IOC Management

```http
POST /api/ioc
Content-Type: application/json

{
  "type": "IP_ADDRESS",
  "value": "192.168.1.100",
  "severity": "HIGH",
  "confidence": 85,
  "tenantId": "default"
}
```

```http
POST /api/ioc/bulk
Content-Type: application/json

{
  "iocs": [
    { "type": "IP_ADDRESS", "value": "1.1.1.1" },
    { "type": "DOMAIN", "value": "malicious.com" }
  ],
  "options": {
    "enrichmentLevel": "FULL",
    "deduplication": true
  }
}
```

```http
POST /api/ioc/export/stix
Content-Type: application/json

{
  "iocIds": ["ioc-1", "ioc-2", "ioc-3"]
}
```

### Intelligence Fusion

```http
POST /api/geoint/fusion
Content-Type: application/json

{
  "threatActorIds": ["actor-1", "actor-2"],
  "iocIds": ["ioc-1", "ioc-2"],
  "spatialBounds": {
    "minLon": -78,
    "minLat": 38,
    "maxLon": -76,
    "maxLat": 40
  },
  "timeRange": {
    "start": "2024-01-01T00:00:00Z",
    "end": "2024-12-31T23:59:59Z"
  }
}
```

```http
POST /api/intel/report
Content-Type: application/json

{
  "title": "Threat Assessment Report",
  "classification": "UNCLASSIFIED",
  "tlp": "AMBER",
  "sources": [
    {
      "type": "OSINT",
      "reliability": "B",
      "credibility": 2,
      "description": "Open source intelligence"
    }
  ],
  "summary": "Summary of threat activity",
  "content": "Detailed content...",
  "assessment": {
    "threatLevel": "HIGH",
    "confidence": 75
  }
}
```

## Data Models

### Threat Actor (Geospatial)

```typescript
interface GeoThreatActor {
  id: string;
  threatActorId: string;
  name: string;
  aliases: string[];
  attribution: {
    primaryCountry?: string;
    operatingRegions: string[];
    knownLocations: Array<{
      location: GeoPoint;
      locationType: 'HEADQUARTERS' | 'TRAINING_FACILITY' | 'C2_INFRASTRUCTURE' | ...;
      confidence: number;
    }>;
    operationalRadius?: number;
  };
  cyberInfrastructure: Array<{
    type: 'C2_SERVER' | 'PROXY' | 'VPN' | 'HOSTING' | 'DNS';
    ipAddress?: string;
    domain?: string;
    geolocation?: GeoPoint;
    active: boolean;
  }>;
  activityHeatmap?: {
    cells: Array<{ h3Index: string; activityScore: number }>;
    resolution: number;
  };
}
```

### IOC (Indicator of Compromise)

```typescript
interface IOC {
  id: string;
  type: 'IP_ADDRESS' | 'DOMAIN' | 'URL' | 'EMAIL' | 'FILE_HASH_SHA256' | ...;
  value: string;
  severity: 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidence: number;
  tlp: 'RED' | 'AMBER' | 'GREEN' | 'WHITE';
  geolocation?: {
    latitude: number;
    longitude: number;
    country?: string;
    city?: string;
    asn?: string;
  };
  threatActors: string[];
  campaigns: string[];
  firstSeen: string;
  lastSeen: string;
  sightings: number;
}
```

### Fusion Result

```typescript
interface FusionResult {
  id: string;
  fusionType: 'GEOINT_CTI' | 'HUMINT_OSINT' | 'MULTI_INT' | ...;
  correlations: Array<{
    type: string;
    entities: string[];
    confidence: number;
    evidence: string[];
  }>;
  insights: Array<{
    title: string;
    description: string;
    importance: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    actionable: boolean;
    recommendedActions: string[];
  }>;
  threatAssessment: {
    overallThreat: number;
    threatVector?: string;
    potentialTargets: string[];
    mitigationPriority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  };
  geospatialSummary: {
    affectedRegions: string[];
    threatHeatmap: Array<{ h3Index: string; threatScore: number }>;
    criticalInfrastructureAtRisk: Array<{
      name: string;
      type: string;
      location: GeoPoint;
      riskLevel: string;
    }>;
  };
}
```

## Performance Optimization

### Query Optimization Strategies

1. **Spatial Indexing**: Neo4j point indexes for geolocation queries
2. **H3 Hexagonal Indexing**: Efficient heatmap aggregation
3. **Query Caching**: 60-second TTL cache with prefix-based invalidation
4. **Batch Processing**: 500 IOCs per batch for bulk operations
5. **Connection Pooling**: 50 max connections to Neo4j

### Monitoring

```http
GET /api/metrics/query-stats

Response:
{
  "p50Latency": 50,
  "p95Latency": 1500,
  "p99Latency": 1800,
  "cacheHitRate": 0.75,
  "queriesPerSecond": 100,
  "target": {
    "p95LatencyMs": 2000,
    "status": "MEETING_TARGET"
  }
}
```

## Testing

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test:coverage

# Run specific test file
pnpm test -- geoint-service.test.ts
```

### Test Coverage Areas

- **GEOINT Service**: Viewshed, LOS, terrain analysis, satellite imagery
- **IOC Management**: Ingestion, enrichment, correlation, STIX export
- **Fusion Service**: Multi-INT fusion, pattern analysis, attribution
- **Edge Performance**: p95 latency verification tests

## Security Considerations

- All endpoints require authentication (integrate with platform auth)
- TLP classification enforced on all intelligence data
- Audit logging for all mutations
- No secrets in code (use environment variables)
- Input validation using Zod schemas

## Contributing

1. Follow the project conventions in `CLAUDE.md`
2. Run tests before committing: `pnpm test`
3. Run linting: `pnpm lint`
4. Use conventional commits

## License

MIT - See LICENSE file for details.
