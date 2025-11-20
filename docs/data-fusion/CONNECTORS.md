# IntelGraph Data Fusion and ETL Pipeline

## Overview

The IntelGraph Data Fusion and ETL Pipeline provides comprehensive capabilities for ingesting, transforming, and enriching data from multiple intelligence sources. The system supports:

- **Universal data ingestion** from 13+ source types
- **OSINT integration** with social media, news, and threat intelligence feeds
- **Advanced transformations** including entity extraction, relationship inference, and deduplication
- **Data quality validation** with multi-dimensional scoring
- **Lineage tracking** for full data provenance
- **Incremental updates** with change data capture
- **Export capabilities** to multiple formats and destinations

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Data Sources                                 │
├─────────┬─────────┬──────────┬──────────┬──────────┬────────────┤
│ REST    │ RSS     │ CSV/JSON │ Web      │ Email    │ OSINT      │
│ APIs    │ Feeds   │ /XML     │ Scraping │ IMAP     │ Sources    │
└─────────┴─────────┴──────────┴──────────┴──────────┴────────────┘
           │                     │                    │
           ▼                     ▼                    ▼
┌──────────────────────────────────────────────────────────────────┐
│                      Connectors Layer                             │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐                 │
│  │ Rate       │  │ Auth       │  │ Pagination │                 │
│  │ Limiting   │  │ (OAuth,    │  │ Support    │                 │
│  │            │  │  API Key)  │  │            │                 │
│  └────────────┘  └────────────┘  └────────────┘                 │
└──────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│                  Transformation Pipeline                          │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Schema Mapping → Entity Extraction → Relationship        │   │
│  │ Inference → Deduplication → Temporal Normalization       │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│                   Data Quality Layer                              │
│  ┌───────────┐  ┌────────────┐  ┌──────────┐  ┌──────────┐     │
│  │Completeness│  │ Accuracy   │  │Consistency│  │Timeliness│     │
│  │  Checks    │  │  Scoring   │  │Validation │  │ Tracking │     │
│  └───────────┘  └────────────┘  └──────────┘  └──────────┘     │
└──────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│                    Data Lake / Graph DB                           │
│              (PostgreSQL, Neo4j, Kafka, S3)                      │
└──────────────────────────────────────────────────────────────────┘
```

## Connectors

### Universal Data Ingestion Connectors

#### 1. REST API Connector

Connects to REST APIs with full OAuth2 and API key support.

**Features:**
- OAuth2, API key, bearer token, and basic authentication
- Automatic pagination (offset, cursor, page-based)
- Rate limiting with configurable windows
- Automatic retry with exponential backoff
- JSONPath data extraction

**Configuration Example:**
```typescript
{
  type: 'REST_API',
  config: {
    baseUrl: 'https://api.example.com',
    endpoints: ['/data', '/users'],
    method: 'GET',
    pagination: {
      type: 'offset',
      limitParam: 'limit',
      offsetParam: 'offset',
      pageSize: 100,
      dataPath: 'data.items'
    }
  },
  auth: {
    type: 'api_key',
    apiKey: 'YOUR_API_KEY',
    headerName: 'X-API-Key'
  },
  rateLimit: {
    maxRequests: 100,
    windowMs: 60000
  }
}
```

#### 2. RSS/Atom Feed Connector

Ingests data from RSS and Atom feeds with incremental fetch support.

**Features:**
- Multi-feed support
- Incremental updates based on publication date
- Custom field extraction
- Content and enclosure inclusion

**Configuration Example:**
```typescript
{
  type: 'RSS_FEED',
  config: {
    feedUrls: [
      'https://example.com/rss',
      'https://news.example.com/feed'
    ],
    includeContent: true,
    includeEnclosures: true,
    lastFetchDate: '2024-01-01T00:00:00Z'
  }
}
```

#### 3. File Connectors (CSV/JSON/XML)

Universal file connector with streaming support for large files.

**Features:**
- Streaming for memory-efficient processing
- Custom delimiter and quote character configuration
- JSONPath and XPath for data extraction
- Encoding support (UTF-8, UTF-16, etc.)

**CSV Configuration:**
```typescript
{
  type: 'CSV_FILE',
  config: {
    filePath: '/data/input.csv',
    fileType: 'CSV',
    csvOptions: {
      delimiter: ',',
      columns: true,
      skipEmptyLines: true,
      trim: true
    }
  }
}
```

**JSON Configuration:**
```typescript
{
  type: 'JSON_FILE',
  config: {
    filePath: '/data/input.json',
    fileType: 'JSON',
    jsonOptions: {
      arrayPath: 'data.records'
    }
  }
}
```

#### 4. Web Scraper Connector

Scrapes websites using CSS selectors with pagination and link following.

**Features:**
- CSS selector-based extraction
- Automatic pagination
- Link following with depth control
- Rate limiting to respect robots.txt
- Domain restriction

**Configuration Example:**
```typescript
{
  type: 'WEB_SCRAPER',
  config: {
    urls: ['https://example.com/articles'],
    selectors: {
      title: 'h1.article-title',
      content: 'div.article-content',
      author: 'span.author-name',
      date: 'time.published-date'
    },
    pagination: {
      enabled: true,
      nextPageSelector: 'a.next-page',
      maxPages: 10
    },
    followLinks: {
      enabled: true,
      linkSelector: 'a.article-link',
      maxDepth: 2
    }
  },
  rateLimit: {
    maxRequests: 10,
    windowMs: 60000
  }
}
```

#### 5. Email IMAP Connector

Ingests emails from IMAP servers with attachment extraction.

**Features:**
- IMAP/POP3 support
- TLS encryption
- Search criteria filtering
- Attachment extraction with filtering
- Mark as seen and delete options

**Configuration Example:**
```typescript
{
  type: 'EMAIL_IMAP',
  config: {
    host: 'imap.gmail.com',
    port: 993,
    user: 'user@example.com',
    password: 'password',
    tls: true,
    mailbox: 'INBOX',
    searchCriteria: ['UNSEEN'],
    fetchAttachments: true,
    attachmentFilter: {
      extensions: ['.csv', '.json', '.pdf'],
      maxSizeBytes: 10485760
    },
    markAsSeen: true
  }
}
```

### OSINT Source Connectors

#### 6. NewsAPI Connector

Aggregates news from NewsAPI.org with 80,000+ sources.

**Features:**
- Global news coverage
- Search and filtering
- Source and language selection
- Historical data access

**Configuration:**
```typescript
{
  type: 'NEWS_API',
  config: {
    apiKey: 'YOUR_NEWSAPI_KEY',
    query: 'cybersecurity threat',
    sources: 'bbc-news,cnn,reuters',
    language: 'en',
    from: '2024-01-01',
    to: '2024-12-31'
  }
}
```

#### 7. GDELT Connector

Ingests global event data from GDELT Project.

**Features:**
- Real-time global event monitoring
- Geospatial data
- Tone and themes analysis
- 100+ languages

**Configuration:**
```typescript
{
  type: 'GDELT',
  config: {
    query: 'cyberattack',
    maxRecords: 250,
    timespan: '7d'
  }
}
```

#### 8. Reddit Connector

Ingests posts and comments from Reddit with OAuth2.

**Features:**
- OAuth2 authentication
- Multi-subreddit support
- Sorting options (hot, new, top, rising)
- Pagination support

**Configuration:**
```typescript
{
  type: 'REDDIT',
  config: {
    clientId: 'YOUR_CLIENT_ID',
    clientSecret: 'YOUR_CLIENT_SECRET',
    subreddits: ['cybersecurity', 'netsec', 'blueteamsec'],
    sort: 'hot',
    limit: 100
  }
}
```

#### 9. WHOIS Connector

Performs WHOIS lookups for domain enrichment.

**Features:**
- Bulk domain lookup
- Registrar information
- Registration dates
- Name server details

**Configuration:**
```typescript
{
  type: 'WHOIS',
  config: {
    domains: ['example.com', 'google.com']
  }
}
```

#### 10. DNS Connector

Performs DNS lookups for domain and IP enrichment.

**Features:**
- Multi-record type support (A, AAAA, MX, TXT, NS, CNAME)
- Bulk lookup
- IPv4 and IPv6 support

**Configuration:**
```typescript
{
  type: 'DNS',
  config: {
    domains: ['example.com', 'google.com'],
    recordTypes: ['A', 'AAAA', 'MX', 'TXT']
  }
}
```

#### 11. MISP Connector

Connects to MISP (Malware Information Sharing Platform) for threat intelligence.

**Features:**
- Event search and filtering
- Attribute extraction
- Tag-based filtering
- Timestamp-based incremental fetch

**Configuration:**
```typescript
{
  type: 'MISP',
  config: {
    url: 'https://misp.example.com',
    apiKey: 'YOUR_MISP_API_KEY',
    publishedOnly: true,
    timestamp: '7d'
  }
}
```

## Transformations

### Schema Mapping

Maps data from source schema to target schema with field transformations.

**Configuration:**
```typescript
{
  type: 'NORMALIZE_SCHEMA',
  config: {
    mappings: [
      {
        source: 'user.fullName',
        target: 'person.name',
        transform: 'trim'
      },
      {
        source: 'createdAt',
        target: 'timestamp',
        transform: 'date'
      }
    ],
    removeUnmapped: false,
    strict: false
  }
}
```

### Entity Extraction

Extracts named entities using NLP (Natural Language Processing).

**Supported Entity Types:**
- Person
- Organization
- Location
- Date
- Money
- Email
- Phone Number
- URL
- IP Address
- Domain

**Configuration:**
```typescript
{
  type: 'EXTRACT_ENTITY',
  config: {
    extractPersons: true,
    extractOrganizations: true,
    extractLocations: true,
    extractDates: true,
    extractContacts: true,
    extractIndicators: true,
    minConfidence: 0.7
  }
}
```

### Relationship Inference

Infers relationships between entities based on proximity and patterns.

**Relationship Types:**
- employedBy
- memberOf
- locatedAt
- ownedBy
- partOf
- relatesTo

**Configuration:**
```typescript
{
  type: 'INFER_RELATIONSHIP',
  config: {
    maxDistance: 100,
    usePatterns: true,
    minConfidence: 0.6
  }
}
```

### Deduplication

Removes duplicate records using various strategies.

**Strategies:**
- **hash**: Content-based hashing
- **key**: Key field matching
- **fuzzy**: Fuzzy matching (similarity threshold)

**Configuration:**
```typescript
{
  type: 'DEDUPLICATE',
  config: {
    strategy: 'hash',
    keyFields: ['email', 'id'],
    hashAlgorithm: 'sha256',
    ignoreFields: ['timestamp', 'processedAt']
  }
}
```

### Temporal Normalization

Normalizes date and time fields to consistent format.

**Configuration:**
```typescript
{
  type: 'NORMALIZE_TEMPORAL',
  config: {
    dateFields: ['createdAt', 'updatedAt', 'publishedAt'],
    outputFormat: 'iso',
    timezone: 'UTC',
    handleInvalid: 'null',
    addTimestamp: true,
    timestampField: '_processedAt'
  }
}
```

## Data Quality Validation

### Quality Dimensions

1. **Completeness**: Check for missing required fields
2. **Accuracy**: Validate data format and ranges
3. **Consistency**: Cross-field validation
4. **Timeliness**: Check data freshness
5. **Validity**: Format and type validation
6. **Uniqueness**: Duplicate detection
7. **Credibility**: Source reliability scoring

### Quality Rules

**Example Rules:**
```typescript
{
  id: 'rule-001',
  name: 'Email Required',
  dimension: 'COMPLETENESS',
  field: 'email',
  expression: 'required',
  severity: 'ERROR'
},
{
  id: 'rule-002',
  name: 'Valid Email Format',
  dimension: 'ACCURACY',
  field: 'email',
  expression: 'email',
  severity: 'ERROR'
},
{
  id: 'rule-003',
  name: 'Recent Data',
  dimension: 'TIMELINESS',
  field: 'timestamp',
  expression: 'age:24h',
  severity: 'WARNING'
}
```

## Pipeline Configuration

### Complete Pipeline Example

```typescript
{
  id: 'pipeline-001',
  name: 'News Intelligence Pipeline',
  description: 'Ingest and enrich news articles from multiple sources',
  connectorId: 'connector-news-api',
  transformations: [
    {
      id: 'trans-001',
      name: 'Schema Normalization',
      type: 'NORMALIZE_SCHEMA',
      order: 1,
      enabled: true,
      config: { /* schema mapping config */ }
    },
    {
      id: 'trans-002',
      name: 'Entity Extraction',
      type: 'EXTRACT_ENTITY',
      order: 2,
      enabled: true,
      config: { /* entity extraction config */ }
    },
    {
      id: 'trans-003',
      name: 'Deduplication',
      type: 'DEDUPLICATE',
      order: 3,
      enabled: true,
      config: { /* deduplication config */ }
    }
  ],
  dataQualityRules: [
    { /* quality rules */ }
  ],
  destination: {
    type: 'POSTGRES',
    config: {
      table: 'news_articles',
      upsertKey: 'url'
    }
  },
  status: 'ACTIVE',
  tenantId: 'tenant-001'
}
```

## Usage Examples

### TypeScript API

```typescript
import {
  PipelineOrchestrator,
  ConnectorFactory,
  initializeETL
} from '@intelgraph/etl';

// Initialize ETL system
initializeETL();

// Create connector
const connector = ConnectorFactory.create({
  id: '...',
  name: 'News API Connector',
  type: 'NEWS_API',
  config: { /* config */ },
  auth: { /* auth */ },
  tenantId: 'tenant-001',
  /* ... */
});

// Test connection
await connector.connect();
const isValid = await connector.test();

// Fetch data
for await (const record of connector.fetch()) {
  console.log(record);
}

// Execute pipeline
const orchestrator = new PipelineOrchestrator(pipelineConfig);
await orchestrator.initialize();

const run = await orchestrator.execute({
  maxRecords: 1000,
  batchSize: 100,
  continueOnError: true
});

console.log(`Processed ${run.metrics.recordsProcessed} records`);
```

### Monitoring and Metrics

All pipeline runs emit detailed metrics:

```typescript
orchestrator.on('progress', (progress) => {
  console.log(`Read: ${progress.recordsRead}`);
  console.log(`Processed: ${progress.recordsProcessed}`);
});

orchestrator.on('run-completed', (run) => {
  console.log(`Duration: ${run.metrics.durationMs}ms`);
  console.log(`Throughput: ${run.metrics.throughputRecordsPerSec} rec/sec`);
  console.log(`Error rate: ${run.metrics.errorRate * 100}%`);
});
```

## Data Lineage

The system automatically tracks full data lineage:

```typescript
import { LineageTracker } from '@intelgraph/etl';

const tracker = new LineageTracker(runId);

// Add source node
tracker.addSourceNode('source-1', 'NewsAPI');

// Add transformation nodes
tracker.addTransformationNode('trans-1', 'Entity Extraction');
tracker.addTransformationNode('trans-2', 'Deduplication');

// Add destination node
tracker.addDestinationNode('dest-1', 'PostgreSQL');

// Add edges
tracker.addEdge('source-1', 'trans-1', 'EXTRACT_ENTITY', 1000);
tracker.addEdge('trans-1', 'trans-2', 'DEDUPLICATE', 1000);
tracker.addEdge('trans-2', 'dest-1', undefined, 950);

// Export lineage
const lineage = tracker.getLineage();
const mermaid = tracker.toMermaid();
const dot = tracker.toDot();
```

## Best Practices

1. **Rate Limiting**: Always configure rate limits to respect API quotas
2. **Error Handling**: Use `continueOnError: true` for fault tolerance
3. **Batch Size**: Tune batch size based on memory and throughput requirements
4. **Incremental Updates**: Use watermarks for efficient incremental processing
5. **Data Quality**: Define comprehensive quality rules before production
6. **Monitoring**: Set up alerts on error rates and throughput
7. **Lineage**: Enable lineage tracking for regulatory compliance
8. **Testing**: Test connectors individually before pipeline integration

## Troubleshooting

### Common Issues

**Connector fails to connect:**
- Verify authentication credentials
- Check network connectivity
- Validate API endpoints

**Low throughput:**
- Increase batch size
- Reduce transformation complexity
- Check rate limiting configuration

**High error rate:**
- Review data quality rules
- Check data format consistency
- Validate transformation logic

**Memory issues:**
- Enable streaming for file connectors
- Reduce batch size
- Process data in chunks

## Support

For issues and questions:
- GitHub Issues: https://github.com/intelgraph/summit/issues
- Documentation: https://docs.intelgraph.com
- Email: support@intelgraph.com
