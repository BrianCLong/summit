#!/bin/bash
mkdir -p dist
echo "Building..."
# Use RANDOM to ensure difference
echo "$RANDOM" > dist/artifact.txt
echo "Done."
