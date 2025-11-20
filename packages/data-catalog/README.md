# Data Catalog

Enterprise-grade data catalog with automated metadata extraction, business glossary management, and semantic search capabilities. The data catalog provides a centralized repository for discovering, understanding, and managing data assets across your organization.

## Features

### Core Capabilities

- **Automated Metadata Extraction**: Discover and catalog data assets from various sources (PostgreSQL, MySQL, MongoDB, APIs, files)
- **Business Glossary**: Manage standardized business terminology and link terms to data assets
- **Data Dictionary**: Maintain comprehensive schema definitions with field-level metadata
- **Tag & Classification System**: Organize assets with customizable tags and data classification levels
- **Search & Discovery**: Advanced full-text search with faceted filtering and semantic search
- **Semantic Metadata Enrichment**: Automatic detection of PII, temporal, and financial data
- **Schema Evolution Tracking**: Track and version schema changes over time
- **Data Lineage**: Discover and visualize data flow between assets
- **Quality Metrics**: Track and monitor data quality dimensions
- **Usage Analytics**: Monitor asset access patterns and popular datasets
- **Asset Certification**: Mark trusted, validated data assets
- **Relationship Management**: Track dependencies and relationships between assets
- **Audit Logging**: Complete audit trail of catalog operations

### Production Features

- Connection pooling for optimal database performance
- Materialized views for fast search operations
- Full-text search with PostgreSQL FTS
- Caching layer for frequently accessed searches
- Bulk operations support
- Transaction support with rollback
- Comprehensive error handling
- Health check endpoints
- TypeScript type safety throughout

## Installation

```bash
npm install @summit/data-catalog
```

## Quick Start

```typescript
import { DataCatalogEngine } from '@summit/data-catalog';

// Initialize the catalog
const catalog = new DataCatalogEngine({
  database: {
    host: 'localhost',
    port: 5432,
    database: 'catalog',
    username: 'catalog_user',
    password: 'password',
  },
  search: {
    enableSemanticSearch: true,
    defaultPageSize: 20,
  },
  glossary: {
    requireApproval: true,
  },
});

// Initialize schema
await catalog.initialize();

// Extract metadata from a database
const result = await catalog.extractMetadata({
  source: {
    type: 'postgres',
    connectionString: 'postgresql://user:pass@host:5432/mydb',
  },
  profileData: true,
});

// Register assets
await catalog.registerAssets(result.assets);

// Search for assets
const searchResults = await catalog.search({
  query: 'customer data',
  types: ['TABLE'],
  classifications: ['CONFIDENTIAL'],
  minQualityScore: 80,
  pagination: {
    page: 1,
    pageSize: 20,
  },
});

// Create a business term
const term = await catalog.createTerm({
  name: 'customer_lifetime_value',
  displayName: 'Customer Lifetime Value',
  definition: 'The predicted net profit attributed to the entire future relationship with a customer',
  domain: 'Customer Analytics',
  steward: 'data-team@example.com',
});

// Link term to assets
await catalog.linkTermToAsset(term.id, assetId);
```

## Core Components

### 1. Metadata Extraction

Automatically discover and extract metadata from various data sources.

```typescript
import { MetadataExtractor } from '@summit/data-catalog';

const extractor = new MetadataExtractor({
  autoProfile: true,
  sampleSize: 1000,
});

// Extract from PostgreSQL
const result = await extractor.extract({
  source: {
    type: 'postgres',
    connectionString: 'postgresql://...',
  },
  scope: {
    schemas: ['public', 'analytics'],
  },
  profileData: true,
});

// Extract with semantic enrichment
const enriched = await extractor.extractWithEnrichment(config);
```

**Supported Sources:**
- PostgreSQL
- MySQL (coming soon)
- MongoDB (coming soon)
- REST APIs (coming soon)
- CSV/Parquet files (coming soon)

**Extracted Metadata:**
- Database schemas and tables
- Column definitions with data types
- Primary and foreign keys
- Indexes and constraints
- Table and column comments
- Sample data
- Data quality metrics

### 2. Asset Discovery

Register, manage, and track data assets throughout their lifecycle.

```typescript
import { AssetDiscovery } from '@summit/data-catalog';

const discovery = new AssetDiscovery({
  pool: dbPool,
  autoDiscoverRelationships: true,
  enableAudit: true,
});

// Register an asset
const asset = await discovery.registerAsset({
  name: 'public.customers',
  displayName: 'Customers',
  type: 'TABLE',
  description: 'Customer master data',
  classification: 'CONFIDENTIAL',
  status: 'ACTIVE',
  owner: 'data-team',
  source: {
    system: 'PostgreSQL',
    database: 'production',
    schema: 'public',
  },
  schema: {
    version: '1.0',
    fields: [
      {
        name: 'customer_id',
        dataType: 'UUID',
        nullable: false,
        isPrimaryKey: true,
      },
      // ... more fields
    ],
  },
});

// Update an asset
await discovery.updateAsset(asset.id, {
  description: 'Updated description',
  updatedBy: 'admin',
});

// List assets with filtering
const { assets, total } = await discovery.listAssets({
  types: ['TABLE', 'VIEW'],
  owner: 'data-team',
  certified: true,
  searchText: 'customer',
}, 50, 0);

// Certify an asset
await discovery.certifyAsset(asset.id, 'data-steward@example.com');

// Add relationships
await discovery.addRelationship({
  sourceId: sourceAssetId,
  targetId: targetAssetId,
  type: 'DERIVED_FROM',
  description: 'Aggregated from',
  createdBy: 'system',
});
```

### 3. Business Glossary

Manage standardized business terminology and link terms to data assets.

```typescript
import { GlossaryManager } from '@summit/data-catalog';

const glossary = new GlossaryManager({
  pool: dbPool,
  requireApproval: true,
  enableVersioning: true,
});

// Create a term
const term = await glossary.createTerm({
  name: 'annual_recurring_revenue',
  displayName: 'Annual Recurring Revenue (ARR)',
  definition: 'The value of recurring revenue normalized to a one-year period',
  domain: 'Finance',
  steward: 'finance-team@example.com',
  synonyms: ['ARR', 'yearly_revenue'],
  status: 'DRAFT',
});

// Approve a term
await glossary.approveTerm(term.id, 'cdo@example.com');

// Search terms
const { terms, total } = await glossary.searchTerms({
  searchText: 'revenue',
  domain: 'Finance',
  status: ['APPROVED'],
}, 20, 0);

// Link term to asset
await glossary.linkToAsset(
  term.id,
  assetId,
  'revenue_field', // optional field name
  1.0, // confidence
  'MANUAL', // link type
  'data-steward'
);

// Get terms for an asset
const assetTerms = await glossary.getTermsForAsset(assetId);

// Get all domains
const domains = await glossary.getDomains();

// Get term version history
const versions = await glossary.getTermVersions(term.id);
```

### 4. Search Engine

Advanced search capabilities with full-text search, faceted filtering, and ranking.

```typescript
import { SearchEngine } from '@summit/data-catalog';

const search = new SearchEngine({
  pool: dbPool,
  enableSemanticSearch: true,
  defaultPageSize: 20,
  enableCache: true,
  cacheTTL: 300,
});

// Search assets
const results = await search.search({
  query: 'customer transaction history',
  types: ['TABLE', 'VIEW'],
  classifications: ['INTERNAL', 'CONFIDENTIAL'],
  owner: 'analytics-team',
  minQualityScore: 75,
  tags: ['pii', 'gdpr'],
  sort: {
    field: 'updated_at',
    order: 'desc',
  },
  pagination: {
    page: 1,
    pageSize: 20,
  },
});

// Get search suggestions
const suggestions = await search.suggest('cust', 10);
// Returns: ['customers', 'customer_orders', 'customer_events', ...]

// Find similar assets
const similar = await search.findSimilar(assetId, 10);

// Get trending assets
const trending = await search.getTrending(10);

// Get recently updated
const recent = await search.getRecentlyUpdated(10);

// Refresh search index
await search.refreshIndex();
```

## Data Types

### DataAsset

```typescript
interface DataAsset {
  id: string;
  name: string;
  displayName: string;
  type: AssetType;
  description: string;
  classification: DataClassification;
  status: AssetStatus;
  source: {
    system: string;
    database?: string;
    schema?: string;
  };
  schema?: Schema;
  owner: string;
  stewards: string[];
  tags: MetadataTag[];
  businessTerms: string[];
  qualityMetrics?: QualityMetrics;
  lineage?: Lineage;
  usageStats?: UsageStatistics;
  customMetadata?: Record<string, any>;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
  lastProfiled?: Date;
  certified?: boolean;
  certifiedBy?: string;
  certifiedAt?: Date;
}
```

### BusinessTerm

```typescript
interface BusinessTerm {
  id: string;
  name: string;
  displayName: string;
  definition: string;
  domain: string;
  relatedTerms: string[];
  synonyms: string[];
  status: 'DRAFT' | 'APPROVED' | 'DEPRECATED';
  steward: string;
  attributes?: Record<string, any>;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
  linkedAssets?: string[];
}
```

### SearchQuery

```typescript
interface SearchQuery {
  query: string;
  types?: AssetType[];
  tags?: string[];
  classifications?: DataClassification[];
  owner?: string;
  domain?: string;
  minQualityScore?: number;
  status?: AssetStatus[];
  filters?: Record<string, any>;
  sort?: {
    field: string;
    order: 'asc' | 'desc';
  };
  pagination?: {
    page: number;
    pageSize: number;
  };
}
```

## Advanced Features

### Schema Evolution Tracking

```typescript
// Schema changes are automatically tracked
const asset = await catalog.getAsset(assetId);
const history = asset.schema?.evolutionHistory;

history.forEach(change => {
  console.log(`Version ${change.version} by ${change.changedBy}`);
  console.log(`Type: ${change.changeType}`);
  console.log(`Breaking: ${change.isBreaking}`);
  change.changes.forEach(c => {
    console.log(`  ${c.field}: ${c.before} -> ${c.after}`);
  });
});
```

### Data Quality Profiling

```typescript
// Profile data during extraction
const result = await catalog.extractMetadata({
  source: { /* ... */ },
  profileData: true,
  sampleSize: 10000,
});

// Access quality metrics
result.assets.forEach(asset => {
  const metrics = asset.qualityMetrics;
  console.log(`Quality Score: ${metrics.overallScore}`);
  console.log(`Accuracy: ${metrics.dimensions.ACCURACY}`);
  console.log(`Completeness: ${metrics.dimensions.COMPLETENESS}`);
  console.log(`Issues: ${metrics.issueCount}`);
});
```

### Semantic Metadata Enrichment

The catalog automatically enriches assets with semantic metadata:

- **PII Detection**: Identifies fields containing personally identifiable information
- **Temporal Data**: Detects time-series and temporal patterns
- **Financial Data**: Identifies monetary and financial fields
- **Data Classification**: Suggests appropriate classification levels

```typescript
const result = await catalog.extractMetadataWithEnrichment(config);

result.assets.forEach(asset => {
  // Check for auto-generated tags
  const piiTag = asset.tags.find(t => t.key === 'contains_pii');
  if (piiTag) {
    console.log(`Asset ${asset.name} contains PII`);
    console.log(`Classification: ${asset.classification}`);
  }
});
```

### Usage Analytics

Track and monitor asset usage patterns:

```typescript
const asset = await catalog.getAsset(assetId);

if (asset.usageStats) {
  console.log(`Total queries: ${asset.usageStats.queryCount}`);
  console.log(`Unique users: ${asset.usageStats.uniqueUsers}`);
  console.log(`Avg daily queries: ${asset.usageStats.avgDailyQueries}`);
  console.log(`Last accessed: ${asset.usageStats.lastAccessed}`);

  // Top users
  asset.usageStats.topUsers.forEach(user => {
    console.log(`  ${user.userName}: ${user.queryCount} queries`);
  });
}
```

## Database Schema

The catalog uses PostgreSQL with the following main tables:

- `catalog_assets`: Data asset registry
- `catalog_relationships`: Asset relationships
- `catalog_events`: Audit log
- `glossary_terms`: Business glossary terms
- `glossary_term_relationships`: Term relationships
- `glossary_term_versions`: Term version history
- `glossary_asset_links`: Term-to-asset links
- `catalog_search_index`: Materialized view for search optimization

## Configuration

### Environment Variables

```bash
# Database
CATALOG_DB_HOST=localhost
CATALOG_DB_PORT=5432
CATALOG_DB_NAME=catalog
CATALOG_DB_USER=catalog_user
CATALOG_DB_PASSWORD=secret

# Search
CATALOG_SEARCH_ENABLE_SEMANTIC=true
CATALOG_SEARCH_PAGE_SIZE=20
CATALOG_SEARCH_CACHE_TTL=300

# Glossary
CATALOG_GLOSSARY_REQUIRE_APPROVAL=true
CATALOG_GLOSSARY_ENABLE_VERSIONING=true
```

### Full Configuration Example

```typescript
const catalog = new DataCatalogEngine({
  database: {
    host: process.env.CATALOG_DB_HOST || 'localhost',
    port: parseInt(process.env.CATALOG_DB_PORT || '5432'),
    database: process.env.CATALOG_DB_NAME || 'catalog',
    username: process.env.CATALOG_DB_USER || 'catalog_user',
    password: process.env.CATALOG_DB_PASSWORD || 'password',
    max: 20,
    idleTimeoutMillis: 30000,
  },
  extractor: {
    autoProfile: true,
    enableSampling: true,
    sampleSize: 1000,
    timeout: 300000,
    batchSize: 100,
  },
  search: {
    enableSemanticSearch: true,
    defaultPageSize: 20,
    maxPageSize: 100,
    enableCache: true,
    cacheTTL: 300,
  },
  glossary: {
    requireApproval: true,
    enableVersioning: true,
  },
  discovery: {
    autoDiscoverRelationships: true,
    enableAudit: true,
  },
});
```

## API Reference

### DataCatalogEngine

Main orchestration class for the data catalog.

#### Methods

- `initialize()`: Initialize the catalog engine
- `extractMetadata(config)`: Extract metadata from a source
- `extractMetadataWithEnrichment(config)`: Extract with semantic enrichment
- `registerAsset(asset)`: Register a single asset
- `registerAssets(assets)`: Bulk register assets
- `updateAsset(id, updates)`: Update an asset
- `getAsset(id)`: Get asset by ID
- `getAssetByName(name)`: Get asset by name
- `deleteAsset(id, deletedBy)`: Delete an asset
- `listAssets(filter, limit, offset)`: List assets with filtering
- `search(query)`: Search for assets
- `suggest(partial, limit)`: Get search suggestions
- `findSimilar(assetId, limit)`: Find similar assets
- `getTrending(limit)`: Get trending assets
- `getRecentlyUpdated(limit)`: Get recently updated assets
- `certifyAsset(assetId, certifiedBy)`: Certify an asset
- `addTags(assetId, tags)`: Add tags to an asset
- `removeTags(assetId, tagIds)`: Remove tags from an asset
- `addRelationship(relationship)`: Add asset relationship
- `getRelationships(assetId)`: Get asset relationships
- `createTerm(term)`: Create a business term
- `updateTerm(id, updates)`: Update a term
- `getTerm(id)`: Get term by ID
- `getTermByName(name)`: Get term by name
- `searchTerms(filter, limit, offset)`: Search terms
- `deleteTerm(id)`: Delete a term
- `approveTerm(id, approvedBy)`: Approve a term
- `deprecateTerm(id, deprecatedBy)`: Deprecate a term
- `linkTermToAsset(termId, assetId, ...)`: Link term to asset
- `unlinkTermFromAsset(termId, assetId, ...)`: Unlink term from asset
- `getTermsForAsset(assetId)`: Get terms for an asset
- `getDomains()`: Get all glossary domains
- `getTermsByDomain(domain)`: Get terms by domain
- `refreshSearchIndex()`: Refresh search index
- `clearSearchCache()`: Clear search cache
- `getStatistics()`: Get catalog statistics
- `healthCheck()`: Perform health check
- `close()`: Close and cleanup

## Best Practices

### 1. Regular Metadata Extraction

Schedule regular metadata extraction to keep the catalog up-to-date:

```typescript
// Run daily at 2 AM
cron.schedule('0 2 * * *', async () => {
  const result = await catalog.extractMetadata(config);
  await catalog.registerAssets(result.assets);
});
```

### 2. Use Business Terms

Link business terms to assets for better discoverability:

```typescript
// Create domain-specific terms
const term = await catalog.createTerm({
  name: 'churn_rate',
  definition: 'Percentage of customers who discontinue service',
  domain: 'Customer Success',
  steward: 'cs-team@example.com',
});

// Link to relevant assets
await catalog.linkTermToAsset(term.id, assetId);
```

### 3. Asset Certification

Certify trusted data assets:

```typescript
// Certify production-ready assets
await catalog.certifyAsset(assetId, 'data-steward@example.com');
```

### 4. Tag Organization

Use consistent tagging strategies:

```typescript
const tags = [
  { key: 'domain', value: 'finance', category: 'business' },
  { key: 'pii', value: 'true', category: 'compliance' },
  { key: 'tier', value: 'gold', category: 'quality' },
];

await catalog.addTags(assetId, tags);
```

### 5. Regular Index Refresh

Refresh search indexes after bulk operations:

```typescript
// After bulk operations
await catalog.registerAssets(manyAssets);
await catalog.refreshSearchIndex();
```

## Performance Considerations

- Use connection pooling (configured by default)
- Enable search caching for frequently accessed queries
- Refresh materialized views during off-peak hours
- Use pagination for large result sets
- Consider batch operations for bulk inserts

## Troubleshooting

### Search Not Finding Assets

```typescript
// Refresh the search index
await catalog.refreshSearchIndex();

// Clear cache if stale
catalog.clearSearchCache();
```

### Slow Queries

```typescript
// Check health
const health = await catalog.healthCheck();
console.log(health);

// Get statistics
const stats = await catalog.getStatistics();
console.log(stats);
```

## License

MIT

## Contributing

Contributions are welcome! Please see the main repository for contribution guidelines.

## Support

For issues and questions, please contact the Summit Data team.
