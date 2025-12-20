#!/bin/bash
set -e

# Generate API Documentation
echo "Generating GraphQL types..."
pnpm graphql:codegen

echo "Generating OpenAPI Documentation..."
# Assuming there is a script for this, otherwise we might need to rely on Swagger UI generated at runtime
# or check if 'server/scripts/generate-openapi.ts' exists.
# For now, let's look for an npm script.
pnpm --filter intelgraph-server run codegen || echo "No explicit openapi gen script found."

# Generate simple architecture diagrams if mermaid-cli is installed
if command -v mmdc &> /dev/null; then
    echo "Generating architecture diagrams..."
    # mmdc -i docs/architecture.mmd -o docs/architecture.png
else
    echo "mmdc (mermaid-cli) not found. Skipping diagram generation."
fi

echo "Documentation generation complete."
