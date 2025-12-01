# Summit Cost Optimization & Resource Efficiency Guide

> **Last Updated**: 2025-11-20
> **Version**: 1.0.0
> **Author**: Cost Optimization Engineering Team

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Resource Tagging & Cost Allocation](#resource-tagging--cost-allocation)
4. [Auto-Scaling Strategies](#auto-scaling-strategies)
5. [Database Optimization](#database-optimization)
6. [Rate Limiting & Throttling](#rate-limiting--throttling)
7. [Cost Monitoring & Dashboards](#cost-monitoring--dashboards)
8. [Budget Alerts & Anomaly Detection](#budget-alerts--anomaly-detection)
9. [Spot Instances](#spot-instances)
10. [Best Practices](#best-practices)
11. [Troubleshooting](#troubleshooting)

---

## Overview

This guide describes the comprehensive cost optimization and resource efficiency implementation for the Summit/IntelGraph platform. Our cost optimization strategy focuses on:

- **Visibility**: Comprehensive resource tagging and cost allocation
- **Efficiency**: Auto-scaling, connection pooling, and resource optimization
- **Control**: Rate limiting, budget alerts, and anomaly detection
- **Savings**: Spot instances, right-sizing, and waste elimination

### Key Features

- ✅ Resource tagging and cost allocation by team, project, environment
- ✅ Horizontal Pod Autoscaling (HPA) and KEDA for all services
- ✅ Optimized PostgreSQL and Neo4j connection pooling
- ✅ Tiered rate limiting with cost tracking
- ✅ Real-time cost monitoring dashboards
- ✅ Budget alerts and anomaly detection
- ✅ Spot instance support for 60-80% cost savings
- ✅ Automatic resource waste detection

### Cost Savings Summary

Based on our implementation, you can expect:

| Optimization | Est. Savings | Implementation |
|-------------|--------------|----------------|
| Spot Instances | 60-80% | Kubernetes spot node groups |
| Auto-scaling | 30-50% | HPA + KEDA with smart policies |
| Connection Pooling | 20-40% | Optimized DB connections |
| Rate Limiting | 15-25% | Prevent abuse and overuse |
| Waste Detection | 10-20% | Identify idle resources |
| **Total Potential** | **70-90%** | Combined implementation |

---

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Cost Optimization Layer                   │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Resource    │  │  Budget      │  │  Cost        │      │
│  │  Tagging     │  │  Alerts      │  │  Monitoring  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Rate        │  │  Connection  │  │  Auto-       │      │
│  │  Limiting    │  │  Pooling     │  │  Scaling     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                           │
            ┌──────────────┼──────────────┐
            │              │              │
    ┌───────▼──────┐  ┌───▼────┐  ┌─────▼─────┐
    │  PostgreSQL  │  │ Neo4j  │  │  Redis    │
    │  (Pooled)    │  │(Pooled)│  │  (Cache)  │
    └──────────────┘  └────────┘  └───────────┘
```

### Data Flow

1. **Request arrives** → Rate limiter checks tier limits
2. **Resource tagged** → Cost allocation tracking
3. **Query executed** → Optimized connection pools
4. **Cost recorded** → Budget tracking and alerting
5. **Metrics collected** → Dashboards and anomaly detection
6. **Auto-scaling triggered** → Based on load and cost

---

## Resource Tagging & Cost Allocation

### Overview

The Resource Tagging Service provides comprehensive cost allocation tracking across all resources in the platform.

### Implementation

Located at: `server/src/services/ResourceTaggingService.ts`

### Standard Tag Categories

| Category | Description | Required | Example |
|----------|-------------|----------|---------|
| `environment` | Deployment environment | ✅ | `production`, `staging`, `dev` |
| `service` | Service name | ✅ | `api-server`, `analytics-engine` |
| `cost_center` | Billing cost center | ✅ | `engineering`, `operations` |
| `team` | Team responsible | ❌ | `platform`, `data-science` |
| `project` | Project name | ❌ | `graph-optimization`, `ml-inference` |
| `owner` | Resource owner | ❌ | `john.doe@company.com` |

### Usage Example

```typescript
import { resourceTagging, createStandardTags, ResourceType } from './services/ResourceTaggingService';

// Tag a resource
const tags = createStandardTags({
  environment: 'production',
  service: 'api-server',
  costCenter: 'engineering',
  team: 'platform',
  project: 'api-optimization',
});

await resourceTagging.tagResource(
  'api-request-12345',
  ResourceType.API_REQUEST,
  tags,
);

// Record cost
await resourceTagging.recordResourceCost({
  resourceId: 'api-request-12345',
  resourceType: ResourceType.API_REQUEST,
  tags,
  cost: 0.05,
  timestamp: new Date(),
  duration: 250,
});

// Get cost allocation report
const report = await resourceTagging.generateCostAllocationReport(
  new Date('2025-01-01'),
  new Date('2025-01-31'),
);

console.log(`Total cost: $${report.totalCost}`);
console.log('By team:', report.byTeam);
console.log('By environment:', report.byEnvironment);
```

### Cost Allocation Reports

Generate reports via API:

```bash
# Get cost allocation by team
curl -X GET "http://localhost:4000/api/cost-allocation?dimension=team&start=2025-01-01&end=2025-01-31"

# Get cost allocation by environment
curl -X GET "http://localhost:4000/api/cost-allocation?dimension=environment&start=2025-01-01&end=2025-01-31"

# Get untagged resources
curl -X GET "http://localhost:4000/api/cost-allocation/untagged?limit=50"
```

---

## Auto-Scaling Strategies

### Overview

Comprehensive auto-scaling policies for all services using HPA (Horizontal Pod Autoscaler) and KEDA (Kubernetes Event-Driven Autoscaling).

### Configuration

Located at: `k8s/autoscaling/comprehensive-autoscaling.yaml`

### Scaling Policies

#### API Server (HPA)
- **Min replicas**: 3
- **Max replicas**: 20
- **Scale-up**: Aggressive (100% or 4 pods per 30s)
- **Scale-down**: Conservative (10% or 2 pods per 60s)
- **Metrics**:
  - CPU: 70%
  - Memory: 80%
  - HTTP RPS: 50/pod
  - GraphQL query rate: 30/pod

#### Workers (KEDA)
- **Queue-based scaling**: Redis queue depth
- **Idle replica count**: Scale to 0 or 1
- **Triggers**: Queue depth, CPU, custom metrics

### Deployment

```bash
# Apply auto-scaling configurations
kubectl apply -f k8s/autoscaling/comprehensive-autoscaling.yaml

# Check HPA status
kubectl get hpa -n prod

# Check KEDA scaled objects
kubectl get scaledobject -n prod

# View scaling events
kubectl get events --sort-by='.lastTimestamp' -n prod | grep -i scale
```

### Monitoring Scaling

```bash
# Watch HPA in real-time
kubectl get hpa -n prod -w

# Check current replica counts
kubectl get deployments -n prod -o custom-columns=NAME:.metadata.name,DESIRED:.spec.replicas,CURRENT:.status.replicas,AVAILABLE:.status.availableReplicas

# View detailed HPA info
kubectl describe hpa api-server-hpa -n prod
```

---

## Database Optimization

### PostgreSQL Connection Pooling

**Location**: `server/src/db/postgres.ts`

#### Features

- ✅ Separate read/write pools with replica support
- ✅ Circuit breaker for failing connections
- ✅ Connection leak detection
- ✅ Slow query tracking
- ✅ Automatic retry with exponential backoff
- ✅ Prepared statement caching

#### Configuration

```bash
# Environment variables
PG_WRITE_POOL_SIZE=24          # Write pool size
PG_READ_POOL_SIZE=60           # Read pool size
PG_QUERY_MAX_RETRIES=3         # Max retries
PG_SLOW_QUERY_THRESHOLD_MS=2000 # Slow query threshold
DATABASE_READ_REPLICAS=postgres-read-1:5432,postgres-read-2:5432
```

#### Usage

```typescript
import { getPostgresPool } from './db/postgres';

const pool = getPostgresPool();

// Explicit read query
const results = await pool.read('SELECT * FROM users WHERE active = $1', [true]);

// Explicit write query
await pool.write('UPDATE users SET last_login = NOW() WHERE id = $1', [userId]);

// Auto-detect (read vs write)
await pool.query('SELECT * FROM orders WHERE user_id = $1', [userId]);

// Get health status
const health = await pool.healthCheck();
console.log('Pool health:', health);

// Get slow query insights
const slowQueries = pool.slowQueryInsights();
console.log('Slow queries:', slowQueries);
```

### Neo4j Connection Optimization

**Location**: `server/src/db/Neo4jConnectionManager.ts`

#### Features

- ✅ Optimized connection pool with 50 connections
- ✅ Query timeout management (30s default)
- ✅ Session leak detection
- ✅ Slow query warnings (>2s)
- ✅ Automatic retry for transient errors
- ✅ Health monitoring

#### Configuration

```bash
# Environment variables
NEO4J_MAX_POOL_SIZE=50
NEO4J_CONNECTION_TIMEOUT=30000
NEO4J_MAX_TRANSACTION_RETRY_TIME=30000
```

#### Usage

```typescript
import { getNeo4jConnectionManager } from './db/Neo4jConnectionManager';

const neo4j = getNeo4jConnectionManager();

// Read query
const users = await neo4j.executeRead(
  'MATCH (u:User) WHERE u.active = $active RETURN u',
  { active: true },
);

// Write query
await neo4j.executeWrite(
  'CREATE (u:User {name: $name, email: $email})',
  { name: 'John Doe', email: 'john@example.com' },
);

// Transaction
await neo4j.executeTransaction(async (tx) => {
  await tx.run('CREATE (u:User {name: $name})', { name: 'Jane' });
  await tx.run('CREATE (p:Profile {userId: $id})', { id: 'jane-id' });
  return { success: true };
});

// Health check
const health = await neo4j.getHealth();
console.log('Neo4j health:', health);
```

---

## Rate Limiting & Throttling

### Overview

Tiered rate limiting with cost tracking to prevent resource abuse and optimize costs.

**Location**: `server/src/middleware/TieredRateLimitMiddleware.ts`

### Rate Limit Tiers

| Tier | Req/Min | Req/Hour | Req/Day | Concurrent | Cost/Day |
|------|---------|----------|---------|------------|----------|
| **FREE** | 10 | 100 | 1,000 | 2 | $1 |
| **BASIC** | 60 | 1,000 | 10,000 | 10 | $10 |
| **PREMIUM** | 300 | 10,000 | 100,000 | 50 | $100 |
| **ENTERPRISE** | 1,000 | 50,000 | 500,000 | 200 | $1,000 |
| **INTERNAL** | 10,000 | 500,000 | 5,000,000 | 1,000 | $10,000 |

### Usage

```typescript
import { createTieredRateLimiter, RateLimitTier } from './middleware/TieredRateLimitMiddleware';

// Create rate limiter
const rateLimiter = createTieredRateLimiter();

// Apply to Express app
app.use(rateLimiter.middleware());

// Check status for a user
const status = await rateLimiter.getStatus('user:12345', RateLimitTier.PREMIUM);
console.log('Usage:', status.usage);
console.log('Limits:', status.limits);
```

### Custom Configuration

```typescript
const rateLimiter = createTieredRateLimiter({
  tiers: {
    custom: {
      requestsPerMinute: 100,
      requestsPerHour: 5000,
      requestsPerDay: 50000,
      concurrentRequests: 25,
      burstLimit: 200,
      costLimit: 50.0,
      queuePriority: 3,
    },
  },
  redis: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
  costTracking: true,
  adaptiveThrottling: true,
});
```

---

## Cost Monitoring & Dashboards

### Grafana Dashboard

**Location**: `observability/dashboards/cost-optimization-dashboard.json`

### Dashboard Panels

1. **Total Cost Trend** - 30-day cost visualization
2. **Cost by Environment** - Pie chart of cost distribution
3. **Cost by Service** - Top 10 services by cost
4. **Cost by Resource Type** - Stacked time series
5. **Budget Utilization** - Per-team budget usage
6. **Resource Efficiency** - CPU/memory utilization
7. **Wasted Resources** - Idle resources costing money
8. **Pod Autoscaling Activity** - Replica count over time
9. **Cost Anomalies** - Detected anomalies log
10. **Rate Limiting Effectiveness** - Requests vs rate limited
11. **Database Pool Utilization** - Connection pool metrics
12. **Spot Instance Savings** - Cost savings from spot instances
13. **Projected Monthly Cost** - Forecast based on current usage
14. **Cost Per Request** - Unit economics
15. **Idle Resources** - Count of underutilized resources

### Accessing the Dashboard

1. Navigate to Grafana: `http://localhost:3001`
2. Go to Dashboards → Cost Optimization & Resource Efficiency
3. Use template variables to filter by environment, service, cost center

### Custom Metrics

Export custom metrics from your application:

```typescript
import { businessMetrics, costTracker } from './observability/telemetry';

// Record cost
costTracker.track('graphql_query', 0.05, {
  tenantId: 'tenant-123',
  userId: 'user-456',
  complexity: 10,
});

// Record budget utilization
businessMetrics.costBudgetUtilization.record(0.75, {
  tenant_id: 'tenant-123',
});
```

---

## Budget Alerts & Anomaly Detection

### Overview

Automatic budget monitoring and cost anomaly detection with configurable thresholds.

**Location**: `server/src/services/CostAnomalyDetectionService.ts`

### Features

- ✅ Budget threshold alerts (warning + critical)
- ✅ Statistical anomaly detection (z-score based)
- ✅ Projected cost overrun detection
- ✅ Idle resource waste detection
- ✅ Alert cooldown to prevent spam
- ✅ Recommendations for cost optimization

### Setting Budget Thresholds

```typescript
import { costAnomalyDetection } from './services/CostAnomalyDetectionService';

// Set budget for a team
await costAnomalyDetection.setBudgetThreshold({
  dimension: 'team',
  dimensionValue: 'platform',
  dailyLimit: 100.0,
  monthlyLimit: 2500.0,
  warningThreshold: 80,   // Alert at 80% usage
  criticalThreshold: 95,  // Critical alert at 95%
});

// Set budget for an environment
await costAnomalyDetection.setBudgetThreshold({
  dimension: 'environment',
  dimensionValue: 'production',
  dailyLimit: 500.0,
  monthlyLimit: 12000.0,
  warningThreshold: 85,
  criticalThreshold: 95,
});
```

### Manual Checks

```typescript
// Check budget compliance
const alerts = await costAnomalyDetection.checkBudgetCompliance(
  'team',
  'platform',
);

console.log('Budget alerts:', alerts);

// Detect anomalies
const anomalies = await costAnomalyDetection.detectCostAnomalies(
  'environment',
  'production',
);

console.log('Cost anomalies:', anomalies);

// Check for waste
const wasteAlerts = await costAnomalyDetection.detectWaste();
console.log('Wasted resources:', wasteAlerts);

// Get recent alerts
const recentAlerts = await costAnomalyDetection.getRecentAlerts(50);
console.log('Recent alerts:', recentAlerts);
```

### Automatic Monitoring

The service runs periodic checks every 15 minutes for:
- Budget compliance (all configured thresholds)
- Cost anomaly detection
- Waste detection

### Alert Types

1. **budget_threshold**: Daily or monthly budget exceeded
2. **cost_anomaly**: Unusual spending spike or drop
3. **projected_overrun**: On track to exceed monthly budget
4. **waste_detected**: Idle resources costing money

### Notifications

Alerts are:
- Logged to application logs (searchable in dashboards)
- Stored in database (queryable via API)
- Can be sent to external systems (Slack, email, PagerDuty)

---

## Spot Instances

### Overview

Kubernetes spot/preemptible instance support for 60-80% cost savings on fault-tolerant workloads.

**Location**: `k8s/cost-optimization/spot-instances.yaml`

### Suitable Workloads

✅ **Good for Spot Instances:**
- Batch processing jobs
- Analytics workers
- Report generation
- Data pipelines
- Stateless web services
- Cache layers (with replication)

❌ **Not Recommended:**
- Databases (primary instances)
- Stateful services without redundancy
- Real-time critical services
- Services with long-running transactions

### Deployment

```bash
# Apply spot instance configurations
kubectl apply -f k8s/cost-optimization/spot-instances.yaml

# Check spot node provisioner
kubectl get provisioner spot-provisioner -o yaml

# View spot instances
kubectl get nodes -l karpenter.sh/capacity-type=spot

# Calculate savings
kubectl exec -n prod deployment/cost-optimizer -- \
  /scripts/calculate-savings.sh
```

### Example: Deploying on Spot

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: analytics-worker
spec:
  replicas: 10
  template:
    spec:
      priorityClassName: spot-workload

      tolerations:
        - key: "spot"
          operator: "Equal"
          value: "true"
          effect: "NoSchedule"

      affinity:
        nodeAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              preference:
                matchExpressions:
                  - key: karpenter.sh/capacity-type
                    operator: In
                    values:
                      - spot

      containers:
        - name: worker
          image: analytics-worker:latest
          # Enable graceful shutdown
          lifecycle:
            preStop:
              exec:
                command: ["/bin/sh", "-c", "kill -SIGTERM 1 && sleep 30"]
```

### Spot Interruption Handling

The spot termination handler automatically:
1. Detects spot instance interruption warnings
2. Drains pods gracefully (120s grace period)
3. Reschedules pods to other nodes
4. Logs interruption events

---

## Best Practices

### Resource Tagging

1. ✅ **Always tag resources** with required fields
2. ✅ Use consistent naming conventions
3. ✅ Review untagged resources weekly
4. ✅ Set up alerts for untagged resources

### Auto-Scaling

1. ✅ Set appropriate min/max replicas
2. ✅ Use conservative scale-down policies
3. ✅ Monitor scaling events
4. ✅ Tune metrics thresholds based on actual load
5. ✅ Use KEDA for queue-based workers

### Database Connections

1. ✅ Always use connection pools
2. ✅ Set appropriate pool sizes (not too large!)
3. ✅ Monitor slow queries regularly
4. ✅ Use read replicas for read-heavy workloads
5. ✅ Set query timeouts

### Rate Limiting

1. ✅ Assign appropriate tiers to users
2. ✅ Monitor rate limit violations
3. ✅ Adjust limits based on usage patterns
4. ✅ Implement cost tracking for expensive operations

### Cost Monitoring

1. ✅ Review dashboards daily
2. ✅ Set up budget alerts for all teams
3. ✅ Investigate anomalies promptly
4. ✅ Generate monthly cost reports
5. ✅ Track cost per customer/tenant

### Spot Instances

1. ✅ Only use for fault-tolerant workloads
2. ✅ Implement graceful shutdown handlers
3. ✅ Diversify across multiple instance types
4. ✅ Monitor spot interruption rates
5. ✅ Have fallback to on-demand instances

---

## Troubleshooting

### High Costs

**Symptom**: Costs are higher than expected

**Diagnosis**:
```bash
# Check resource usage
kubectl top nodes
kubectl top pods -n prod --sort-by=cpu

# Review cost dashboard
# Look for: wasted resources, high-cost services, anomalies

# Get cost allocation
curl http://localhost:4000/api/cost-allocation?dimension=service&start=2025-01-01&end=2025-01-31
```

**Solutions**:
1. Identify top cost drivers in dashboard
2. Check for idle resources
3. Review auto-scaling min replicas
4. Consider spot instances for suitable workloads
5. Optimize expensive database queries

### Rate Limiting Issues

**Symptom**: Users hitting rate limits

**Diagnosis**:
```typescript
const status = await rateLimiter.getStatus(userId, tier);
console.log('Usage:', status.usage);
console.log('Limits:', status.limits);
```

**Solutions**:
1. Review user tier assignment
2. Check if legitimate burst traffic
3. Adjust tier limits if needed
4. Implement request batching
5. Cache responses where possible

### Database Connection Issues

**Symptom**: Connection pool exhaustion

**Diagnosis**:
```typescript
const health = await pool.healthCheck();
console.log('Active connections:', health[0].activeConnections);
console.log('Queued requests:', health[0].queuedRequests);
```

**Solutions**:
1. Increase pool size if needed
2. Check for connection leaks
3. Review slow queries
4. Optimize queries
5. Add read replicas

### Budget Alerts Not Working

**Symptom**: Not receiving budget alerts

**Diagnosis**:
```typescript
// Check if thresholds are set
const alerts = await costAnomalyDetection.getRecentAlerts(10);
console.log('Recent alerts:', alerts);
```

**Solutions**:
1. Verify budget thresholds are configured
2. Check alert cooldown period
3. Review notification configuration
4. Check application logs for errors
5. Ensure cost tracking is enabled

---

## Support

For questions or issues with cost optimization:

1. Check this guide first
2. Review dashboards and logs
3. Contact the Platform Engineering team
4. File an issue in the repository

## Contributing

To improve cost optimization:

1. Profile and optimize expensive operations
2. Add new cost tracking metrics
3. Improve dashboard visualizations
4. Share optimization wins with the team

---

**Remember**: Cost optimization is an ongoing process. Review metrics regularly, iterate on improvements, and share learnings across teams!
