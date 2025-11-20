# Real-time Stream Processing and Event Intelligence Platform Guide

## Overview

Summit's Real-time Stream Processing and Event Intelligence Platform provides enterprise-grade distributed streaming infrastructure with comprehensive event processing, complex event correlation, and streaming analytics capabilities that surpass specialized tools like Apache Kafka and Apache Flink.

## Architecture

### Core Components

1. **Stream Processing** (`@intelgraph/stream-processing`)
   - Distributed message broker with Kafka-compatible API
   - Multi-broker replication and partitioning
   - Exactly-once semantics support
   - High-throughput message ingestion (millions/sec)
   - Stream retention and compaction policies

2. **Event Processing** (`@intelgraph/event-processing`)
   - Complex Event Processing (CEP) engine
   - Pattern matching across event streams
   - Event enrichment and transformation
   - Real-time filtering and routing

3. **Real-time Analytics** (`@intelgraph/real-time-analytics`)
   - Statistical calculations on streams
   - Moving averages and trend detection
   - Anomaly detection
   - Time series analysis

4. **CEP Engine** (`@intelgraph/cep-engine`)
   - Advanced pattern matching
   - Event correlation
   - Anomaly detection algorithms

5. **Stream Ingestion** (`@intelgraph/stream-ingestion`)
   - Multi-protocol data collectors
   - HTTP, WebSocket, MQTT, gRPC support
   - File-based ingestion
   - Database Change Data Capture (CDC)

## Getting Started

### Installation

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Start streaming service
cd services/streaming-service
pnpm start

# Start event correlation service
cd services/event-correlation-service
pnpm start
```

### Basic Usage

#### Creating a Topic

```typescript
import { MessageBroker, type TopicConfig } from '@intelgraph/stream-processing';

const broker = new MessageBroker({
  brokerId: 0,
  host: 'localhost',
  port: 9092,
  dataDir: '/tmp/stream-data',
  logDirs: ['/tmp/stream-logs'],
});

await broker.start();

const topicConfig: TopicConfig = {
  name: 'intelligence-events',
  partitions: 6,
  replicationFactor: 3,
  retentionMs: 7 * 24 * 60 * 60 * 1000, // 7 days
  compressionType: 'lz4',
};

await broker.createTopic(topicConfig);
```

#### Producing Messages

```typescript
import { StreamProducer, type ProducerConfig } from '@intelgraph/stream-processing';

const producerConfig: ProducerConfig = {
  clientId: 'intel-producer',
  bootstrapServers: ['localhost:9092'],
  acks: 'all',
  idempotence: true,
  compressionType: 'lz4',
};

const producer = new StreamProducer(producerConfig);
await producer.connect(brokers);

const result = await producer.send({
  topic: 'intelligence-events',
  key: 'entity-123',
  value: JSON.stringify({
    eventType: 'entity.created',
    entityId: 'entity-123',
    timestamp: Date.now(),
    data: { /* entity data */ },
  }),
});

console.log(`Message produced to partition ${result.partition} at offset ${result.offset}`);
```

#### Consuming Messages

```typescript
import { StreamConsumer, type ConsumerConfig } from '@intelgraph/stream-processing';

const consumerConfig: ConsumerConfig = {
  groupId: 'intel-consumers',
  clientId: 'consumer-1',
  bootstrapServers: ['localhost:9092'],
  autoOffsetReset: 'earliest',
  enableAutoCommit: true,
};

const consumer = new StreamConsumer(consumerConfig);
await consumer.connect(brokers);
await consumer.subscribe(['intelligence-events']);

await consumer.start(async (record) => {
  const event = JSON.parse(record.value.toString());
  console.log(`Received event: ${event.eventType}`);

  // Process event
  await processIntelligenceEvent(event);
});
```

## Complex Event Processing

### Pattern Matching

Define patterns to detect complex event sequences:

```typescript
import { CEPEngine, type EventPattern } from '@intelgraph/event-processing';

const cepEngine = new CEPEngine();

const suspiciousActivityPattern: EventPattern = {
  id: 'suspicious-activity-pattern',
  name: 'Suspicious Activity Detection',
  description: 'Detects multiple failed login attempts followed by successful login',
  conditions: [
    {
      field: 'eventType',
      operator: 'eq',
      value: 'auth.login.failed',
      eventType: 'auth.login.failed',
    },
    {
      field: 'eventType',
      operator: 'eq',
      value: 'auth.login.success',
      eventType: 'auth.login.success',
    },
  ],
  windowConfig: {
    type: 'sliding',
    size: 60000, // 1 minute
  },
  action: {
    type: 'alert',
    config: {
      severity: 'high',
      notify: ['security-team'],
    },
  },
};

cepEngine.registerPattern(suspiciousActivityPattern);

cepEngine.on('pattern:matched', ({ pattern, sequence }) => {
  console.log(`Pattern matched: ${pattern.name}`);
  console.log(`Events: ${sequence.events.length}`);
});

cepEngine.on('alert:generated', (alert) => {
  console.log(`ALERT: ${alert.title} [${alert.severity}]`);
  // Send to alerting system
});
```

### Event Enrichment

Enrich events with additional context:

```typescript
import { EventEnricher, type EnrichmentRule } from '@intelgraph/event-processing';

const enricher = new EventEnricher();

const geoEnrichmentRule: EnrichmentRule = {
  id: 'geo-enrichment',
  eventType: 'user.login',
  enrichmentType: 'geo',
  config: {
    ipField: 'ipAddress',
  },
};

const apiEnrichmentRule: EnrichmentRule = {
  id: 'threat-intel-enrichment',
  eventType: 'network.connection',
  enrichmentType: 'api',
  config: {
    apiUrl: 'https://threat-intel-api.example.com/lookup',
    apiKey: process.env.THREAT_INTEL_API_KEY,
  },
};

enricher.registerEnrichmentRule(geoEnrichmentRule);
enricher.registerEnrichmentRule(apiEnrichmentRule);

const enrichedEvent = await enricher.enrichEvent(event);
console.log('Enriched data:', enrichedEvent.enrichedData);
```

### Event Transformation

Transform and normalize event data:

```typescript
import { EventTransformer, type TransformationRule } from '@intelgraph/event-processing';

const transformer = new EventTransformer();

const normalizationRule: TransformationRule = {
  id: 'normalize-timestamps',
  eventType: '*', // Apply to all events
  transformations: [
    {
      field: 'timestamp',
      operation: 'convert',
      config: { type: 'timestamp' },
    },
    {
      field: 'user.email',
      operation: 'mask',
      config: {
        maskChar: '*',
        preserveStart: 2,
        preserveEnd: 10, // Preserve domain
      },
    },
  ],
};

transformer.registerTransformationRule(normalizationRule);

const transformedEvent = await transformer.transformEvent(event);
```

## Real-time Analytics

### Stream Analytics Queries

Define analytics queries to compute metrics in real-time:

```typescript
import { StreamAnalytics, type AnalyticsQuery } from '@intelgraph/real-time-analytics';

const analytics = new StreamAnalytics();

const loginMetricsQuery: AnalyticsQuery = {
  id: 'login-metrics',
  name: 'Login Metrics by Country',
  eventTypes: ['user.login'],
  window: {
    type: 'tumbling',
    size: 300000, // 5 minutes
  },
  metrics: [
    { name: 'login_count', field: 'eventId', function: 'count' },
    { name: 'avg_duration', field: 'duration', function: 'avg' },
    { name: 'p95_duration', field: 'duration', function: 'percentile', percentile: 95 },
  ],
  groupBy: ['country', 'deviceType'],
};

analytics.registerQuery(loginMetricsQuery);

analytics.on('analytics:result', (result) => {
  console.log(`Query ${result.queryId} results:`);

  for (const group of result.groups) {
    console.log(`${group.keys.country} (${group.keys.deviceType}):`, group.metrics);
  }
});

await analytics.processEvent(event);
```

### Anomaly Detection

Detect anomalies in time series data:

```typescript
import { StreamAnalytics, type AnomalyDetectionConfig } from '@intelgraph/real-time-analytics';

const anomalyConfig: AnomalyDetectionConfig = {
  method: 'zscore',
  sensitivity: 3,
  threshold: 3,
};

const timeSeries = [
  { timestamp: Date.now() - 10000, value: 100 },
  { timestamp: Date.now() - 9000, value: 105 },
  { timestamp: Date.now() - 8000, value: 98 },
  { timestamp: Date.now() - 7000, value: 1000 }, // Anomaly
];

const anomalies = await analytics.detectAnomalies(timeSeries, anomalyConfig);

for (const anomaly of anomalies) {
  console.log(`Anomaly detected at ${new Date(anomaly.timestamp)}`);
  console.log(`Value: ${anomaly.value}, Expected: ${anomaly.expected}`);
  console.log(`Severity: ${anomaly.severity}`);
}
```

## Event Correlation

Correlate events across multiple streams:

```typescript
import { EventCorrelator, type CorrelationRule } from '@intelgraph/cep-engine';

const correlator = new EventCorrelator();

const sessionCorrelationRule: CorrelationRule = {
  id: 'user-session-correlation',
  name: 'User Session Correlation',
  eventTypes: ['user.login', 'user.action', 'user.logout'],
  correlationKey: 'sessionId',
  timeWindow: 3600000, // 1 hour
  minEvents: 2,
  maxEvents: 1000,
};

correlator.registerCorrelationRule(sessionCorrelationRule);

correlator.on('events:correlated', ({ rule, events }) => {
  console.log(`Correlated ${events.length} events for rule: ${rule.name}`);

  // Analyze user session
  analyzeUserSession(events);
});

const correlated = await correlator.correlateEvents(events);
```

## Data Ingestion

### HTTP Collector

Ingest data via HTTP endpoints:

```typescript
import { HttpCollector, type CollectorConfig } from '@intelgraph/stream-ingestion';

const httpConfig: CollectorConfig = {
  name: 'http-collector',
  type: 'http',
  port: 8080,
  path: '/ingest',
  topic: 'raw-events',
};

const httpCollector = new HttpCollector(httpConfig);
await httpCollector.start(producer);

// POST events to http://localhost:8080/ingest
```

### WebSocket Collector

Real-time data ingestion via WebSocket:

```typescript
import { WebSocketCollector, type CollectorConfig } from '@intelgraph/stream-ingestion';

const wsConfig: CollectorConfig = {
  name: 'websocket-collector',
  type: 'websocket',
  port: 8081,
  topic: 'realtime-events',
};

const wsCollector = new WebSocketCollector(wsConfig);
await wsCollector.start(producer);

// Connect WebSocket client to ws://localhost:8081
```

## Performance Tuning

### Producer Optimization

```typescript
const producerConfig: ProducerConfig = {
  clientId: 'high-throughput-producer',
  bootstrapServers: ['broker1:9092', 'broker2:9092', 'broker3:9092'],

  // Batching
  batchSize: 65536, // 64KB
  lingerMs: 50, // Wait up to 50ms to batch

  // Compression
  compressionType: 'lz4',

  // Reliability
  acks: 'all',
  retries: 5,
  idempotence: true,

  // Performance
  maxInFlightRequestsPerConnection: 5,
  bufferMemory: 128 * 1024 * 1024, // 128MB
};
```

### Consumer Optimization

```typescript
const consumerConfig: ConsumerConfig = {
  groupId: 'high-throughput-consumers',
  clientId: 'consumer-1',
  bootstrapServers: ['broker1:9092', 'broker2:9092', 'broker3:9092'],

  // Fetch settings
  maxPollRecords: 1000,
  maxPollIntervalMs: 600000, // 10 minutes

  // Offset management
  enableAutoCommit: false, // Manual commit for better control
  autoOffsetReset: 'earliest',

  // Session management
  sessionTimeoutMs: 30000,
  heartbeatIntervalMs: 3000,
};

// Manual offset commit
const messages = await consumer.poll();
await processMessages(messages);
await consumer.commitOffsets();
```

## Monitoring and Metrics

Access real-time metrics:

```typescript
const metrics = broker.getMetrics();

console.log('Messages In/Sec:', metrics.messagesInPerSec);
console.log('Messages Out/Sec:', metrics.messagesOutPerSec);
console.log('Bytes In/Sec:', metrics.bytesInPerSec);
console.log('Bytes Out/Sec:', metrics.bytesOutPerSec);
console.log('Under-replicated Partitions:', metrics.underReplicatedPartitions);
console.log('Leader Election Rate:', metrics.leaderElectionRate);
```

## API Reference

### REST API Endpoints

#### Streaming Service (Port 3000)

- `GET /health` - Health check
- `POST /api/topics` - Create topic
- `GET /api/topics` - List topics
- `POST /api/produce` - Produce message
- `GET /api/consume/:topic/:partition` - Consume messages
- `GET /api/metrics` - Get broker metrics
- `POST /api/cep/patterns` - Register CEP pattern
- `POST /api/enrichment/rules` - Register enrichment rule
- `POST /api/collectors` - Register data collector

#### Event Correlation Service (Port 3001)

- `GET /health` - Health check
- `POST /api/correlation/rules` - Register correlation rule
- `POST /api/patterns` - Register pattern
- `POST /api/analytics/queries` - Register analytics query
- `GET /api/alerts` - Get alerts
- `GET /api/alerts/:id` - Get alert by ID
- `GET /api/correlation/events` - Get correlated events
- `POST /api/events` - Process event
- `GET /api/stats` - Get statistics

## Best Practices

### 1. Topic Design

- Use clear, hierarchical naming: `domain.entity.action`
- Set appropriate retention policies based on use case
- Choose partition count based on throughput requirements
- Set replication factor >= 2 for production

### 2. Event Schema

- Include consistent metadata: `eventId`, `eventType`, `timestamp`, `source`
- Version your event schemas
- Use meaningful event types
- Include correlation IDs for tracing

### 3. CEP Patterns

- Keep patterns focused and specific
- Use appropriate window sizes
- Consider performance impact of complex patterns
- Test patterns with sample data

### 4. Performance

- Batch produce when possible
- Use compression for large messages
- Tune consumer fetch settings
- Monitor lag and adjust consumer instances

### 5. Reliability

- Enable idempotence for exactly-once semantics
- Use transactions for multi-topic writes
- Implement proper error handling
- Monitor replication and ISR

## Troubleshooting

### High Consumer Lag

- Increase number of consumer instances
- Optimize message processing
- Increase `maxPollRecords`
- Check network latency

### Under-replicated Partitions

- Check broker health
- Verify network connectivity
- Review replication settings
- Check disk space

### Pattern Not Matching

- Verify event types match conditions
- Check window configuration
- Review field names and values
- Enable debug logging

## Advanced Topics

See additional documentation:

- [CEP Patterns](./CEP_PATTERNS.md) - Detailed pattern examples
- [Deployment Guide](./DEPLOYMENT.md) - Production deployment
- [Performance Tuning](./PERFORMANCE.md) - Advanced optimization

## Support

For issues and questions:
- GitHub Issues: https://github.com/summit/issues
- Documentation: https://docs.summit.io
- Slack: #streaming-platform
