# OSINT Fusion Engine

Autonomous multi-source intelligence fusion with semantic knowledge graph traversal, designed for ODNI-compliant zero-trust, air-gapped data coordination.

## Overview

The OSINT Fusion Engine provides:

- **Multi-Source Fusion**: Aggregates intelligence from social media, domain registries, dark web, public records, and news sources
- **Semantic Graph Traversal**: Neo4j-powered knowledge graph with multi-hop traversal and path finding
- **Hallucination Guards**: Multi-layer validation achieving 85%+ validation rate
- **Air-Gap Compatibility**: Zero-trust architecture supporting disconnected operations
- **Performance**: p95 < 2s query latency with intelligent caching

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      OSINTFusionAgent                           │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────┐    │
│  │   Source    │  │ Hallucination│  │   Graph Traversal   │    │
│  │ Connectors  │  │    Guard     │  │    (Neo4j)          │    │
│  └──────┬──────┘  └──────┬───────┘  └──────────┬──────────┘    │
│         │                │                      │               │
│         ▼                ▼                      ▼               │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    Fusion Pipeline                        │  │
│  │  1. Collect → 2. Extract → 3. Validate → 4. Infer →      │  │
│  │  5. Persist → 6. Enhance → 7. Analyze → 8. Report        │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Quick Start

```typescript
import { createOSINTFusionAgent, OsintFusionQuery } from './agents/osint-fusion';

// Create and initialize agent
const agent = await createOSINTFusionAgent({
  targetValidationRate: 0.85,
  targetP95LatencyMs: 2000,
});

// Define fusion query
const query: OsintFusionQuery = {
  type: 'osint_fusion',
  parameters: {},
  keywords: ['John Doe', 'Acme Corporation'],
  entityTypes: ['person', 'organization'],
  maxResults: 100,
  includeRelationships: true,
  traversalDepth: 3,
};

// Execute fusion
const result = await agent.fuse(query, {
  enableHallucinationGuard: true,
  minCorroboratingSourceCount: 2,
  confidenceThreshold: 0.7,
  maxTraversalDepth: 3,
  enableSemanticMatching: true,
  enableTemporalAnalysis: true,
  airgapMode: false,
  maxLatencyMs: 2000,
});

console.log(`Found ${result.entities.length} entities`);
console.log(`Validation rate: ${(result.metrics.validationRate * 100).toFixed(1)}%`);
```

## Components

### OSINTFusionAgent

The main agent orchestrating multi-source intelligence fusion.

**Capabilities:**
- `multi_source_fusion` - Aggregate data from multiple OSINT sources
- `entity_extraction` - Extract entities from raw intelligence
- `relationship_inference` - Infer relationships between entities
- `semantic_search` - Find entities by embedding similarity
- `temporal_analysis` - Detect temporal patterns
- `risk_assessment` - Identify and assess risks
- `hallucination_detection` - Validate data authenticity
- `graph_traversal` - Multi-hop knowledge graph queries

### HallucinationGuard

Multi-layer validation system preventing fabricated intelligence.

**Validation Checks:**
1. **Source Corroboration** - Requires minimum corroborating sources
2. **Cross-Reference** - Validates against existing entities
3. **Temporal Consistency** - Checks timestamp validity
4. **Semantic Coherence** - Detects gibberish and inconsistencies

**Configuration:**
```typescript
const guard = new HallucinationGuard({
  minCorroboratingSourceCount: 2,  // Minimum unique sources
  confidenceThreshold: 0.7,        // Minimum validation confidence
  temporalToleranceMs: 86400000,   // 24-hour tolerance
  semanticSimilarityThreshold: 0.75,
  enableStrictMode: false,
});
```

### GraphTraversal

Neo4j-powered semantic knowledge graph operations.

**Features:**
- Multi-hop traversal with configurable depth
- Shortest path finding between entities
- Neighborhood expansion
- Semantic similarity search (with/without GDS)
- Centrality computation
- Query result caching

### SourceConnectors

Pluggable adapters for OSINT data sources.

**Available Connectors:**
- `SocialMediaConnector` - Social platform aggregation
- `DomainRegistryConnector` - WHOIS and DNS data
- `DarkWebConnector` - Tor hidden services (requires special config)
- `PublicRecordsConnector` - Government databases
- `NewsMediaConnector` - News article aggregation

## Configuration

### Agent Configuration

```typescript
interface OSINTFusionAgentConfig {
  hallucinationGuard?: Partial<HallucinationGuardConfig>;
  defaultSources?: OsintSourceType[];
  maxConcurrentQueries?: number;
  cacheTtlMs?: number;
  targetValidationRate?: number;  // Default: 0.85
  targetP95LatencyMs?: number;    // Default: 2000
}
```

### Fusion Options

```typescript
interface FusionOptions {
  enableHallucinationGuard: boolean;
  minCorroboratingSourceCount: number;
  confidenceThreshold: number;
  maxTraversalDepth: number;
  enableSemanticMatching: boolean;
  enableTemporalAnalysis: boolean;
  airgapMode: boolean;
  maxLatencyMs: number;
}
```

## Tradeoffs

### Strengths (+)

| Feature | Benefit |
|---------|---------|
| **Edge Resilience** | Full air-gap support enables operation in disconnected/classified environments |
| **Multi-Source Corroboration** | 85%+ validation rate reduces hallucination/fabrication risk |
| **Graph-Native** | Neo4j enables complex relationship queries and path analysis |
| **Provenance Tracking** | Complete audit chain for intelligence accountability |
| **Modular Sources** | Easily add new OSINT sources via connector interface |
| **Caching Layer** | Reduces latency for repeated queries |

### Limitations (-)

| Limitation | Impact | Mitigation |
|------------|--------|------------|
| **Cloud Scale** | Single-node Neo4j limits horizontal scaling | Use Neo4j Cluster or GDS for large deployments |
| **Real-time Feeds** | Batch processing, not streaming | Implement Kafka integration for streaming |
| **Dark Web Access** | Requires Tor proxy configuration | Deploy dedicated onion routing infrastructure |
| **GDS Dependency** | Advanced similarity requires Neo4j GDS | Fallback cosine similarity included |
| **Source Coverage** | Limited to configured connectors | Extend SourceConnector for new sources |

### Performance Characteristics

| Metric | Target | Notes |
|--------|--------|-------|
| Query p95 Latency | < 2s | With warm cache |
| Validation Rate | ≥ 85% | Multi-source entities |
| Cache Hit Rate | > 60% | After warmup |
| Max Traversal Depth | 3 hops | Configurable, impacts latency |
| Concurrent Queries | 5 | Per source type |

## Security Considerations

### Classification Levels

All entities and relationships maintain classification:
- `UNCLASSIFIED`
- `CONFIDENTIAL`
- `SECRET`
- `TOP_SECRET`
- `SCI`
- `SAP`

### Air-Gap Mode

When `airgapMode: true`:
- Only air-gap compatible sources are queried
- Dark web connector is disabled
- Local caches are used
- No external network calls

### Provenance Chain

Every fusion result includes:
- Source checksums
- Transformation audit trail
- Validation records
- Timestamp chain

## API Reference

### createOSINTFusionAgent

```typescript
async function createOSINTFusionAgent(
  config?: OSINTFusionAgentConfig,
  options?: { register?: boolean },
): Promise<OSINTFusionAgent>
```

### OSINTFusionAgent.fuse

```typescript
async fuse(
  query: OsintFusionQuery,
  options?: FusionOptions,
  context?: AgentContext,
): Promise<FusionResult>
```

### OSINTFusionAgent.analyze

```typescript
async analyze(
  query: AgentQuery,
  context: AgentContext,
): Promise<AgentAnalysis>
```

### GraphTraversal.findShortestPaths

```typescript
async findShortestPaths(
  sourceId: string,
  targetId: string,
  maxDepth?: number,
  relationshipTypes?: OsintRelationshipType[],
): Promise<GraphTraversalResult>
```

### HallucinationGuard.validateEntity

```typescript
async validateEntity(
  entity: OsintEntity,
  existingEntities?: OsintEntity[],
): Promise<HallucinationCheckResult>
```

## Testing

```bash
# Run all OSINT fusion tests
pnpm test src/agents/osint-fusion

# Run with coverage
pnpm test --coverage src/agents/osint-fusion
```

## Future Enhancements

1. **Streaming Pipeline** - Kafka-based real-time fusion
2. **ML Entity Resolution** - Neural network deduplication
3. **GDS Integration** - Community detection, Link prediction
4. **Multi-Tenant** - Per-organization isolation
5. **Federated Learning** - Cross-org intelligence sharing

## License

Internal use only. Summit/IntelGraph proprietary.
