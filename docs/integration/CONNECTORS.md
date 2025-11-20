# Data Integration Connectors Guide

## Overview

The Summit Data Integration Platform provides a comprehensive set of connectors for various data sources including databases, cloud storage, APIs, message queues, and SaaS applications.

## Available Connectors

### Database Connectors

#### PostgreSQL Connector

**Capabilities:**
- Streaming and batch reads
- Incremental loading
- Change Data Capture (CDC)
- Schema introspection
- Transaction support
- Connection pooling

**Configuration:**

```typescript
import { PostgresConnector } from '@intelgraph/data-connectors';

const connector = new PostgresConnector();
await connector.connect({
  type: DataSourceType.POSTGRES,
  name: 'postgres-db',
  host: 'localhost',
  port: 5432,
  database: 'mydb',
  username: 'user',
  password: 'password',
  ssl: true,
  poolSize: 10,
  timeout: 5000,
});

// Read data
for await (const record of connector.read({
  filter: { table: 'customers' },
  batchSize: 1000,
})) {
  console.log(record);
}

// Write data
const result = await connector.write(data, {
  mode: 'upsert',
  batchSize: 500,
});
```

**CDC Support:**

```typescript
// Enable CDC for real-time changes
const cdc = new CDCEngine({
  mode: CDCMode.LOG_BASED,
  source: postgresConfig,
  tables: ['customers', 'orders'],
});

await cdc.start();

for await (const change of cdc.getChanges()) {
  console.log(`Change: ${change.operation} on ${change.table}`);
}
```

#### MongoDB Connector

**Capabilities:**
- Document-based operations
- Aggregation pipelines
- Change streams (CDC)
- Bulk operations
- Index support

**Configuration:**

```typescript
import { MongoDBConnector } from '@intelgraph/data-connectors';

const connector = new MongoDBConnector();
await connector.connect({
  type: DataSourceType.MONGODB,
  name: 'mongodb',
  connectionString: 'mongodb://localhost:27017/mydb',
});

// Read with filter
for await (const doc of connector.read({
  filter: { status: 'active' },
  projection: ['name', 'email'],
})) {
  console.log(doc);
}
```

#### Neo4j Connector

**Capabilities:**
- Graph queries (Cypher)
- Relationship traversal
- Batch loading
- Path finding

**Configuration:**

```typescript
import { Neo4jConnector } from '@intelgraph/data-connectors';

const connector = new Neo4jConnector();
await connector.connect({
  type: DataSourceType.NEO4J,
  host: 'localhost',
  port: 7687,
  username: 'neo4j',
  password: 'password',
});
```

### Cloud Storage Connectors

#### Amazon S3 Connector

**Capabilities:**
- List, read, and write objects
- Multipart uploads
- Streaming reads
- Prefix-based filtering
- Server-side encryption

**Configuration:**

```typescript
import { S3Connector } from '@intelgraph/data-connectors';

const connector = new S3Connector();
await connector.connect({
  type: DataSourceType.S3,
  name: 's3-storage',
  region: 'us-east-1',
  apiKey: 'AWS_ACCESS_KEY',
  apiSecret: 'AWS_SECRET_KEY',
  bucket: 'my-bucket',
});

// Read objects
for await (const object of connector.read({
  prefix: 'data/',
  filter: '*.json',
})) {
  console.log(object);
}

// Write object
await connector.write([{ key: 'file.json', data: jsonData }]);
```

#### Azure Blob Storage Connector

**Configuration:**

```typescript
import { AzureBlobConnector } from '@intelgraph/data-connectors';

const connector = new AzureBlobConnector();
await connector.connect({
  type: DataSourceType.AZURE_BLOB,
  connectionString: 'DefaultEndpointsProtocol=https;...',
  bucket: 'my-container',
});
```

#### Google Cloud Storage Connector

**Configuration:**

```typescript
import { GCSConnector } from '@intelgraph/data-connectors';

const connector = new GCSConnector();
await connector.connect({
  type: DataSourceType.GCS,
  bucket: 'my-bucket',
  apiKey: 'service-account-key.json',
});
```

### API Connectors

#### REST API Connector

**Capabilities:**
- HTTP methods (GET, POST, PUT, DELETE)
- Authentication (API key, OAuth, Basic)
- Pagination handling
- Rate limiting
- Retry logic

**Configuration:**

```typescript
import { RestAPIConnector } from '@intelgraph/data-connectors';

const connector = new RestAPIConnector();
await connector.connect({
  type: DataSourceType.REST_API,
  connectionString: 'https://api.example.com',
  apiKey: 'your-api-key',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Read from API
for await (const record of connector.read({
  filter: {
    endpoint: '/users',
    params: { status: 'active' },
  },
})) {
  console.log(record);
}

// Write to API
await connector.write(data, {
  mode: '/users',
  method: 'POST',
});
```

**Pagination:**

```typescript
// Automatic pagination
for await (const record of connector.read({
  filter: {
    endpoint: '/users',
    pagination: {
      type: 'page',
      pageSize: 100,
      maxPages: 10,
    },
  },
})) {
  console.log(record);
}
```

#### GraphQL API Connector

**Configuration:**

```typescript
import { GraphQLConnector } from '@intelgraph/data-connectors';

const connector = new GraphQLConnector();
await connector.connect({
  type: DataSourceType.GRAPHQL,
  connectionString: 'https://api.example.com/graphql',
  apiKey: 'your-api-key',
});

// Execute query
for await (const result of connector.read({
  query: `
    query GetUsers($status: String!) {
      users(status: $status) {
        id
        name
        email
      }
    }
  `,
  variables: { status: 'active' },
})) {
  console.log(result);
}
```

### Message Queue Connectors

#### Kafka Connector

**Capabilities:**
- Topic subscription
- Consumer groups
- Batch consumption
- Offset management
- Message production

**Configuration:**

```typescript
import { KafkaConnector } from '@intelgraph/data-connectors';

const connector = new KafkaConnector();
await connector.connect({
  type: DataSourceType.KAFKA,
  host: 'localhost:9092',
  metadata: {
    consumerGroup: 'my-consumer-group',
  },
});

// Consume messages
for await (const message of connector.read({
  topic: 'my-topic',
  offset: 'latest',
  batchSize: 100,
})) {
  console.log(message);
}

// Produce messages
await connector.write(messages, {
  topic: 'output-topic',
});
```

#### RabbitMQ Connector

**Configuration:**

```typescript
import { RabbitMQConnector } from '@intelgraph/data-connectors';

const connector = new RabbitMQConnector();
await connector.connect({
  type: DataSourceType.RABBITMQ,
  host: 'localhost',
  port: 5672,
  username: 'guest',
  password: 'guest',
});

// Consume from queue
for await (const message of connector.read({
  queue: 'my-queue',
})) {
  console.log(message);
}
```

### File Format Connectors

#### CSV Connector

**Configuration:**

```typescript
import { CSVConnector } from '@intelgraph/data-connectors';

const connector = new CSVConnector();
await connector.connect({
  type: DataSourceType.CSV,
  path: '/data/file.csv',
});

// Read CSV
for await (const record of connector.read({
  delimiter: ',',
  header: true,
  encoding: 'utf-8',
})) {
  console.log(record);
}
```

#### JSON Connector

**Configuration:**

```typescript
import { JSONConnector } from '@intelgraph/data-connectors';

const connector = new JSONConnector();
await connector.connect({
  type: DataSourceType.JSON,
  path: '/data/file.json',
});

// Read JSON
for await (const record of connector.read({
  jsonPath: '$.data[*]',
})) {
  console.log(record);
}
```

#### Parquet Connector

**Configuration:**

```typescript
import { ParquetConnector } from '@intelgraph/data-connectors';

const connector = new ParquetConnector();
await connector.connect({
  type: DataSourceType.PARQUET,
  path: '/data/file.parquet',
});

// Read Parquet
for await (const record of connector.read()) {
  console.log(record);
}
```

### SaaS Application Connectors

#### Salesforce Connector

**Configuration:**

```typescript
import { SalesforceConnector } from '@intelgraph/data-connectors';

const connector = new SalesforceConnector();
await connector.connect({
  type: DataSourceType.SALESFORCE,
  instanceUrl: 'https://yourinstance.salesforce.com',
  accessToken: 'your-access-token',
  apiVersion: '58.0',
});

// Query Salesforce
for await (const record of connector.read({
  soql: 'SELECT Id, Name FROM Account',
})) {
  console.log(record);
}
```

#### HubSpot Connector

**Configuration:**

```typescript
import { HubSpotConnector } from '@intelgraph/data-connectors';

const connector = new HubSpotConnector();
await connector.connect({
  type: DataSourceType.HUBSPOT,
  apiKey: 'your-api-key',
  portalId: 'your-portal-id',
});
```

#### Jira Connector

**Configuration:**

```typescript
import { JiraConnector } from '@intelgraph/data-connectors';

const connector = new JiraConnector();
await connector.connect({
  type: DataSourceType.JIRA,
  host: 'yourcompany.atlassian.net',
  email: 'user@example.com',
  apiToken: 'your-api-token',
});

// Query issues
for await (const issue of connector.read({
  jql: 'project = PROJ AND status = Open',
})) {
  console.log(issue);
}
```

## Creating Custom Connectors

### Implementing a Custom Connector

```typescript
import {
  BaseConnector,
  ConnectionConfig,
  ReadOptions,
  WriteOptions,
  WriteResult,
  SchemaInfo,
} from '@intelgraph/data-integration';

export class MyCustomConnector extends BaseConnector {
  private client: any;

  constructor() {
    super({
      name: 'My Custom Connector',
      version: '1.0.0',
      description: 'Custom connector for XYZ system',
      type: DataSourceType.CUSTOM,
      capabilities: {
        supportsStreaming: true,
        supportsBatch: true,
        supportsIncremental: false,
        supportsCDC: false,
        supportsSchema: true,
        supportsPartitioning: false,
        supportsTransactions: false,
      },
      configSchema: {},
    });
  }

  async connect(config: ConnectionConfig): Promise<void> {
    this.config = config;
    // Initialize client connection
    this.client = await createClient(config);
    this.connected = true;
    this.emit('connected');
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = undefined;
    }
    this.connected = false;
    this.emit('disconnected');
  }

  async getSchema(tableName?: string): Promise<SchemaInfo | SchemaInfo[]> {
    // Return schema information
    return {
      name: 'my-schema',
      type: 'table',
      fields: [],
    };
  }

  async *read(options?: ReadOptions): AsyncIterableIterator<any> {
    // Implement read logic
    const results = await this.client.query(options);
    for (const record of results) {
      yield record;
    }
  }

  async write(data: any[], options?: WriteOptions): Promise<WriteResult> {
    // Implement write logic
    const startTime = Date.now();
    await this.client.bulkInsert(data);

    return {
      recordsWritten: data.length,
      recordsFailed: 0,
      errors: [],
      duration: Date.now() - startTime,
    };
  }
}
```

### Using Custom Connector

```typescript
import { MyCustomConnector } from './MyCustomConnector';

const connector = new MyCustomConnector();
await connector.connect(config);

// Use in pipeline
pipeline.setSourceConnector(connector);
```

## Connector Configuration Best Practices

1. **Connection Pooling**: Configure appropriate pool sizes for database connectors
2. **Timeouts**: Set reasonable timeout values to prevent hanging connections
3. **SSL/TLS**: Enable encryption for production environments
4. **Retry Logic**: Configure retry strategies for transient failures
5. **Batch Sizes**: Optimize batch sizes based on data volume and target system
6. **Authentication**: Use secure authentication methods (API keys, OAuth)
7. **Error Handling**: Implement comprehensive error handling
8. **Resource Cleanup**: Always disconnect connectors after use
9. **Monitoring**: Monitor connector health and performance
10. **Testing**: Test connections before production use

## Performance Optimization

### Connection Pooling

```typescript
const connector = new PostgresConnector();
await connector.connect({
  // ...
  poolSize: 20, // Increase pool size for high concurrency
  timeout: 30000,
});
```

### Batch Operations

```typescript
// Read in larger batches
for await (const record of connector.read({
  batchSize: 5000, // Optimize based on memory and network
})) {
  // Process batch
}

// Write in batches
await connector.write(data, {
  batchSize: 1000,
  mode: 'append',
});
```

### Parallel Processing

```typescript
import PQueue from 'p-queue';

const queue = new PQueue({ concurrency: 10 });

for await (const record of connector.read()) {
  queue.add(async () => {
    await processRecord(record);
  });
}

await queue.onIdle();
```

## Troubleshooting

### Common Issues

**Connection Timeouts:**
```typescript
// Increase timeout
await connector.connect({
  ...config,
  timeout: 60000, // 60 seconds
});
```

**Memory Issues:**
```typescript
// Reduce batch size
for await (const record of connector.read({
  batchSize: 100, // Smaller batches
})) {
  // Process
}
```

**SSL Certificate Errors:**
```typescript
await connector.connect({
  ...config,
  ssl: {
    rejectUnauthorized: false, // For self-signed certs (dev only)
  },
});
```

## Next Steps

- [Integration Guide](./GUIDE.md) - Complete integration platform guide
- [Best Practices](./BEST_PRACTICES.md) - Advanced optimization techniques
