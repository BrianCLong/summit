#!/bin/bash
# Auto-Rollback Script for SLO Breach Protection
# Monitors SLO compliance during canary deployments and triggers automatic rollback

set -euo pipefail

# Configuration
NAMESPACE="${NAMESPACE:-intelgraph}"
SERVICE_NAME="${SERVICE_NAME:-intelgraph-server}"
PROMETHEUS_URL="${PROMETHEUS_URL:-http://prometheus:9090}"
ROLLBACK_ENABLED="${ROLLBACK_ENABLED:-true}"
DRY_RUN="${DRY_RUN:-false}"
MONITORING_DURATION="${MONITORING_DURATION:-300}" # 5 minutes
CHECK_INTERVAL="${CHECK_INTERVAL:-30}"             # 30 seconds

# SLO thresholds
AVAILABILITY_THRESHOLD="0.999"    # 99.9%
LATENCY_P95_THRESHOLD="0.2"       # 200ms
ERROR_BUDGET_BURN_THRESHOLD="5.0" # 5x normal burn rate

# Deployment tracking
DEPLOYMENT_ID="${DEPLOYMENT_ID:-$(date +%s)}"
CANARY_LABEL="${CANARY_LABEL:-version}"
STABLE_LABEL="${STABLE_LABEL:-stable}"

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*" >&2
}

error() {
    log "ERROR: $*"
    exit 1
}

# Check if required tools are available
check_dependencies() {
    log "🔧 Checking dependencies..."

    local missing_tools=()

    if ! command -v kubectl &> /dev/null; then
        missing_tools+=("kubectl")
    fi

    if ! command -v curl &> /dev/null; then
        missing_tools+=("curl")
    fi

    if ! command -v jq &> /dev/null; then
        missing_tools+=("jq")
    fi

    if [[ ${#missing_tools[@]} -gt 0 ]]; then
        error "Missing required tools: ${missing_tools[*]}"
    fi

    log "✅ All dependencies available"
}

# Query Prometheus for metrics
prometheus_query() {
    local query="$1"
    local timeout="${2:-10}"

    log "📊 Querying Prometheus: $query"

    curl -s \
        --max-time "$timeout" \
        --get \
        --data-urlencode "query=$query" \
        "$PROMETHEUS_URL/api/v1/query" | \
    jq -r '.data.result[0].value[1] // "null"' 2>/dev/null || echo "null"
}

# Get current deployment info
get_deployment_info() {
    log "🔍 Getting deployment information..."

    # Get current deployment
    local deployment=$(kubectl get deployment "$SERVICE_NAME" -n "$NAMESPACE" -o json 2>/dev/null || echo "{}")

    if [[ "$deployment" == "{}" ]]; then
        error "Deployment $SERVICE_NAME not found in namespace $NAMESPACE"
    fi

    # Extract deployment details
    CURRENT_IMAGE=$(echo "$deployment" | jq -r '.spec.template.spec.containers[0].image')
    CURRENT_REPLICAS=$(echo "$deployment" | jq -r '.spec.replicas')
    READY_REPLICAS=$(echo "$deployment" | jq -r '.status.readyReplicas // 0')

    # Check if this is a canary deployment
    local canary_annotation=$(echo "$deployment" | jq -r '.metadata.annotations["deployment.kubernetes.io/canary"] // "false"')
    IS_CANARY_DEPLOYMENT="$canary_annotation"

    log "📦 Current image: $CURRENT_IMAGE"
    log "📊 Replicas: $READY_REPLICAS/$CURRENT_REPLICAS"
    log "🚀 Canary deployment: $IS_CANARY_DEPLOYMENT"

    # Get rollback target if available
    if [[ "$IS_CANARY_DEPLOYMENT" == "true" ]]; then
        ROLLBACK_TARGET=$(echo "$deployment" | jq -r '.metadata.annotations["deployment.kubernetes.io/rollback-target"] // ""')
        log "🔄 Rollback target: ${ROLLBACK_TARGET:-"not specified"}"
    fi
}

# Check SLO compliance
check_slo_compliance() {
    log "🎯 Checking SLO compliance..."

    local slo_violations=()

    # Check availability SLO
    local availability=$(prometheus_query "sli:availability:rate5m{service=\"$SERVICE_NAME\"}")
    if [[ "$availability" != "null" ]]; then
        log "📈 Current availability: $(printf "%.3f" "$(echo "$availability * 100" | bc -l)")%"

        if (( $(echo "$availability < $AVAILABILITY_THRESHOLD" | bc -l) )); then
            slo_violations+=("availability:$availability")
            log "🚨 Availability SLO breach: $availability < $AVAILABILITY_THRESHOLD"
        fi
    else
        log "⚠️  Could not fetch availability metric"
    fi

    # Check latency SLO
    local latency_p95=$(prometheus_query "histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{job=\"$SERVICE_NAME\"}[5m])) by (le))")
    if [[ "$latency_p95" != "null" ]]; then
        local latency_ms=$(echo "$latency_p95 * 1000" | bc -l)
        log "📈 Current p95 latency: $(printf "%.0f" "$latency_ms")ms"

        if (( $(echo "$latency_p95 > $LATENCY_P95_THRESHOLD" | bc -l) )); then
            slo_violations+=("latency_p95:$latency_p95")
            log "🚨 Latency SLO breach: $(printf "%.0f" "$latency_ms")ms > 200ms"
        fi
    else
        log "⚠️  Could not fetch latency metric"
    fi

    # Check error budget burn rate
    local burn_rate=$(prometheus_query "error_budget:burn_rate:5m{service=\"$SERVICE_NAME\"}")
    if [[ "$burn_rate" != "null" ]]; then
        log "📈 Current error budget burn rate: $(printf "%.2f" "$burn_rate")x"

        if (( $(echo "$burn_rate > $ERROR_BUDGET_BURN_THRESHOLD" | bc -l) )); then
            slo_violations+=("error_budget_burn:$burn_rate")
            log "🚨 Error budget burn rate breach: $(printf "%.2f" "$burn_rate")x > ${ERROR_BUDGET_BURN_THRESHOLD}x"
        fi
    else
        log "⚠️  Could not fetch error budget burn rate"
    fi

    # Return violations count
    echo "${#slo_violations[@]}"

    # Export violations for use by calling function
    if [[ ${#slo_violations[@]} -gt 0 ]]; then
        export SLO_VIOLATIONS="${slo_violations[*]}"
        return 1
    else
        export SLO_VIOLATIONS=""
        return 0
    fi
}

# Trigger rollback
trigger_rollback() {
    local reason="$1"

    log "🔄 Triggering automatic rollback..."
    log "📝 Reason: $reason"

    if [[ "$DRY_RUN" == "true" ]]; then
        log "🧪 DRY RUN: Would trigger rollback to $ROLLBACK_TARGET"
        return 0
    fi

    if [[ "$ROLLBACK_ENABLED" != "true" ]]; then
        log "⚠️  Auto-rollback is disabled - manual intervention required"
        return 1
    fi

    # Check if rollback target is available
    if [[ -z "${ROLLBACK_TARGET:-}" ]]; then
        error "No rollback target specified - cannot perform automatic rollback"
    fi

    # Create rollback annotation
    local rollback_annotation="auto-rollback-$(date +%s)"

    # Perform the rollback
    log "🔄 Rolling back deployment to $ROLLBACK_TARGET..."

    if kubectl patch deployment "$SERVICE_NAME" -n "$NAMESPACE" \
        --type='merge' \
        -p="{
            \"metadata\": {
                \"annotations\": {
                    \"deployment.kubernetes.io/rollback\": \"$rollback_annotation\",
                    \"deployment.kubernetes.io/rollback-reason\": \"$reason\",
                    \"deployment.kubernetes.io/rollback-timestamp\": \"$(date -Iseconds)\"
                }
            },
            \"spec\": {
                \"template\": {
                    \"spec\": {
                        \"containers\": [{
                            \"name\": \"$SERVICE_NAME\",
                            \"image\": \"$ROLLBACK_TARGET\"
                        }]
                    }
                }
            }
        }"; then

        log "✅ Rollback initiated successfully"

        # Wait for rollback to complete
        log "⏳ Waiting for rollback to complete..."
        if kubectl rollout status deployment "$SERVICE_NAME" -n "$NAMESPACE" --timeout=300s; then
            log "✅ Rollback completed successfully"

            # Send notifications
            send_rollback_notification "$reason"

            return 0
        else
            error "Rollback failed to complete within timeout"
        fi
    else
        error "Failed to initiate rollback"
    fi
}

# Send rollback notifications
send_rollback_notification() {
    local reason="$1"

    log "📧 Sending rollback notifications..."

    # GitHub issue creation (if in CI)
    if [[ -n "${GITHUB_TOKEN:-}" ]] && [[ -n "${GITHUB_REPOSITORY:-}" ]]; then
        create_rollback_issue "$reason"
    fi

    # Slack notification (if webhook available)
    if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
        send_slack_notification "$reason"
    fi

    # Email notification (if configured)
    if [[ -n "${ALERT_EMAIL:-}" ]]; then
        send_email_notification "$reason"
    fi
}

# Create GitHub issue for rollback
create_rollback_issue() {
    local reason="$1"

    log "📝 Creating GitHub issue for rollback..."

    local issue_body="# 🚨 Automatic Rollback Triggered

**Timestamp**: $(date -Iseconds)
**Service**: $SERVICE_NAME
**Namespace**: $NAMESPACE
**Deployment ID**: $DEPLOYMENT_ID

## Rollback Details

- **From**: $CURRENT_IMAGE
- **To**: $ROLLBACK_TARGET
- **Reason**: $reason
- **SLO Violations**: $SLO_VIOLATIONS

## Investigation Required

1. Review deployment logs for errors
2. Check monitoring dashboards for anomalies
3. Validate configuration changes
4. Perform post-incident analysis

## Next Steps

- [ ] Investigate root cause
- [ ] Fix underlying issue
- [ ] Plan re-deployment strategy
- [ ] Update rollback procedures if needed

---
*This issue was automatically created by the auto-rollback system*"

    curl -s -X POST \
        -H "Authorization: token $GITHUB_TOKEN" \
        -H "Accept: application/vnd.github.v3+json" \
        "https://api.github.com/repos/$GITHUB_REPOSITORY/issues" \
        -d "{
            \"title\": \"🚨 Auto-rollback: $SERVICE_NAME - $(date +'%Y-%m-%d %H:%M')\",
            \"body\": $(echo "$issue_body" | jq -Rs .),
            \"labels\": [\"auto-rollback\", \"incident\", \"slo-breach\"]
        }" > /dev/null

    log "✅ GitHub issue created"
}

# Send Slack notification
send_slack_notification() {
    local reason="$1"

    log "📱 Sending Slack notification..."

    local slack_payload="{
        \"text\": \"🚨 Automatic Rollback Triggered\",
        \"attachments\": [{
            \"color\": \"danger\",
            \"fields\": [
                {\"title\": \"Service\", \"value\": \"$SERVICE_NAME\", \"short\": true},
                {\"title\": \"Namespace\", \"value\": \"$NAMESPACE\", \"short\": true},
                {\"title\": \"Reason\", \"value\": \"$reason\", \"short\": false},
                {\"title\": \"SLO Violations\", \"value\": \"$SLO_VIOLATIONS\", \"short\": false}
            ],
            \"footer\": \"IntelGraph Auto-Rollback System\",
            \"ts\": $(date +%s)
        }]
    }"

    curl -s -X POST \
        -H 'Content-type: application/json' \
        --data "$slack_payload" \
        "$SLACK_WEBHOOK_URL" > /dev/null

    log "✅ Slack notification sent"
}

# Monitor SLOs continuously
monitor_slos() {
    log "🚦 Starting SLO monitoring for $MONITORING_DURATION seconds..."
    log "🔍 Check interval: $CHECK_INTERVAL seconds"

    local start_time=$(date +%s)
    local end_time=$((start_time + MONITORING_DURATION))
    local violation_count=0
    local consecutive_violations=0

    while [[ $(date +%s) -lt $end_time ]]; do
        log "📊 Checking SLOs... ($(date +'%H:%M:%S'))"

        if ! check_slo_compliance; then
            violation_count=$((violation_count + 1))
            consecutive_violations=$((consecutive_violations + 1))

            log "⚠️  SLO violation #$violation_count (consecutive: $consecutive_violations)"

            # Trigger rollback after 2 consecutive violations
            if [[ $consecutive_violations -ge 2 ]]; then
                log "🚨 Multiple consecutive SLO violations detected"
                trigger_rollback "Multiple SLO violations: $SLO_VIOLATIONS"
                return 1
            fi
        else
            log "✅ SLOs within thresholds"
            consecutive_violations=0
        fi

        # Wait before next check
        sleep "$CHECK_INTERVAL"
    done

    if [[ $violation_count -eq 0 ]]; then
        log "🎉 Monitoring completed - no SLO violations detected"
        return 0
    else
        log "⚠️  Monitoring completed with $violation_count total violations"
        return 0
    fi
}

# Main execution
main() {
    log "🚂 Starting auto-rollback monitoring for GREEN TRAIN deployment..."
    log "🎯 Service: $SERVICE_NAME"
    log "🌍 Namespace: $NAMESPACE"
    log "📊 Prometheus: $PROMETHEUS_URL"
    log "🔄 Rollback enabled: $ROLLBACK_ENABLED"
    log "🧪 Dry run: $DRY_RUN"

    # Check dependencies
    check_dependencies

    # Get deployment information
    get_deployment_info

    # Only monitor if this is a canary deployment
    if [[ "$IS_CANARY_DEPLOYMENT" != "true" ]]; then
        log "ℹ️  Not a canary deployment - skipping SLO monitoring"
        exit 0
    fi

    # Start monitoring
    if monitor_slos; then
        log "✅ Auto-rollback monitoring completed successfully"
        exit 0
    else
        log "🚨 Auto-rollback was triggered due to SLO violations"
        exit 1
    fi
}

# Handle signals
trap 'log "⚠️  Received termination signal - stopping monitoring"; exit 130' INT TERM

# Execute main function
main "$@"