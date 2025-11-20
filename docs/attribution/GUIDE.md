# Advanced Attribution and Identity Resolution Platform Guide

## Overview

The IntelGraph Attribution and Identity Resolution Platform provides enterprise-grade capabilities for correlating identities across multiple data sources, resolving entities, tracking digital footprints, and establishing attribution for anonymous actors.

## Architecture

### Core Packages

1. **@intelgraph/identity-resolution** - Core entity resolution algorithms
2. **@intelgraph/entity-linking** - Fuzzy matching and record linkage
3. **@intelgraph/digital-footprint** - Cross-platform digital footprint analysis
4. **@intelgraph/attribution-engine** - Confidence scoring and attribution
5. **@intelgraph/behavioral-analysis** - Behavioral biometrics and patterns
6. **@intelgraph/graph-analytics** - Network analysis and graph algorithms

### Services

1. **attribution-service** (Port 3100) - Main attribution REST API
2. **identity-resolution-service** (Port 3101) - Real-time identity resolution

## Getting Started

### Installation

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm -r --filter "@intelgraph/*" run build

# Build services
cd services/attribution-service && pnpm build
cd services/identity-resolution-service && pnpm build
```

### Starting Services

```bash
# Start attribution service
cd services/attribution-service
pnpm start

# Start identity resolution service
cd services/identity-resolution-service
pnpm start
```

## Core Capabilities

### 1. Identity Data Ingestion and Normalization

The platform supports multi-source identity data collection with automatic normalization:

```typescript
import { IdentityResolver, normalizeRecord } from '@intelgraph/identity-resolution';

const resolver = new IdentityResolver({
  matchingThreshold: 0.75,
  autoMergeThreshold: 0.9,
  matchingMethods: ['deterministic', 'probabilistic'],
  fieldWeights: {
    email: 0.95,
    phone: 0.9,
    name: 0.75
  }
});

// Add identity record
const record = {
  id: 'user_123',
  sourceSystem: 'crm',
  entityType: 'person',
  attributes: {
    email: 'john.doe@example.com',
    name: 'John Doe',
    phone: '+1-555-0123'
  },
  metadata: {
    confidence: 0.9,
    dataQuality: 0.85,
    completeness: 0.9,
    freshness: new Date(),
    source: 'customer_database',
    verificationStatus: 'verified'
  },
  createdAt: new Date(),
  updatedAt: new Date()
};

resolver.addRecord(normalizeRecord(record));
```

### 2. Entity Resolution and Record Linkage

Find matching records across datasets:

```typescript
// Find matches for a record
const matches = await resolver.findMatches(record);

// Resolve all records into clusters
const result = await resolver.resolve();

console.log(`Found ${result.clusters.length} entity clusters`);
console.log(`Average confidence: ${result.statistics.averageConfidence}`);
```

### 3. Digital Footprint Analysis

Track and analyze digital footprints across platforms:

```typescript
import { FootprintTracker, FootprintAnalyzer } from '@intelgraph/digital-footprint';

const tracker = new FootprintTracker();
const analyzer = new FootprintAnalyzer();

// Add username to footprint
tracker.addUsername('entity_123', {
  username: 'johndoe',
  platform: 'twitter',
  profileUrl: 'https://twitter.com/johndoe',
  verified: true,
  firstSeen: new Date('2020-01-01'),
  lastSeen: new Date(),
  confidence: 0.95
});

// Add email
tracker.addEmail('entity_123', {
  email: 'john.doe@example.com',
  type: 'personal',
  domain: 'example.com',
  verified: true,
  breached: false,
  firstSeen: new Date('2019-01-01'),
  confidence: 0.9
});

// Analyze footprint
const footprint = tracker.getFootprint('entity_123');
const analysis = analyzer.analyze(footprint);

console.log('Patterns detected:', analysis.patterns);
console.log('Anomalies found:', analysis.anomalies);
console.log('Risk score:', footprint.metadata.riskScore);
```

### 4. Cross-Platform Identity Linking

Link entities across multiple platforms:

```typescript
import { EntityLinker } from '@intelgraph/entity-linking';

const linker = new EntityLinker({
  minConfidence: 0.7,
  maxDistance: 3,
  enableProbabilistic: true,
  evidenceWeights: {
    shared_attribute: 0.8,
    network_connection: 0.7,
    behavioral_similarity: 0.75
  }
});

// Add link between entities
const link = linker.addLink(
  'entity_a',
  'entity_b',
  'same_as',
  [
    {
      source: 'username_correlation',
      type: 'shared_attribute',
      value: { username: 'johndoe' },
      confidence: 0.9,
      timestamp: new Date()
    }
  ]
);

// Discover links automatically
const entities = new Map([
  ['entity_1', { email: 'john@example.com', name: 'John Doe' }],
  ['entity_2', { email: 'john@example.com', username: 'johndoe' }]
]);

const discoveredLinks = await linker.discoverLinks(entities, 'related_to');
```

### 5. Behavioral Biometrics and Analysis

Analyze behavioral patterns:

```typescript
import { BehavioralAnalyzer } from '@intelgraph/behavioral-analysis';

const analyzer = new BehavioralAnalyzer();

const profile = {
  entityId: 'user_123',
  typingPattern: {
    avgKeystrokeDuration: 120,
    avgDwellTime: 80,
    avgFlightTime: 40,
    errorRate: 0.05,
    backspaceFrequency: 0.1,
    uniqueSignature: 'sig_abc123'
  },
  temporalPattern: {
    activeHours: [9, 10, 11, 14, 15, 16],
    timezone: 'America/New_York',
    consistency: 0.85,
    weekdayActivity: [8, 9, 8, 7, 6],
    weekendActivity: [2, 3]
  },
  confidence: 0.9
};

analyzer.addProfile(profile);

// Compare profiles
const similarity = analyzer.compareProfiles('user_123', 'user_456');
```

### 6. Attribution Confidence Scoring

Calculate attribution confidence with multiple factors:

```typescript
import { AttributionEngine } from '@intelgraph/attribution-engine';

const engine = new AttributionEngine();

const attribution = engine.createAttribution(
  'anonymous_actor_xyz',
  'known_entity_abc',
  'hybrid',
  [
    {
      id: 'ev_1',
      type: 'digital_footprint',
      source: 'social_media_analysis',
      value: { username: 'johndoe', platform: 'twitter' },
      strength: 0.85,
      reliability: 0.9,
      timestamp: new Date(),
      metadata: {}
    },
    {
      id: 'ev_2',
      type: 'identity_match',
      source: 'email_correlation',
      value: { email: 'john@example.com' },
      strength: 0.95,
      reliability: 0.95,
      timestamp: new Date(),
      metadata: {}
    }
  ]
);

console.log(`Attribution confidence: ${attribution.confidence}`);
```

### 7. Advanced Graph Analytics

Perform network analysis on identity graphs:

```typescript
import { GraphAnalyzer } from '@intelgraph/graph-analytics';

const graph = {
  nodes: [
    { id: 'user_1', label: 'John Doe', properties: {} },
    { id: 'user_2', label: 'Jane Smith', properties: {} },
    { id: 'user_3', label: 'Bob Wilson', properties: {} }
  ],
  edges: [
    { source: 'user_1', target: 'user_2', type: 'knows', weight: 0.8, properties: {} },
    { source: 'user_2', target: 'user_3', type: 'knows', weight: 0.7, properties: {} }
  ]
};

const analyzer = new GraphAnalyzer(graph);

// Calculate centrality
const degreeCentrality = analyzer.calculateDegreeCentrality();
const betweenness = analyzer.calculateBetweennessCentrality();

// Detect communities
const communities = analyzer.detectCommunities();

// Find shortest path
const path = analyzer.findShortestPath('user_1', 'user_3');
```

## REST API Reference

### Attribution Service (Port 3100)

#### Create Attribution
```
POST /api/v1/attributions
{
  "targetEntity": "anonymous_actor",
  "attributedTo": "known_entity",
  "method": "hybrid",
  "evidence": [...]
}
```

#### Get Attribution
```
GET /api/v1/attributions/:id
```

#### Find Attributions by Target
```
GET /api/v1/attributions/target/:entity
```

#### Get Statistics
```
GET /api/v1/attributions/stats
```

#### Add Identity Record
```
POST /api/v1/identities
{
  "record": {...}
}
```

#### Resolve Identities
```
POST /api/v1/identities/resolve
```

#### Find Matches
```
POST /api/v1/identities/match
{
  "record": {...}
}
```

#### Add to Digital Footprint
```
POST /api/v1/footprints/:entityId/username
{
  "record": {...}
}
```

#### Get Footprint
```
GET /api/v1/footprints/:entityId
```

#### Analyze Footprint
```
POST /api/v1/footprints/:entityId/analyze
```

### Identity Resolution Service (Port 3101)

#### Add Record
```
POST /api/v1/records
{
  "record": {...}
}
```

#### Find Matches
```
POST /api/v1/records/match
{
  "record": {...}
}
```

#### Resolve All
```
POST /api/v1/resolve
```

#### Get Cluster
```
GET /api/v1/clusters/:id
```

#### Deduplicate
```
POST /api/v1/deduplicate
{
  "records": [...],
  "threshold": 0.85
}
```

#### Assess Quality
```
POST /api/v1/quality/assess
{
  "record": {...}
}
```

#### Generate Quality Report
```
POST /api/v1/quality/report
{
  "records": [...]
}
```

## Best Practices

### 1. Data Quality

- Always normalize data before processing
- Validate input data quality
- Set appropriate confidence thresholds
- Handle missing data gracefully

### 2. Privacy and Compliance

- Implement purpose limitation
- Track consent and legal basis
- Apply data retention policies
- Enable audit logging
- Conduct privacy impact assessments

### 3. Performance

- Use batch processing for large datasets
- Implement caching for frequently accessed data
- Monitor service health and performance
- Set appropriate timeout values

### 4. Security

- Use TLS for all communications
- Implement authentication and authorization
- Encrypt sensitive data at rest
- Apply rate limiting
- Regular security audits

## Troubleshooting

### Low Match Rates

- Adjust matching thresholds
- Review field weights
- Improve data normalization
- Check data quality metrics

### High False Positive Rates

- Increase matching threshold
- Add more discriminating fields
- Improve evidence reliability
- Review conflicting evidence

### Performance Issues

- Enable caching
- Use batch operations
- Optimize field weights
- Consider data partitioning

## Support

For issues, questions, or contributions:
- GitHub Issues: [Repository Issues](https://github.com/your-org/intelgraph)
- Documentation: [Full Documentation](https://docs.intelgraph.io)
- Email: support@intelgraph.io
