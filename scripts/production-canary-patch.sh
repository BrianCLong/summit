#!/bin/bash
sed -i '/kubectl get deployment intelgraph -n "$NAMESPACE" -o yaml |/,/kubectl apply -f -/c\
    # Robust canary deployment\
    kubectl create deployment intelgraph-canary --image="ghcr.io/$GITHUB_REPOSITORY/server:$VERSION" --replicas=$canary_replicas -n "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -' scripts/production-canary.sh
# Fix ORIGINAL_REPLICAS empty/bad value issue
sed -i 's/local total_replicas=$ORIGINAL_REPLICAS/local total_replicas=${ORIGINAL_REPLICAS:-3}/' scripts/production-canary.sh
# Also force numeric default just in case of "intelgraph deployment" string
sed -i 's/local total_replicas=${ORIGINAL_REPLICAS:-3}/local total_replicas=3/' scripts/production-canary.sh
