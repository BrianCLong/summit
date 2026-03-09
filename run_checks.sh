#!/bin/bash
echo "Looking for graphql schema files:"
find . -name "*.graphql" -exec grep -Hl "Narrative" {} \;

echo "Looking for intelgraph types:"
grep -rnw -i "export type Narrative" . || true

echo "Looking for golden datasets:"
ls -la GOLDEN/datasets/ || true

echo "Looking for adapters directory:"
ls -la adapters/ || true

echo "Looking for active-measures-module directory:"
ls -la active-measures-module/ || true

echo "Looking for absorption directory:"
ls -la absorption/ || true
