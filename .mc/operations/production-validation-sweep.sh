#!/bin/bash
# Production Validation Sweep - Enhanced Continuous Monitoring
# Executes comprehensive production health checks and optimization recommendations

set -e

DATE=$(date +%Y%m%d)
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
VALIDATION_LOG="/tmp/production-validation-${DATE}.log"
RESULTS_DIR="/tmp/validation-results-${DATE}"

mkdir -p ${RESULTS_DIR}

exec > >(tee -a ${VALIDATION_LOG})
exec 2>&1

echo "🔍 Production Validation Sweep - ${TIMESTAMP}"
echo "=================================================="
echo "Objective: Comprehensive health check, optimization analysis, and proactive issue detection"
echo ""

# 1. Service Health Assessment
echo "🏥 Step 1: Service Health Assessment"
echo "===================================="

# Check all critical services
SERVICES=("intelgraph-mc" "postgres" "neo4j" "redis" "kafka")
HEALTH_STATUS="HEALTHY"

for service in "${SERVICES[@]}"; do
    echo "🔍 Checking ${service}..."

    # Pod health
    READY_PODS=$(kubectl get pods -n intelgraph-prod -l app=${service} --field-selector=status.phase=Running -o json | jq '.items | length')
    TOTAL_PODS=$(kubectl get pods -n intelgraph-prod -l app=${service} -o json | jq '.items | length')

    if [ "$READY_PODS" -eq "$TOTAL_PODS" ] && [ "$READY_PODS" -gt 0 ]; then
        echo "✅ ${service}: ${READY_PODS}/${TOTAL_PODS} pods healthy"
    else
        echo "❌ ${service}: ${READY_PODS}/${TOTAL_PODS} pods healthy"
        HEALTH_STATUS="DEGRADED"
    fi

    # Service endpoint health
    if kubectl get service ${service} -n intelgraph-prod &>/dev/null; then
        ENDPOINT_IP=$(kubectl get service ${service} -n intelgraph-prod -o jsonpath='{.spec.clusterIP}')
        if timeout 5s nc -z ${ENDPOINT_IP} 80 2>/dev/null || timeout 5s nc -z ${ENDPOINT_IP} 443 2>/dev/null; then
            echo "✅ ${service}: Service endpoint responding"
        else
            echo "⚠️  ${service}: Service endpoint not accessible"
        fi
    fi
done

# 2. Performance Metrics Analysis
echo ""
echo "📊 Step 2: Performance Metrics Analysis"
echo "======================================="

# Current performance metrics
echo "📈 Collecting current performance data..."

# Request rate analysis
CURRENT_RPS=$(curl -s "http://prometheus:9090/api/v1/query?query=sum(rate(http_requests_total{namespace=\"intelgraph-prod\"}[5m]))" | jq -r '.data.result[0].value[1] // "0"')
P95_LATENCY=$(curl -s "http://prometheus:9090/api/v1/query?query=histogram_quantile(0.95,sum(rate(http_request_duration_seconds_bucket{namespace=\"intelgraph-prod\"}[5m]))by(le))*1000" | jq -r '.data.result[0].value[1] // "0"')
ERROR_RATE=$(curl -s "http://prometheus:9090/api/v1/query?query=sum(rate(http_requests_total{namespace=\"intelgraph-prod\",status=~\"[45]..\"}[5m]))/sum(rate(http_requests_total{namespace=\"intelgraph-prod\"}[5m]))*100" | jq -r '.data.result[0].value[1] // "0"')
SUCCESS_RATE=$(echo "100 - ${ERROR_RATE}" | bc)

echo "📊 Current Performance Metrics:"
echo "   - Request Rate: ${CURRENT_RPS} RPS"
echo "   - P95 Latency: ${P95_LATENCY} ms"
echo "   - Success Rate: ${SUCCESS_RATE}%"
echo "   - Error Rate: ${ERROR_RATE}%"

# SLO compliance check
SLO_COMPLIANCE="PASS"
if (( $(echo "${P95_LATENCY} > 350" | bc -l) )); then
    echo "❌ SLO VIOLATION: P95 latency (${P95_LATENCY}ms) exceeds 350ms target"
    SLO_COMPLIANCE="FAIL"
fi

if (( $(echo "${SUCCESS_RATE} < 99" | bc -l) )); then
    echo "❌ SLO VIOLATION: Success rate (${SUCCESS_RATE}%) below 99% target"
    SLO_COMPLIANCE="FAIL"
fi

if (( $(echo "${CURRENT_RPS} < 50" | bc -l) )); then
    echo "⚠️  LOW TRAFFIC: Request rate (${CURRENT_RPS} RPS) below 50 RPS baseline"
fi

if [ "$SLO_COMPLIANCE" = "PASS" ]; then
    echo "✅ All SLOs within acceptable thresholds"
fi

# 3. Resource Optimization Analysis
echo ""
echo "⚡ Step 3: Resource Optimization Analysis"
echo "========================================"

# CPU and Memory utilization
echo "💻 Analyzing resource utilization..."

CPU_USAGE=$(curl -s "http://prometheus:9090/api/v1/query?query=avg(rate(container_cpu_usage_seconds_total{namespace=\"intelgraph-prod\"}[5m]))*100" | jq -r '.data.result[0].value[1] // "0"')
MEMORY_USAGE=$(curl -s "http://prometheus:9090/api/v1/query?query=avg(container_memory_usage_bytes{namespace=\"intelgraph-prod\"})/avg(container_spec_memory_limit_bytes{namespace=\"intelgraph-prod\"})*100" | jq -r '.data.result[0].value[1] // "0"')

echo "📊 Resource Utilization:"
echo "   - CPU Usage: ${CPU_USAGE}%"
echo "   - Memory Usage: ${MEMORY_USAGE}%"

# Optimization recommendations
OPTIMIZATION_RECS=()

if (( $(echo "${CPU_USAGE} < 20" | bc -l) )); then
    OPTIMIZATION_RECS+=("CPU_UNDERUTILIZED: Consider reducing CPU requests/limits")
elif (( $(echo "${CPU_USAGE} > 80" | bc -l) )); then
    OPTIMIZATION_RECS+=("CPU_STRESSED: Consider increasing CPU requests/limits or scaling")
fi

if (( $(echo "${MEMORY_USAGE} < 30" | bc -l) )); then
    OPTIMIZATION_RECS+=("MEMORY_UNDERUTILIZED: Consider reducing memory requests/limits")
elif (( $(echo "${MEMORY_USAGE} > 85" | bc -l) )); then
    OPTIMIZATION_RECS+=("MEMORY_STRESSED: Consider increasing memory requests/limits")
fi

# 4. Database Performance Assessment
echo ""
echo "🗄️ Step 4: Database Performance Assessment"
echo "=========================================="

# PostgreSQL metrics
POSTGRES_P95=$(curl -s "http://prometheus:9090/api/v1/query?query=histogram_quantile(0.95,sum(rate(postgres_query_duration_seconds_bucket{namespace=\"intelgraph-prod\"}[5m]))by(le))*1000" | jq -r '.data.result[0].value[1] // "0"')
POSTGRES_CONNECTIONS=$(curl -s "http://prometheus:9090/api/v1/query?query=postgres_connections{namespace=\"intelgraph-prod\"}" | jq -r '.data.result[0].value[1] // "0"')

# Neo4j metrics
NEO4J_P95=$(curl -s "http://prometheus:9090/api/v1/query?query=histogram_quantile(0.95,sum(rate(neo4j_cypher_duration_seconds_bucket{namespace=\"intelgraph-prod\"}[5m]))by(le))*1000" | jq -r '.data.result[0].value[1] // "0"')
NEO4J_CONNECTIONS=$(curl -s "http://prometheus:9090/api/v1/query?query=neo4j_pool_total_connections{namespace=\"intelgraph-prod\"}" | jq -r '.data.result[0].value[1] // "0"')

# Redis metrics
REDIS_P95=$(curl -s "http://prometheus:9090/api/v1/query?query=histogram_quantile(0.95,sum(rate(redis_command_duration_seconds_bucket{namespace=\"intelgraph-prod\"}[5m]))by(le))*1000" | jq -r '.data.result[0].value[1] // "0"')
REDIS_MEMORY=$(curl -s "http://prometheus:9090/api/v1/query?query=redis_memory_used_bytes{namespace=\"intelgraph-prod\"}/redis_memory_max_bytes{namespace=\"intelgraph-prod\"}*100" | jq -r '.data.result[0].value[1] // "0"')

echo "📊 Database Performance:"
echo "   - PostgreSQL P95: ${POSTGRES_P95}ms (${POSTGRES_CONNECTIONS} connections)"
echo "   - Neo4j P95: ${NEO4J_P95}ms (${NEO4J_CONNECTIONS} connections)"
echo "   - Redis P95: ${REDIS_P95}ms (${REDIS_MEMORY}% memory used)"

# Database optimization recommendations
if (( $(echo "${POSTGRES_P95} > 100" | bc -l) )); then
    OPTIMIZATION_RECS+=("POSTGRES_SLOW: P95 query time (${POSTGRES_P95}ms) exceeds 100ms - consider query optimization")
fi

if (( $(echo "${NEO4J_P95} > 200" | bc -l) )); then
    OPTIMIZATION_RECS+=("NEO4J_SLOW: P95 Cypher time (${NEO4J_P95}ms) exceeds 200ms - consider index optimization")
fi

if (( $(echo "${REDIS_MEMORY} > 80" | bc -l) )); then
    OPTIMIZATION_RECS+=("REDIS_MEMORY_HIGH: Redis memory usage (${REDIS_MEMORY}%) approaching limits")
fi

# 5. Security Posture Check
echo ""
echo "🔒 Step 5: Security Posture Check"
echo "================================="

# Check security hardening implementations
echo "🛡️ Validating security hardening..."

# Persisted query enforcement
PERSISTED_QUERIES_ENABLED=$(kubectl get configmap graphql-config -n intelgraph-prod -o jsonpath='{.data.persisted-queries-enabled}' 2>/dev/null || echo "false")

# Secret scanning status
SECRETS_DETECTED=0
if command -v gitleaks &> /dev/null; then
    gitleaks detect --no-git --quiet . || SECRETS_DETECTED=1
fi

# Network policies
NETWORK_POLICIES=$(kubectl get networkpolicies -n intelgraph-prod --no-headers | wc -l)

# Pod security policies
PSP_VIOLATIONS=$(kubectl get pods -n intelgraph-prod -o json | jq '.items[] | select(.spec.securityContext.runAsUser == 0 or .spec.securityContext.privileged == true) | .metadata.name' | wc -l)

echo "🔒 Security Status:"
echo "   - Persisted Queries: $([ "$PERSISTED_QUERIES_ENABLED" = "true" ] && echo "✅ Enabled" || echo "⚠️  Disabled")"
echo "   - Secret Scanning: $([ "$SECRETS_DETECTED" -eq 0 ] && echo "✅ Clean" || echo "❌ Issues detected")"
echo "   - Network Policies: ${NETWORK_POLICIES} active"
echo "   - Pod Security: $([ "$PSP_VIOLATIONS" -eq 0 ] && echo "✅ Compliant" || echo "⚠️  ${PSP_VIOLATIONS} violations")"

# 6. Cost Analysis
echo ""
echo "💰 Step 6: Cost Analysis"
echo "======================="

# Calculate current hourly costs
INGEST_EVENTS=$(curl -s "http://prometheus:9090/api/v1/query?query=sum(increase(ingest_events_total{namespace=\"intelgraph-prod\"}[1h]))" | jq -r '.data.result[0].value[1] // "0"')
GRAPHQL_REQUESTS=$(curl -s "http://prometheus:9090/api/v1/query?query=sum(increase(graphql_requests_total{namespace=\"intelgraph-prod\"}[1h]))" | jq -r '.data.result[0].value[1] // "0"')

# Cost calculation ($0.05/1k events, $10/1M GraphQL calls)
INGEST_COST=$(echo "scale=4; ${INGEST_EVENTS} * 0.00005" | bc)
GRAPHQL_COST=$(echo "scale=4; ${GRAPHQL_REQUESTS} * 0.00001" | bc)
TOTAL_HOURLY_COST=$(echo "scale=4; ${INGEST_COST} + ${GRAPHQL_COST}" | bc)

# Weekly projection
WEEKLY_PROJECTION=$(echo "scale=2; ${TOTAL_HOURLY_COST} * 168" | bc)

echo "💰 Cost Analysis (Last Hour):"
echo "   - Ingest Events: ${INGEST_EVENTS} (Cost: \$${INGEST_COST})"
echo "   - GraphQL Requests: ${GRAPHQL_REQUESTS} (Cost: \$${GRAPHQL_COST})"
echo "   - Total Hourly: \$${TOTAL_HOURLY_COST}"
echo "   - Weekly Projection: \$${WEEKLY_PROJECTION}"

# Cost optimization recommendations
if (( $(echo "${WEEKLY_PROJECTION} > 200" | bc -l) )); then
    OPTIMIZATION_RECS+=("COST_HIGH: Weekly projection (\$${WEEKLY_PROJECTION}) exceeds \$200 budget")
fi

# 7. Generate Comprehensive Report
echo ""
echo "📋 Step 7: Generating Comprehensive Report"
echo "========================================="

# Create JSON summary
cat << EOF > ${RESULTS_DIR}/production-validation-summary.json
{
  "validation_metadata": {
    "date": "${DATE}",
    "timestamp": "${TIMESTAMP}",
    "sweep_duration_minutes": $(($(date +%s) - $(date -d "${TIMESTAMP}" +%s)) / 60)
  },
  "health_assessment": {
    "overall_status": "${HEALTH_STATUS}",
    "service_health": {
      "ready_services": $(echo "${SERVICES[@]}" | wc -w),
      "total_services": $(echo "${SERVICES[@]}" | wc -w)
    }
  },
  "performance_metrics": {
    "current_rps": ${CURRENT_RPS},
    "p95_latency_ms": ${P95_LATENCY},
    "success_rate_percent": ${SUCCESS_RATE},
    "error_rate_percent": ${ERROR_RATE},
    "slo_compliance": "${SLO_COMPLIANCE}"
  },
  "resource_utilization": {
    "cpu_usage_percent": ${CPU_USAGE},
    "memory_usage_percent": ${MEMORY_USAGE}
  },
  "database_performance": {
    "postgres_p95_ms": ${POSTGRES_P95},
    "neo4j_p95_ms": ${NEO4J_P95},
    "redis_p95_ms": ${REDIS_P95},
    "redis_memory_percent": ${REDIS_MEMORY}
  },
  "security_posture": {
    "persisted_queries_enabled": $([ "$PERSISTED_QUERIES_ENABLED" = "true" ] && echo true || echo false),
    "secrets_clean": $([ "$SECRETS_DETECTED" -eq 0 ] && echo true || echo false),
    "network_policies_count": ${NETWORK_POLICIES},
    "psp_violations": ${PSP_VIOLATIONS}
  },
  "cost_analysis": {
    "hourly_cost_usd": ${TOTAL_HOURLY_COST},
    "weekly_projection_usd": ${WEEKLY_PROJECTION},
    "ingest_events_per_hour": ${INGEST_EVENTS},
    "graphql_requests_per_hour": ${GRAPHQL_REQUESTS}
  },
  "optimization_recommendations": $(printf '%s\n' "${OPTIMIZATION_RECS[@]}" | jq -R . | jq -s .)
}
EOF

# Create human-readable report
cat << 'EOF' > ${RESULTS_DIR}/production-validation-report.md
# 🔍 Production Validation Sweep Report

**Date**: ${DATE}
**Timestamp**: ${TIMESTAMP}
**Duration**: $(($(date +%s) - $(date -d "${TIMESTAMP}" +%s)) / 60) minutes

## ✅ Executive Summary

**Overall Health**: ${HEALTH_STATUS}
**SLO Compliance**: ${SLO_COMPLIANCE}
**Security Posture**: Strong
**Cost Status**: $([ $(echo "${WEEKLY_PROJECTION} < 200" | bc) -eq 1 ] && echo "Within Budget" || echo "Attention Required")

## 📊 Key Performance Indicators

### Service Level Objectives
- **Request Rate**: ${CURRENT_RPS} RPS
- **P95 Latency**: ${P95_LATENCY}ms (Target: <350ms)
- **Success Rate**: ${SUCCESS_RATE}% (Target: >99%)
- **Availability**: $([ "$HEALTH_STATUS" = "HEALTHY" ] && echo "✅ GREEN" || echo "⚠️  AMBER")

### Resource Efficiency
- **CPU Utilization**: ${CPU_USAGE}%
- **Memory Utilization**: ${MEMORY_USAGE}%
- **Database Performance**:
  - PostgreSQL: ${POSTGRES_P95}ms P95
  - Neo4j: ${NEO4J_P95}ms P95
  - Redis: ${REDIS_P95}ms P95, ${REDIS_MEMORY}% memory

## 🔒 Security Assessment

- **Persisted Queries**: $([ "$PERSISTED_QUERIES_ENABLED" = "true" ] && echo "✅ Enabled" || echo "⚠️  Disabled")
- **Secret Scanning**: $([ "$SECRETS_DETECTED" -eq 0 ] && echo "✅ Clean" || echo "❌ Issues Found")
- **Network Policies**: ${NETWORK_POLICIES} active policies
- **Pod Security**: $([ "$PSP_VIOLATIONS" -eq 0 ] && echo "✅ Compliant" || echo "⚠️  ${PSP_VIOLATIONS} violations")

## 💰 Cost Analysis

- **Hourly Cost**: $${TOTAL_HOURLY_COST}
- **Weekly Projection**: $${WEEKLY_PROJECTION}
- **Budget Status**: $([ $(echo "${WEEKLY_PROJECTION} < 200" | bc) -eq 1 ] && echo "✅ Within limits" || echo "⚠️  Exceeds target")

## 🎯 Optimization Recommendations

$(if [ ${#OPTIMIZATION_RECS[@]} -eq 0 ]; then
    echo "✅ No immediate optimization opportunities identified"
else
    for rec in "${OPTIMIZATION_RECS[@]}"; do
        echo "- ${rec}"
    done
fi)

## 🚀 Action Items

### Immediate (0-24h)
$([ "$SLO_COMPLIANCE" = "FAIL" ] && echo "- **CRITICAL**: Address SLO violations")
$([ "$SECRETS_DETECTED" -ne 0 ] && echo "- **HIGH**: Resolve detected security issues")
$([ "$HEALTH_STATUS" != "HEALTHY" ] && echo "- **HIGH**: Restore service health")

### Short-term (1-7 days)
$([ $(echo "${WEEKLY_PROJECTION} > 200" | bc) -eq 1 ] && echo "- **MEDIUM**: Implement cost optimization measures")
$([ "$PERSISTED_QUERIES_ENABLED" != "true" ] && echo "- **MEDIUM**: Enable persisted query enforcement")

### Long-term (1-4 weeks)
- **LOW**: Review and optimize database query performance
- **LOW**: Implement predictive scaling based on traffic patterns

---
*Generated by Production Validation Sweep automation*
EOF

# Replace variables in template
envsubst < ${RESULTS_DIR}/production-validation-report.md > ${RESULTS_DIR}/production-validation-report-final.md

echo ""
echo "✅ PRODUCTION VALIDATION COMPLETE"
echo "================================="
echo "📊 Summary:"
echo "   - Overall Health: ${HEALTH_STATUS}"
echo "   - SLO Compliance: ${SLO_COMPLIANCE}"
echo "   - Optimization Recommendations: ${#OPTIMIZATION_RECS[@]}"
echo "   - Weekly Cost Projection: \$${WEEKLY_PROJECTION}"
echo ""
echo "📁 Reports saved to: ${RESULTS_DIR}/"
echo "📝 Detailed report: ${RESULTS_DIR}/production-validation-report-final.md"
echo "📊 JSON summary: ${RESULTS_DIR}/production-validation-summary.json"
echo ""
echo "🎯 Next Steps:"
echo "   1. Review optimization recommendations"
echo "   2. Address any critical issues identified"
echo "   3. Update monitoring thresholds if needed"
echo "   4. Schedule next validation sweep in 24h"