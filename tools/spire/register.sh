#!/usr/bin/env bash
set -euo pipefail

# Register a Kubernetes workload with SPIRE
# Requires spire-server CLI access

NAMESPACE=${NAMESPACE:-intelgraph}
SERVICE_ACCOUNT=${SERVICE_ACCOUNT:-maestro}
TRUST_DOMAIN=${TRUST_DOMAIN:-intelgraph}

spire-server entry create \
  -spiffeID spiffe://${TRUST_DOMAIN}/ns/${NAMESPACE}/sa/${SERVICE_ACCOUNT} \
  -selector k8s:ns:${NAMESPACE} -selector k8s:sa:${SERVICE_ACCOUNT} \
  -parentID spiffe://${TRUST_DOMAIN}/ns/spire/sa/spire-agent

