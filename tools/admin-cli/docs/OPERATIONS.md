# Admin CLI Operations Guide

## For SRE Teams and Platform Operators

This guide covers day-to-day operations, incident response, and maintenance procedures using the Summit Admin CLI.

## Table of Contents

1. [Daily Operations](#daily-operations)
2. [Incident Response](#incident-response)
3. [Maintenance Procedures](#maintenance-procedures)
4. [Runbook Integration](#runbook-integration)
5. [Monitoring Integration](#monitoring-integration)
6. [Troubleshooting](#troubleshooting)

---

## Daily Operations

### Morning Health Check

```bash
#!/bin/bash
# daily-health-check.sh

echo "=== IntelGraph Daily Health Check ==="
echo "Date: $(date)"
echo ""

# 1. Check overall environment status
echo "### Environment Status ###"
summit-admin env status

# 2. Check SLO compliance
echo ""
echo "### SLO Summary (Last 24h) ###"
summit-admin env slo --period day

# 3. Check for any degraded services
echo ""
echo "### Service Health ###"
UNHEALTHY=$(summit-admin --format json env health | jq -r '.services[] | select(.status != "healthy") | .name')
if [ -n "$UNHEALTHY" ]; then
  echo "WARNING: Unhealthy services detected:"
  echo "$UNHEALTHY"
else
  echo "All services healthy ✓"
fi

# 4. Check recent security events
echo ""
echo "### Recent Security Events ###"
summit-admin security audit --limit 10 --action "auth.fail*"

# 5. Check data operations
echo ""
echo "### Running Data Operations ###"
summit-admin data operations --status running
```

### Tenant Monitoring

```bash
# List all active tenants
summit-admin tenant list --status active

# Check specific tenant details
summit-admin tenant get <tenant-id>

# Export tenant report
summit-admin --format json tenant list > daily-tenant-report.json
```

### Database Health

```bash
# Check graph database
summit-admin graph health
summit-admin graph stats

# Check for index issues
summit-admin graph schema --indexes
```

---

## Incident Response

### Incident Playbook: Service Degradation

```bash
#!/bin/bash
# incident-service-degradation.sh

SEVERITY=${1:-"medium"}
SERVICE=${2:-"all"}

echo "=== Incident Response: Service Degradation ==="
echo "Severity: $SEVERITY"
echo "Service: $SERVICE"
echo "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo ""

# Step 1: Assess current state
echo "### Step 1: Current State Assessment ###"
summit-admin env status --detailed

# Step 2: Check specific service if provided
if [ "$SERVICE" != "all" ]; then
  echo ""
  echo "### Step 2: Service-Specific Health ###"
  summit-admin env health --service "$SERVICE"
fi

# Step 3: Check recent changes/operations
echo ""
echo "### Step 3: Recent Operations ###"
summit-admin data operations --limit 10
summit-admin security audit --limit 20

# Step 4: Check graph database (common bottleneck)
echo ""
echo "### Step 4: Graph Database Status ###"
summit-admin graph health
summit-admin graph stats

# Step 5: Generate incident report
echo ""
echo "### Generating Incident Report ###"
REPORT_FILE="incident-$(date +%Y%m%d-%H%M%S).json"
summit-admin --format json env status > "$REPORT_FILE"
echo "Report saved to: $REPORT_FILE"
```

### Incident Playbook: Authentication Failures

```bash
#!/bin/bash
# incident-auth-failures.sh

echo "=== Incident Response: Authentication Failures ==="

# Check recent auth failures
echo "### Recent Authentication Failures ###"
summit-admin security audit --action "auth.fail" --limit 50

# Check if specific user is affected
if [ -n "$1" ]; then
  echo ""
  echo "### User-Specific Events ###"
  summit-admin security audit --user "$1" --limit 20
fi

# Check key status
echo ""
echo "### Security Key Status ###"
summit-admin security keys --status active

# Check policy compliance
echo ""
echo "### Policy Check ###"
summit-admin security check-policies --policy authentication
```

### Incident Playbook: Data Inconsistency

```bash
#!/bin/bash
# incident-data-inconsistency.sh

ENTITY_TYPE=${1:-""}

echo "=== Incident Response: Data Inconsistency ==="

# Step 1: Verify integrity
echo "### Step 1: Running Integrity Check ###"
if [ -n "$ENTITY_TYPE" ]; then
  summit-admin data verify-integrity --entity-type "$ENTITY_TYPE" --sample-size 50000
else
  summit-admin data verify-integrity --sample-size 50000
fi

# Step 2: Check recent data operations
echo ""
echo "### Step 2: Recent Data Operations ###"
summit-admin data operations --limit 20

# Step 3: Check for failed operations
echo ""
echo "### Step 3: Failed Operations ###"
summit-admin data operations --status failed --limit 10
```

### Emergency: Tenant Lockout

```bash
#!/bin/bash
# emergency-tenant-lockout.sh

TENANT_ID=$1

if [ -z "$TENANT_ID" ]; then
  echo "Usage: $0 <tenant-id>"
  exit 1
fi

echo "=== EMERGENCY: Tenant Lockout ==="
echo "Tenant: $TENANT_ID"
echo ""

# WARNING: This requires elevated permissions
echo "WARNING: This operation requires admin privileges"
echo ""

# Suspend tenant immediately
summit-admin tenant suspend "$TENANT_ID" \
  --reason "Emergency lockout - Security incident" \
  --force

# Revoke all tokens for tenant
summit-admin security revoke-tokens --tenant "$TENANT_ID" --force

echo ""
echo "Tenant $TENANT_ID has been locked out."
echo "All active sessions have been terminated."
```

---

## Maintenance Procedures

### Scheduled Key Rotation

```bash
#!/bin/bash
# maintenance-key-rotation.sh

# This should be run during maintenance window
echo "=== Scheduled Key Rotation ==="
echo "Start time: $(date)"
echo ""

# Pre-rotation checks
echo "### Pre-Rotation Status ###"
summit-admin security keys

# Rotate with 24-hour grace period
echo ""
echo "### Rotating Keys ###"
summit-admin security rotate-keys \
  --type all \
  --grace-period 24 \
  --force

# Verify new keys are active
echo ""
echo "### Post-Rotation Status ###"
summit-admin security keys --status active

echo ""
echo "Key rotation complete at $(date)"
echo "Grace period: 24 hours"
echo "Old keys will be invalidated at: $(date -d '+24 hours')"
```

### Database Maintenance

```bash
#!/bin/bash
# maintenance-database.sh

echo "=== Database Maintenance ==="
echo "Start time: $(date)"
echo ""

# Step 1: Pre-maintenance health check
echo "### Pre-Maintenance Health ###"
summit-admin graph health
summit-admin graph stats

# Step 2: Clear caches
echo ""
echo "### Clearing Caches ###"
summit-admin graph clear-cache --force

# Step 3: Run analyze (non-destructive)
echo ""
echo "### Running Analysis ###"
summit-admin graph vacuum --analyze

# Step 4: Post-maintenance check
echo ""
echo "### Post-Maintenance Health ###"
summit-admin graph health

echo ""
echo "Maintenance complete at $(date)"
```

### Reindexing Procedure

```bash
#!/bin/bash
# maintenance-reindex.sh

INDEX=${1:-"all"}

echo "=== Search Reindexing ==="
echo "Target: $INDEX"
echo "Start time: $(date)"
echo ""

# Start reindex
if [ "$INDEX" = "all" ]; then
  OPERATION=$(summit-admin --format json data reindex --all --batch-size 500 | jq -r '.operationId')
else
  OPERATION=$(summit-admin --format json data reindex --index "$INDEX" --batch-size 500 | jq -r '.operationId')
fi

echo "Operation started: $OPERATION"
echo ""

# Monitor progress
echo "### Monitoring Progress ###"
summit-admin data status "$OPERATION" --watch
```

---

## Runbook Integration

### Automated Runbook Execution

The CLI can be integrated with runbook systems for automated incident response:

```yaml
# runbook-service-restart.yaml
name: Service Restart
trigger:
  alert: ServiceUnhealthy
  severity: high

steps:
  - name: Assess Impact
    command: summit-admin env status --detailed

  - name: Check Dependencies
    command: summit-admin env health

  - name: Notify On-Call
    command: echo "Service restart initiated" | notify-oncall

  - name: Verify Recovery
    command: summit-admin env health --wait --timeout 120
    condition: previous.exitCode == 0
```

### PagerDuty Integration

```bash
#!/bin/bash
# pagerduty-diagnostic.sh
# Called by PagerDuty webhook

INCIDENT_ID=$1

# Gather diagnostic data
DIAG=$(summit-admin --format json env status)

# Post to PagerDuty
curl -X POST "https://api.pagerduty.com/incidents/$INCIDENT_ID/notes" \
  -H "Authorization: Token token=$PAGERDUTY_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"note\": {\"content\": \"Auto-diagnostic:\\n$DIAG\"}}"
```

---

## Monitoring Integration

### Prometheus Metrics Export

```bash
#!/bin/bash
# prometheus-exporter.sh
# Run as cron job every minute

# Export metrics to textfile collector
METRICS_FILE="/var/lib/prometheus/node-exporter/admin-cli.prom"

# Get SLO data
SLO=$(summit-admin --format json env slo --period hour)

# Write metrics
cat > "$METRICS_FILE" << EOF
# HELP intelgraph_availability Platform availability
# TYPE intelgraph_availability gauge
intelgraph_availability $(echo $SLO | jq -r '.availability')

# HELP intelgraph_error_rate Platform error rate
# TYPE intelgraph_error_rate gauge
intelgraph_error_rate $(echo $SLO | jq -r '.errorRate')

# HELP intelgraph_p99_latency P99 latency in ms
# TYPE intelgraph_p99_latency gauge
intelgraph_p99_latency $(echo $SLO | jq -r '.p99Latency')

# HELP intelgraph_throughput Requests per second
# TYPE intelgraph_throughput gauge
intelgraph_throughput $(echo $SLO | jq -r '.throughput')
EOF
```

### Grafana Alert Integration

```bash
# Grafana webhook handler
#!/bin/bash
# grafana-alert-handler.sh

ALERT_NAME=$1
ALERT_STATE=$2

case $ALERT_STATE in
  "alerting")
    # Run diagnostic
    summit-admin env status --detailed > "/tmp/alert-$ALERT_NAME.log"
    ;;
  "ok")
    # Log recovery
    echo "Alert $ALERT_NAME recovered at $(date)" >> /var/log/alerts.log
    ;;
esac
```

---

## Troubleshooting

### Common Issues

#### Issue: "Connection refused"

```bash
# Check endpoint configuration
summit-admin config get profiles.default.endpoint

# Test connectivity
curl -v $(summit-admin config get profiles.default.endpoint)/health

# Try with explicit endpoint
summit-admin --endpoint http://localhost:4000 env health
```

#### Issue: "Authentication failed"

```bash
# Verify token is set
echo $INTELGRAPH_TOKEN | head -c 10

# Check token in profile
summit-admin config show | grep -A5 "profiles"

# Test with fresh token
summit-admin --token $NEW_TOKEN env health
```

#### Issue: "Permission denied"

```bash
# Check your permissions
summit-admin security check-permission --user $(whoami) --permission "*:*"

# View your roles
summit-admin --format json security audit --user $(whoami) --action "auth.success" --limit 1 | \
  jq '.items[0].user.role'
```

#### Issue: "Operation timeout"

```bash
# Check service health
summit-admin env health

# Check for long-running operations
summit-admin data operations --status running

# Cancel stuck operation
summit-admin data cancel <operation-id> --force
```

### Debug Mode

```bash
# Enable verbose output
summit-admin --verbose env status

# Enable debug logging
DEBUG=* summit-admin env status

# Trace API calls
summit-admin --verbose --format json env status 2>&1 | tee debug.log
```

### Getting Help

```bash
# Command help
summit-admin --help
summit-admin <command> --help

# Check version
summit-admin --version

# Report issues
# https://github.com/BrianCLong/summit/issues
```
