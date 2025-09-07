#!/usr/bin/env bash
set -euo pipefail

NAMESPACE=${NAMESPACE:-intelgraph}
SA=${SA:-conductor}
TRUST_DOMAIN=${TRUST_DOMAIN:-intelgraph.local}

spire-server entry create \
  -spiffeID spiffe://$TRUST_DOMAIN/ns/$NAMESPACE/sa/$SA \
  -selector k8s:ns:$NAMESPACE -selector k8s:sa:$SA \
  -parentID spiffe://$TRUST_DOMAIN/spire/server

echo "Registered SPIFFE ID for serviceaccount $SA in namespace $NAMESPACE"

