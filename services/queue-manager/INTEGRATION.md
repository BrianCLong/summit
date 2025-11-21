# Queue Manager Integration Guide

This guide shows how to integrate the Queue Manager into existing services.

## Integration with Existing Services

### 1. Import Queue Manager as a Library

```typescript
import { QueueManager, JobPriority } from '@intelgraph/queue-manager';

const queueManager = new QueueManager();
```

### 2. Replace Existing Queue Usage

**Before (server/src/services/QueueService.ts):**

```typescript
import { Queue, Worker } from 'bullmq';

const socialQueue = new Queue('social:ingest', { connection });
```

**After:**

```typescript
import { QueueManager, JobPriority } from '@intelgraph/queue-manager';

const queueManager = new QueueManager();
queueManager.registerQueue('social:ingest', {
  rateLimit: { max: 100, duration: 60000 },
});
```

### 3. Migration Example for Social Service

**Old Implementation (server/src/services/QueueService.ts):**

```typescript
export async function enqueueSocial(
  provider: string,
  query: string,
  investigationId: string,
  options: QueueOptions = {},
): Promise<string> {
  const job = await socialQueue.add(
    'ingest',
    { provider, query, investigationId, ...options },
    { attempts: 3, backoff: { type: 'exponential', delay: 1000 } },
  );
  return job.id!;
}
```

**New Implementation:**

```typescript
import { queueManager } from './queueManagerInstance';
import { JobPriority } from '@intelgraph/queue-manager';

export async function enqueueSocial(
  provider: string,
  query: string,
  investigationId: string,
  options: QueueOptions = {},
): Promise<string> {
  const job = await queueManager.addJob(
    'social:ingest',
    'ingest',
    { provider, query, investigationId, ...options },
    {
      priority: options.priority || JobPriority.NORMAL,
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
    },
  );
  return job.id!;
}
```

### 4. Create Shared Queue Manager Instance

**server/src/queue/queueManagerInstance.ts:**

```typescript
import { QueueManager } from '@intelgraph/queue-manager';

export const queueManager = new QueueManager();

// Register all application queues
queueManager.registerQueue('social:ingest', {
  rateLimit: { max: 100, duration: 60000 },
});

queueManager.registerQueue('webhooks', {
  rateLimit: { max: 50, duration: 60000 },
});

queueManager.registerQueue('data-processing');
queueManager.registerQueue('ai-inference', {
  rateLimit: { max: 20, duration: 60000 },
});

// Register processors
import SocialService from '../services/SocialService.js';

queueManager.registerProcessor('social:ingest', async (job) => {
  const { provider, query, investigationId, host, limit } = job.data;
  const svc = new SocialService();
  return await svc.queryProvider(provider, query, investigationId, {
    host,
    limit,
  });
});

// Start workers
queueManager.startWorkers();

// Graceful shutdown
process.on('SIGTERM', async () => {
  await queueManager.shutdown();
  process.exit(0);
});
```

### 5. Update Server Initialization

**server/server.ts:**

```typescript
import { queueManager } from './queue/queueManagerInstance.js';

async function startServer() {
  // ... existing server setup

  // Queue manager is already initialized in queueManagerInstance.ts

  // Optionally expose queue metrics endpoint
  app.get('/queue/metrics', async (req, res) => {
    const metrics = await queueManager.getAllMetrics();
    res.json(metrics);
  });
}
```

## Using in Microservices

Each microservice can have its own queue manager instance:

**services/analytics-engine/src/queue.ts:**

```typescript
import { QueueManager } from '@intelgraph/queue-manager';

export const analyticsQueue = new QueueManager();

analyticsQueue.registerQueue('analytics-jobs');

analyticsQueue.registerProcessor('analytics-jobs', async (job) => {
  // Process analytics job
  return { processed: true };
});

analyticsQueue.startWorkers();
```

## Docker Compose Integration

Add queue manager to your docker-compose:

```yaml
version: '3.8'

services:
  # Existing services...

  queue-manager:
    build: ./services/queue-manager
    ports:
      - '3010:3010'
    environment:
      - REDIS_HOST=redis
      - REDIS_PORT=6379
    depends_on:
      - redis
    restart: unless-stopped

  # Add more worker instances for scaling
  queue-worker:
    build: ./services/queue-manager
    environment:
      - REDIS_HOST=redis
      - WORKER_CONCURRENCY=20
    depends_on:
      - redis
    deploy:
      replicas: 4
```

## Kubernetes Deployment

**k8s/queue-manager-deployment.yaml:**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: queue-manager
spec:
  replicas: 3
  selector:
    matchLabels:
      app: queue-manager
  template:
    metadata:
      labels:
        app: queue-manager
    spec:
      containers:
        - name: queue-manager
          image: intelgraph/queue-manager:latest
          ports:
            - containerPort: 3010
          env:
            - name: REDIS_HOST
              value: 'redis-service'
            - name: REDIS_PORT
              value: '6379'
            - name: WORKER_CONCURRENCY
              value: '10'
          resources:
            requests:
              memory: '512Mi'
              cpu: '500m'
            limits:
              memory: '2Gi'
              cpu: '2000m'
---
apiVersion: v1
kind: Service
metadata:
  name: queue-manager
spec:
  selector:
    app: queue-manager
  ports:
    - port: 3010
      targetPort: 3010
  type: LoadBalancer
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: queue-manager-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: queue-manager
  minReplicas: 3
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
```

## Monitoring Integration

### Prometheus

Queue metrics are automatically exposed at `/metrics`. Add to your prometheus config:

```yaml
scrape_configs:
  - job_name: 'queue-manager'
    static_configs:
      - targets: ['queue-manager:3010']
```

### Grafana Dashboard

Import the provided Grafana dashboard JSON to visualize:

- Queue depth over time
- Job throughput
- Processing times
- Error rates
- Worker utilization

## Migration Checklist

- [ ] Install `@intelgraph/queue-manager` package
- [ ] Create shared queue manager instance
- [ ] Migrate existing queue registrations
- [ ] Update job enqueueing code
- [ ] Register job processors
- [ ] Test with existing workloads
- [ ] Deploy queue manager service
- [ ] Set up monitoring dashboards
- [ ] Configure horizontal scaling
- [ ] Remove old queue code after validation

## Best Practices

1. **One Queue Manager per Application**: Share a single instance across your app
2. **Separate Queues by Concern**: Different queues for different job types
3. **Use Priority Wisely**: Don't overuse CRITICAL priority
4. **Monitor Metrics**: Set up alerts for queue depth and error rates
5. **Test Failure Scenarios**: Ensure jobs retry correctly
6. **Scale Gradually**: Start with fewer workers and scale up as needed

## Troubleshooting

### Jobs Not Processing

Check worker status:

```typescript
const metrics = await queueManager.getQueueMetrics('my-queue');
console.log('Active workers:', metrics.active);
```

### High Memory Usage

Increase job cleanup frequency:

```typescript
queueManager.registerQueue('my-queue', {
  defaultJobOptions: {
    removeOnComplete: {
      age: 3600, // 1 hour
      count: 100,
    },
  },
});
```

### Rate Limit Issues

Adjust rate limits:

```typescript
queueManager.registerQueue('api-calls', {
  rateLimit: {
    max: 50, // Reduce from 100
    duration: 60000,
  },
});
```

## Support

For issues or questions:

- Check the main README.md
- Review the examples/ directory
- Open an issue in the repository
