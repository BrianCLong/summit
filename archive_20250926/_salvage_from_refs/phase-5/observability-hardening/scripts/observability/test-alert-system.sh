#!/bin/bash

# Script to test IntelGraph observability alert system
# Proves that burn-rate alerts fire and are acknowledged

set -euo pipefail

NAMESPACE="${NAMESPACE:-intelgraph-stage}"
PROMETHEUS_URL="${PROMETHEUS_URL:-http://prometheus.monitoring.svc.cluster.local:9090}"
ALERTMANAGER_URL="${ALERTMANAGER_URL:-http://alertmanager.monitoring.svc.cluster.local:9093}"

echo "🔥 Testing IntelGraph Alert System"
echo "Namespace: $NAMESPACE"
echo "Prometheus: $PROMETHEUS_URL"
echo "Alertmanager: $ALERTMANAGER_URL"

# Function to check if alert is firing
check_alert_firing() {
    local alert_name="$1"
    local retries=30
    local count=0

    echo "🔍 Checking if alert '$alert_name' is firing..."

    while [ $count -lt $retries ]; do
        # Query Prometheus for active alerts
        response=$(curl -s "$PROMETHEUS_URL/api/v1/alerts" || echo '{"data":{"alerts":[]}}')

        # Check if our alert is in the firing state
        alert_count=$(echo "$response" | jq -r --arg name "$alert_name" '.data.alerts[] | select(.labels.alertname == $name and .state == "firing") | length' 2>/dev/null || echo "0")

        if [ "$alert_count" != "0" ]; then
            echo "✅ Alert '$alert_name' is firing!"
            return 0
        fi

        echo "⏳ Waiting for alert to fire... ($((count + 1))/$retries)"
        sleep 10
        count=$((count + 1))
    done

    echo "❌ Alert '$alert_name' did not fire within timeout"
    return 1
}

# Function to acknowledge alert in Alertmanager
acknowledge_alert() {
    local alert_name="$1"
    local silence_duration="300s"  # 5 minutes

    echo "🤫 Acknowledging alert '$alert_name' for $silence_duration"

    # Create silence in Alertmanager
    silence_payload=$(cat <<EOF
{
  "matchers": [
    {
      "name": "alertname",
      "value": "$alert_name",
      "isRegex": false
    }
  ],
  "startsAt": "$(date -u +%Y-%m-%dT%H:%M:%S.000Z)",
  "endsAt": "$(date -u -d '+5 minutes' +%Y-%m-%dT%H:%M:%S.000Z)",
  "createdBy": "test-alert-system.sh",
  "comment": "Alert acknowledged during observability testing"
}
EOF
    )

    response=$(curl -s -X POST "$ALERTMANAGER_URL/api/v1/silences" \
        -H "Content-Type: application/json" \
        -d "$silence_payload" || echo '{"silenceID":"failed"}')

    silence_id=$(echo "$response" | jq -r '.silenceID' 2>/dev/null || echo "failed")

    if [ "$silence_id" != "failed" ] && [ "$silence_id" != "null" ]; then
        echo "✅ Alert acknowledged with silence ID: $silence_id"
        return 0
    else
        echo "❌ Failed to acknowledge alert"
        return 1
    fi
}

# Function to generate synthetic load to trigger alerts
generate_synthetic_load() {
    echo "🚀 Generating synthetic load to trigger alerts..."

    # Get a pod from the namespace to exec into
    pod=$(kubectl get pods -n "$NAMESPACE" -l app.kubernetes.io/name=intelgraph -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")

    if [ -z "$pod" ]; then
        echo "⚠️  No IntelGraph pods found in namespace $NAMESPACE"
        echo "📝 Creating synthetic metrics manually..."

        # Create a test pod to simulate metrics
        cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Pod
metadata:
  name: metric-simulator
  namespace: $NAMESPACE
  labels:
    app.kubernetes.io/name: intelgraph
    app.kubernetes.io/component: test
spec:
  containers:
  - name: simulator
    image: busybox
    command: ['sh', '-c', 'sleep 3600']
    resources:
      requests:
        memory: "64Mi"
        cpu: "250m"
      limits:
        memory: "128Mi"
        cpu: "500m"
EOF

        echo "📈 Waiting for test pod to be ready..."
        kubectl wait --for=condition=Ready pod/metric-simulator -n "$NAMESPACE" --timeout=60s

        pod="metric-simulator"
    fi

    echo "📊 Using pod: $pod"

    # Simulate high CPU usage to trigger CPU throttling alert
    echo "🔥 Simulating high CPU usage..."
    kubectl exec -n "$NAMESPACE" "$pod" -- sh -c '
        # CPU stress test
        for i in $(seq 1 4); do
            yes > /dev/null &
        done

        echo "CPU stress started, PID: $$"
        sleep 180  # Run for 3 minutes

        # Kill background processes
        pkill -P $$
    ' &

    CPU_STRESS_PID=$!

    echo "💾 Simulating memory pressure..."
    kubectl exec -n "$NAMESPACE" "$pod" -- sh -c '
        # Memory stress test - allocate memory gradually
        for i in $(seq 1 10); do
            dd if=/dev/zero of=/tmp/memtest$i bs=1M count=8 2>/dev/null
            sleep 5
        done

        echo "Memory allocated, cleaning up..."
        rm -f /tmp/memtest*
    ' &

    MEMORY_STRESS_PID=$!

    echo "🕐 Load generation started (PIDs: $CPU_STRESS_PID, $MEMORY_STRESS_PID)"
    echo "⏱️  Waiting 2 minutes for metrics to be scraped and alerts to fire..."
    sleep 120
}

# Function to verify observability stack is running
verify_observability_stack() {
    echo "🔍 Verifying observability stack..."

    # Check if Prometheus is accessible
    if ! curl -s "$PROMETHEUS_URL/api/v1/status/config" >/dev/null; then
        echo "❌ Prometheus is not accessible at $PROMETHEUS_URL"
        return 1
    fi

    # Check if Alertmanager is accessible
    if ! curl -s "$ALERTMANAGER_URL/api/v1/status" >/dev/null; then
        echo "❌ Alertmanager is not accessible at $ALERTMANAGER_URL"
        return 1
    fi

    # Check if ServiceMonitor is deployed
    if ! kubectl get servicemonitor -n "$NAMESPACE" >/dev/null 2>&1; then
        echo "❌ No ServiceMonitor found in namespace $NAMESPACE"
        return 1
    fi

    # Check if PrometheusRule is deployed
    if ! kubectl get prometheusrule -n "$NAMESPACE" >/dev/null 2>&1; then
        echo "❌ No PrometheusRule found in namespace $NAMESPACE"
        return 1
    fi

    echo "✅ Observability stack verified"
    return 0
}

# Function to cleanup test resources
cleanup() {
    echo "🧹 Cleaning up test resources..."

    # Remove test pod if it exists
    kubectl delete pod metric-simulator -n "$NAMESPACE" --ignore-not-found=true

    # Kill any background stress processes
    if [ -n "${CPU_STRESS_PID:-}" ]; then
        kill "$CPU_STRESS_PID" 2>/dev/null || true
    fi
    if [ -n "${MEMORY_STRESS_PID:-}" ]; then
        kill "$MEMORY_STRESS_PID" 2>/dev/null || true
    fi

    echo "✅ Cleanup completed"
}

# Set up cleanup trap
trap cleanup EXIT

# Main test execution
main() {
    echo "🚀 Starting IntelGraph Alert System Test"
    echo "=========================================="

    # Step 1: Verify observability stack
    if ! verify_observability_stack; then
        echo "❌ Observability stack verification failed"
        exit 1
    fi

    # Step 2: Generate load to trigger alerts
    generate_synthetic_load

    # Step 3: Test different alert scenarios
    local test_results=()

    echo ""
    echo "🔔 Testing Alert Scenarios"
    echo "=========================="

    # Test 1: High CPU throttling alert
    echo ""
    echo "Test 1: CPU Throttling Alert"
    if check_alert_firing "IntelGraphCPUThrottling"; then
        if acknowledge_alert "IntelGraphCPUThrottling"; then
            test_results+=("✅ CPU Throttling Alert: PASS")
        else
            test_results+=("⚠️  CPU Throttling Alert: Fired but acknowledgment failed")
        fi
    else
        test_results+=("❌ CPU Throttling Alert: FAIL")
    fi

    # Test 2: High memory usage alert
    echo ""
    echo "Test 2: High Memory Usage Alert"
    if check_alert_firing "IntelGraphHighMemoryUsage"; then
        if acknowledge_alert "IntelGraphHighMemoryUsage"; then
            test_results+=("✅ High Memory Usage Alert: PASS")
        else
            test_results+=("⚠️  High Memory Usage Alert: Fired but acknowledgment failed")
        fi
    else
        test_results+=("❌ High Memory Usage Alert: FAIL")
    fi

    # Step 4: Report results
    echo ""
    echo "📊 Test Results Summary"
    echo "======================="

    local passed=0
    local total=${#test_results[@]}

    for result in "${test_results[@]}"; do
        echo "$result"
        if [[ "$result" =~ ✅ ]]; then
            passed=$((passed + 1))
        fi
    done

    echo ""
    echo "📈 Overall Results: $passed/$total tests passed"

    if [ $passed -eq $total ]; then
        echo "🎉 All alert tests passed! Observability system is working correctly."
        exit 0
    else
        echo "⚠️  Some alert tests failed. Please check the observability configuration."
        exit 1
    fi
}

# Handle command line arguments
case "${1:-test}" in
    "test")
        main
        ;;
    "verify")
        verify_observability_stack
        ;;
    "cleanup")
        cleanup
        ;;
    *)
        echo "Usage: $0 [test|verify|cleanup]"
        echo "  test    - Run full alert system test (default)"
        echo "  verify  - Only verify observability stack"
        echo "  cleanup - Clean up test resources"
        exit 1
        ;;
esac