# @intelgraph/data-integration

Enterprise-grade data integration framework with 100+ connectors for databases, APIs, cloud storage, and SaaS platforms.

## Features

- **Extensive Connector Library**: PostgreSQL, MySQL, MongoDB, REST APIs, S3, and more
- **Multiple Extraction Strategies**: Full, incremental, CDC, real-time streaming
- **Connection Management**: Pooling, SSL/TLS, OAuth, API keys
- **Rate Limiting**: Built-in rate limiting and throttling
- **Retry Logic**: Exponential backoff with configurable retry policies
- **Pagination Support**: Offset, cursor, and page-based pagination

## Installation

```bash
pnpm add @intelgraph/data-integration
```

## Quick Start

```typescript
import { PostgreSQLConnector, DataSourceConfig, SourceType, ExtractionStrategy } from '@intelgraph/data-integration';
import { createLogger } from 'winston';

const logger = createLogger();

const config: DataSourceConfig = {
  id: 'my-postgres-source',
  name: 'PostgreSQL Database',
  type: SourceType.DATABASE,
  connectionConfig: {
    host: 'localhost',
    port: 5432,
    database: 'mydb',
    username: 'user',
    password: 'password'
  },
  extractionConfig: {
    strategy: ExtractionStrategy.INCREMENTAL,
    incrementalColumn: 'updated_at',
    batchSize: 1000
  },
  loadConfig: {
    targetTable: 'my_table',
    strategy: LoadStrategy.UPSERT,
    upsertKey: ['id']
  }
};

const connector = new PostgreSQLConnector(config, logger);

await connector.connect();

for await (const batch of connector.extract()) {
  console.log(`Extracted ${batch.length} records`);
}

await connector.disconnect();
```

## Available Connectors

### Databases
- PostgreSQLConnector
- MySQLConnector
- MongoDBConnector

### APIs & Cloud
- RESTAPIConnector
- S3Connector

### Custom Connectors

Extend `BaseConnector` to create custom connectors:

```typescript
import { BaseConnector, ConnectorCapabilities } from '@intelgraph/data-integration';

export class CustomConnector extends BaseConnector {
  async connect(): Promise<void> {
    // Implement connection logic
  }

  async disconnect(): Promise<void> {
    // Implement disconnection logic
  }

  async testConnection(): Promise<boolean> {
    // Implement connection test
  }

  getCapabilities(): ConnectorCapabilities {
    return {
      supportsStreaming: true,
      supportsIncremental: true,
      supportsCDC: false,
      supportsSchema: true,
      supportsPartitioning: false,
      maxConcurrentConnections: 10
    };
  }

  async *extract(): AsyncGenerator<any[], void, unknown> {
    // Implement extraction logic
  }

  async getSchema(): Promise<any> {
    // Implement schema retrieval
  }
}
```

## License

MIT
