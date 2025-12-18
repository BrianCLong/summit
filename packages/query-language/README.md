# Summit Query Language (SummitQL)

A declarative, GraphQL-inspired query language for intelligence analysis.

## Features

- **Declarative Syntax**: Express complex queries in a readable, intuitive format
- **Advanced Filtering**: Support for comparison, logical, full-text, geospatial, and temporal filters
- **Nested Queries**: Query nested relationships and embedded data structures
- **Aggregations**: Built-in support for count, sum, avg, min, max, histograms, and percentiles
- **Query Optimization**: Automatic query optimization with predicate pushdown, join reordering, and index selection
- **Type Safety**: Full TypeScript support with type checking
- **Streaming Support**: Execute queries as streams for large datasets
- **Explain Plans**: Generate execution plans for query debugging

## Installation

```bash
npm install @intelgraph/query-language
```

## Quick Start

```typescript
import { SummitQL } from '@intelgraph/query-language';

const ql = new SummitQL({
  optimize: true,
  validate: true,
});

const result = await ql.execute(`
  query {
    from: entities
    select: [id, name, type, relationships { type, target { name } }]
    where: type = "Person" AND country IN ["US", "UK"]
    order_by: [name ASC]
    limit: 100
  }
`);

console.log(result.data);
```

## Documentation

See the [Query Language Guide](../../docs/api-reference/QUERY_LANGUAGE_GUIDE.md) for comprehensive documentation.

## License

MIT
