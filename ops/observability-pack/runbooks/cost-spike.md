# Cost Spike Investigation Runbook

## Overview
This runbook covers investigation and mitigation of unexpected cost increases.

## Symptoms
- Cost guard alerts firing
- Daily/monthly budget thresholds exceeded
- Unexpected resource scaling events

## Investigation Steps

### 1. Identify Cost Source
```bash
# Check cost breakdown by service
curl -s "http://prometheus:9090/api/v1/query?query=sum(increase(cloud_cost_total_dollars[24h]))by(service)" | jq

# Check by resource type
curl -s "http://prometheus:9090/api/v1/query?query=sum(increase(cloud_cost_total_dollars[24h]))by(resource_type)" | jq
```

### 2. Check for Runaway Resources

```bash
# List all pods sorted by resource usage
kubectl top pods -A --sort-by=cpu | head -20
kubectl top pods -A --sort-by=memory | head -20

# Check for unexpectedly scaled deployments
kubectl get hpa -A

# Check persistent volume claims
kubectl get pvc -A -o custom-columns=NAME:.metadata.name,SIZE:.spec.resources.requests.storage,STATUS:.status.phase
```

### 3. Analyze Network Traffic
```bash
# Check network egress by service
curl -s "http://prometheus:9090/api/v1/query?query=sum(rate(container_network_transmit_bytes_total[1h]))by(pod)" | jq

# Check for unusual external API calls
kubectl logs -n intelgraph deployment/api-gateway --since=1h | grep -c "external_api"
```

### 4. Review Database Costs
```sql
-- PostgreSQL storage growth
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) as size
FROM pg_tables
ORDER BY pg_total_relation_size(schemaname || '.' || tablename) DESC
LIMIT 10;
```

```cypher
// Neo4j database size
CALL dbms.queryJmx("org.neo4j:*")
YIELD name, attributes
WHERE name CONTAINS "Store"
RETURN name, attributes
```

### 5. Check for Data Ingestion Spikes
```bash
# Ingest rate
curl -s "http://prometheus:9090/api/v1/query?query=sum(rate(ingest_records_total[1h]))" | jq

# Check Kafka consumer lag
kubectl exec -it kafka-0 -- kafka-consumer-groups.sh --bootstrap-server localhost:9092 --describe --all-groups
```

## Remediation Steps

### Immediate Cost Control

1. **Enable budget hard caps**
   ```bash
   kubectl apply -f k8s/cost-guard-hard-cap.yaml
   ```

2. **Scale down non-critical workloads**
   ```bash
   # Scale down dev/test environments
   kubectl scale deployment --all --replicas=0 -n dev
   kubectl scale deployment --all --replicas=0 -n staging
   ```

3. **Pause expensive batch jobs**
   ```bash
   kubectl patch cronjob <job-name> -p '{"spec":{"suspend":true}}'
   ```

4. **Enable data retention policies**
   ```bash
   # Apply aggressive retention
   kubectl apply -f k8s/data-retention-emergency.yaml
   ```

### Investigation Actions

1. **Review auto-scaling settings**
   ```yaml
   # Check HPA configurations
   kubectl get hpa -A -o yaml | grep -A10 "spec:"
   ```

2. **Audit external API usage**
   - Check third-party API call volumes
   - Review rate limiting configurations
   - Identify unnecessary API calls

3. **Analyze storage growth**
   - Check for log rotation issues
   - Review data retention policies
   - Identify orphaned resources

## Cost Optimization Checklist

- [ ] Right-size compute resources based on actual usage
- [ ] Enable spot/preemptible instances for non-critical workloads
- [ ] Implement aggressive auto-scaling down policies
- [ ] Review and optimize database queries
- [ ] Enable data compression
- [ ] Implement tiered storage (hot/warm/cold)
- [ ] Set up reserved capacity for predictable workloads

## Budget Policies

| Resource Type | Daily Limit | Monthly Limit | Auto-Action |
|---------------|-------------|---------------|-------------|
| Compute | $500 | $12,000 | Scale down at 100% |
| Storage | $100 | $2,500 | Alert at 80% |
| Network | $50 | $1,000 | Rate limit at 90% |
| **Total** | **$650** | **$15,000** | Hard stop at 110% |

## Escalation Path

1. **L1**: On-call - Initial cost containment (15 min)
2. **L2**: FinOps - Budget review and approval (30 min)
3. **L3**: Management - Budget increase approval (as needed)

## Post-Incident

- [ ] Calculate total cost impact
- [ ] Identify root cause
- [ ] Update budget alerts and thresholds
- [ ] Implement preventive controls
- [ ] Update cost allocation tags
