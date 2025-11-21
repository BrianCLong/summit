# Data Catalog and Metadata Management Platform

## Overview

The Summit Data Catalog is an enterprise-grade metadata management platform designed for intelligence operations. It provides comprehensive data discovery, semantic search, collaborative documentation, and advanced lineage tracking that surpasses specialized catalog tools like Alation, Collibra, and Atlan.

## Key Capabilities

### 🔍 Automated Metadata Discovery
- Schema extraction from PostgreSQL, MySQL, MongoDB, Neo4j
- File and object metadata harvesting from S3, HDFS
- API endpoint discovery and profiling
- Automated data quality scoring
- Sample data collection with privacy controls
- Relationship inference and dependency mapping
- Scheduled discovery jobs with error handling

### 📚 Business Glossary
- Centralized term definitions with hierarchical taxonomy
- Multi-step approval workflows
- Version control for term definitions
- Synonyms and related term linking
- Business rules and validation documentation
- Cross-reference linking to data assets
- Domain expertise capture

### 🔎 Semantic Search
- Full-text search across all metadata
- Faceted search and filtering (type, status, domain, owner)
- Advanced relevance ranking with multiple signals
- Query suggestions and auto-complete
- Search analytics and optimization
- Saved and shared searches
- Context-aware natural language queries

### 📊 Data Lineage Visualization
- End-to-end lineage tracking from source to consumption
- Column-level lineage for critical fields
- Interactive visual lineage graphs
- Impact analysis for change management
- Dependency tracking across systems
- Transformation visibility with SQL/code
- Time-based historical lineage
- Export capabilities for documentation

### ✅ Data Quality & Trust Indicators
- Multi-dimensional quality scores (completeness, accuracy, consistency, timeliness)
- Certification badges (Bronze, Silver, Gold, Platinum)
- User ratings and reviews
- Usage statistics and trending indicators
- Freshness and update frequency tracking
- Completeness metrics for metadata coverage
- Trust signals with verification tracking

### 📝 Collaborative Documentation
- Rich text editing with Markdown and HTML support
- Threaded comments and discussions
- @mentions and real-time notifications
- Document versioning with diff tracking
- Inline editing for quick updates
- Template library for standardization
- Co-authoring with real-time collaboration

### 📈 Analytics & Reporting
- Catalog usage metrics and dashboards
- Popular assets and trending data
- Search analytics for optimization
- User engagement and adoption tracking
- Coverage reports and gap analysis
- ROI measurement (time saved, productivity gains)
- Executive summaries with key insights

### 🔐 Access Control & Security
- Role-based permissions (RBAC)
- Row-level security for sensitive data
- Attribute-based access control (ABAC)
- Data masking rules by classification
- Comprehensive audit logging
- Privacy classifications (PUBLIC, INTERNAL, CONFIDENTIAL, RESTRICTED, TOP_SECRET)
- Sensitive data tagging (PII, PHI, PCI)
- Compliance tracking and reporting

## Architecture

### Package Structure

```
packages/
├── data-catalog/           # Core types, models, and services
│   ├── src/
│   │   ├── types/         # TypeScript type definitions
│   │   │   ├── catalog.ts        # Asset and catalog types
│   │   │   ├── lineage.ts        # Lineage types
│   │   │   ├── glossary.ts       # Business glossary types
│   │   │   ├── documentation.ts  # Documentation types
│   │   │   └── analytics.ts      # Analytics types
│   │   ├── services/      # Core business logic
│   │   │   ├── CatalogService.ts
│   │   │   └── LineageService.ts
│   │   └── migrations/    # Database schemas
│   └── package.json
│
├── metadata-discovery/     # Automated metadata extraction
│   ├── src/
│   │   ├── extractors/    # Source-specific extractors
│   │   │   └── PostgresExtractor.ts
│   │   ├── profilers/     # Data profiling
│   │   │   └── DataProfiler.ts
│   │   ├── jobs/          # Discovery job management
│   │   │   └── DiscoveryJobRunner.ts
│   │   └── types/
│   └── package.json
│
├── business-glossary/      # Term management and workflows
│   ├── src/
│   │   ├── services/
│   │   │   └── GlossaryService.ts
│   │   └── workflows/
│   │       └── ApprovalWorkflowService.ts
│   └── package.json
│
├── semantic-search/        # Search and discovery
│   ├── src/
│   │   ├── services/
│   │   │   └── SearchService.ts
│   │   └── rankers/
│   │       └── RelevanceRanker.ts
│   └── package.json
│
└── catalog-analytics/      # Usage tracking and reporting
    ├── src/
    │   ├── collectors/
    │   │   └── UsageCollector.ts
    │   ├── analyzers/
    │   │   └── TrendAnalyzer.ts
    │   └── reporters/
    │       └── AnalyticsReporter.ts
    └── package.json

services/
├── catalog-service/        # REST API service
│   ├── src/
│   │   ├── routes/        # API route definitions
│   │   ├── controllers/   # Request handlers
│   │   ├── middleware/    # Express middleware
│   │   └── server.ts      # Express server
│   └── package.json
│
└── metadata-service/       # Background discovery service
    ├── src/
    │   ├── workers/       # Background workers
    │   ├── schedulers/    # Job scheduling
    │   └── server.ts      # Service entry point
    └── package.json
```

### Technology Stack

- **Language**: TypeScript (strict mode)
- **Database**: PostgreSQL with JSONB for flexible metadata
- **Search**: Full-text search with tsvector, GIN indexes
- **API**: Express.js REST API
- **Scheduling**: Node-cron for discovery jobs
- **Validation**: Zod schemas for runtime validation

## Quick Start

### Installation

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm -r build
```

### Database Setup

```bash
# Run migrations
psql -U postgres -d catalog_db -f packages/data-catalog/migrations/001_catalog_schema.sql
```

### Start Services

```bash
# Start catalog API service
cd services/catalog-service
pnpm dev

# Start metadata discovery service
cd services/metadata-service
pnpm dev
```

### API Usage

```typescript
import { CatalogService } from '@intelgraph/data-catalog';
import { SearchService } from '@intelgraph/semantic-search';
import { DiscoveryJobRunner } from '@intelgraph/metadata-discovery';

// Create and manage assets
const catalogService = new CatalogService(catalogStore);
const asset = await catalogService.createAsset({
  type: AssetType.TABLE,
  name: 'customer_transactions',
  displayName: 'Customer Transactions',
  description: 'Daily customer transaction data',
  owner: 'data-team@company.com',
  // ... other properties
});

// Search for assets
const searchService = new SearchService(searchIndex);
const results = await searchService.search({
  query: 'customer',
  filters: [
    { field: 'type', operator: 'EQUALS', value: 'TABLE' },
    { field: 'status', operator: 'EQUALS', value: 'ACTIVE' }
  ],
  facets: ['domain', 'owner'],
  sort: [{ field: '_score', direction: 'DESC' }],
  offset: 0,
  limit: 20
});

// Run discovery job
const jobRunner = new DiscoveryJobRunner(store);
await jobRunner.executeJob(jobConfig, sourceConfig);
```

## REST API

### Endpoints

**Catalog Management**
```
GET    /api/v1/catalog/assets          # List assets
GET    /api/v1/catalog/assets/:id      # Get asset
POST   /api/v1/catalog/assets          # Create asset
PATCH  /api/v1/catalog/assets/:id      # Update asset
DELETE /api/v1/catalog/assets/:id      # Delete asset
POST   /api/v1/catalog/assets/:id/tags # Add tags
```

**Search**
```
GET    /api/v1/search?q=query          # Simple search
POST   /api/v1/search                  # Advanced search
GET    /api/v1/search/suggestions      # Get suggestions
```

**Lineage**
```
GET    /api/v1/lineage/:assetId                   # Get lineage
GET    /api/v1/lineage/:assetId/upstream          # Upstream
GET    /api/v1/lineage/:assetId/downstream        # Downstream
GET    /api/v1/lineage/:assetId/impact            # Impact analysis
GET    /api/v1/lineage/:assetId/column/:name      # Column lineage
```

**Analytics**
```
GET    /api/v1/analytics/summary       # Executive summary
GET    /api/v1/analytics/coverage      # Coverage metrics
GET    /api/v1/analytics/trending      # Trending assets
```

## Documentation

- [User Guide](./GUIDE.md) - Comprehensive usage guide
- [Best Practices](./BEST_PRACTICES.md) - Recommended practices
- [Search Tips](./SEARCH_TIPS.md) - Advanced search techniques

## Features Comparison

| Feature | Summit Catalog | Alation | Collibra | Atlan |
|---------|---------------|---------|----------|-------|
| Automated Discovery | ✅ | ✅ | ✅ | ✅ |
| Column-Level Lineage | ✅ | ✅ | ✅ | ✅ |
| Real-time Collaboration | ✅ | ⚠️ | ⚠️ | ✅ |
| Intelligence-Focused | ✅ | ❌ | ❌ | ❌ |
| Open Source Core | ✅ | ❌ | ❌ | ❌ |
| Advanced Analytics | ✅ | ⚠️ | ⚠️ | ✅ |
| Impact Analysis | ✅ | ✅ | ✅ | ✅ |
| Semantic Search | ✅ | ✅ | ✅ | ✅ |
| Classification Tags | ✅ | ✅ | ✅ | ✅ |
| Custom Workflows | ✅ | ⚠️ | ✅ | ⚠️ |

✅ Full Support | ⚠️ Partial Support | ❌ Not Available

## Intelligence Operations Benefits

### Enhanced for Intelligence Work

1. **Classification Handling**: Built-in support for intelligence classification levels
2. **Investigation Tracking**: Link assets to investigations and cases
3. **Entity Resolution**: Track entity relationships across datasets
4. **Provenance Tracking**: Complete chain of custody in metadata
5. **Cross-Reference Linking**: Intelligence-specific relationship types
6. **Access Controls**: Fine-grained security for classified data
7. **Audit Trails**: Comprehensive logging for compliance

### Use Cases

- **Intelligence Analysis**: Track data sources used in analysis
- **Investigation Management**: Link datasets to active investigations
- **Data Provenance**: Maintain chain of custody
- **Compliance**: Audit data access and usage
- **Knowledge Sharing**: Collaborative intelligence documentation
- **Impact Assessment**: Understand data dependencies for operations

## Contributing

Contributions welcome! Please follow these guidelines:

1. Use TypeScript with strict mode
2. Add comprehensive tests
3. Update documentation
4. Follow existing code patterns
5. Create descriptive commit messages

## License

MIT License - see LICENSE file for details

## Support

- Documentation: `/docs/catalog/`
- Issues: GitHub Issues
- Email: data-platform@company.com
