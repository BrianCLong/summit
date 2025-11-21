# Real-Time Streaming Analytics Pipeline

Enterprise-scale streaming analytics platform for processing millions of events per second with sub-second latency.

## Quick Start

### 1. Start Kafka Cluster

```bash
cd infrastructure/kafka-cluster
docker-compose -f docker-compose.kafka.yml up -d

# Wait for cluster to be ready (30 seconds)
sleep 30

# Initialize topics
docker exec -it kafka-1 bash init-topics.sh
```

### 2. Start Stream Processor

```bash
cd services/stream-processor
pnpm install
pnpm dev
```

### 3. Start Alert Engine

```bash
cd services/alert-engine
pnpm install
pnpm dev
```

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed architecture documentation.

## Packages

- **@intelgraph/kafka-integration**: Kafka producer/consumer with EOS
- **@intelgraph/stream-processing**: Stream processing framework
- **@intelgraph/stream-analytics**: Real-time analytics and ML
- **@intelgraph/cep-engine**: Complex event processing

## Services

- **alert-engine**: Real-time alerting service (port 3003)
- **stream-processor**: Main stream processing service

## Key Features

✅ **High Throughput**: 1M+ events/second
✅ **Low Latency**: Sub-100ms P99
✅ **Exactly-Once Semantics**: Guaranteed delivery
✅ **Complex Event Processing**: Pattern-based detection
✅ **Real-Time ML**: Online inference and anomaly detection
✅ **Comprehensive Alerting**: Multi-channel notifications
✅ **Fault Tolerance**: Checkpointing and state management
✅ **Monitoring**: Built-in observability

## Configuration

### Environment Variables

```bash
# Kafka
KAFKA_BROKERS=kafka-1:9092,kafka-2:9093,kafka-3:9094
SCHEMA_REGISTRY_URL=http://localhost:8081

# Redis
REDIS_URL=redis://localhost:6379

# Database
DATABASE_URL=postgresql://localhost:5432/intelgraph

# Alert Engine
PORT=3003
```

## Monitoring

Access Kafka UI at http://localhost:8080

Monitor stream metrics:
- Consumer lag
- Throughput (events/sec)
- Processing latency
- Error rates

## Examples

See [ARCHITECTURE.md](./ARCHITECTURE.md) for code examples.

## License

MIT
