#!/usr/bin/env bash
set -euo pipefail
helm upgrade --install ig charts/intelgraph -f charts/intelgraph/values.prod.yaml --set featureFlags.v24.coherence=false
helm rollback ig 1   # replace 1 with previous good revision
