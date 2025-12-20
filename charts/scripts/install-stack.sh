#!/usr/bin/env bash
# Install the full Summit stack with environment-specific configurations

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT="${1:-dev}"
NAMESPACE="${NAMESPACE:-summit-${ENVIRONMENT}}"
TIMEOUT="${TIMEOUT:-600s}"

echo -e "${BLUE}==================================================================${NC}"
echo -e "${BLUE}  Summit Stack Installation - ${ENVIRONMENT} environment${NC}"
echo -e "${BLUE}==================================================================${NC}"
echo ""

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|prod)$ ]]; then
    echo -e "${RED}Error: Environment must be 'dev', 'staging', or 'prod'${NC}"
    exit 1
fi

# Function to install chart with environment values
install_chart() {
    local chart_name=$1
    local chart_path=$2
    local values_file="${chart_path}/values.${ENVIRONMENT}.yaml"

    echo -e "${BLUE}→ Installing ${chart_name}...${NC}"

    # Check if environment-specific values exist
    local values_args=""
    if [ -f "$values_file" ]; then
        values_args="--values ${values_file}"
    else
        echo -e "${YELLOW}  ⚠ No ${ENVIRONMENT} values file found, using defaults${NC}"
    fi

    # Install or upgrade the chart
    helm upgrade --install "$chart_name" "$chart_path" \
        --namespace "$NAMESPACE" \
        --create-namespace \
        --timeout "$TIMEOUT" \
        --wait \
        $values_args \
        || {
            echo -e "${RED}  ✗ Failed to install ${chart_name}${NC}"
            return 1
        }

    echo -e "${GREEN}  ✓ ${chart_name} installed successfully${NC}"
}

# Function to check prerequisites
check_prerequisites() {
    echo -e "${BLUE}Checking prerequisites...${NC}"

    # Check for helm
    if ! command -v helm &> /dev/null; then
        echo -e "${RED}Error: helm is not installed${NC}"
        exit 1
    fi

    # Check for kubectl
    if ! command -v kubectl &> /dev/null; then
        echo -e "${RED}Error: kubectl is not installed${NC}"
        exit 1
    fi

    # Check cluster connectivity
    if ! kubectl cluster-info &> /dev/null; then
        echo -e "${RED}Error: Cannot connect to Kubernetes cluster${NC}"
        exit 1
    fi

    echo -e "${GREEN}✓ Prerequisites met${NC}"
}

# Installation order (dependencies first)
CHARTS_ORDER=(
    # Infrastructure
    "monitoring:monitoring"
    "observability:observability"

    # Core services
    "maestro:maestro"
    "gateway:gateway"
    "intelgraph:intelgraph"

    # Additional services
    "backup:backup"
    "flow-audit:flow-audit"
)

main() {
    check_prerequisites

    echo ""
    echo -e "${BLUE}Installing charts in namespace: ${NAMESPACE}${NC}"
    echo ""

    # Install each chart
    for entry in "${CHARTS_ORDER[@]}"; do
        IFS=':' read -r release chart <<< "$entry"
        chart_path="$(dirname "$0")/../${chart}"

        if [ -d "$chart_path" ]; then
            install_chart "$release" "$chart_path"
        else
            echo -e "${YELLOW}⚠ Skipping ${release} - chart not found at ${chart_path}${NC}"
        fi
    done

    echo ""
    echo -e "${GREEN}==================================================================${NC}"
    echo -e "${GREEN}  Stack installation complete!${NC}"
    echo -e "${GREEN}==================================================================${NC}"
    echo ""
    echo -e "${BLUE}Next steps:${NC}"
    echo -e "  1. Run smoke tests: ${YELLOW}make test${NC}"
    echo -e "  2. Check pod status: ${YELLOW}kubectl get pods -n ${NAMESPACE}${NC}"
    echo -e "  3. View logs: ${YELLOW}kubectl logs -n ${NAMESPACE} -l app.kubernetes.io/name=maestro${NC}"
    echo ""
}

main
