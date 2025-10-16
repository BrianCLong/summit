# Premium Model Router Troubleshooting Guide

## Overview

The Premium Model Router uses Thompson Sampling and multi-armed bandit optimization to intelligently route requests to the most suitable AI models based on cost, performance, quality, and availability factors.

## Architecture Components

### Thompson Sampling Engine

- **Purpose**: Multi-armed bandit optimization for model selection
- **Algorithm**: Beta distribution-based exploration-exploitation balance
- **Metrics**: Success rate, latency, cost efficiency, quality scores

### Cost-Performance Optimizer

- **Purpose**: Budget-aware model selection with quality guarantees
- **Features**: Dynamic pricing, cost prediction, ROI optimization
- **Constraints**: Budget limits, quality thresholds, latency requirements

### Adaptive Learning System

- **Purpose**: Continuous improvement through feedback loops
- **Learning**: Model performance tracking, user satisfaction, outcome analysis
- **Adaptation**: Weight adjustments, model ranking updates, strategy optimization

## Common Issues and Solutions

### Issue 1: Suboptimal Model Selection

**Symptoms:**

- Users reporting poor quality results despite sufficient budget
- Cost optimization metrics showing negative ROI
- Quality scores below expected thresholds

**Root Causes:**

- Stale model performance data
- Incorrect Thompson sampling parameters
- Biased feedback loops
- Insufficient exploration of new models

**Diagnostic Steps:**

1. **Check Model Performance Data**

   ```bash
   # Query current model performance metrics
   curl -s http://localhost:4001/v1/router/models | jq '.[] | {name: .name, quality: .qualityScore, cost: .costPerToken, latency: .averageLatency, availability: .availability}'

   # Check for stale data
   kubectl exec -n intelgraph-core postgres-0 -- psql -U maestro -d maestro -c "
   SELECT
     model_id,
     last_updated,
     EXTRACT(EPOCH FROM (NOW() - last_updated))/3600 as hours_since_update,
     success_rate,
     avg_quality_score
   FROM model_performance
   ORDER BY hours_since_update DESC;"
   ```

2. **Analyze Thompson Sampling Parameters**

   ```bash
   # Check current Thompson sampling configuration
   kubectl get configmap maestro-premium-router-config -n intelgraph-maestro -o yaml | grep -A 10 thompson_sampling

   # Query model selection statistics
   curl -s "http://prometheus:9090/api/v1/query?query=maestro_thompson_sampling_exploration_rate{model_id!=\"\"}" | jq '.data.result[] | {model: .metric.model_id, exploration_rate: .value[1]}'
   ```

3. **Review Recent Routing Decisions**
   ```bash
   # Get recent routing decisions with reasoning
   curl -s "http://localhost:4001/v1/audit/logs?action=model_routing_decision&limit=50" | jq '.data[] | {timestamp: .timestamp, model: .details.selectedModel, reasoning: .details.reasoning, confidence: .details.confidence}'
   ```

**Resolution Steps:**

1. **Reset Thompson Sampling State** (if data is corrupted)

   ```bash
   # Clear model performance history
   kubectl exec -n intelgraph-core postgres-0 -- psql -U maestro -d maestro -c "
   UPDATE model_performance
   SET alpha = 1, beta = 1, last_updated = NOW()
   WHERE model_id IN (SELECT model_id FROM model_performance);"

   # Restart router to reinitialize sampling
   kubectl rollout restart deployment/maestro-premium-router -n intelgraph-maestro
   ```

2. **Adjust Exploration Parameters**

   ```bash
   # Increase exploration rate temporarily
   kubectl patch configmap maestro-premium-router-config -n intelgraph-maestro --patch '
   {
     "data": {
       "THOMPSON_SAMPLING_EXPLORATION_RATE": "0.3",
       "THOMPSON_SAMPLING_DECAY_RATE": "0.99"
     }
   }'

   # Apply configuration
   kubectl rollout restart deployment/maestro-premium-router -n intelgraph-maestro
   ```

3. **Force Model Performance Update**
   ```bash
   # Trigger immediate performance evaluation
   curl -X POST http://localhost:4001/v1/router/evaluate-models \
     -H "Content-Type: application/json" \
     -d '{"force_refresh": true, "evaluation_tasks": ["reasoning", "analysis", "synthesis"]}'
   ```

### Issue 2: High Routing Latency

**Symptoms:**

- Model selection taking >2 seconds consistently
- Timeout errors in orchestration logs
- User complaints about slow response times

**Root Causes:**

- Database query optimization issues
- Model API health check delays
- Complex routing algorithm calculations
- Network connectivity issues

**Diagnostic Steps:**

1. **Profile Routing Performance**

   ```bash
   # Check routing latency metrics
   curl -s "http://prometheus:9090/api/v1/query?query=histogram_quantile(0.95, maestro_premium_routing_duration_bucket)" | jq '.data.result[0].value[1]'

   # Breakdown by routing stage
   curl -s "http://prometheus:9090/api/v1/query?query=maestro_routing_stage_duration{stage!=\"\"}" | jq '.data.result[] | {stage: .metric.stage, duration: .value[1]}'
   ```

2. **Database Query Analysis**

   ```bash
   # Check slow queries
   kubectl exec -n intelgraph-core postgres-0 -- psql -U maestro -d maestro -c "
   SELECT query, mean_time, calls, total_time
   FROM pg_stat_statements
   WHERE query LIKE '%model_performance%'
   ORDER BY mean_time DESC
   LIMIT 10;"
   ```

3. **Model API Health Checks**
   ```bash
   # Test individual model APIs
   for model in gpt-4-turbo claude-3-opus gemini-pro; do
     echo "Testing $model API..."
     time curl -s -o /dev/null -w "%{http_code} %{time_total}s\n" \
       -H "Authorization: Bearer ${API_KEY}" \
       "https://api.${model}.com/v1/health"
   done
   ```

**Resolution Steps:**

1. **Optimize Database Queries**

   ```sql
   -- Add missing indexes
   CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_model_performance_composite
   ON model_performance(availability DESC, avg_quality_score DESC, last_updated DESC);

   -- Update query statistics
   ANALYZE model_performance;

   -- Optimize query plans
   SET work_mem = '256MB';
   ```

2. **Implement Caching**

   ```bash
   # Enable model performance caching
   kubectl patch configmap maestro-premium-router-config -n intelgraph-maestro --patch '
   {
     "data": {
       "MODEL_PERFORMANCE_CACHE_TTL": "300",
       "ROUTING_DECISION_CACHE_TTL": "60",
       "ENABLE_ROUTING_CACHE": "true"
     }
   }'
   ```

3. **Parallelize Health Checks**
   ```bash
   # Enable concurrent model health checks
   kubectl patch configmap maestro-premium-router-config -n intelgraph-maestro --patch '
   {
     "data": {
       "CONCURRENT_HEALTH_CHECKS": "true",
       "HEALTH_CHECK_TIMEOUT": "2000",
       "HEALTH_CHECK_PARALLELISM": "5"
     }
   }'
   ```

### Issue 3: Budget Overruns

**Symptoms:**

- Daily/monthly budget limits exceeded
- Cost alerts firing frequently
- Users receiving budget exhaustion errors

**Root Causes:**

- Inaccurate cost predictions
- Model price changes not reflected
- Inefficient model selection
- Lack of cost-aware routing

**Diagnostic Steps:**

1. **Analyze Cost Patterns**

   ```bash
   # Check daily cost breakdown by model
   curl -s "http://prometheus:9090/api/v1/query?query=sum by (model_id) (maestro_daily_cost[24h])" | jq '.data.result[] | {model: .metric.model_id, cost: .value[1]}'

   # Compare predicted vs actual costs
   curl -s "http://prometheus:9090/api/v1/query?query=maestro_cost_prediction_accuracy" | jq '.data.result[0].value[1]'
   ```

2. **Review Cost-Performance Ratios**

   ```bash
   # Calculate cost-effectiveness by model
   kubectl exec -n intelgraph-core postgres-0 -- psql -U maestro -d maestro -c "
   SELECT
     model_id,
     avg_quality_score / avg_cost_per_request as cost_effectiveness,
     total_requests,
     total_cost
   FROM model_performance
   WHERE last_updated > NOW() - INTERVAL '7 days'
   ORDER BY cost_effectiveness DESC;"
   ```

3. **Check Budget Configuration**

   ```bash
   # Verify budget limits and alerts
   kubectl get configmap maestro-budget-config -n intelgraph-maestro -o yaml

   # Check budget utilization by tenant
   curl -s "http://localhost:4001/v1/audit/logs?action=budget_check" | jq '.data[] | {tenant: .tenantId, budget_used: .details.budgetUsed, budget_limit: .details.budgetLimit}'
   ```

**Resolution Steps:**

1. **Update Cost Models**

   ```bash
   # Refresh model pricing data
   curl -X POST http://localhost:4001/v1/router/refresh-pricing \
     -H "Content-Type: application/json" \
     -d '{"force_update": true}'

   # Verify updated prices
   curl -s http://localhost:4001/v1/router/models | jq '.[] | {name: .name, costPerToken: .costPerToken}'
   ```

2. **Implement Stricter Budget Controls**

   ```bash
   # Enable budget-first routing
   kubectl patch configmap maestro-premium-router-config -n intelgraph-maestro --patch '
   {
     "data": {
       "BUDGET_AWARE_ROUTING": "strict",
       "COST_OPTIMIZATION_WEIGHT": "0.4",
       "QUALITY_COST_TRADEOFF": "0.7"
     }
   }'
   ```

3. **Set Up Dynamic Budget Allocation**
   ```bash
   # Enable adaptive budget management
   kubectl apply -f - <<EOF
   apiVersion: v1
   kind: ConfigMap
   metadata:
     name: maestro-budget-adaptive-config
     namespace: intelgraph-maestro
   data:
     ADAPTIVE_BUDGET_ENABLED: "true"
     BUDGET_REALLOCATION_FREQUENCY: "hourly"
     MIN_BUDGET_RESERVE: "0.1"
     MAX_BUDGET_BURST: "1.5"
   EOF
   ```

### Issue 4: Model Availability Issues

**Symptoms:**

- Frequent fallbacks to lower-tier models
- Model unavailability errors
- Degraded service quality due to model outages

**Diagnostic Steps:**

1. **Check Model Availability Status**

   ```bash
   # Real-time availability check
   curl -s http://localhost:4001/v1/router/models | jq '.[] | select(.availability < 0.95) | {name: .name, availability: .availability, lastCheck: .lastHealthCheck}'

   # Historical availability trends
   curl -s "http://prometheus:9090/api/v1/query_range?query=maestro_model_availability{model_id!=\"\"}&start=$(date -d '24 hours ago' +%s)&end=$(date +%s)&step=3600" | jq '.data.result[] | {model: .metric.model_id, availability_trend: .values}'
   ```

2. **Analyze Failure Patterns**

   ```bash
   # Check failure reasons
   curl -s "http://localhost:4001/v1/audit/logs?action=model_failure" | jq '.data[] | {timestamp: .timestamp, model: .details.model, reason: .details.failureReason}'

   # API response time analysis
   curl -s "http://prometheus:9090/api/v1/query?query=maestro_external_api_response_time{provider!=\"\"}" | jq '.data.result[] | {provider: .metric.provider, response_time: .value[1]}'
   ```

**Resolution Steps:**

1. **Configure Circuit Breakers**

   ```bash
   # Enable circuit breaker for problematic models
   kubectl patch configmap maestro-premium-router-config -n intelgraph-maestro --patch '
   {
     "data": {
       "CIRCUIT_BREAKER_ENABLED": "true",
       "CIRCUIT_BREAKER_FAILURE_THRESHOLD": "5",
       "CIRCUIT_BREAKER_TIMEOUT": "300",
       "CIRCUIT_BREAKER_RESET_TIMEOUT": "60"
     }
   }'
   ```

2. **Implement Graceful Degradation**

   ```bash
   # Configure fallback model hierarchy
   kubectl apply -f - <<EOF
   apiVersion: v1
   kind: ConfigMap
   metadata:
     name: maestro-fallback-config
     namespace: intelgraph-maestro
   data:
     FALLBACK_HIERARCHY: |
       gpt-4-turbo:
         - claude-3-opus
         - gpt-4
         - claude-3-sonnet
       claude-3-opus:
         - gpt-4-turbo
         - gpt-4
         - claude-3-sonnet
     FALLBACK_QUALITY_THRESHOLD: "0.8"
   EOF
   ```

3. **Set Up Proactive Health Monitoring**
   ```bash
   # Increase health check frequency for critical models
   kubectl patch configmap maestro-premium-router-config -n intelgraph-maestro --patch '
   {
     "data": {
       "HEALTH_CHECK_INTERVAL": "30",
       "HEALTH_CHECK_RETRIES": "3",
       "HEALTH_CHECK_TIMEOUT": "10000"
     }
   }'
   ```

## Performance Optimization

### Thompson Sampling Tuning

**Optimal Parameters for Different Scenarios:**

```yaml
# High-exploration scenario (new models, changing landscape)
exploration_config:
  beta_prior: 1.0
  alpha_prior: 1.0
  exploration_rate: 0.25
  decay_rate: 0.95

# Stable environment (established models, consistent performance)
stable_config:
  beta_prior: 5.0
  alpha_prior: 10.0
  exploration_rate: 0.1
  decay_rate: 0.99

# Cost-sensitive scenario (budget constraints)
cost_sensitive_config:
  cost_weight: 0.5
  quality_weight: 0.3
  latency_weight: 0.2
  budget_buffer: 0.1
```

### Database Optimization

**Model Performance Table Optimization:**

```sql
-- Partitioning by date for historical data
CREATE TABLE model_performance_partitioned (
    LIKE model_performance INCLUDING ALL
) PARTITION BY RANGE (last_updated);

CREATE TABLE model_performance_current
PARTITION OF model_performance_partitioned
FOR VALUES FROM (CURRENT_DATE - INTERVAL '7 days') TO (CURRENT_DATE + INTERVAL '1 day');

-- Materialized view for routing decisions
CREATE MATERIALIZED VIEW model_routing_summary AS
SELECT
    model_id,
    AVG(success_rate) as avg_success_rate,
    AVG(avg_latency) as avg_latency,
    AVG(cost_per_request) as avg_cost,
    AVG(quality_score) as avg_quality,
    COUNT(*) as total_requests,
    MAX(last_updated) as last_updated
FROM model_performance
WHERE last_updated > NOW() - INTERVAL '24 hours'
GROUP BY model_id;

-- Refresh materialized view every 5 minutes
SELECT cron.schedule('refresh_model_routing_summary', '*/5 * * * *', 'REFRESH MATERIALIZED VIEW model_routing_summary;');
```

### Caching Strategy

**Multi-Level Caching Implementation:**

```bash
# Redis caching configuration
kubectl apply -f - <<EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: maestro-cache-config
  namespace: intelgraph-maestro
data:
  # L1 Cache: In-memory (application level)
  L1_CACHE_SIZE: "1000"
  L1_CACHE_TTL: "60"

  # L2 Cache: Redis (distributed)
  L2_CACHE_TTL: "300"
  L2_CACHE_PREFIX: "maestro:routing:"

  # L3 Cache: Database query result cache
  L3_CACHE_TTL: "3600"

  # Cache warming strategy
  CACHE_WARM_ON_STARTUP: "true"
  CACHE_PRELOAD_MODELS: "gpt-4-turbo,claude-3-opus,gemini-pro"
EOF
```

## Monitoring and Alerting

### Key Performance Indicators

**Routing Efficiency Metrics:**

```prometheus
# Model selection accuracy (compared to optimal choice)
maestro_routing_accuracy =
  (optimal_model_selections / total_selections) * 100

# Cost optimization effectiveness
maestro_cost_optimization_ratio =
  (baseline_cost - actual_cost) / baseline_cost * 100

# Quality-cost tradeoff efficiency
maestro_quality_cost_efficiency =
  average_quality_score / average_cost_per_request

# Exploration vs exploitation balance
maestro_exploration_rate =
  exploration_selections / total_selections
```

**Alert Configuration:**

```yaml
# Routing accuracy degradation
- alert: RoutingAccuracyLow
  expr: maestro_routing_accuracy < 80
  for: 10m
  severity: warning
  description: 'Model routing accuracy below 80% for 10 minutes'

# Cost optimization failure
- alert: CostOptimizationFailure
  expr: maestro_cost_optimization_ratio < 10
  for: 15m
  severity: warning
  description: 'Cost optimization providing less than 10% savings'

# Thompson sampling convergence issues
- alert: ThompsonSamplingConvergenceIssue
  expr: stddev(maestro_model_selection_probability) > 0.3
  for: 30m
  severity: warning
  description: 'Thompson sampling not converging - high variance in model selection'
```

## Testing and Validation

### A/B Testing Framework

**Routing Strategy Comparison:**

```bash
#!/bin/bash
# A/B test different routing strategies

# Create test groups
curl -X POST http://localhost:4001/v1/router/ab-test/create \
  -H "Content-Type: application/json" \
  -d '{
    "name": "thompson_sampling_vs_round_robin",
    "strategies": [
      {
        "name": "thompson_sampling",
        "config": {
          "algorithm": "thompson_sampling",
          "exploration_rate": 0.15
        },
        "traffic_percentage": 50
      },
      {
        "name": "round_robin",
        "config": {
          "algorithm": "round_robin"
        },
        "traffic_percentage": 50
      }
    ],
    "duration": "7d",
    "success_metrics": ["quality_score", "cost_efficiency", "user_satisfaction"]
  }'

# Monitor test results
curl -s http://localhost:4001/v1/router/ab-test/thompson_sampling_vs_round_robin/results | jq '.'
```

### Load Testing

**Routing Performance Under Load:**

```bash
#!/bin/bash
# Load test the premium router

# Generate concurrent routing requests
for i in {1..100}; do
  (
    curl -X POST http://localhost:4001/v1/router/optimize \
      -H "Content-Type: application/json" \
      -d '{
        "taskType": "synthesis_enhancement",
        "context": {
          "complexity": 0.7,
          "budget": 5.0,
          "urgency": "medium",
          "qualityRequirement": 0.8
        }
      }' &
  )
done

wait
echo "Load test completed"

# Analyze performance impact
curl -s "http://prometheus:9090/api/v1/query?query=rate(maestro_premium_routing_duration_sum[5m]) / rate(maestro_premium_routing_duration_count[5m])" | jq '.data.result[0].value[1]'
```

## Troubleshooting Checklist

### Pre-Incident Checklist

- [ ] All model APIs responding within SLA
- [ ] Database performance within acceptable range
- [ ] Thompson sampling parameters configured correctly
- [ ] Budget limits set appropriately
- [ ] Caching layers functioning properly
- [ ] Monitoring and alerting active

### During Incident Checklist

- [ ] Identify affected models/tenants
- [ ] Check system resource utilization
- [ ] Verify external dependencies
- [ ] Enable fallback mechanisms if needed
- [ ] Document timeline and actions taken
- [ ] Communicate status to stakeholders

### Post-Incident Checklist

- [ ] Conduct thorough root cause analysis
- [ ] Update monitoring/alerting rules
- [ ] Improve system resilience
- [ ] Update documentation and runbooks
- [ ] Share lessons learned with team
- [ ] Implement preventive measures

---

**Document Version**: 1.0  
**Last Updated**: $(date)  
**Next Review**: $(date -d '+3 months')  
**Owner**: Premium Routing Team
