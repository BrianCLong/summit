# Summit Query Language (SummitQL) Guide

## Overview

SummitQL is a declarative, GraphQL-inspired query language designed for intelligence analysis. It provides a powerful and flexible way to query entities, relationships, and intelligence data across the Summit platform.

## Basic Syntax

### Simple Query

```summitql
query {
  from: entities
  select: [id, name, type, createdAt]
  where: type = "Person"
  limit: 100
}
```

### Query with Filters

```summitql
query {
  from: entities
  select: [id, name, type, attributes]
  where: (
    type = "Organization" AND
    country IN ["US", "UK", "CA"] AND
    riskScore >= 7.0
  )
  order_by: [riskScore DESC, name ASC]
  limit: 50
}
```

## Field Selection

### Nested Fields

```summitql
query {
  from: entities
  select: [
    id,
    name,
    relationships {
      id,
      type,
      target {
        id,
        name
      }
    },
    attributes {
      key,
      value
    }
  ]
  where: type = "Person"
}
```

### Field Aliases

```summitql
query {
  from: entities
  select: [
    id,
    name as entityName,
    type as entityType,
    createdAt as created
  ]
}
```

## Filtering

### Comparison Operators

- `=` - Equal
- `!=` - Not equal
- `>` - Greater than
- `>=` - Greater than or equal
- `<` - Less than
- `<=` - Less than or equal
- `LIKE` - Pattern matching
- `IN` - Value in list
- `CONTAINS` - Contains substring

### Logical Operators

- `AND` - Logical AND
- `OR` - Logical OR
- `NOT` - Logical NOT

### Examples

```summitql
// String matching
query {
  from: entities
  where: name LIKE "John%"
}

// List membership
query {
  from: entities
  where: type IN ["Person", "Organization"]
}

// Complex logic
query {
  from: entities
  where: (
    (type = "Person" AND country = "US") OR
    (type = "Organization" AND riskScore > 5.0)
  )
}
```

## Full-Text Search

```summitql
query {
  from: entities
  where: search([name, description], "intelligence analysis", {
    mode: "natural",
    minScore: 0.5,
    fuzzy: true
  })
}
```

## Geospatial Queries

### Within Radius

```summitql
query {
  from: entities
  where: near(location, {
    type: "Point",
    coordinates: [-74.006, 40.7128]
  }, {
    maxDistance: 10000,
    unit: "meters"
  })
}
```

### Within Polygon

```summitql
query {
  from: entities
  where: within(location, {
    type: "Polygon",
    coordinates: [[
      [-74.0, 40.7],
      [-74.0, 40.8],
      [-73.9, 40.8],
      [-73.9, 40.7],
      [-74.0, 40.7]
    ]]
  })
}
```

## Temporal Queries

### Point in Time

```summitql
query {
  from: entities
  temporal: {
    point_in_time: "2024-01-01T00:00:00Z"
  }
}
```

### Time Range

```summitql
query {
  from: entities
  temporal: {
    time_range: {
      start: "2024-01-01T00:00:00Z",
      end: "2024-12-31T23:59:59Z"
    }
  }
}
```

## Joins

```summitql
query {
  from: entities
  select: [id, name, type]
  join: {
    from: relationships
    on: entities.id = relationships.sourceId
    as: rels
  }
  where: entities.type = "Person"
}
```

## Aggregations

### Count

```summitql
query {
  from: entities
  aggregate: [
    count() as total,
    count(DISTINCT type) as uniqueTypes
  ]
}
```

### Group By

```summitql
query {
  from: entities
  aggregate: [
    count() as count,
    avg(riskScore) as avgRisk,
    max(riskScore) as maxRisk
  ]
  group_by: [type, country]
}
```

### Histogram

```summitql
query {
  from: entities
  aggregate: [
    histogram(createdAt, interval: "1d") as timeline
  ]
}
```

## Sorting

```summitql
query {
  from: entities
  order_by: [
    riskScore DESC NULLS LAST,
    name ASC
  ]
}
```

## Pagination

### Offset-based

```summitql
query {
  from: entities
  limit: 100
  offset: 200
}
```

### Cursor-based

Use the `cursor` parameter in your API request:

```javascript
const result = await api.query(queryString, {
  limit: 100,
  cursor: previousResult.metadata.cursor
});
```

## Query Options

```javascript
// Execute query with options
const result = await ql.execute(queryString, {
  cache: true,
  cacheTTL: 3600,
  timeout: 30000
});

// Stream query results
for await (const chunk of ql.stream(queryString)) {
  console.log(chunk);
}

// Validate query
const validation = ql.validate(queryString);

// Explain query execution plan
const explanation = ql.explain(queryString);
```

## Advanced Features

### Query Fragments

```summitql
fragment EntityDetails on Entity {
  id
  name
  type
  attributes
}

query {
  from: entities
  select: [...EntityDetails]
}
```

### Variables

```javascript
const query = `
  query {
    from: entities
    where: type = $entityType AND country = $country
  }
`;

const result = await ql.execute(query, {
  variables: {
    entityType: 'Person',
    country: 'US'
  }
});
```

## Performance Tips

1. **Use Field Selection**: Only select fields you need
2. **Apply Filters Early**: Use WHERE clauses to reduce data volume
3. **Use Indexes**: Ensure indexed fields are used in filters
4. **Limit Results**: Always use LIMIT for large datasets
5. **Enable Caching**: Cache frequently-used queries
6. **Use Cursor Pagination**: For large result sets

## Error Handling

```javascript
try {
  const result = await ql.execute(queryString);
} catch (error) {
  if (error.code === 'PARSE_ERROR') {
    // Handle syntax errors
  } else if (error.code === 'VALIDATION_ERROR') {
    // Handle validation errors
  } else if (error.code === 'EXECUTION_ERROR') {
    // Handle runtime errors
  }
}
```

## Examples

### Find High-Risk Entities

```summitql
query {
  from: entities
  select: [
    id,
    name,
    type,
    riskScore,
    relationships { type, target { name } }
  ]
  where: (
    riskScore >= 8.0 AND
    type IN ["Person", "Organization"] AND
    lastUpdated >= "2024-01-01T00:00:00Z"
  )
  order_by: [riskScore DESC]
  limit: 100
}
```

### Geographic Analysis

```summitql
query {
  from: entities
  select: [id, name, location, type]
  where: (
    type = "Organization" AND
    within(location, {
      type: "Polygon",
      coordinates: [[...]]
    })
  )
  aggregate: [
    count() as total,
    histogram(createdAt, interval: "1w") as timeline
  ]
  group_by: [subType]
}
```

### Temporal Intelligence

```summitql
query {
  from: intelligence_reports
  select: [id, title, summary, classification, sources]
  where: (
    classification IN ["SECRET", "TOP_SECRET"] AND
    search([title, summary], "cyber threat", {
      fuzzy: true,
      minScore: 0.7
    })
  )
  temporal: {
    time_range: {
      start: "2024-01-01T00:00:00Z",
      end: "2024-12-31T23:59:59Z"
    }
  }
  order_by: [relevanceScore DESC, publishedAt DESC]
  limit: 50
}
```

## API Integration

### REST API

```bash
# Execute query
curl -X POST http://localhost:3000/api/v1/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query { from: entities where: type = \"Person\" limit: 10 }"
  }'

# Validate query
curl -X POST http://localhost:3000/api/v1/query/validate \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query { from: entities }"
  }'

# Explain query
curl -X POST http://localhost:3000/api/v1/query/explain \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query { from: entities where: type = \"Person\" }"
  }'
```

### TypeScript SDK

```typescript
import { SummitQL } from '@intelgraph/query-language';

const ql = new SummitQL({
  optimize: true,
  validate: true,
});

const result = await ql.execute(`
  query {
    from: entities
    where: type = "Person"
    limit: 100
  }
`);
```

## See Also

- [REST API Guide](./REST_API_GUIDE.md)
- [GraphQL API Guide](./GRAPHQL_API_GUIDE.md)
- [Streaming API Guide](./STREAMING_API_GUIDE.md)
- [API Framework Overview](./API_FRAMEWORK.md)
