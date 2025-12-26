#!/bin/bash
set -eo pipefail

# This script automates the deployment of the Summit application to a single, specified region.
# It reads region-specific Helm configurations and applies them.

# --- Configuration ---
HELM_CHART_PATH="deploy/helm/summit"

# --- Pre-flight Checks ---
if ! command -v helm &> /dev/null; then
    echo "Helm CLI not found. Please install helm."
    exit 1
fi

# --- Deployment Logic ---
main() {
    local region="$1"

    if [ -z "$region" ]; then
        echo "Error: No region specified. Usage: $0 <region>"
        exit 1
    fi

    echo "-------------------------------------------"
    echo "Deploying to region: $region"

    local values_file="$HELM_CHART_PATH/values.$region.yaml"
    local release_name="summit-$region"

    if [ ! -f "$values_file" ]; then
        echo "Error: Values file for region '$region' not found at '$values_file'."
        exit 1
    fi

    echo "Deploying release '$release_name' using values from '$values_file'..."

    # The --dry-run flag is used for safety in this context.
    # In a real CI/CD pipeline, this would be a live deployment.
    helm upgrade --install "$release_name" "$HELM_CHART_PATH" \
        -f "$values_file" \
        --namespace "summit-$region" \
        --create-namespace \
        --dry-run \
        --debug

    echo "Successfully processed deployment for region: $region"
    echo "-------------------------------------------"
}

# --- Execution ---
main "$@"
