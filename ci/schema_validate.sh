#!/bin/bash
# CI Gate: Schema Validation
# Validates a JSON file against a provided JSON Schema.

FILE=$1
SCHEMA=$2

if [ ! -f "$FILE" ]; then
  echo "Error: File $FILE not found."
  exit 1
fi

if [ ! -f "$SCHEMA" ]; then
  echo "Error: Schema $SCHEMA not found."
  exit 1
fi

python3 ci/validate_schema.py "$FILE" "$SCHEMA"
