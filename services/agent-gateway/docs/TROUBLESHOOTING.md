# Troubleshooting Guide

Common issues and solutions for the Summit Agent Gateway.

## Table of Contents

1. [Authentication Issues](#authentication-issues)
2. [Authorization & Policy Issues](#authorization--policy-issues)
3. [Scope Violations](#scope-violations)
4. [Quota & Rate Limiting](#quota--rate-limiting)
5. [Approval Workflow](#approval-workflow)
6. [Performance Issues](#performance-issues)
7. [Integration Issues](#integration-issues)
8. [Debugging Tools](#debugging-tools)

## Authentication Issues

### Issue: "Authentication failed: Invalid credentials"

**Symptoms:**
```bash
curl -H "Authorization: Bearer agt_..." http://localhost:3001/api/agent/execute
# Response: {"error": "Authentication failed: Invalid credentials"}
```

**Possible Causes:**

1. **Invalid API Key**
   ```bash
   # Check if key is correct
   echo $AGENT_API_KEY | wc -c
   # Should be 68 characters (agt_ + 64 hex chars)
   ```

2. **Expired Credential**
   ```bash
   # Check expiration
   summit-agent get $AGENT_ID
   # Look for "Credential Expires: ..."
   ```

3. **Revoked Credential**
   ```sql
   -- Check in database
   SELECT * FROM agent_credentials
   WHERE key_prefix = 'agt_abc123'
   AND revoked_at IS NOT NULL;
   ```

**Solutions:**

```bash
# 1. Verify API key format
echo "$AGENT_API_KEY" | grep -E "^agt_[0-9a-f]{64}$"

# 2. Create new credential if expired/revoked
summit-agent credential:create $AGENT_ID --save /secure/path/api-key.txt

# 3. Test authentication
curl -H "Authorization: Bearer $(cat /secure/path/api-key.txt)" \
  http://localhost:3001/api/agent/me
```

### Issue: "Agent is not active. Status: suspended"

**Cause:** Agent has been suspended (manually or automatically)

**Solution:**
```bash
# Check agent status
summit-agent get $AGENT_ID

# Reactivate if appropriate
summit-agent update $AGENT_ID --status active

# Check audit log for suspension reason
SELECT * FROM agent_audit_log
WHERE agent_id = '$AGENT_ID'
AND event_type = 'agent_suspended'
ORDER BY timestamp DESC LIMIT 1;
```

## Authorization & Policy Issues

### Issue: "Policy denied"

**Symptoms:**
```json
{
  "success": false,
  "error": {
    "code": "POLICY_DENIED",
    "message": "missing required capability: delete:data"
  }
}
```

**Debug Steps:**

1. **Check agent capabilities**
   ```bash
   summit-agent get $AGENT_ID
   # Look at "Capabilities:" section
   ```

2. **Review OPA policy decision**
   ```bash
   # Test policy directly
   curl -X POST http://localhost:8181/v1/data/summit/agent/decision \
     -d '{
       "input": {
         "subject": {
           "type": "AGENT",
           "capabilities": ["read:data"],
           ...
         },
         "action": {
           "type": "delete",
           "riskLevel": "high"
         },
         ...
       }
     }'
   ```

3. **Check risk level restrictions**
   ```bash
   # Agent restrictions
   summit-agent get $AGENT_ID | grep -A 5 "Restrictions:"
   ```

**Solutions:**

```bash
# 1. Add required capability
summit-agent update $AGENT_ID --add-capability delete:data

# 2. Use lower-risk action
# Instead of 'delete', use 'write' to mark as inactive

# 3. Request approval for high-risk action
# Action will create approval request automatically

# 4. Use SIMULATION mode for testing
{
  "operationMode": "SIMULATION",
  ...
}
```

### Issue: OPA Not Responding

**Symptoms:**
```
Error: Policy evaluation failed: connect ECONNREFUSED
```

**Diagnosis:**
```bash
# 1. Check if OPA is running
curl http://localhost:8181/health

# 2. Check OPA logs
docker logs opa  # If using Docker
# or
journalctl -u opa -n 50

# 3. Verify network connectivity
telnet localhost 8181
```

**Solutions:**

```bash
# 1. Start OPA
opa run --server --addr :8181 /path/to/policies

# 2. Deploy policies
curl -X PUT http://localhost:8181/v1/policies/agent \
  --data-binary @policy/agent/agent_policy.rego

# 3. Enable dry-run mode temporarily
export OPA_DRY_RUN=true
npm restart
```

## Scope Violations

### Issue: "Scope violation: does not have access to tenant"

**Symptoms:**
```json
{
  "success": false,
  "error": {
    "code": "SCOPE_VIOLATION",
    "message": "Agent my-agent does not have access to tenant prod-tenant-2"
  }
}
```

**Diagnosis:**
```bash
# Check agent scopes
summit-agent get $AGENT_ID
# Look for "Scopes:" section

# Compare with requested tenant
echo "Requested: prod-tenant-2"
echo "Allowed: [tenant-1, tenant-3]"
```

**Solutions:**

```bash
# 1. Add tenant to agent scope
summit-agent update $AGENT_ID --add-tenant prod-tenant-2

# 2. Use correct tenant in request
{
  "tenantId": "tenant-1",  # Use allowed tenant
  ...
}

# 3. Create separate agent for different tenant
summit-agent create \
  --name "agent-tenant2" \
  --tenant prod-tenant-2
```

### Issue: Cross-Tenant Data Leakage

**Detection:**
```sql
-- Find cross-tenant attempts
SELECT
  ar.agent_id,
  ar.tenant_id,
  aa.action_type,
  aa.authorization_status
FROM agent_runs ar
JOIN agent_actions aa ON ar.id = aa.run_id
WHERE aa.authorization_status = 'denied'
AND aa.denial_reason LIKE '%cross-tenant%'
ORDER BY ar.started_at DESC;
```

**Response:**
```bash
# 1. Suspend agent immediately
summit-agent update $AGENT_ID --status suspended

# 2. Review all recent actions
SELECT * FROM agent_actions
WHERE agent_id = '$AGENT_ID'
AND created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

# 3. Investigate and fix
# 4. Re-certify agent before reactivating
```

## Quota & Rate Limiting

### Issue: "Quota exceeded"

**Symptoms:**
```json
{
  "success": false,
  "error": {
    "code": "QUOTA_EXCEEDED",
    "message": "Quota exceeded for daily_runs. Limit: 100, Used: 100"
  }
}
```

**Check Quotas:**
```bash
# Via API
curl -H "Authorization: Bearer $AGENT_API_KEY" \
  http://localhost:3001/api/agent/quotas

# Via CLI
summit-agent quota:status $AGENT_ID

# Via SQL
SELECT * FROM agent_quotas
WHERE agent_id = '$AGENT_ID'
AND period_end > NOW();
```

**Solutions:**

```bash
# 1. Wait for quota reset
# Check reset time in response:
# "resetsAt": "2025-11-21T00:00:00Z"

# 2. Request quota increase
summit-agent update $AGENT_ID \
  --update-restriction maxDailyRuns 500

# 3. Optimize agent to reduce runs
# Batch operations, use caching, etc.

# 4. Temporarily reset quota (admin only)
UPDATE agent_quotas
SET quota_used = 0
WHERE agent_id = '$AGENT_ID'
AND quota_type = 'daily_runs';
```

### Issue: Rate Limiting Too Aggressive

**Symptoms:**
- Agent frequently hits rate limits
- Legitimate operations blocked

**Diagnosis:**
```sql
-- Check quota usage patterns
SELECT
  quota_type,
  quota_limit,
  AVG(quota_used) as avg_used,
  MAX(quota_used) as max_used
FROM agent_quotas
WHERE agent_id = '$AGENT_ID'
GROUP BY quota_type, quota_limit;
```

**Solutions:**

```bash
# 1. Adjust limits in agent restrictions
{
  "restrictions": {
    "maxDailyRuns": 2000,  # Increase
    "maxConcurrentRuns": 10
  }
}

# 2. Implement exponential backoff
async function executeWithBackoff(action, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await execute(action);
    } catch (error) {
      if (error.code === 'QUOTA_EXCEEDED') {
        await sleep(Math.pow(2, i) * 1000);  # 1s, 2s, 4s
        continue;
      }
      throw error;
    }
  }
}
```

## Approval Workflow

### Issue: Action Stuck in Approval

**Symptoms:**
- High-risk action requires approval
- Approval pending for extended time

**Check Status:**
```bash
# List pending approvals
summit-agent approval:list --user $USER_ID

# Get specific approval
summit-agent approval:get $APPROVAL_ID
```

**Solutions:**

```bash
# 1. Approve/reject the request
summit-agent approval:decide $APPROVAL_ID \
  --decision approved \
  --user $USER_ID \
  --reason "Verified legitimate need"

# 2. Check if approval expired
SELECT * FROM agent_approvals
WHERE id = '$APPROVAL_ID'
AND expires_at < NOW();

# If expired, retry action

# 3. Adjust approval expiry time
export APPROVAL_EXPIRY_MINUTES=120  # 2 hours
npm restart
```

### Issue: Approval Email Not Received

**Diagnosis:**
```bash
# Check if webhook configured
echo $ALERT_WEBHOOK

# Check recent approval creations
SELECT * FROM agent_approvals
WHERE created_at >= NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

**Solutions:**

```bash
# 1. Configure webhook for notifications
export ALERT_WEBHOOK=https://hooks.slack.com/services/...

# 2. Set up polling mechanism
while true; do
  summit-agent approval:list --user $USER_ID
  sleep 60
done

# 3. Integrate with ticketing system
# Create approval tickets automatically
```

## Performance Issues

### Issue: Slow Response Times

**Diagnosis:**
```bash
# 1. Check database performance
SELECT
  agent_id,
  COUNT(*) as runs,
  AVG(duration_ms) as avg_duration
FROM agent_runs
WHERE started_at >= NOW() - INTERVAL '1 hour'
GROUP BY agent_id
ORDER BY avg_duration DESC;

# 2. Check active connections
SELECT count(*) FROM pg_stat_activity
WHERE application_name LIKE '%agent-gateway%';

# 3. Check slow queries
SELECT query, calls, mean_exec_time
FROM pg_stat_statements
WHERE query LIKE '%agent_%'
ORDER BY mean_exec_time DESC
LIMIT 10;
```

**Solutions:**

```bash
# 1. Add database indexes
CREATE INDEX CONCURRENTLY idx_agent_runs_started_agent
ON agent_runs(agent_id, started_at DESC);

# 2. Increase connection pool
export DB_POOL_SIZE=50

# 3. Enable query caching
export ENABLE_QUERY_CACHE=true

# 4. Scale horizontally
# Run multiple gateway instances behind load balancer
```

### Issue: High Memory Usage

**Diagnosis:**
```bash
# Check Node.js memory
node --max-old-space-size=4096 dist/server.js

# Monitor with PM2
pm2 monit agent-gateway

# Check for memory leaks
node --inspect dist/server.js
# Connect Chrome DevTools → Memory → Take heap snapshot
```

**Solutions:**

```bash
# 1. Increase heap size
export NODE_OPTIONS="--max-old-space-size=4096"

# 2. Enable garbage collection logging
export NODE_OPTIONS="--trace-gc"

# 3. Identify and fix memory leaks
# Use Chrome DevTools Memory Profiler

# 4. Restart service periodically
pm2 start dist/server.js \
  --name agent-gateway \
  --max-memory-restart 1G
```

## Integration Issues

### Issue: Provenance Ledger Not Recording

**Diagnosis:**
```bash
# Check ledger service
curl http://localhost:3002/health

# Check recent entries
curl http://localhost:3002/api/claims | jq '.[-5:]'

# Check agent gateway logs
grep "provenance" logs/agent-gateway.log
```

**Solutions:**

```bash
# 1. Configure ledger URL
export PROVENANCE_LEDGER_URL=http://localhost:3002

# 2. Verify network connectivity
telnet localhost 3002

# 3. Check ledger service logs
journalctl -u prov-ledger -n 100

# 4. Retry failed entries
# Implement retry logic with exponential backoff
```

### Issue: CLI Execution Fails

**Symptoms:**
```json
{
  "error": "Failed to execute CLI command: permission denied"
}
```

**Diagnosis:**
```bash
# Check CLI path
which maestro
echo $CLI_PATH

# Check permissions
ls -la /usr/local/bin/maestro

# Test CLI directly
maestro --version
```

**Solutions:**

```bash
# 1. Set correct CLI path
export CLI_PATH=/usr/local/bin/maestro

# 2. Add execute permissions
chmod +x /usr/local/bin/maestro

# 3. Add agent user to sudoers (if needed)
echo "agent-gateway ALL=(ALL) NOPASSWD: /usr/local/bin/maestro" >> /etc/sudoers.d/agent-gateway

# 4. Use wrapper script
# Create /usr/local/bin/maestro-agent-wrapper
```

## Debugging Tools

### Enable Debug Logging

```bash
# Set log level
export LOG_LEVEL=debug
export ENABLE_DETAILED_LOGGING=true

# Restart service
npm restart

# Tail logs
tail -f logs/agent-gateway.log | jq '.'
```

### Trace Requests

```bash
# Enable tracing
export ENABLE_TRACING=true
export OTEL_SAMPLE_RATE=1.0  # Trace everything

# View traces in Jaeger
open http://localhost:16686
```

### Database Queries

```sql
-- Recent agent activity
SELECT
  a.name,
  ar.status,
  ar.operation_mode,
  COUNT(aa.*) as actions,
  ar.started_at
FROM agent_runs ar
JOIN agents a ON ar.agent_id = a.id
LEFT JOIN agent_actions aa ON ar.id = aa.run_id
WHERE ar.started_at >= NOW() - INTERVAL '1 hour'
GROUP BY a.name, ar.id
ORDER BY ar.started_at DESC;

-- Failed actions
SELECT
  a.name,
  aa.action_type,
  aa.authorization_status,
  aa.denial_reason,
  aa.created_at
FROM agent_actions aa
JOIN agents a ON aa.agent_id = a.id
WHERE aa.authorization_status = 'denied'
AND aa.created_at >= NOW() - INTERVAL '24 hours'
ORDER BY aa.created_at DESC;

-- Quota exhaustion
SELECT
  a.name,
  aq.quota_type,
  aq.quota_used,
  aq.quota_limit,
  (aq.quota_used::float / aq.quota_limit * 100) as usage_percent
FROM agent_quotas aq
JOIN agents a ON aq.agent_id = a.id
WHERE aq.quota_used >= aq.quota_limit * 0.9
ORDER BY usage_percent DESC;
```

### Health Check Script

```bash
#!/bin/bash
# health-check.sh

echo "=== Agent Gateway Health Check ==="

# 1. Service health
curl -sf http://localhost:3001/health || echo "❌ Service unhealthy"

# 2. Database connectivity
psql -h $DB_HOST -U summit -c "SELECT 1" || echo "❌ Database unreachable"

# 3. OPA connectivity
curl -sf http://localhost:8181/health || echo "❌ OPA unreachable"

# 4. Check active agents
ACTIVE_AGENTS=$(psql -h $DB_HOST -U summit -t -c \
  "SELECT COUNT(*) FROM agents WHERE status='active'" | xargs)
echo "Active agents: $ACTIVE_AGENTS"

# 5. Check recent runs
RECENT_RUNS=$(psql -h $DB_HOST -U summit -t -c \
  "SELECT COUNT(*) FROM agent_runs WHERE started_at >= NOW() - INTERVAL '1 hour'" | xargs)
echo "Runs (last hour): $RECENT_RUNS"

# 6. Check error rate
ERROR_RATE=$(psql -h $DB_HOST -U summit -t -c \
  "SELECT ROUND(COUNT(*) FILTER (WHERE status='failed')::numeric / COUNT(*) * 100, 2)
   FROM agent_runs WHERE started_at >= NOW() - INTERVAL '1 hour'" | xargs)
echo "Error rate (last hour): ${ERROR_RATE}%"

echo "=== End Health Check ==="
```

## Getting Help

### Log Collection

```bash
# Collect diagnostic information
./scripts/collect-diagnostics.sh

# Creates: diagnostics-YYYYMMDD.tar.gz
# Contains:
# - Service logs
# - Configuration (redacted)
# - Database schema
# - Recent agent activity
# - Error logs
```

### Support Channels

- **Documentation**: `cat README.md docs/*.md`
- **GitHub Issues**: https://github.com/company/summit/issues
- **Slack**: #agent-gateway-support
- **Email**: agent-support@company.com

### Reporting Bugs

```markdown
## Bug Report Template

**Description:**
Brief description of the issue

**Environment:**
- Environment: staging/production
- Gateway Version: 1.0.0
- Node Version: 18.x
- OS: Linux/macOS

**Steps to Reproduce:**
1. Step 1
2. Step 2
3. Step 3

**Expected Behavior:**
What should happen

**Actual Behavior:**
What actually happens

**Logs:**
```
Relevant log entries
```

**Additional Context:**
Any other relevant information
```

---

**Last Updated:** 2025-11-20
**Version:** 1.0
