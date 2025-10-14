# IncidentAutoReweighter Runbook

**Service:** MC Platform v0.4.5 IncidentAutoReweighter
**Component:** QAM (Quantum Application Manager)
**On-Call Priority:** P1 (Critical Production Service)

## Overview

The IncidentAutoReweighter automatically reduces exploration rates and pins weights during critical incidents to stabilize system behavior. It provides 50% exploration reduction and 2-hour weight pinning with automatic restoration.

## Feature Flags

| Flag Name | Default | Description |
|-----------|---------|-------------|
| `mc.incident_reweighter.enabled` | `true` | Master enable/disable switch |
| `mc.incident_reweighter.auto_restore` | `true` | Enable automatic restoration after pin TTL |
| `mc.incident_reweighter.exploration_reduction` | `0.5` | Factor to reduce exploration (0.5 = 50% reduction) |
| `mc.incident_reweighter.pin_duration_ms` | `7200000` | Pin duration in milliseconds (2 hours) |

## Severity Thresholds

### Default Configuration
```yaml
correctness_floor_breach:
  medium: true    # Trigger on medium+ severity
  high: true
  critical: true

performance_degradation:
  high: true      # Trigger on high+ severity
  critical: true

security_violation:
  medium: true    # Trigger on medium+ severity
  high: true
  critical: true

budget_breach:
  high: true      # Trigger on high+ severity
  critical: true

custom:
  critical: true  # Trigger only on critical custom incidents
```

## Commands

### Check Status
```bash
# Get current reweighter status
curl -s http://mc-platform:8080/qam/reweighter/status | jq .

# Check active reweights
curl -s http://mc-platform:8080/qam/reweighter/active | jq .

# View metrics
curl -s http://mc-platform:8080/metrics | grep mc_incident_reweighter
```

### Pin/Unpin Operations

#### Manual Pin (Emergency)
```bash
# Manually trigger reweight for specific app
curl -X POST http://mc-platform:8080/qam/reweighter/manual-pin \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "TENANT_ID",
    "appId": "APP_ID",
    "reason": "Manual intervention - describe reason",
    "duration": 7200000
  }'
```

#### Manual Unpin (Restore)
```bash
# Restore original settings immediately
curl -X POST http://mc-platform:8080/qam/reweighter/restore \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "TENANT_ID",
    "appId": "APP_ID"
  }'

# Restore by reweight ID
curl -X POST http://mc-platform:8080/qam/reweighter/restore/{REWEIGHT_ID}
```

#### Bulk Operations
```bash
# List all active reweights
curl -s http://mc-platform:8080/qam/reweighter/active | jq '.[] | {id, tenantId, appId, endTime}'

# Emergency restore all
curl -X POST http://mc-platform:8080/qam/reweighter/restore-all \
  -H "Authorization: Bearer ${EMERGENCY_TOKEN}"
```

### Configuration Updates

#### Update Thresholds
```bash
# Update severity thresholds
curl -X PUT http://mc-platform:8080/qam/reweighter/config \
  -H "Content-Type: application/json" \
  -d '{
    "triggerThresholds": {
      "correctness_floor_breach": {
        "medium": false,
        "high": true,
        "critical": true
      }
    }
  }'
```

#### Disable Reweighter
```bash
# Graceful disable (complete current operations)
curl -X POST http://mc-platform:8080/qam/reweighter/disable

# Emergency disable (immediate stop)
kubectl patch configmap mc-platform-config \
  -p '{"data":{"INCIDENT_REWEIGHTER_ENABLED":"false"}}'
kubectl rollout restart deployment/mc-platform
```

## Failure Modes & Recovery

### 1. Reweighter Stuck in Active State

**Symptoms:**
- Alert: `ReweighterToggleStuck`
- `mc_incident_reweighter_active` = 1 for >10 minutes without incident

**Diagnosis:**
```bash
# Check incident status
curl -s http://mc-platform:8080/qam/reweighter/status | jq '.activeReweights[]'

# Check Redis state
redis-cli -h mc-redis GET "incident:reweight:*"
```

**Recovery:**
```bash
# Manual restore specific reweight
curl -X POST http://mc-platform:8080/qam/reweighter/restore/{REWEIGHT_ID}

# If multiple stuck, restore all
curl -X POST http://mc-platform:8080/qam/reweighter/restore-all
```

### 2. Pin TTL Expired But Still Pinned

**Symptoms:**
- Alert: `PinTTLExpiredButPinned`
- `mc_weights_pinned` = 1 beyond 2h10m

**Diagnosis:**
```bash
# Check pin start time
curl -s http://mc-platform:8080/qam/reweighter/status | jq '.activeReweights[] | {id, startTime, endTime}'

# Check Redis TTL
redis-cli -h mc-redis TTL "incident:reweight:*"
```

**Recovery:**
```bash
# Force restoration
curl -X POST http://mc-platform:8080/qam/reweighter/restore/{REWEIGHT_ID}

# Clear Redis state if needed
redis-cli -h mc-redis DEL "incident:reweight:{REWEIGHT_ID}"
redis-cli -h mc-redis DEL "qam:incident:{TENANT_ID}:{APP_ID}"
```

### 3. Exploration Rate Not Reduced

**Symptoms:**
- Alert: `ExplorationNotReduced`
- Incident active but exploration rate >60% of baseline

**Diagnosis:**
```bash
# Check current vs baseline rates
curl -s http://mc-platform:8080/metrics | grep -E "(mc_exploration_rate|mc_exploration_rate_baseline)"

# Check reweighter processing
curl -s http://mc-platform:8080/qam/reweighter/status | jq '.metrics'
```

**Recovery:**
```bash
# Manual reweight application
curl -X POST http://mc-platform:8080/qam/reweighter/manual-pin \
  -d '{"tenantId":"TENANT","appId":"APP","reason":"Manual fix for failed auto-reweight"}'

# Restart reweighter service if needed
kubectl rollout restart deployment/mc-platform
```

### 4. Restore Failed

**Symptoms:**
- Alert: `RestoreFailed`
- No successful restore within 5 minutes of incident clearance

**Diagnosis:**
```bash
# Check restore attempts
curl -s http://mc-platform:8080/qam/reweighter/status | jq '.metrics.failedRestorations'

# Check logs for errors
kubectl logs -l app=mc-platform --tail=100 | grep "restore.*error"
```

**Recovery:**
```bash
# Manual restore with verification
curl -X POST http://mc-platform:8080/qam/reweighter/restore/{REWEIGHT_ID}

# Verify restoration
curl -s http://mc-platform:8080/qam/state/{TENANT_ID}/{APP_ID} | jq '.exploreRate'
```

## Health Checks

### Service Health
```bash
# Basic health check
curl -s http://mc-platform:8080/health/reweighter

# Detailed status
curl -s http://mc-platform:8080/qam/reweighter/status | jq '{
  healthy: .healthy,
  activeReweights: .activeReweights,
  redisStatus: .redisStatus,
  isProcessing: .isProcessing
}'
```

### Key Metrics to Monitor
```bash
# Critical metrics
curl -s http://mc-platform:8080/metrics | grep -E "
mc_incident_reweighter_active
mc_exploration_rate
mc_weights_pinned
mc_reweighter_incidents_processed_total
mc_reweighter_restore_success_total
mc_reweighter_restore_failed_total
"
```

## Escalation

### P1 Escalation Triggers
- Multiple restore failures (>3 in 10 minutes)
- Reweighter service down >5 minutes
- Critical incidents not triggering reweight
- Data corruption in Redis state

### P2 Escalation Triggers
- Pin TTL consistently exceeded
- High restore failure rate (>10%)
- Configuration drift detected

### Contact Information
- **Primary On-Call:** MC Platform Engineering
- **Secondary:** Platform SRE Team
- **Emergency:** Architecture General (DoD Production Issues)

## Debugging

### Log Analysis
```bash
# Reweighter-specific logs
kubectl logs -l app=mc-platform --tail=500 | grep IncidentAutoReweighter

# Filter by incident ID
kubectl logs -l app=mc-platform --tail=1000 | grep "incidentId.*{INCIDENT_ID}"

# Error patterns
kubectl logs -l app=mc-platform --tail=1000 | grep -E "(error|ERROR|failed|FAILED)" | grep reweight
```

### State Inspection
```bash
# Redis state keys
redis-cli -h mc-redis KEYS "*incident*"
redis-cli -h mc-redis KEYS "*reweight*"

# Current app states
redis-cli -h mc-redis KEYS "qam:state:*:*:current"

# Incident flags
redis-cli -h mc-redis KEYS "qam:incident:*"
```

### Configuration Validation
```bash
# Current configuration
curl -s http://mc-platform:8080/qam/reweighter/config | jq .

# Validate against schema
curl -s http://mc-platform:8080/qam/reweighter/config/validate

# Environment variables
kubectl get configmap mc-platform-config -o yaml | grep -E "INCIDENT_|REWEIGHT"
```

## Testing

### Incident Simulation
```bash
# Simulate correctness floor breach
curl -X POST http://mc-platform:8080/qam/incident/simulate \
  -d '{
    "type": "correctness_floor_breach",
    "severity": "high",
    "tenantId": "TEST_TENANT",
    "appId": "TEST_APP"
  }'

# Verify reweight applied
sleep 5
curl -s http://mc-platform:8080/qam/state/TEST_TENANT/TEST_APP | jq '.exploreRate'
```

### End-to-End Test
```bash
# Run complete E2E test
curl -X POST http://mc-platform:8080/qam/reweighter/test/e2e

# Monitor test progress
watch 'curl -s http://mc-platform:8080/qam/reweighter/test/status'
```

## Related Documentation
- [MC Platform Architecture](../docs/architecture.md)
- [QAM Service Overview](../docs/qam-overview.md)
- [Incident Response Playbook](./incident-response-playbook.md)
- [Monitoring & Alerting Guide](./monitoring-guide.md)