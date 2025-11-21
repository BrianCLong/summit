#!/usr/bin/env bash
# Health check script for deployed services

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

NAMESPACE="${NAMESPACE:-summit-dev}"

echo -e "${BLUE}==================================================================${NC}"
echo -e "${BLUE}  Service Health Check${NC}"
echo -e "${BLUE}==================================================================${NC}"
echo ""

# Function to check pod health
check_pod_health() {
    local app=$1

    echo -e "${BLUE}Checking ${app}...${NC}"

    # Get pods for this app
    local pods=$(kubectl get pods -n "$NAMESPACE" -l "app.kubernetes.io/name=${app}" --no-headers 2>/dev/null)

    if [ -z "$pods" ]; then
        echo -e "${YELLOW}  ⚠ No pods found${NC}"
        return
    fi

    # Check each pod
    while read -r line; do
        local pod_name=$(echo "$line" | awk '{print $1}')
        local status=$(echo "$line" | awk '{print $3}')
        local restarts=$(echo "$line" | awk '{print $4}')

        if [ "$status" = "Running" ]; then
            echo -e "${GREEN}  ✓ ${pod_name}: ${status} (restarts: ${restarts})${NC}"

            # Check health endpoint if pod is running
            for path in "/health" "/healthz" "/ready"; do
                if kubectl exec -n "$NAMESPACE" "$pod_name" -- wget -q -O- "http://localhost:8080${path}" &> /dev/null; then
                    echo -e "${GREEN}    ✓ Health endpoint ${path} responding${NC}"
                    break
                fi
            done
        else
            echo -e "${RED}  ✗ ${pod_name}: ${status}${NC}"
        fi
    done <<< "$pods"

    echo ""
}

# Function to display resource usage
check_resources() {
    echo -e "${BLUE}Resource Usage:${NC}"
    kubectl top pods -n "$NAMESPACE" 2>/dev/null || echo -e "${YELLOW}  ⚠ Metrics not available${NC}"
    echo ""
}

# Function to check service endpoints
check_services() {
    echo -e "${BLUE}Services:${NC}"
    kubectl get svc -n "$NAMESPACE" 2>/dev/null
    echo ""
}

# Function to check ingress
check_ingress() {
    echo -e "${BLUE}Ingress:${NC}"
    kubectl get ingress -n "$NAMESPACE" 2>/dev/null || echo -e "${YELLOW}  ⚠ No ingress resources${NC}"
    echo ""
}

# Main
main() {
    # Check if namespace exists
    if ! kubectl get namespace "$NAMESPACE" &> /dev/null; then
        echo -e "${RED}Error: Namespace ${NAMESPACE} does not exist${NC}"
        exit 1
    fi

    # Get all apps in namespace
    local apps=$(kubectl get pods -n "$NAMESPACE" -o json 2>/dev/null | jq -r '.items[].metadata.labels."app.kubernetes.io/name"' | sort -u)

    # Check health of each app
    while read -r app; do
        if [ -n "$app" ]; then
            check_pod_health "$app"
        fi
    done <<< "$apps"

    # Additional checks
    check_resources
    check_services
    check_ingress

    echo -e "${GREEN}Health check complete${NC}"
}

main
