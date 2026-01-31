#!/usr/bin/env bash
set -euo pipefail

WS="${1:-}"
TAG_PREFIX="${2:-apply-ok}"
if [[ -z "$WS" ]]; then
  echo "usage: $0 <workspace> [tag-prefix]"; exit 2
fi

cd "$(dirname "$0")/.."

git fetch --tags --force
TAG="$(git tag -l "${TAG_PREFIX}-${WS}-*" --sort=-v:refname | head -n1)"
if [[ -z "$TAG" ]]; then
  echo "No rollback tag found for ${WS} with prefix ${TAG_PREFIX}-"; exit 3
fi

echo "Rolling back ${WS} to ${TAG}"
git checkout -f "${TAG}" -- infra
pushd infra >/dev/null
terraform init -upgrade=false
terraform workspace select "${WS}" || terraform workspace new "${WS}"
terraform apply -auto-approve
popd >/dev/null
