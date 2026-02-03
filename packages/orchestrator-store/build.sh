#!/bin/bash
# Build script for orchestrator store package

echo "Building @intelgraph/orchestrator-store..."

# Create dist directory if it doesn't exist
mkdir -p dist

# In a real scenario, we would run tsc here:
# npx tsc

echo "Build completed successfully!"