# Summit Advanced Search API Documentation

> **Version**: 1.0.0
> **Last Updated**: 2025-11-20
> **Maintainer**: Engineering Team

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Quick Start](#quick-start)
4. [Search Types](#search-types)
5. [GraphQL API](#graphql-api)
6. [REST API](#rest-api)
7. [Search Features](#search-features)
8. [Best Practices](#best-practices)
9. [Performance Optimization](#performance-optimization)
10. [Troubleshooting](#troubleshooting)

---

## Overview

The Summit Advanced Search system provides powerful full-text, semantic, and hybrid search capabilities across all entities, cases, and documents in the platform. Built on Elasticsearch, it supports:

- **Full-text search** with fuzzy matching and typo tolerance
- **Semantic search** using vector embeddings for meaning-based queries
- **Hybrid search** combining keyword and semantic approaches
- **Faceted search** with dynamic filters and aggregations
- **Autocomplete** and query suggestions
- **Search analytics** for query optimization
- **Saved searches** for frequently used queries

---

## Architecture

### Components

```
┌─────────────┐
│   Client    │
│  (GraphQL)  │
└──────┬──────┘
       │
       ▼
┌──────────────────────────────────────┐
│     GraphQL Resolvers                │
│  (server/src/graphql/resolvers/)     │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│     Search Engine Services           │
│  ┌────────────────────────────────┐  │
│  │  ElasticsearchService          │  │
│  │  QueryBuilderService           │  │
│  │  IndexingService               │  │
│  │  SearchAnalyticsService        │  │
│  └────────────────────────────────┘  │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│        Data Sources                  │
│  ┌────────────┬──────────┬────────┐  │
│  │Elasticsearch│PostgreSQL│ Neo4j  │  │
│  └────────────┴──────────┴────────┘  │
└──────────────────────────────────────┘
```

### Data Flow

1. **Indexing Pipeline**: Syncs entities from PostgreSQL and Neo4j to Elasticsearch
   - Full sync on startup
   - Incremental sync every 60 seconds (configurable)
   - Real-time indexing via API triggers

2. **Search Execution**: Processes queries through multiple stages
   - Query parsing and NLP analysis
   - Synonym expansion and typo correction
   - Elasticsearch query execution
   - Result ranking and aggregation
   - Analytics tracking

3. **Caching**: Redis-based caching for performance
   - Query result caching
   - Autocomplete suggestions
   - Analytics metrics

---

## Quick Start

### Prerequisites

Ensure Elasticsearch is running:

```bash
# Check if Elasticsearch is in docker-compose.dev.yml
docker ps | grep elasticsearch

# If not running, start the stack
make up
```

### Basic Search Query (GraphQL)

```graphql
query SearchEntities {
  search(query: {
    query: "threat intelligence"
    searchType: FULLTEXT
    pagination: {
      page: 1
      size: 20
    }
  }) {
    results {
      id
      type
      score
      source
      highlight
    }
    total {
      value
      relation
    }
    took
  }
}
```

### Basic Search (REST API)

```bash
curl -X POST http://localhost:4000/api/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "query": "threat intelligence",
    "searchType": "fulltext",
    "pagination": { "page": 1, "size": 20 }
  }'
```

---

## Search Types

### 1. Full-Text Search

Standard keyword-based search with fuzzy matching and synonym support.

**Use Cases**:
- Known keywords or phrases
- Entity name lookups
- Document searches

**Example**:

```graphql
{
  search(query: {
    query: "cyber attack financial sector"
    searchType: FULLTEXT
    highlight: {
      fields: ["title", "content", "description"]
      fragmentSize: 150
      numberOfFragments: 3
    }
  }) {
    results {
      id
      score
      highlight
    }
  }
}
```

**Features**:
- Typo tolerance (up to 2 character differences)
- Synonym expansion (e.g., "company" → "organization", "enterprise")
- Stemming (e.g., "running" → "run")
- Stop word removal
- Field boosting (title^3, content^2, description^1.5)

---

### 2. Semantic Search

Vector-based search using embeddings for meaning similarity.

**Use Cases**:
- Conceptual searches
- Finding similar entities
- Cross-language queries (future)

**Example**:

```graphql
{
  search(query: {
    query: "companies involved in data breaches"
    searchType: SEMANTIC
  }) {
    results {
      id
      score
      source
    }
  }
}
```

**Note**: Requires entities to have `embedding_vector` field populated.

---

### 3. Hybrid Search

Combines full-text and semantic search for best results.

**Use Cases**:
- Exploratory searches
- Unknown entity types
- Complex multi-faceted queries

**Example**:

```graphql
{
  search(query: {
    query: "suspicious financial transactions"
    searchType: HYBRID
    boost: {
      fields: {
        "title": 3.0
        "tags": 2.5
      }
    }
  }) {
    results {
      id
      score
      source
    }
  }
}
```

---

### 4. Fuzzy Search

Approximate matching for typos and variations.

**Use Cases**:
- User input with potential misspellings
- Name variations
- OCR-extracted text

**Example**:

```graphql
{
  search(query: {
    query: "organizaton" # typo intentional
    searchType: FUZZY
  }) {
    results {
      id
      source
    }
    suggestions {
      text
      score
    }
  }
}
```

---

## GraphQL API

### Queries

#### `search`

Main search endpoint with full configuration options.

```graphql
query AdvancedSearch {
  search(query: {
    query: "threat actor"
    searchType: HYBRID
    filters: {
      entityTypes: ["person", "organization"]
      dateRange: {
        field: "createdAt"
        from: "2024-01-01"
        to: "2024-12-31"
      }
      confidence: {
        min: 0.7
        max: 1.0
      }
      tags: ["apt", "malware"]
    }
    sort: {
      field: "createdAt"
      order: DESC
    }
    pagination: {
      page: 1
      size: 50
    }
    facets: ["entityTypes", "sources", "tags", "dateHistogram"]
    highlight: {
      fields: ["title", "content"]
      fragmentSize: 200
      numberOfFragments: 3
      preTags: ["<mark>"]
      postTags: ["</mark>"]
    }
  }) {
    results {
      id
      type
      score
      source
      highlight
      explanation # for debugging relevance
    }
    total {
      value
      relation
    }
    took
    timedOut
    facets
    suggestions {
      text
      score
    }
  }
}
```

#### `autocomplete`

Get autocomplete suggestions as user types.

```graphql
query Autocomplete {
  autocomplete(query: "thre", limit: 10) {
    text
    type
    score
    highlight
  }
}
```

#### `querySuggestions`

Get query suggestions based on popular searches.

```graphql
query QuerySuggestions {
  querySuggestions(prefix: "threat", limit: 5)
}
```

#### `personalizedSuggestions`

Get personalized suggestions for the current user.

```graphql
query PersonalizedSuggestions {
  personalizedSuggestions(limit: 10)
}
```

#### `savedSearches`

List user's saved searches.

```graphql
query MySavedSearches {
  savedSearches(
    includePublic: true
    tags: ["threat-intel"]
    limit: 20
    offset: 0
  ) {
    id
    name
    description
    query
    tags
    executionCount
    lastExecuted
  }
}
```

#### `searchMetrics`

Get search analytics and performance metrics (admin only).

```graphql
query SearchMetrics {
  searchMetrics(
    startDate: "2024-01-01"
    endDate: "2024-12-31"
  ) {
    totalQueries
    avgExecutionTime
    successRate
    failedQueries
    topQueries {
      query
      executionCount
      uniqueUsers
      avgClickThroughRate
    }
    slowQueries {
      query
      avgExecutionTime
      totalExecutions
    }
    cacheHitRate
  }
}
```

---

### Mutations

#### `saveSearch`

Save a search for later use.

```graphql
mutation SaveSearch {
  saveSearch(
    name: "High-Confidence Threats"
    description: "Critical threat indicators with high confidence"
    query: {
      query: "threat OR attack"
      filters: {
        confidence: { min: 0.9 }
        entityTypes: ["threat"]
      }
    }
    isPublic: false
    tags: ["security", "critical"]
  ) {
    id
    name
    createdAt
  }
}
```

#### `executeSavedSearch`

Execute a previously saved search.

```graphql
mutation ExecuteSavedSearch {
  executeSavedSearch(id: "saved_search_id") {
    results {
      id
      score
      source
    }
    total {
      value
    }
  }
}
```

#### `trackSearchClick`

Track when a user clicks on a search result (for analytics).

```graphql
mutation TrackClick {
  trackSearchClick(
    queryId: "query_123"
    resultId: "entity_456"
    position: 2
  )
}
```

#### `reindexAll`

Trigger full reindexing of all entities (admin only).

```graphql
mutation ReindexAll {
  reindexAll
}
```

---

## REST API

The search engine also exposes REST endpoints for non-GraphQL clients.

### POST `/api/search`

Main search endpoint.

```bash
curl -X POST http://localhost:4000/api/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "query": "cyber threat",
    "searchType": "hybrid",
    "pagination": { "page": 1, "size": 20 },
    "filters": {
      "entityTypes": ["threat", "event"],
      "confidence": { "min": 0.7 }
    }
  }'
```

### GET `/api/autocomplete`

Autocomplete suggestions.

```bash
curl "http://localhost:4000/api/autocomplete?q=thre&size=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### GET `/api/suggestions`

Query suggestions and spelling corrections.

```bash
curl "http://localhost:4000/api/suggestions?q=organizaton" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### GET `/api/search/saved`

List saved searches.

```bash
curl "http://localhost:4000/api/search/saved?limit=20" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Search Features

### Faceted Search

Facets provide aggregated counts for filtering.

**Available Facets**:
- `entityTypes`: Count by entity type
- `sources`: Count by data source
- `tags`: Count by tags
- `dateHistogram`: Time-based distribution
- `confidence`: Confidence score distribution

**Example**:

```graphql
{
  search(query: {
    query: "financial crime"
    facets: ["entityTypes", "sources", "tags"]
  }) {
    results { id }
    facets
    # Returns:
    # {
    #   "entityTypes": {
    #     "buckets": [
    #       { "key": "person", "docCount": 42 },
    #       { "key": "organization", "docCount": 38 }
    #     ]
    #   },
    #   ...
    # }
  }
}
```

---

### Highlighting

Highlights matched terms in results.

```graphql
{
  search(query: {
    query: "data breach"
    highlight: {
      fields: ["title", "content", "description"]
      fragmentSize: 150
      numberOfFragments: 3
      preTags: ["<em class='highlight'>"]
      postTags: ["</em>"]
    }
  }) {
    results {
      id
      highlight
      # Returns:
      # {
      #   "title": ["Company suffers <em>data breach</em> affecting millions"],
      #   "content": ["The <em>breach</em> occurred when..."]
      # }
    }
  }
}
```

---

### Synonym Support

Automatically expands queries with synonyms.

**Built-in Synonym Groups**:

- **Entity Types**: `person, individual, human, people`
- **Organizations**: `company, corp, corporation, enterprise, business`
- **Locations**: `place, address, location, site`
- **Threats**: `danger, risk, vulnerability, attack, exploit`
- **Intelligence**: `intel, intelligence, information, data`

**Example**:

Searching for "company" automatically includes results with "organization", "enterprise", "corp", etc.

---

### Typo Tolerance

Automatic fuzzy matching handles typos.

**Tolerance Levels**:
- 1-2 chars: exact match only
- 3-5 chars: 1 character difference
- 6+ chars: 2 character differences

**Example**:

- `organiztion` → `organization`
- `finacial` → `financial`
- `attck` → `attack`

---

### Boosting

Adjust relevance scoring for specific fields or conditions.

**Field Boosting**:

```graphql
{
  search(query: {
    query: "threat"
    boost: {
      fields: {
        "title": 5.0      # Title matches 5x more important
        "tags": 3.0       # Tag matches 3x more important
        "content": 1.0    # Content baseline
      }
    }
  }) {
    results { id score }
  }
}
```

**Function Boosting**:

```graphql
{
  search(query: {
    query: "entity"
    boost: {
      functions: [
        {
          type: "field_value_factor"
          field: "graphScore"
          factor: 1.5
          modifier: "log1p"
        }
      ]
    }
  }) {
    results { id score }
  }
}
```

---

## Best Practices

### 1. Use Appropriate Search Types

- **Full-text**: For known keywords (e.g., "John Smith")
- **Semantic**: For conceptual queries (e.g., "financial crimes")
- **Hybrid**: When unsure or for complex queries
- **Fuzzy**: For user-generated input with potential typos

### 2. Apply Filters Early

Filters are faster than query clauses. Use them to narrow results before complex scoring.

```graphql
# Good
{
  search(query: {
    query: "threat"
    filters: {
      entityTypes: ["threat"]
      confidence: { min: 0.8 }
    }
  }) { results { id } }
}

# Less efficient
{
  search(query: {
    query: "threat AND confidence:>0.8 AND type:threat"
  }) { results { id } }
}
```

### 3. Limit Result Size

Large result sets impact performance. Use pagination.

```graphql
# Good
{
  search(query: {
    query: "attack"
    pagination: { page: 1, size: 20 }
  }) { results { id } }
}

# Bad - may timeout
{
  search(query: {
    query: "attack"
    pagination: { page: 1, size: 10000 }
  }) { results { id } }
}
```

### 4. Use Highlighting Selectively

Only highlight fields you'll display.

```graphql
# Good
highlight: {
  fields: ["title"]  # Only what's shown in UI
}

# Wasteful
highlight: {
  fields: ["title", "content", "description", "metadata", ...]
}
```

### 5. Track Analytics

Always track clicks for relevance optimization.

```graphql
mutation TrackClick {
  trackSearchClick(
    queryId: $queryId
    resultId: $clickedResultId
    position: $resultPosition
  )
}
```

---

## Performance Optimization

### Caching Strategy

Search results are cached in Redis for 5 minutes by default.

**Cache Key Format**: `search:query:${hash(query)}`

**Bypass Cache**:

Add `_nocache` parameter or use fresh data mode.

### Index Optimization

**Refresh Interval**: Indices refresh every 60 seconds (configurable).

**Shard Configuration**:
- Entities: 3 shards, 1 replica
- Cases: 2 shards, 1 replica
- Documents: 3 shards, 1 replica

### Query Optimization

**Use `track_total_hits: false`** when exact counts aren't needed:

Only available via direct Elasticsearch client for now.

**Prefer Filters over Queries** for exact matches:

Filters are cached and faster.

---

## Troubleshooting

### No Results

**Check**:
1. Is indexing running? `curl http://localhost:9200/_cat/indices?v`
2. Are entities indexed? Check index doc count
3. Are filters too restrictive?
4. Try fuzzy search for typos

**Debug Query**:

```graphql
{
  search(query: {
    query: "your query"
  }) {
    results {
      explanation  # Shows scoring details
    }
  }
}
```

### Slow Queries

**Check**:
1. Search metrics: `searchMetrics` query
2. Elasticsearch slow log: `/usr/share/elasticsearch/logs/`
3. Query complexity: simplify filters and facets

**Optimize**:
- Reduce result size
- Limit highlighted fields
- Remove unnecessary facets
- Add more specific filters

### Indexing Issues

**Check Indexing Status**:

```graphql
{
  searchHealth {
    status
    details
  }
}
```

**Force Reindex**:

```graphql
mutation {
  reindexAll
}
```

**Check Logs**:

```bash
docker logs summit-elasticsearch
tail -f apps/search-engine/logs/indexing.log
```

### Elasticsearch Connection Issues

**Check Health**:

```bash
curl http://localhost:9200/_cluster/health?pretty
```

**Restart Elasticsearch**:

```bash
docker restart summit-elasticsearch
```

---

## Environment Variables

```bash
# Elasticsearch Configuration
ELASTICSEARCH_URL=http://localhost:9200
ELASTICSEARCH_USERNAME=elastic
ELASTICSEARCH_PASSWORD=devpassword
ELASTICSEARCH_INDEX_PREFIX=summit

# Search Configuration
SEARCH_BATCH_SIZE=1000
SEARCH_INDEXING_INTERVAL=60000  # milliseconds
SEARCH_ENABLE_REALTIME=true
SEARCH_SKIP_INITIAL_INDEXING=false

# Logging
LOG_LEVEL=info
```

---

## Support and Feedback

For issues, questions, or feature requests:

- **GitHub Issues**: https://github.com/BrianCLong/summit/issues
- **Documentation**: `/docs/`
- **Logs**: `apps/search-engine/logs/`

---

## Changelog

### Version 1.0.0 (2025-11-20)

- Initial release
- Full-text, semantic, and hybrid search
- Faceted search and filtering
- Autocomplete and suggestions
- Search analytics
- Saved searches
- GraphQL and REST APIs
