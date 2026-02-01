#!/usr/bin/env bash
set -e

# E2E test for policy-controller configuration
# Validates that manifests are valid

echo "Validating Kubernetes Manifests..."

if command -v kubectl >/dev/null; then
    kubectl apply --dry-run=client -f deploy/policy-controller/cip_summit_images.yaml
    echo "ClusterImagePolicy manifest is valid."
else
    echo "kubectl not found, skipping dry-run validation."
fi

if command -v helm >/dev/null; then
    helm template policy-controller sigstore/policy-controller \
        --repo https://sigstore.github.io/helm-charts \
        --values deploy/policy-controller/policy-controller-values.yaml > /dev/null
    echo "Helm values are valid."
else
    echo "helm not found, skipping values validation."
fi
