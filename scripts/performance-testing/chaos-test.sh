#!/bin/bash
set -e

# Chaos Engineering Test Suite
# Tests system resilience under various failure conditions

NAMESPACE="${NAMESPACE:-intelgraph}"
DURATION="${DURATION:-300}" # 5 minutes
INTERVAL="${INTERVAL:-60}"  # 1 minute

echo "=== Starting Chaos Engineering Tests ==="
echo "Namespace: $NAMESPACE"
echo "Duration: $DURATION seconds"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check system health
check_health() {
    echo -e "${YELLOW}Checking system health...${NC}"

    # Check pod status
    kubectl get pods -n $NAMESPACE --field-selector=status.phase!=Running --no-headers | wc -l

    # Check service endpoints
    kubectl get endpoints -n $NAMESPACE -o json | jq '.items[] | select(.subsets[].addresses | length == 0) | .metadata.name'

    # Check recent errors in logs
    kubectl logs -n $NAMESPACE -l app=intelgraph-api --tail=100 | grep -i error | wc -l
}

# Function to run chaos experiment
run_chaos() {
    local experiment=$1
    local description=$2

    echo -e "${YELLOW}=== Experiment: $description ===${NC}"
    echo "Starting at $(date)"

    # Apply chaos experiment
    kubectl apply -f "chaos-experiments/${experiment}.yaml"

    # Monitor during chaos
    echo "Monitoring for $DURATION seconds..."
    for i in $(seq 1 $((DURATION / INTERVAL))); do
        sleep $INTERVAL
        echo "Check $i of $((DURATION / INTERVAL)):"
        check_health
    done

    # Clean up
    kubectl delete -f "chaos-experiments/${experiment}.yaml"

    echo -e "${GREEN}Experiment completed${NC}"
    echo ""

    # Recovery check
    echo "Waiting for system to recover..."
    sleep 60
    check_health
}

# Test 1: Pod Failure
echo -e "${YELLOW}=== Test 1: Random Pod Failure ===${NC}"
cat <<EOF | kubectl apply -f -
apiVersion: chaos-mesh.org/v1alpha1
kind: PodChaos
metadata:
  name: pod-failure-test
  namespace: $NAMESPACE
spec:
  action: pod-failure
  mode: one
  duration: "${DURATION}s"
  selector:
    namespaces:
      - $NAMESPACE
    labelSelectors:
      app: intelgraph-api
EOF

sleep $DURATION
kubectl delete podchaos pod-failure-test -n $NAMESPACE
echo -e "${GREEN}Test 1 completed${NC}\n"

# Test 2: Network Delay
echo -e "${YELLOW}=== Test 2: Network Latency Injection ===${NC}"
cat <<EOF | kubectl apply -f -
apiVersion: chaos-mesh.org/v1alpha1
kind: NetworkChaos
metadata:
  name: network-delay-test
  namespace: $NAMESPACE
spec:
  action: delay
  mode: all
  selector:
    namespaces:
      - $NAMESPACE
    labelSelectors:
      app: intelgraph-api
  delay:
    latency: "100ms"
    correlation: "25"
    jitter: "10ms"
  duration: "${DURATION}s"
EOF

sleep $DURATION
kubectl delete networkchaos network-delay-test -n $NAMESPACE
echo -e "${GREEN}Test 2 completed${NC}\n"

# Test 3: Network Partition
echo -e "${YELLOW}=== Test 3: Network Partition ===${NC}"
cat <<EOF | kubectl apply -f -
apiVersion: chaos-mesh.org/v1alpha1
kind: NetworkChaos
metadata:
  name: network-partition-test
  namespace: $NAMESPACE
spec:
  action: partition
  mode: one
  selector:
    namespaces:
      - $NAMESPACE
    labelSelectors:
      app: intelgraph-api
  direction: to
  target:
    selector:
      namespaces:
        - $NAMESPACE
      labelSelectors:
        app: postgres
  duration: "${DURATION}s"
EOF

sleep $DURATION
kubectl delete networkchaos network-partition-test -n $NAMESPACE
echo -e "${GREEN}Test 3 completed${NC}\n"

# Test 4: CPU Stress
echo -e "${YELLOW}=== Test 4: CPU Stress ===${NC}"
cat <<EOF | kubectl apply -f -
apiVersion: chaos-mesh.org/v1alpha1
kind: StressChaos
metadata:
  name: cpu-stress-test
  namespace: $NAMESPACE
spec:
  mode: one
  selector:
    namespaces:
      - $NAMESPACE
    labelSelectors:
      app: intelgraph-api
  stressors:
    cpu:
      workers: 4
      load: 80
  duration: "${DURATION}s"
EOF

sleep $DURATION
kubectl delete stresschaos cpu-stress-test -n $NAMESPACE
echo -e "${GREEN}Test 4 completed${NC}\n"

# Test 5: Memory Stress
echo -e "${YELLOW}=== Test 5: Memory Stress ===${NC}"
cat <<EOF | kubectl apply -f -
apiVersion: chaos-mesh.org/v1alpha1
kind: StressChaos
metadata:
  name: memory-stress-test
  namespace: $NAMESPACE
spec:
  mode: one
  selector:
    namespaces:
      - $NAMESPACE
    labelSelectors:
      app: intelgraph-api
  stressors:
    memory:
      workers: 4
      size: "1GB"
  duration: "${DURATION}s"
EOF

sleep $DURATION
kubectl delete stresschaos memory-stress-test -n $NAMESPACE
echo -e "${GREEN}Test 5 completed${NC}\n"

# Test 6: IO Stress
echo -e "${YELLOW}=== Test 6: IO Stress ===${NC}"
cat <<EOF | kubectl apply -f -
apiVersion: chaos-mesh.org/v1alpha1
kind: IOChaos
metadata:
  name: io-delay-test
  namespace: $NAMESPACE
spec:
  action: latency
  mode: one
  selector:
    namespaces:
      - $NAMESPACE
    labelSelectors:
      app: postgres
  volumePath: /var/lib/postgresql/data
  path: /var/lib/postgresql/data/**/*
  delay: "100ms"
  percent: 50
  duration: "${DURATION}s"
EOF

sleep $DURATION
kubectl delete iochaos io-delay-test -n $NAMESPACE
echo -e "${GREEN}Test 6 completed${NC}\n"

# Final health check
echo -e "${YELLOW}=== Final System Health Check ===${NC}"
check_health

echo -e "${GREEN}=== All Chaos Tests Completed ===${NC}"
echo "Review logs and metrics for detailed analysis"
