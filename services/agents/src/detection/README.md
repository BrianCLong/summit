# Anomaly Detection System

Unsupervised anomaly detection for OSINT/CTI outlier detection over Neo4j and pgvector data streams with agentic alerting at edge scale.

## Overview

This module provides a production-ready anomaly detection system that combines:

- **Isolation Forest** - Feature-based unsupervised anomaly detection
- **Graph Diffusion** - Network/graph-based anomaly detection
- **Stream Processing** - Real-time consumption from Neo4j and pgvector via Redis streams
- **Agentic Alerting** - Intelligent alert management with escalation and auto-investigation

### Performance Targets

| Metric | Target | Achieved |
|--------|--------|----------|
| Precision | 91% | ≥85%* |
| p95 Latency | <500ms | <500ms |
| Throughput | >1000 pts/sec | >1000 pts/sec |

*Precision varies based on data characteristics and contamination rate.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    AnomalyDetectionService                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐    ┌──────────────────┐    ┌───────────────┐  │
│  │   Neo4j     │───►│                  │───►│  Isolation    │  │
│  │   Stream    │    │  StreamProcessor │    │  Forest       │  │
│  └─────────────┘    │                  │    │  Detector     │  │
│                     │  - Batching      │    └───────────────┘  │
│  ┌─────────────┐    │  - Feature       │           │           │
│  │  pgvector   │───►│    Extraction    │           ▼           │
│  │   Stream    │    │  - Graph Updates │    ┌───────────────┐  │
│  └─────────────┘    └──────────────────┘    │   Combined    │  │
│                             │               │   Scoring     │  │
│                             ▼               └───────────────┘  │
│                     ┌──────────────────┐           │           │
│                     │  Graph Diffusion │           │           │
│                     │  Detector        │───────────┘           │
│                     └──────────────────┘                       │
│                                                                 │
│                             ▼                                   │
│                     ┌──────────────────┐                       │
│                     │  AlertingAgent   │                       │
│                     │  - Deduplication │                       │
│                     │  - Throttling    │                       │
│                     │  - Escalation    │                       │
│                     └──────────────────┘                       │
│                             │                                   │
│           ┌─────────────────┼─────────────────┐                │
│           ▼                 ▼                 ▼                │
│    ┌────────────┐   ┌────────────┐   ┌────────────┐           │
│    │   Redis    │   │  Webhook   │   │   Agent    │           │
│    │   Stream   │   │  Endpoint  │   │   Bus      │           │
│    └────────────┘   └────────────┘   └────────────┘           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Components

### IsolationForestDetector

Implements the Isolation Forest algorithm for unsupervised anomaly detection.

**Key Features:**
- Random forest of isolation trees
- O(n log n) training, O(log n) detection
- Feature contribution analysis
- Incremental updates via partial fitting
- Serialization for model persistence

**Configuration:**
```typescript
{
  numTrees: 100,        // Number of isolation trees
  subsampleSize: 256,   // Subsample size for each tree
  maxDepth: 8,          // Maximum tree depth
  contamination: 0.1,   // Expected anomaly ratio
  bootstrapSampling: true
}
```

### GraphDiffusionDetector

Implements graph-based anomaly detection using diffusion processes.

**Key Features:**
- PageRank-style diffusion scoring
- Local neighborhood analysis
- Clustering coefficient computation
- Node embedding similarity
- Incremental node/edge addition

**Configuration:**
```typescript
{
  diffusionSteps: 5,       // Random walk steps
  dampingFactor: 0.85,     // PageRank damping
  convergenceThreshold: 1e-6,
  neighborhoodSize: 2,     // k-hop neighborhood
  useEdgeWeights: true,
  embeddingDimension: 64
}
```

### StreamProcessor

Consumes data from Redis streams connected to Neo4j and pgvector.

**Key Features:**
- Consumer group-based processing
- Automatic batching with timeout
- Feature vector extraction
- Graph structure updates
- Backpressure handling

### AlertingAgent

Intelligent alert management system.

**Key Features:**
- Priority-based triage (P0-P4)
- Deduplication within time windows
- Per-entity throttling
- Escalation rules
- Multi-channel delivery (Redis, webhooks, GraphQL subscriptions)
- Auto-investigation triggers

## Usage

### Basic Setup

```typescript
import { AnomalyDetectionService } from './detection';

const service = new AnomalyDetectionService({
  detector: {
    isolationForest: { numTrees: 100, contamination: 0.1 },
    graphDiffusion: { diffusionSteps: 5 },
    thresholds: { anomalyScoreThreshold: 0.7 },
  },
  alerting: {
    enabled: true,
    channels: [
      { type: 'redis', endpoint: 'alerts:anomaly', enabled: true },
    ],
  },
});

await service.initialize();
await service.start();
```

### Manual Detection

```typescript
const anomalies = await service.detectManual(streamDataPoints);
```

### Custom Alert Handler

```typescript
alertingAgent.registerHandler('custom-channel', async (alert) => {
  // Custom alert processing
  console.log('Alert received:', alert);
});
```

## Tradeoffs Analysis

### Proactive Detection (+)

| Advantage | Impact |
|-----------|--------|
| **Early Warning** | Detects anomalies before they escalate |
| **Continuous Monitoring** | 24/7 automated detection |
| **Pattern Discovery** | Identifies unknown threat patterns |
| **Reduced MTTR** | Faster incident response |
| **Scale** | Handles high-volume data streams |

### False Positive Considerations (-)

| Challenge | Mitigation |
|-----------|-----------|
| **Alert Fatigue** | Deduplication, throttling, severity filtering |
| **Investigation Overhead** | Auto-investigation for high-priority alerts |
| **Tuning Required** | Configurable thresholds, incremental learning |
| **Context Dependency** | Graph-based detection adds structural context |
| **Baseline Drift** | Periodic retraining, exponential moving average |

### Algorithm Selection Rationale

#### Why Isolation Forest?

1. **No assumption on data distribution** - Works with any feature distribution
2. **Efficient** - O(n log n) training, O(log n) inference
3. **Interpretable** - Feature contributions explain detections
4. **Scalable** - Linear memory, parallelizable

#### Why Graph Diffusion?

1. **Structural anomalies** - Catches anomalies invisible in feature space
2. **Relationship context** - Leverages entity connections
3. **Incremental updates** - New nodes don't require full retraining
4. **Complementary** - Different perspective from feature-based detection

### Performance vs Accuracy Trade-offs

| Setting | Performance | Accuracy |
|---------|-------------|----------|
| More trees | Slower training | Higher precision |
| Larger subsample | Slower training | Better generalization |
| More diffusion steps | Slower detection | Better convergence |
| Lower threshold | Faster decisions | More false positives |

### Recommended Configurations

#### High-Precision Mode (Fewer False Positives)
```typescript
{
  isolationForest: { numTrees: 200, contamination: 0.05 },
  thresholds: { anomalyScoreThreshold: 0.85, confidenceThreshold: 0.8 }
}
```

#### High-Recall Mode (Fewer Missed Anomalies)
```typescript
{
  isolationForest: { numTrees: 100, contamination: 0.15 },
  thresholds: { anomalyScoreThreshold: 0.6, confidenceThreshold: 0.5 }
}
```

#### Low-Latency Mode
```typescript
{
  isolationForest: { numTrees: 50, maxDepth: 6 },
  graphDiffusion: { diffusionSteps: 3 },
  performance: { batchSize: 50 }
}
```

## API Reference

### AnomalyDetectionService

```typescript
class AnomalyDetectionService {
  initialize(): Promise<void>
  start(): Promise<void>
  stop(): Promise<void>
  detectManual(data: StreamDataPoint[]): Promise<DetectedAnomaly[]>
  trainManual(data: FeatureVector[]): Promise<void>
  recordFeedback(alertId: string, isTruePositive: boolean): void
  getMetrics(): DetectionMetrics
  getHealth(): Promise<DetectorHealth>
}
```

### IsolationForestDetector

```typescript
class IsolationForestDetector {
  fit(data: FeatureVector[]): Promise<void>
  detect(data: FeatureVector[]): Promise<AnomalyScore[]>
  detectSingle(vector: FeatureVector): Promise<AnomalyScore>
  partialFit(newData: FeatureVector[]): Promise<void>
  serialize(): string
  static deserialize(data: string): IsolationForestDetector
}
```

### GraphDiffusionDetector

```typescript
class GraphDiffusionDetector {
  fit(nodes: GraphNode[], edges: GraphEdge[]): Promise<void>
  detect(nodeIds: string[]): Promise<AnomalyScore[]>
  addNodes(nodes: GraphNode[], edges: GraphEdge[]): Promise<void>
  getNodeProfile(nodeId: string): NodeProfile | undefined
}
```

### AlertingAgent

```typescript
class AlertingAgent {
  initialize(redisUrl?: string): Promise<void>
  processAnomaly(anomaly: DetectedAnomaly): Promise<AnomalyAlert | null>
  processBatch(anomalies: DetectedAnomaly[]): Promise<AnomalyAlert[]>
  acknowledgeAlert(alertId: string, assignee?: string): Promise<boolean>
  resolveAlert(alertId: string, resolution?: string): Promise<boolean>
  dismissAlert(alertId: string, reason?: string): Promise<boolean>
  getActiveAlerts(): AnomalyAlert[]
  shutdown(): Promise<void>
}
```

## Testing

```bash
# Run all tests
pnpm test services/agents/src/detection

# Run with coverage
pnpm test --coverage services/agents/src/detection

# Run performance benchmarks
pnpm test services/agents/src/detection/__tests__/anomaly-detection.test.ts -t "Performance"
```

## Monitoring

### Metrics

The service exposes the following metrics:

- `anomaly_detection_total_processed` - Total data points processed
- `anomaly_detection_anomalies_detected` - Total anomalies detected
- `anomaly_detection_latency_ms` - Detection latency histogram
- `anomaly_detection_precision` - Estimated precision from feedback
- `anomaly_detection_queue_depth` - Stream processing queue depth

### Health Check

```typescript
const health = await service.getHealth();
// {
//   status: 'healthy' | 'degraded' | 'unhealthy',
//   detectorState: 'ready' | 'initializing' | 'error',
//   neo4jConnected: boolean,
//   pgvectorConnected: boolean,
//   redisConnected: boolean,
//   queueDepth: number,
//   errors: string[]
// }
```

## Integration

### With Existing Agent Bus

The alerting agent integrates with the existing Summit agent bus:

```typescript
// Alerts can trigger auto-investigation via the agent bus
await redis.xAdd('agents', '*', {
  kind: 'investigate',
  msg: JSON.stringify({
    alertId: alert.id,
    entityId: alert.entityId,
    evidence: alert.metadata.evidence,
  }),
});
```

### With Neo4j

Configure Neo4j change data capture to publish to Redis:

```cypher
// Example CDC configuration
CALL apoc.trigger.add('anomaly-stream',
  'UNWIND $createdNodes AS n
   CALL apoc.redis.xadd("neo4j:changes", "*", {
     nodeId: id(n),
     nodeType: labels(n)[0],
     properties: properties(n)
   }) YIELD value
   RETURN value',
  {phase:'after'});
```

### With pgvector

Configure embedding updates to publish to Redis:

```sql
-- Example trigger for pgvector changes
CREATE OR REPLACE FUNCTION notify_embedding_change()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify('embeddings',
    json_build_object(
      'id', NEW.id,
      'embedding', NEW.embedding::text,
      'operation', TG_OP
    )::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

## License

Internal use only - Summit/IntelGraph Platform
