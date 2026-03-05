#!/bin/bash
set -e

# Org Mesh Twin GA Demo Wrapper

echo "Starting Org Mesh Twin GA Demo..."
echo "---------------------------------"

# Ensure mock data exists
if [ ! -f mock-org-data.json ]; then
    echo "Generating mock data..."
    npx tsx scripts/demo/generate-mock-org.ts
fi

# Run the demo script
npm run demo:org-mesh

echo "---------------------------------"
echo "Demo finished."
