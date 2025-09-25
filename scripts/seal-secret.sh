#!/usr/bin/env bash
# Seal a generic secret for the Sealed Secrets controller
set -euo pipefail
: "${NAMESPACE:=companyos}"
: "${NAME:?Set NAME=<secret-name>}"

# Check if the sealed secrets controller is running and ready
kubectl -n kube-system get secret -l sealedsecrets.bitnami.com/sealed-secrets-key >/dev/null

TMP_SECRET=$(mktemp)

cleanup() {
  rm -f "$TMP_SECRET"
}
trap cleanup EXIT

kubectl -n "$NAMESPACE" create secret generic "$NAME" --from-literal=example=change-me --dry-run=client -o yaml > "$TMP_SECRET"

kubeseal --format yaml < "$TMP_SECRET" > "k8s/secrets/${NAME}.sealed.yaml"

echo "Wrote k8s/secrets/${NAME}.sealed.yaml"
