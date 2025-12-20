# Data Catalog Platform Guide

## Overview

The Summit Data Catalog is a comprehensive metadata management platform designed for intelligence operations. It provides enterprise-grade data discovery, semantic search, collaborative documentation, and advanced lineage tracking that surpasses specialized catalog tools.

## Key Features

### 1. Automated Metadata Discovery

Automatically discover and extract metadata from various data sources:

- **Database Schema Extraction**: PostgreSQL, MySQL, MongoDB, Neo4j
- **File Metadata Harvesting**: S3, HDFS, local file systems
- **API Endpoint Discovery**: REST APIs, GraphQL endpoints
- **Data Profiling**: Statistical analysis and quality metrics
- **Sample Data Collection**: Representative data samples
- **Relationship Inference**: Automatic foreign key and dependency detection
- **Usage Pattern Analysis**: Track how data is accessed and used

#### Setting Up Discovery Jobs

```typescript
import { DiscoveryJobRunner } from '@intelgraph/metadata-discovery';

const jobRunner = new DiscoveryJobRunner(store);

const jobConfig = {
  id: 'postgres-discovery',
  name: 'PostgreSQL Database Discovery',
  sourceId: 'postgres-prod',
  schedule: '0 2 * * *', // Daily at 2 AM
  enabled: true,
  options: {
    extractSchema: true,
    profileData: true,
    collectSamples: true,
    inferRelationships: true,
    analyzeUsage: true,
    maxSampleRows: 100,
    excludePatterns: ['tmp_*', 'test_*'],
    includePatterns: ['*'],
  },
};

await jobRunner.scheduleJob(jobConfig);
```

### 2. Business Glossary

Manage business terminology with approval workflows:

- **Term Definitions**: Centralized business vocabulary
- **Hierarchical Taxonomy**: Organize terms into categories
- **Synonyms & Related Terms**: Link related concepts
- **Business Rules**: Document validation and calculation rules
- **Approval Workflows**: Multi-step approval process
- **Version Control**: Track definition changes over time
- **Cross-Reference Linking**: Connect terms to data assets

#### Creating Glossary Terms

```typescript
import { GlossaryService } from '@intelgraph/business-glossary';

const glossaryService = new GlossaryService(store);

const term = await glossaryService.createTerm({
  name: 'customer_lifetime_value',
  displayName: 'Customer Lifetime Value',
  definition: 'Total revenue expected from a customer over their entire relationship',
  longDescription: 'CLV is calculated by...',
  categoryId: 'metrics',
  owner: 'data-governance@company.com',
  stewards: ['analytics-team@company.com'],
  domain: 'sales',
  tags: ['metric', 'revenue', 'customer'],
  synonyms: ['CLV', 'LTV'],
  relatedTerms: ['customer_acquisition_cost', 'churn_rate'],
  businessRules: [
    {
      id: 'clv-calculation',
      name: 'CLV Calculation',
      description: 'Average order value × Purchase frequency × Customer lifespan',
      type: 'CALCULATION',
      severity: 'CRITICAL',
    },
  ],
  examples: ['CLV = $100 × 10 × 3 = $3,000'],
});
```

### 3. Semantic Search

Powerful search capabilities with faceted filtering:

- **Full-Text Search**: Search across all metadata fields
- **Faceted Filtering**: Filter by type, status, domain, owner
- **Relevance Ranking**: Smart ranking based on multiple signals
- **Query Suggestions**: Auto-complete and search suggestions
- **Search Analytics**: Track popular searches and zero-result queries
- **Saved Searches**: Save and share search queries
- **Natural Language**: Context-aware search results

#### Using the Search API

```typescript
import { SearchService } from '@intelgraph/semantic-search';

const searchService = new SearchService(searchIndex, analytics);

// Basic search
const results = await searchService.search({
  query: 'customer transactions',
  filters: [],
  facets: ['type', 'status', 'domain'],
  sort: [{ field: '_score', direction: 'DESC' }],
  offset: 0,
  limit: 20,
}, userId);

// Faceted search
const facetedResults = await searchService.facetedSearch(
  'sales data',
  {
    type: ['TABLE', 'VIEW'],
    domain: ['sales', 'marketing'],
    status: ['ACTIVE'],
  },
  userId
);

// Advanced search
const advancedResults = await searchService.advancedSearch(
  'revenue',
  {
    classification: { operator: 'IN', value: ['PUBLIC', 'INTERNAL'] },
    'trustIndicators.certificationLevel': 'GOLD',
    updatedAt: { operator: 'GREATER_THAN', value: '2024-01-01' },
  },
  [{ field: 'updatedAt', direction: 'DESC' }],
  0,
  50,
  userId
);
```

### 4. Data Lineage

Comprehensive lineage tracking and impact analysis:

- **End-to-End Lineage**: Trace data from source to consumption
- **Column-Level Lineage**: Track individual column dependencies
- **Interactive Exploration**: Visual lineage graphs
- **Impact Analysis**: Understand downstream effects of changes
- **Dependency Tracking**: Map data dependencies
- **Transformation Visibility**: See how data is transformed
- **Time-Based Lineage**: Historical lineage snapshots

#### Working with Lineage

```typescript
import { LineageService } from '@intelgraph/data-catalog';

const lineageService = new LineageService(lineageStore);

// Get upstream lineage
const upstream = await lineageService.getUpstreamLineage(
  'table-sales-transactions',
  5, // depth
  LineageLevel.TABLE
);

// Analyze impact of changes
const impact = await lineageService.analyzeImpact('table-customer-master', 10);

console.log(`Total impacted assets: ${impact.totalImpacted}`);
console.log(`Critical impacts: ${impact.criticalImpacts}`);

// Get column-level lineage
const columnLineage = await lineageService.getColumnLineage(
  'table-sales-summary',
  'total_revenue'
);

console.log('Source columns:', columnLineage?.sourceColumns);
```

### 5. Data Quality & Trust Indicators

Track and display quality metrics:

- **Quality Scores**: Completeness, accuracy, consistency, timeliness
- **Certification Badges**: Bronze, Silver, Gold, Platinum levels
- **User Ratings**: Community-driven quality ratings
- **Usage Statistics**: Track asset popularity
- **Freshness Indicators**: Data recency and update frequency
- **Completeness Metrics**: Measure metadata coverage
- **Trust Signals**: Verification and endorsement tracking

#### Managing Quality Metrics

```typescript
import { CatalogService } from '@intelgraph/data-catalog';

const catalogService = new CatalogService(catalogStore);

// Update quality scores
await catalogService.updateAsset('asset-id', {
  trustIndicators: {
    certificationLevel: 'GOLD',
    endorsementCount: 15,
    userRating: 4.5,
    usageCount: 1250,
    lastVerified: new Date(),
    verifiedBy: 'data-quality-team',
    qualityScore: {
      overall: 0.92,
      completeness: 0.95,
      accuracy: 0.90,
      consistency: 0.88,
      timeliness: 0.95,
      validity: 0.93,
      uniqueness: 0.91,
    },
  },
});
```

### 6. Collaborative Documentation

Rich documentation with co-authoring:

- **Rich Text Editing**: Markdown and HTML support
- **Comment Threads**: Discuss assets with team
- **@Mentions**: Notify team members
- **Document Versioning**: Track documentation changes
- **Inline Editing**: Quick updates
- **Template Library**: Standard documentation templates
- **Co-Authoring**: Real-time collaborative editing

### 7. Analytics & Reporting

Comprehensive usage analytics:

- **Catalog Usage Metrics**: Track how the catalog is used
- **Popular Assets**: Identify trending datasets
- **Search Analytics**: Optimize search experience
- **User Engagement**: Measure adoption and activity
- **Coverage Reports**: Track metadata completeness
- **Adoption Dashboards**: Monitor catalog adoption
- **ROI Measurement**: Calculate time saved and value created

#### Generating Reports

```typescript
import { AnalyticsReporter } from '@intelgraph/catalog-analytics';

const reporter = new AnalyticsReporter(analyticsStore, insightGenerator);

// Executive summary
const summary = await reporter.generateExecutiveSummary(TimePeriod.MONTH);

// Coverage report
const coverage = await reporter.generateCoverageReport();
console.log(`Coverage: ${coverage.coveragePercentage}%`);
console.log(`Documented assets: ${coverage.documentedAssets}/${coverage.totalAssets}`);

// Quality report
const quality = await reporter.generateQualityReport();
console.log('Recommendations:', quality.recommendations);

// Health score
const healthScore = await reporter.calculateHealthScore();
console.log(`Catalog health: ${healthScore}/100`);
```

## Architecture

### Package Structure

```
packages/
├── data-catalog/          # Core catalog types and services
├── metadata-discovery/    # Automated metadata extraction
├── business-glossary/     # Term management and workflows
├── semantic-search/       # Search and discovery
└── catalog-analytics/     # Usage tracking and reporting

services/
├── catalog-service/       # REST API service
└── metadata-service/      # Background discovery service
```

### Database Schema

The catalog uses PostgreSQL with the following main tables:

- `catalog_assets`: Asset metadata and properties
- `catalog_relationships`: Asset relationships
- `glossary_terms`: Business terminology
- `lineage_nodes` & `lineage_edges`: Lineage graphs
- `usage_events`: Usage tracking
- `catalog_comments`: Collaborative comments
- `catalog_documents`: Rich documentation

## API Reference

### REST API Endpoints

**Catalog Management**
- `GET /api/v1/catalog/assets` - List assets
- `GET /api/v1/catalog/assets/:id` - Get asset details
- `POST /api/v1/catalog/assets` - Create asset
- `PATCH /api/v1/catalog/assets/:id` - Update asset
- `DELETE /api/v1/catalog/assets/:id` - Delete asset

**Search**
- `GET /api/v1/search?q=query` - Search assets
- `POST /api/v1/search` - Advanced search
- `GET /api/v1/search/suggestions` - Get suggestions

**Lineage**
- `GET /api/v1/lineage/:assetId` - Get lineage graph
- `GET /api/v1/lineage/:assetId/upstream` - Upstream lineage
- `GET /api/v1/lineage/:assetId/downstream` - Downstream lineage
- `GET /api/v1/lineage/:assetId/impact` - Impact analysis

**Analytics**
- `GET /api/v1/analytics/summary` - Executive summary
- `GET /api/v1/analytics/coverage` - Coverage metrics
- `GET /api/v1/analytics/trending` - Trending assets

## Best Practices

See [BEST_PRACTICES.md](./BEST_PRACTICES.md) for detailed recommendations.

## Search Tips

See [SEARCH_TIPS.md](./SEARCH_TIPS.md) for advanced search techniques.
