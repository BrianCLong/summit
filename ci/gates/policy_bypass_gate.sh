#!/bin/bash
echo "Running Policy Bypass Gate..."
if grep -r "@bypass-policy" . --exclude-dir=ci --exclude-dir=docs; then
  echo "FAILURE: Found explicit policy bypass."
  exit 1
else
  echo "SUCCESS: No policy bypasses found."
  exit 0
fi
