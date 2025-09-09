#!/usr/bin/env bash
set -euo pipefail
# Requires: npx spectaql or graphdoc installed
npx -y spectaql graphql/schema.graphql --target-dir docs/reference/graphql