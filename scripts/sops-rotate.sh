#!/usr/bin/env bash
set -euo pipefail

# Rotate SOPS age keys and re-encrypt secrets
find helm -name "*-secrets.yaml" -o -name "*-secret.yaml" | while read -r file; do
  echo "Rotating $file"
  sops --rotate "$file"
done
