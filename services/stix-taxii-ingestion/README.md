# STIX 2.1 / TAXII 2.1 Feed Ingestion Service

A comprehensive threat intelligence ingestion service for the IntelGraph platform, providing STIX 2.1/TAXII 2.1 feed ingestion with pgvector semantic search and Neo4j graph storage.

## Features

- **STIX 2.1 Support**: Complete type definitions for all STIX Domain Objects (SDOs), Relationship Objects (SROs), and Cyber Observable Objects (SCOs)
- **TAXII 2.1 Client**: Full-featured client with proxy support for air-gapped environments
- **pgvector Storage**: Semantic IOC search with OpenAI embeddings
- **Neo4j Graph Storage**: Threat actor relationship analysis and graph traversal
- **Agentic Enrichment**: AI-powered enrichment with MITRE ATT&CK mapping
- **Air-Gapped Support**: Offline package export/import for disconnected environments
- **Real-time Sync**: Automatic feed synchronization with state tracking

## Quick Start

```typescript
import {
  createStixIngestionService,
  TaxiiFeedConfig,
} from '@intelgraph/stix-taxii-ingestion';

// Create service
const service = createStixIngestionService({
  postgres: {
    host: 'localhost',
    database: 'intelgraph_dev',
  },
  neo4j: {
    uri: 'bolt://localhost:7687',
  },
  enrichment: {
    enabled: true,
    generateEmbeddings: true,
    mapMitre: true,
  },
});

// Initialize
await service.initialize();

// Register a TAXII feed
const feedConfig: TaxiiFeedConfig = {
  id: 'cisa-known-exploited',
  name: 'CISA Known Exploited Vulnerabilities',
  enabled: true,
  serverUrl: 'https://taxii.example.com',
  apiRoot: '/taxii2/api-root',
  collectionId: 'collection--cisa-kev',
  syncIntervalSeconds: 3600,
  auth: {
    type: 'bearer',
    token: process.env.TAXII_TOKEN,
  },
};

service.registerFeed(feedConfig);

// Sync the feed
const stats = await service.syncFeed(feedConfig, {
  enrich: true,
  storeGraph: true,
  storeVector: true,
});

console.log(`Ingested ${stats.objectsStored} objects`);

// Search IOCs with semantic similarity
const results = await service.searchIOCs({
  query: 'APT29 C2 infrastructure',
  types: ['indicator', 'malware'],
  minConfidence: 70,
  limit: 20,
});

// Get threat actor graph
const actorGraph = await service.getThreatActorGraph('threat-actor--apt29-uuid');

// Clean up
await service.close();
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    STIX Ingestion Service                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────────┐   │
│  │ TAXII Client │   │ Air-Gap Proxy│   │ Direct Ingest    │   │
│  │ (HTTP/SOCKS) │   │ (File-based) │   │ (Bundle Upload)  │   │
│  └──────┬───────┘   └──────┬───────┘   └────────┬─────────┘   │
│         │                  │                     │             │
│         └──────────────────┼─────────────────────┘             │
│                            ▼                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                  Agentic Enrichment                      │   │
│  │  • Embedding Generation (OpenAI)                         │   │
│  │  • MITRE ATT&CK Mapping                                  │   │
│  │  • Risk Score Calculation                                │   │
│  │  • Geolocation / Reputation (optional)                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                            │                                    │
│         ┌──────────────────┼──────────────────┐                │
│         ▼                  ▼                  ▼                │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────────┐      │
│  │  pgvector   │   │   Neo4j     │   │  Event Emitter  │      │
│  │  (IOCs +    │   │  (Graphs +  │   │  (Progress +    │      │
│  │  Embeddings)│   │  Relations) │   │   Callbacks)    │      │
│  └─────────────┘   └─────────────┘   └─────────────────┘      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## API Reference

### StixIngestionService

Main orchestrator for STIX/TAXII feed ingestion.

#### Methods

| Method | Description |
|--------|-------------|
| `initialize()` | Initialize storage backends |
| `registerFeed(config)` | Register a TAXII feed |
| `unregisterFeed(feedId)` | Unregister a feed |
| `syncFeed(config, options)` | Sync a feed from TAXII server |
| `ingestBundle(bundle, feedId, feedName)` | Ingest a STIX bundle directly |
| `importAirgapPackage(filepath)` | Import from air-gapped package |
| `exportToAirgap(config, objects)` | Export to air-gapped package |
| `searchIOCs(options)` | Search IOCs with semantic similarity |
| `getThreatActorGraph(actorId)` | Get threat actor relationship graph |
| `findPaths(sourceId, targetId)` | Find paths between entities |
| `getStats()` | Get service statistics |
| `close()` | Close all connections |

### TaxiiClient

TAXII 2.1 protocol client with proxy support.

```typescript
import { createTaxiiClient } from '@intelgraph/stix-taxii-ingestion';

const client = createTaxiiClient({
  serverUrl: 'https://taxii.example.com',
  apiRoot: '/taxii2/api-root',
  auth: {
    type: 'basic',
    username: 'user',
    password: 'pass',
  },
  proxy: {
    type: 'socks5',
    host: 'proxy.internal',
    port: 1080,
  },
  timeout: 30000,
  verifySsl: true,
});

// Discover server
const discovery = await client.discover();

// Get collections
const collections = await client.getCollections();

// Fetch objects
const objects = await client.getAllObjects('collection-id', {
  added_after: '2024-01-01T00:00:00Z',
});
```

### AirgapProxy

File-based ingestion for air-gapped environments.

```typescript
import { createAirgapProxy } from '@intelgraph/stix-taxii-ingestion';

const proxy = createAirgapProxy({
  exportDir: '/mnt/transfer/export',
  importDir: '/mnt/transfer/import',
  maxPackageAgeHours: 72,
});

// External side: Create export package
const pkg = await proxy.createExportPackage(feedConfig, objects);
const filepath = await proxy.writeExportPackage(pkg);

// Air-gapped side: Import package
const result = await proxy.importPackage(filepath);
```

### AgenticEnricher

AI-powered enrichment pipeline.

```typescript
import { createAgenticEnricher } from '@intelgraph/stix-taxii-ingestion';

const enricher = createAgenticEnricher({
  openaiApiKey: process.env.OPENAI_API_KEY,
  generateEmbeddings: true,
  mapMitre: true,
  embeddingModel: 'text-embedding-3-small',
});

// Enrich single object
const result = await enricher.enrich(indicator, metadata);
console.log(result.embedding); // Vector embedding
console.log(result.enrichments.mitreMappings); // MITRE techniques
console.log(result.enrichments.riskScore); // 0-100 risk score

// Batch enrichment
const results = await enricher.enrichBatch(objects);
```

## Storage Backends

### pgvector (PostgreSQL)

Stores IOCs with vector embeddings for semantic search.

```sql
-- Schema
CREATE TABLE stix_iocs (
  id UUID PRIMARY KEY,
  stix_id TEXT UNIQUE NOT NULL,
  stix_type TEXT NOT NULL,
  value TEXT,
  pattern TEXT,
  embedding vector(1536),
  feed_id TEXT NOT NULL,
  -- ... additional fields
);

-- Semantic search
SELECT *, 1 - (embedding <=> $1) as similarity
FROM stix_iocs
WHERE embedding IS NOT NULL
ORDER BY similarity DESC
LIMIT 10;
```

### Neo4j

Stores STIX objects and relationships for graph analysis.

```cypher
// Threat actor graph query
MATCH (actor:ThreatActor {stix_id: $actorId})
OPTIONAL MATCH (actor)-[:USES|TARGETS|ATTRIBUTED_TO*1..2]-(related)
RETURN actor, collect(related) as related

// Path finding
MATCH path = shortestPath(
  (a:StixObject {stix_id: $source})-[*1..4]-(b:StixObject {stix_id: $target})
)
RETURN path
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `POSTGRES_HOST` | PostgreSQL host | `localhost` |
| `POSTGRES_PORT` | PostgreSQL port | `5432` |
| `POSTGRES_DB` | PostgreSQL database | `intelgraph_dev` |
| `POSTGRES_USER` | PostgreSQL user | `intelgraph` |
| `POSTGRES_PASSWORD` | PostgreSQL password | `devpassword` |
| `NEO4J_URI` | Neo4j connection URI | `bolt://localhost:7687` |
| `NEO4J_USER` | Neo4j username | `neo4j` |
| `NEO4J_PASSWORD` | Neo4j password | `devpassword` |
| `OPENAI_API_KEY` | OpenAI API key for embeddings | - |

## Testing

```bash
# Run tests
pnpm test

# Run with coverage
pnpm test -- --coverage

# Run benchmarks
pnpm test:benchmark
```

## Benchmarks

Typical performance on modern hardware:

| Operation | Throughput |
|-----------|------------|
| Pattern extraction | ~500k/sec |
| MITRE mapping | ~200k/sec |
| Risk calculation | ~1M/sec |
| Object processing | ~50k/sec |
| Batch ingestion (w/enrichment) | ~1k/sec |
| Semantic search | <50ms |

## MITRE ATT&CK Mapping

The enricher automatically maps indicators to MITRE ATT&CK techniques based on:
- Pattern keywords (phishing, powershell, ransomware, etc.)
- Explicit external references in STIX objects
- Description text analysis

Supported techniques include T1566 (Phishing), T1059 (Command and Scripting), T1078 (Valid Accounts), T1486 (Data Encrypted for Impact), and many more.

## Air-Gapped Deployment

For disconnected environments:

1. **External Side**: Sync feeds and export packages
   ```typescript
   const objects = await client.getAllObjects(collectionId);
   const filepath = await proxy.writeExportPackage(
     await proxy.createExportPackage(feedConfig, objects)
   );
   // Transfer file to air-gapped network
   ```

2. **Air-Gapped Side**: Import packages
   ```typescript
   const result = await service.importAirgapPackage('/mnt/import/package.json');
   ```

## License

PROPRIETARY - IntelGraph Platform
