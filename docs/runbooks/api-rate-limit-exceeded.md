# API Rate Limit Exceeded Runbook

## Overview

This runbook covers procedures for handling API rate limit exceeded scenarios, including identifying abusive clients, implementing rate limiting, and mitigating DDoS attacks.

## Symptoms

- Spike in API request volume
- Increase in 429 (Too Many Requests) responses
- System resource exhaustion
- Slow response times for legitimate users
- Alert: "UnusualAPITraffic" or "HighAPIRequestVolume"

## Quick Diagnosis

### Check Request Metrics

```bash
# Check current request rate
kubectl logs -l app=intelgraph-api -n intelgraph --tail=1000 | \
  grep "HTTP" | wc -l

# Check by status code
kubectl logs -l app=intelgraph-api -n intelgraph --tail=5000 | \
  grep "429" | wc -l

# Query Prometheus for request rate
curl -G 'http://prometheus:9090/api/v1/query' \
  --data-urlencode 'query=rate(http_requests_total[5m])'

# Check top endpoints
kubectl logs -l app=intelgraph-api -n intelgraph --tail=10000 | \
  awk '{print $7}' | sort | uniq -c | sort -rn | head -20
```

### Identify Problematic Clients

```bash
# Query API logs for top IP addresses
kubectl logs -l app=intelgraph-api -n intelgraph --tail=10000 | \
  grep "HTTP" | awk '{print $1}' | sort | uniq -c | sort -rn | head -20

# Query database for top API consumers
psql -h postgres -U $POSTGRES_USER -d intelgraph -c "
  SELECT
    user_id,
    tenant_id,
    COUNT(*) as request_count,
    MAX(created_at) as last_request,
    COUNT(DISTINCT endpoint) as unique_endpoints
  FROM api_requests
  WHERE created_at > NOW() - INTERVAL '1 hour'
  GROUP BY user_id, tenant_id
  ORDER BY request_count DESC
  LIMIT 20;
"

# Check for suspicious patterns (same IP, many tenants)
psql -h postgres -U $POSTGRES_USER -d intelgraph -c "
  SELECT
    ip_address,
    COUNT(DISTINCT tenant_id) as tenant_count,
    COUNT(*) as request_count,
    array_agg(DISTINCT endpoint) as endpoints
  FROM api_requests
  WHERE created_at > NOW() - INTERVAL '1 hour'
  GROUP BY ip_address
  HAVING COUNT(DISTINCT tenant_id) > 5
  ORDER BY request_count DESC;
"
```

### Check DataDog APM

```bash
# Open DataDog APM dashboard
open "https://app.datadoghq.com/apm/services"

# Query for rate limit violations
# In DataDog: @http.status_code:429 @env:production
```

## Mitigation Strategies

### Strategy 1: Enable/Adjust Rate Limiting

#### Enable Rate Limiting Globally
```bash
# Update rate limit configuration
kubectl patch configmap intelgraph-config -n intelgraph --type merge -p '
{
  "data": {
    "RATE_LIMIT_ENABLED": "true",
    "RATE_LIMIT_WINDOW_MS": "60000",
    "RATE_LIMIT_MAX_REQUESTS": "100",
    "RATE_LIMIT_BURST": "120"
  }
}
'

# Rolling restart to apply
kubectl rollout restart deployment intelgraph-api -n intelgraph
kubectl rollout status deployment intelgraph-api -n intelgraph
```

#### Tier-Based Rate Limiting
```bash
# Configure different limits by subscription tier
kubectl patch configmap intelgraph-config -n intelgraph --type merge -p '
{
  "data": {
    "RATE_LIMIT_FREE_TIER": "50",
    "RATE_LIMIT_BASIC_TIER": "200",
    "RATE_LIMIT_PREMIUM_TIER": "1000",
    "RATE_LIMIT_ENTERPRISE_TIER": "10000"
  }
}
'

kubectl rollout restart deployment intelgraph-api -n intelgraph
```

#### Endpoint-Specific Rate Limiting
```bash
# Set lower limits for expensive endpoints
kubectl patch configmap intelgraph-config -n intelgraph --type merge -p '
{
  "data": {
    "RATE_LIMIT_GRAPH_ANALYSIS": "10",
    "RATE_LIMIT_EXPORT": "5",
    "RATE_LIMIT_BULK_IMPORT": "2"
  }
}
'
```

### Strategy 2: Block Abusive Clients

#### Temporary IP Block (using Network Policy)
```bash
# Create network policy to block specific IP
cat <<EOF | kubectl apply -f -
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: block-abusive-ip
  namespace: intelgraph
spec:
  podSelector:
    matchLabels:
      app: intelgraph-api
  policyTypes:
  - Ingress
  ingress:
  - from:
    - ipBlock:
        cidr: 0.0.0.0/0
        except:
        - 203.0.113.45/32  # Blocked IP
    ports:
    - protocol: TCP
      port: 3000
EOF
```

#### Block at Load Balancer Level
```bash
# AWS ALB - Add IP to WAF block list
aws wafv2 update-ip-set \
  --name intelgraph-blocked-ips \
  --scope REGIONAL \
  --id <ip-set-id> \
  --addresses "203.0.113.45/32" \
  --lock-token <lock-token>

# Or using Cloudflare
curl -X POST "https://api.cloudflare.com/client/v4/zones/<zone-id>/firewall/access_rules/rules" \
  -H "X-Auth-Email: <email>" \
  -H "X-Auth-Key: <api-key>" \
  -H "Content-Type: application/json" \
  --data '{
    "mode": "block",
    "configuration": {
      "target": "ip",
      "value": "203.0.113.45"
    },
    "notes": "Abusive client - automated blocking"
  }'
```

#### Suspend Abusive Tenant
```bash
# Temporarily disable tenant access
psql -h postgres -U $POSTGRES_USER -d intelgraph -c "
  UPDATE tenants
  SET status = 'suspended',
      suspension_reason = 'API abuse - rate limit exceeded',
      suspended_at = NOW(),
      suspended_by = 'ops-team'
  WHERE id = '<tenant-id>';
"

# Notify tenant
# Send email to tenant admin about suspension
```

### Strategy 3: Scale Infrastructure

#### Scale API Replicas
```bash
# Horizontal scaling
kubectl scale deployment intelgraph-api -n intelgraph --replicas=10

# Enable HPA for automatic scaling
kubectl autoscale deployment intelgraph-api -n intelgraph \
  --min=5 --max=20 --cpu-percent=70

# Verify scaling
kubectl get hpa -n intelgraph
```

#### Increase Resource Limits
```bash
# Update resource limits
kubectl patch deployment intelgraph-api -n intelgraph -p '
{
  "spec": {
    "template": {
      "spec": {
        "containers": [{
          "name": "api",
          "resources": {
            "requests": {
              "cpu": "500m",
              "memory": "1Gi"
            },
            "limits": {
              "cpu": "2000m",
              "memory": "4Gi"
            }
          }
        }]
      }
    }
  }
}
'
```

### Strategy 4: Enable DDoS Protection

#### Cloudflare DDoS Protection
```bash
# Enable "I'm Under Attack" mode
curl -X PATCH "https://api.cloudflare.com/client/v4/zones/<zone-id>/settings/security_level" \
  -H "X-Auth-Email: <email>" \
  -H "X-Auth-Key: <api-key>" \
  -H "Content-Type: application/json" \
  --data '{"value":"under_attack"}'

# Enable rate limiting rule
curl -X POST "https://api.cloudflare.com/client/v4/zones/<zone-id>/rate_limits" \
  -H "X-Auth-Email: <email>" \
  -H "X-Auth-Key: <api-key>" \
  -H "Content-Type: application/json" \
  --data '{
    "threshold": 100,
    "period": 60,
    "action": {
      "mode": "challenge",
      "timeout": 3600
    }
  }'
```

#### AWS Shield / WAF
```bash
# Enable AWS Shield Advanced (if not enabled)
aws shield create-protection \
  --name intelgraph-api-protection \
  --resource-arn <alb-arn>

# Create rate-based rule
aws wafv2 create-rate-based-rule \
  --name intelgraph-rate-limit \
  --scope REGIONAL \
  --rate-limit 2000 \
  --aggregate-key-type IP
```

### Strategy 5: Implement Caching

#### Enable Aggressive Caching
```bash
# Configure Redis caching
kubectl patch configmap intelgraph-config -n intelgraph --type merge -p '
{
  "data": {
    "CACHE_ENABLED": "true",
    "CACHE_TTL": "300",
    "CACHE_MAX_SIZE": "10000",
    "CACHE_STRATEGY": "lru"
  }
}
'

# Add CDN caching headers
kubectl patch configmap intelgraph-config -n intelgraph --type merge -p '
{
  "data": {
    "CDN_CACHE_STATIC_ASSETS": "true",
    "CDN_CACHE_MAX_AGE": "3600"
  }
}
'

kubectl rollout restart deployment intelgraph-api -n intelgraph
```

## Investigation Checklist

- [ ] Identify traffic spike pattern (sudden vs gradual)
- [ ] Determine if legitimate traffic or abuse
- [ ] Identify top consumers (IPs, tenants, users)
- [ ] Check for pattern (endpoint, method, payload)
- [ ] Review recent marketing campaigns or events
- [ ] Check for coordinated attack (multiple IPs, same pattern)
- [ ] Assess impact on system resources (CPU, memory, DB connections)
- [ ] Verify current rate limiting configuration

## Response Based on Pattern

### Legitimate Traffic Spike
```
✅ Action: Scale infrastructure
- Increase API replicas
- Enable auto-scaling
- Optimize slow endpoints
- Add caching where possible
- Notify team of capacity needs
```

### Abusive Single Tenant
```
⚠️ Action: Throttle specific tenant
- Reduce rate limit for tenant
- Contact tenant to discuss usage
- Offer upgrade to higher tier if needed
- Suspend if malicious behavior confirmed
```

### Distributed Attack (DDoS)
```
🚨 Action: Enable DDoS protection
- Enable Cloudflare "Under Attack" mode
- Implement CAPTCHA challenges
- Block malicious IP ranges
- Enable AWS Shield/WAF
- Contact DDoS mitigation service
```

### API Abuse / Scraping
```
⚠️ Action: Implement bot protection
- Enable bot detection
- Require authentication for all endpoints
- Implement CAPTCHA for suspicious requests
- Block known bot user agents
- Rate limit aggressively
```

## Monitoring During Incident

```bash
# Monitor request rate in real-time
watch -n 5 'curl -s http://prometheus:9090/api/v1/query --data-urlencode "query=rate(http_requests_total[1m])" | jq ".data.result[0].value[1]"'

# Monitor 429 responses
watch -n 5 'kubectl logs -l app=intelgraph-api -n intelgraph --tail=500 | grep " 429 " | wc -l'

# Monitor system resources
watch -n 5 'kubectl top pods -n intelgraph'

# Monitor database connections
watch -n 10 'psql -h postgres -U $POSTGRES_USER -d intelgraph -c "SELECT count(*) FROM pg_stat_activity WHERE datname='\''intelgraph'\'';"'
```

## Communication Templates

### Internal Alert
```
🚨 HIGH API TRAFFIC ALERT

Current Rate: <X> req/sec (normal: <Y> req/sec)
Pattern: <Spike/Gradual/Distributed>
Top Consumers:
- IP: <IP> - <X> req/sec
- Tenant: <tenant> - <Y> req/sec

Current Actions:
- Rate limiting enabled
- Investigating source
- Monitoring system resources

Status: Under investigation
```

### Customer Communication (if blocking)
```
Subject: Temporary API Access Restriction

Hi <customer>,

We've temporarily restricted API access for your account due to unusually high request volumes that exceeded our rate limits.

Details:
- Requests in last hour: <X>
- Rate limit: <Y> requests/minute
- Your tier: <tier>

To restore access:
1. Reduce request frequency
2. Implement exponential backoff
3. Contact support if you need higher limits

We're here to help! Reply to discuss your usage needs.
```

## Post-Incident Actions

- [ ] Document traffic patterns and sources
- [ ] Review rate limit configuration
- [ ] Update tier limits if needed
- [ ] Improve monitoring alerts
- [ ] Add rate limiting to additional endpoints
- [ ] Document lessons learned
- [ ] Update runbook with new findings

## Prevention

### Proactive Measures
1. Implement rate limiting from day one
2. Use tier-based limits
3. Monitor API usage trends
4. Set up alerting for unusual patterns
5. Use CDN and caching extensively
6. Implement bot detection
7. Require API keys for all endpoints
8. Document API best practices for customers
9. Regular capacity planning
10. Test rate limiting regularly

### Customer Education
- Document rate limits clearly
- Provide retry logic examples
- Recommend best practices (caching, pagination)
- Offer webhooks as alternative to polling
- Provide usage dashboard to customers

## Useful Commands

```bash
# Get rate limit stats from Redis
redis-cli -h redis KEYS "ratelimit:*" | wc -l

# Check rate limit violations
kubectl logs -l app=intelgraph-api -n intelgraph | grep "rate limit exceeded" | tail -50

# Export API usage for analysis
psql -h postgres -U $POSTGRES_USER -d intelgraph -c "
  COPY (
    SELECT
      tenant_id,
      endpoint,
      method,
      status_code,
      response_time_ms,
      created_at
    FROM api_requests
    WHERE created_at > NOW() - INTERVAL '1 hour'
  ) TO STDOUT WITH CSV HEADER
" > api_usage_analysis.csv
```

## References

- Rate Limiting Documentation: https://docs.intelgraph.com/api/rate-limits
- DDoS Response Plan: https://docs.intelgraph.com/security/ddos
- API Usage Dashboard: https://grafana.intelgraph.com/d/api-usage
- Incident Response: https://docs.intelgraph.com/runbooks/incident-response
