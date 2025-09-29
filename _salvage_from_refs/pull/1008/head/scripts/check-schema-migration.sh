#!/bin/sh
CHANGED=$(git diff --cached --name-only)
if echo "$CHANGED" | grep -q '^schema/graph_versions/'; then
  if ! echo "$CHANGED" | grep -Eq 'schema/migration.yaml|tests/test_schema_consistency.py'; then
    echo 'Schema changes require migration.yaml and tests.'
    exit 1
  fi
fi
