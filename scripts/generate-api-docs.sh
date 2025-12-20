#!/bin/bash
set -e

# Script to regenerate/synchronize API documentation

echo "Synchronizing API specifications..."

# Copy/Update the specs if they are generated from source
# For now, we assume the YAMLs in root are the source of truth for the doc site,
# but in a real scenario we might generate them here.

if [ -f "docs/api-spec.yaml" ]; then
    echo "Updating Core API spec from docs/api-spec.yaml..."
    # In a real setup, we might merge or validate here.
    # cp docs/api-spec.yaml intelgraph-core-api.yaml
    echo "Core API spec is managed manually at intelgraph-core-api.yaml for now."
else
    echo "Warning: docs/api-spec.yaml not found."
fi

# Validate specs if tools are available
if command -v swagger-cli &> /dev/null; then
    echo "Validating Maestro API spec..."
    swagger-cli validate maestro-orchestration-api.yaml
    echo "Validating Core API spec..."
    swagger-cli validate intelgraph-core-api.yaml
else
    echo "swagger-cli not found, skipping validation."
fi

echo "API Docs synchronization complete."
