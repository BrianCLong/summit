#!/bin/bash
# Cost Optimization Automation - Maestro Conductor
# Automated cost analysis, optimization recommendations, and efficiency improvements

set -e

DATE=$(date +%Y%m%d)
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
COST_LOG="/tmp/cost-optimization-${DATE}.log"
RESULTS_DIR="/tmp/cost-optimization-${DATE}"

mkdir -p ${RESULTS_DIR}

exec > >(tee -a ${COST_LOG})
exec 2>&1

echo "💰 Cost Optimization Automation - ${TIMESTAMP}"
echo "==============================================="
echo "Objective: Analyze costs, identify optimization opportunities, implement efficiency measures"
echo ""

# 1. Current Cost Analysis
echo "📊 Step 1: Current Cost Analysis"
echo "================================"

# Collect metrics for the last 7 days
INGEST_EVENTS_7D=$(curl -s "http://prometheus:9090/api/v1/query?query=sum(increase(ingest_events_total{namespace=\"intelgraph-prod\"}[7d]))" | jq -r '.data.result[0].value[1] // "0"')
GRAPHQL_REQUESTS_7D=$(curl -s "http://prometheus:9090/api/v1/query?query=sum(increase(graphql_requests_total{namespace=\"intelgraph-prod\"}[7d]))" | jq -r '.data.result[0].value[1] // "0"')

# Calculate costs ($0.05/1k events, $10/1M GraphQL calls)
INGEST_COST_7D=$(echo "scale=4; ${INGEST_EVENTS_7D} * 0.00005" | bc)
GRAPHQL_COST_7D=$(echo "scale=4; ${GRAPHQL_REQUESTS_7D} * 0.00001" | bc)
TOTAL_COST_7D=$(echo "scale=4; ${INGEST_COST_7D} + ${GRAPHQL_COST_7D}" | bc)

# Daily averages
DAILY_AVG_COST=$(echo "scale=2; ${TOTAL_COST_7D} / 7" | bc)
MONTHLY_PROJECTION=$(echo "scale=2; ${DAILY_AVG_COST} * 30" | bc)

echo "💰 Current Cost Analysis (7-day period):"
echo "   - Ingest Events: ${INGEST_EVENTS_7D} (Cost: \$${INGEST_COST_7D})"
echo "   - GraphQL Requests: ${GRAPHQL_REQUESTS_7D} (Cost: \$${GRAPHQL_COST_7D})"
echo "   - Total 7-day Cost: \$${TOTAL_COST_7D}"
echo "   - Daily Average: \$${DAILY_AVG_COST}"
echo "   - Monthly Projection: \$${MONTHLY_PROJECTION}"

# Budget comparison
BUDGET_WEEKLY=200
BUDGET_MONTHLY=800
BUDGET_UTILIZATION=$(echo "scale=1; ${TOTAL_COST_7D} * 100 / ${BUDGET_WEEKLY}" | bc)

echo "📋 Budget Analysis:"
echo "   - Weekly Budget: \$${BUDGET_WEEKLY}"
echo "   - Budget Utilization: ${BUDGET_UTILIZATION}%"

if (( $(echo "${TOTAL_COST_7D} > ${BUDGET_WEEKLY}" | bc -l) )); then
    echo "❌ BUDGET EXCEEDED: Over budget by \$$(echo "${TOTAL_COST_7D} - ${BUDGET_WEEKLY}" | bc)"
    BUDGET_STATUS="EXCEEDED"
elif (( $(echo "${BUDGET_UTILIZATION} > 80" | bc -l) )); then
    echo "⚠️  BUDGET WARNING: ${BUDGET_UTILIZATION}% of weekly budget used"
    BUDGET_STATUS="WARNING"
else
    echo "✅ BUDGET HEALTHY: ${BUDGET_UTILIZATION}% of weekly budget used"
    BUDGET_STATUS="HEALTHY"
fi

# 2. Cost Trend Analysis
echo ""
echo "📈 Step 2: Cost Trend Analysis"
echo "=============================="

# Collect hourly data for trend analysis
echo "📊 Analyzing cost trends over time..."

# Get hourly costs for the past 24 hours
for i in {0..23}; do
    HOUR_START=$((i + 1))
    INGEST_HOURLY=$(curl -s "http://prometheus:9090/api/v1/query?query=sum(increase(ingest_events_total{namespace=\"intelgraph-prod\"}[1h] offset ${HOUR_START}h))" | jq -r '.data.result[0].value[1] // "0"')
    GRAPHQL_HOURLY=$(curl -s "http://prometheus:9090/api/v1/query?query=sum(increase(graphql_requests_total{namespace=\"intelgraph-prod\"}[1h] offset ${HOUR_START}h))" | jq -r '.data.result[0].value[1] // "0"')

    HOURLY_COST=$(echo "scale=4; (${INGEST_HOURLY} * 0.00005) + (${GRAPHQL_HOURLY} * 0.00001)" | bc)

    echo "${HOUR_START}h_ago,${HOURLY_COST}" >> ${RESULTS_DIR}/hourly_costs.csv
done

# Calculate trend (simple linear regression slope)
TREND_SLOPE=$(python3 - << 'EOF'
import sys
import numpy as np

try:
    data = []
    with open('/tmp/cost-optimization-$(date +%Y%m%d)/hourly_costs.csv', 'r') as f:
        for line in f:
            parts = line.strip().split(',')
            hour = int(parts[0].replace('h_ago', ''))
            cost = float(parts[1])
            data.append((hour, cost))

    if len(data) >= 2:
        x = np.array([d[0] for d in data])
        y = np.array([d[1] for d in data])
        slope, _ = np.polyfit(x, y, 1)
        print(f"{slope:.6f}")
    else:
        print("0")
except:
    print("0")
EOF
)

# Interpret trend
if (( $(echo "${TREND_SLOPE} > 0.001" | bc -l) )); then
    TREND_STATUS="INCREASING"
    echo "📈 TREND: Costs increasing at \$$(echo "${TREND_SLOPE} * 24" | bc)/day rate"
elif (( $(echo "${TREND_SLOPE} < -0.001" | bc -l) )); then
    TREND_STATUS="DECREASING"
    echo "📉 TREND: Costs decreasing at \$$(echo "${TREND_SLOPE} * -24" | bc)/day savings rate"
else
    TREND_STATUS="STABLE"
    echo "📊 TREND: Costs stable with minimal variation"
fi

# 3. Cost Driver Analysis
echo ""
echo "🔍 Step 3: Cost Driver Analysis"
echo "==============================="

# Analyze cost per service/component
echo "💡 Identifying primary cost drivers..."

# Ingest breakdown by source/type
INGEST_BREAKDOWN=$(curl -s "http://prometheus:9090/api/v1/query?query=sum(increase(ingest_events_total{namespace=\"intelgraph-prod\"}[7d])) by (source_type)" | jq -r '.data.result[] | "\(.metric.source_type // "unknown"):\(.value[1])"')

echo "📊 Ingest Cost Breakdown (7-day):"
while IFS=: read -r source events; do
    if [ "$events" != "null" ] && [ -n "$events" ] && [ "$events" != "0" ]; then
        COST=$(echo "scale=4; ${events} * 0.00005" | bc)
        PERCENTAGE=$(echo "scale=1; ${events} * 100 / ${INGEST_EVENTS_7D}" | bc 2>/dev/null || echo "0")
        echo "   - ${source}: ${events} events (\$${COST}, ${PERCENTAGE}%)"
    fi
done <<< "$INGEST_BREAKDOWN"

# GraphQL breakdown by operation
GRAPHQL_BREAKDOWN=$(curl -s "http://prometheus:9090/api/v1/query?query=sum(increase(graphql_requests_total{namespace=\"intelgraph-prod\"}[7d])) by (operation_name)" | jq -r '.data.result[] | "\(.metric.operation_name // "unknown"):\(.value[1])"')

echo ""
echo "📊 GraphQL Cost Breakdown (7-day):"
while IFS=: read -r operation requests; do
    if [ "$requests" != "null" ] && [ -n "$requests" ] && [ "$requests" != "0" ]; then
        COST=$(echo "scale=4; ${requests} * 0.00001" | bc)
        PERCENTAGE=$(echo "scale=1; ${requests} * 100 / ${GRAPHQL_REQUESTS_7D}" | bc 2>/dev/null || echo "0")
        echo "   - ${operation}: ${requests} requests (\$${COST}, ${PERCENTAGE}%)"
    fi
done <<< "$GRAPHQL_BREAKDOWN"

# 4. Optimization Opportunity Detection
echo ""
echo "🎯 Step 4: Optimization Opportunity Detection"
echo "============================================="

OPTIMIZATION_OPPORTUNITIES=()

# Check for cache efficiency
CACHE_HIT_RATE=$(curl -s "http://prometheus:9090/api/v1/query?query=sum(rate(cache_hits_total{namespace=\"intelgraph-prod\"}[7d]))/sum(rate(cache_requests_total{namespace=\"intelgraph-prod\"}[7d]))*100" | jq -r '.data.result[0].value[1] // "0"')

echo "🎯 Optimization Opportunities:"

if (( $(echo "${CACHE_HIT_RATE} < 70" | bc -l) )); then
    OPTIMIZATION_OPPORTUNITIES+=("CACHE_EFFICIENCY: Cache hit rate ${CACHE_HIT_RATE}% - increase TTL or add more caching layers")
fi

# Check for duplicate/redundant requests
DUPLICATE_QUERIES=$(curl -s "http://prometheus:9090/api/v1/query?query=count(count(increase(graphql_requests_total{namespace=\"intelgraph-prod\"}[1h])) by (query_hash) > 100)" | jq -r '.data.result[0].value[1] // "0"')

if (( $(echo "${DUPLICATE_QUERIES} > 10" | bc -l) )); then
    OPTIMIZATION_OPPORTUNITIES+=("QUERY_DEDUPLICATION: ${DUPLICATE_QUERIES} high-frequency queries detected - implement query deduplication")
fi

# Check for inefficient ingest patterns
INGEST_BATCH_SIZE=$(curl -s "http://prometheus:9090/api/v1/query?query=avg(ingest_batch_size{namespace=\"intelgraph-prod\"})" | jq -r '.data.result[0].value[1] // "0"')

if (( $(echo "${INGEST_BATCH_SIZE} < 100" | bc -l) )); then
    OPTIMIZATION_OPPORTUNITIES+=("INGEST_BATCHING: Average batch size ${INGEST_BATCH_SIZE} - increase batching for better efficiency")
fi

# Check for underutilized resources
CPU_UTILIZATION=$(curl -s "http://prometheus:9090/api/v1/query?query=avg(rate(container_cpu_usage_seconds_total{namespace=\"intelgraph-prod\"}[7d]))*100" | jq -r '.data.result[0].value[1] // "0"')
MEMORY_UTILIZATION=$(curl -s "http://prometheus:9090/api/v1/query?query=avg(container_memory_usage_bytes{namespace=\"intelgraph-prod\"})/avg(container_spec_memory_limit_bytes{namespace=\"intelgraph-prod\"})*100" | jq -r '.data.result[0].value[1] // "0"')

if (( $(echo "${CPU_UTILIZATION} < 30" | bc -l) )); then
    OPTIMIZATION_OPPORTUNITIES+=("RESOURCE_RIGHTSIZING: CPU utilization ${CPU_UTILIZATION}% - consider reducing CPU requests/limits")
fi

if (( $(echo "${MEMORY_UTILIZATION} < 40" | bc -l) )); then
    OPTIMIZATION_OPPORTUNITIES+=("RESOURCE_RIGHTSIZING: Memory utilization ${MEMORY_UTILIZATION}% - consider reducing memory requests/limits")
fi

# Display opportunities
if [ ${#OPTIMIZATION_OPPORTUNITIES[@]} -eq 0 ]; then
    echo "✅ No immediate optimization opportunities detected"
else
    for opportunity in "${OPTIMIZATION_OPPORTUNITIES[@]}"; do
        echo "💡 ${opportunity}"
    done
fi

# 5. Automated Optimization Implementation
echo ""
echo "🚀 Step 5: Automated Optimization Implementation"
echo "==============================================="

IMPLEMENTED_OPTIMIZATIONS=()

# Implement cache TTL optimization if hit rate is low
if (( $(echo "${CACHE_HIT_RATE} < 70" | bc -l) )); then
    echo "🔧 Implementing cache TTL optimization..."

    # Increase cache TTL for frequently accessed data
    kubectl patch configmap redis-config -n intelgraph-prod --patch '{"data":{"default-ttl":"7200"}}'

    # Enable cache compression for larger objects
    kubectl patch configmap redis-config -n intelgraph-prod --patch '{"data":{"compression-enabled":"true"}}'

    IMPLEMENTED_OPTIMIZATIONS+=("CACHE_TTL: Increased default TTL to 2 hours and enabled compression")
fi

# Implement query complexity limits if needed
COMPLEX_QUERIES=$(curl -s "http://prometheus:9090/api/v1/query?query=count(histogram_quantile(0.95, sum(rate(graphql_query_complexity_bucket{namespace=\"intelgraph-prod\"}[7d])) by (le)) > 500)" | jq -r '.data.result[0].value[1] // "0"')

if (( $(echo "${COMPLEX_QUERIES} > 0" | bc -l) )); then
    echo "🔧 Implementing query complexity limits..."

    # Update GraphQL schema with complexity limits
    kubectl patch configmap graphql-config -n intelgraph-prod --patch '{"data":{"max-query-complexity":"1000","complexity-analysis":"true"}}'

    IMPLEMENTED_OPTIMIZATIONS+=("QUERY_COMPLEXITY: Added complexity limits and analysis")
fi

# Implement resource rightsizing if underutilized
if (( $(echo "${CPU_UTILIZATION} < 30" | bc -l) )) || (( $(echo "${MEMORY_UTILIZATION} < 40" | bc -l) )); then
    echo "🔧 Implementing resource rightsizing..."

    # Reduce resource requests by 20% if utilization is low
    if (( $(echo "${CPU_UTILIZATION} < 30" | bc -l) )); then
        kubectl patch deployment intelgraph-mc -n intelgraph-prod --patch '{"spec":{"template":{"spec":{"containers":[{"name":"intelgraph-mc","resources":{"requests":{"cpu":"800m"}}}]}}}}'
        IMPLEMENTED_OPTIMIZATIONS+=("CPU_RIGHTSIZING: Reduced CPU requests from 1000m to 800m")
    fi

    if (( $(echo "${MEMORY_UTILIZATION} < 40" | bc -l) )); then
        kubectl patch deployment intelgraph-mc -n intelgraph-prod --patch '{"spec":{"template":{"spec":{"containers":[{"name":"intelgraph-mc","resources":{"requests":{"memory":"800Mi"}}}]}}}}'
        IMPLEMENTED_OPTIMIZATIONS+=("MEMORY_RIGHTSIZING: Reduced memory requests from 1Gi to 800Mi")
    fi
fi

# 6. Cost Projection and Savings Analysis
echo ""
echo "💡 Step 6: Cost Projection and Savings Analysis"
echo "==============================================="

# Calculate potential savings from implemented optimizations
POTENTIAL_SAVINGS=0

# Cache optimization savings (assume 15% reduction in GraphQL requests)
if grep -q "CACHE_TTL" <<< "${IMPLEMENTED_OPTIMIZATIONS[@]}"; then
    CACHE_SAVINGS=$(echo "scale=2; ${GRAPHQL_COST_7D} * 0.15" | bc)
    POTENTIAL_SAVINGS=$(echo "scale=2; ${POTENTIAL_SAVINGS} + ${CACHE_SAVINGS}" | bc)
    echo "💰 Cache optimization savings: \$${CACHE_SAVINGS}/week"
fi

# Resource rightsizing savings (assume 20% infrastructure cost reduction)
if grep -q "RIGHTSIZING" <<< "${IMPLEMENTED_OPTIMIZATIONS[@]}"; then
    INFRA_COST_WEEKLY=$(echo "scale=2; ${TOTAL_COST_7D} * 0.3" | bc)  # Assume 30% of cost is infrastructure
    RIGHTSIZING_SAVINGS=$(echo "scale=2; ${INFRA_COST_WEEKLY} * 0.2" | bc)
    POTENTIAL_SAVINGS=$(echo "scale=2; ${POTENTIAL_SAVINGS} + ${RIGHTSIZING_SAVINGS}" | bc)
    echo "💰 Resource rightsizing savings: \$${RIGHTSIZING_SAVINGS}/week"
fi

# Query optimization savings (assume 10% reduction in complex queries)
if grep -q "QUERY_COMPLEXITY" <<< "${IMPLEMENTED_OPTIMIZATIONS[@]}"; then
    QUERY_SAVINGS=$(echo "scale=2; ${GRAPHQL_COST_7D} * 0.1" | bc)
    POTENTIAL_SAVINGS=$(echo "scale=2; ${POTENTIAL_SAVINGS} + ${QUERY_SAVINGS}" | bc)
    echo "💰 Query optimization savings: \$${QUERY_SAVINGS}/week"
fi

echo ""
echo "📊 Total Potential Weekly Savings: \$${POTENTIAL_SAVINGS}"
echo "📅 Monthly Savings Projection: \$$(echo "scale=2; ${POTENTIAL_SAVINGS} * 4.3" | bc)"
echo "📈 Annual Savings Projection: \$$(echo "scale=2; ${POTENTIAL_SAVINGS} * 52" | bc)"

# 7. Generate Cost Optimization Report
echo ""
echo "📋 Step 7: Generating Cost Optimization Report"
echo "=============================================="

# Create comprehensive JSON report
cat << EOF > ${RESULTS_DIR}/cost-optimization-report.json
{
  "optimization_metadata": {
    "date": "${DATE}",
    "timestamp": "${TIMESTAMP}",
    "analysis_period_days": 7
  },
  "current_costs": {
    "ingest_events_7d": ${INGEST_EVENTS_7D},
    "graphql_requests_7d": ${GRAPHQL_REQUESTS_7D},
    "ingest_cost_7d": ${INGEST_COST_7D},
    "graphql_cost_7d": ${GRAPHQL_COST_7D},
    "total_cost_7d": ${TOTAL_COST_7D},
    "daily_average": ${DAILY_AVG_COST},
    "monthly_projection": ${MONTHLY_PROJECTION}
  },
  "budget_analysis": {
    "weekly_budget": ${BUDGET_WEEKLY},
    "budget_utilization_percent": ${BUDGET_UTILIZATION},
    "budget_status": "${BUDGET_STATUS}"
  },
  "cost_trends": {
    "trend_status": "${TREND_STATUS}",
    "trend_slope_per_hour": ${TREND_SLOPE}
  },
  "optimization_opportunities": $(printf '%s\n' "${OPTIMIZATION_OPPORTUNITIES[@]}" | jq -R . | jq -s .),
  "implemented_optimizations": $(printf '%s\n' "${IMPLEMENTED_OPTIMIZATIONS[@]}" | jq -R . | jq -s .),
  "savings_analysis": {
    "potential_weekly_savings": ${POTENTIAL_SAVINGS},
    "monthly_savings_projection": $(echo "scale=2; ${POTENTIAL_SAVINGS} * 4.3" | bc),
    "annual_savings_projection": $(echo "scale=2; ${POTENTIAL_SAVINGS} * 52" | bc)
  },
  "resource_utilization": {
    "cache_hit_rate_percent": ${CACHE_HIT_RATE},
    "cpu_utilization_percent": ${CPU_UTILIZATION},
    "memory_utilization_percent": ${MEMORY_UTILIZATION}
  }
}
EOF

# Create human-readable report
cat << 'EOF' > ${RESULTS_DIR}/cost-optimization-summary.md
# 💰 Cost Optimization Report

**Date**: ${DATE}
**Analysis Period**: 7 days
**Total Optimizations**: ${#IMPLEMENTED_OPTIMIZATIONS[@]}

## 📊 Cost Summary

### Current Costs
- **7-day Total**: $${TOTAL_COST_7D}
- **Daily Average**: $${DAILY_AVG_COST}
- **Monthly Projection**: $${MONTHLY_PROJECTION}
- **Budget Status**: ${BUDGET_STATUS} (${BUDGET_UTILIZATION}% of $${BUDGET_WEEKLY} weekly budget)

### Cost Breakdown
- **Ingest Operations**: ${INGEST_EVENTS_7D} events → $${INGEST_COST_7D}
- **GraphQL Operations**: ${GRAPHQL_REQUESTS_7D} requests → $${GRAPHQL_COST_7D}

## 📈 Trends & Analysis

**Cost Trend**: ${TREND_STATUS}
**Resource Efficiency**:
- Cache Hit Rate: ${CACHE_HIT_RATE}%
- CPU Utilization: ${CPU_UTILIZATION}%
- Memory Utilization: ${MEMORY_UTILIZATION}%

## 🎯 Optimization Opportunities

$(if [ ${#OPTIMIZATION_OPPORTUNITIES[@]} -eq 0 ]; then
    echo "✅ No immediate optimization opportunities identified"
else
    for opportunity in "${OPTIMIZATION_OPPORTUNITIES[@]}"; do
        echo "- ${opportunity}"
    done
fi)

## 🚀 Implemented Optimizations

$(if [ ${#IMPLEMENTED_OPTIMIZATIONS[@]} -eq 0 ]; then
    echo "No automated optimizations implemented this cycle"
else
    for optimization in "${IMPLEMENTED_OPTIMIZATIONS[@]}"; do
        echo "✅ ${optimization}"
    done
fi)

## 💡 Savings Projections

- **Weekly Savings**: $${POTENTIAL_SAVINGS}
- **Monthly Savings**: $$(echo "scale=2; ${POTENTIAL_SAVINGS} * 4.3" | bc)
- **Annual Savings**: $$(echo "scale=2; ${POTENTIAL_SAVINGS} * 52" | bc)

## 📋 Recommendations

### Immediate Actions
$([ "$BUDGET_STATUS" = "EXCEEDED" ] && echo "- **CRITICAL**: Investigate cost spike and implement emergency optimizations")
$([ "$TREND_STATUS" = "INCREASING" ] && echo "- **HIGH**: Monitor cost trend and implement proactive optimizations")
$([ $(echo "${CACHE_HIT_RATE} < 60" | bc) -eq 1 ] && echo "- **MEDIUM**: Improve cache strategy and TTL configuration")

### Strategic Improvements
- Review and optimize high-frequency GraphQL operations
- Implement intelligent batching for ingest operations
- Consider tiered storage for historical data
- Evaluate regional cost differences for multi-region deployment

---
*Generated by Cost Optimization Automation*
EOF

# Replace variables in template
envsubst < ${RESULTS_DIR}/cost-optimization-summary.md > ${RESULTS_DIR}/cost-optimization-summary-final.md

echo ""
echo "✅ COST OPTIMIZATION COMPLETE"
echo "============================="
echo "📊 Summary:"
echo "   - Current Weekly Cost: \$${TOTAL_COST_7D}"
echo "   - Budget Status: ${BUDGET_STATUS} (${BUDGET_UTILIZATION}%)"
echo "   - Trend: ${TREND_STATUS}"
echo "   - Optimizations Implemented: ${#IMPLEMENTED_OPTIMIZATIONS[@]}"
echo "   - Potential Weekly Savings: \$${POTENTIAL_SAVINGS}"
echo ""
echo "📁 Reports saved to: ${RESULTS_DIR}/"
echo "📝 Summary report: ${RESULTS_DIR}/cost-optimization-summary-final.md"
echo "📊 JSON data: ${RESULTS_DIR}/cost-optimization-report.json"
echo ""
echo "🎯 Next Steps:"
echo "   1. Review implemented optimizations effectiveness in 24h"
echo "   2. Monitor cost trends for optimization impact"
echo "   3. Consider strategic improvements for long-term savings"
echo "   4. Schedule next cost optimization cycle in 7 days"