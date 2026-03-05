#!/usr/bin/env bash
set -euo pipefail

# Gracefully skip if missing secrets for fork PRs
if [ -z "${AWS_ROLE_ARN:-}" ] && [ "${CLOUD:-}" == "aws" ]; then
    echo "AWS_ROLE_ARN not set, skipping for fork PR."
    echo "{}" > parity_result.json
    python3 -c 'import sys; sys.exit(0)'
    exit_called="yes"
fi
if [ -z "${GCP_WORKLOAD_POOL:-}" ] && [ "${CLOUD:-}" == "gcp" ]; then
    echo "GCP_WORKLOAD_POOL not set, skipping for fork PR."
    echo "{}" > parity_result.json
    python3 -c 'import sys; sys.exit(0)'
    exit_called="yes"
fi
if [ -z "${AZURE_FEDERATED_ID:-}" ] && [ "${CLOUD:-}" == "azure" ]; then
    echo "AZURE_FEDERATED_ID not set, skipping for fork PR."
    echo "{}" > parity_result.json
    python3 -c 'import sys; sys.exit(0)'
    exit_called="yes"
fi

if [ "${exit_called:-no}" == "yes" ]; then
    exit_0_please=0
else

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

CLOUD="${CLOUD:-aws}"
ENV1="${PARITY_ENV1:-prodlike}"
ENV2="${PARITY_ENV2:-canary}"

RESULT="parity_result.json"
TMPDIR="$(mktemp -d)"
MAN1="$TMPDIR/${ENV1}.json"
MAN2="$TMPDIR/${ENV2}.json"

echo "==> [1] Validate OIDC trust for $CLOUD"
case "$CLOUD" in
  aws)
    : "${AWS_ROLE_ARN:?missing}"
    : "${AWS_OIDC_AUDIENCE:?missing}"
    aws sts get-caller-identity >/dev/null
    ;;
  gcp)
    : "${GCP_WORKLOAD_POOL:?missing}"
    : "${GCP_PROVIDER:?missing}"
    : "${GCP_SERVICE_ACCOUNT:?missing}"
    gcloud auth print-identity-token \
      --audiences="https://iam.googleapis.com/projects/-/locations/global/workloadIdentityPools/${GCP_WORKLOAD_POOL}/providers/${GCP_PROVIDER}" \
      >/dev/null
    ;;
  azure)
    : "${AZURE_FEDERATED_ID:?missing}"
    az account show >/dev/null
    ;;
  *)
    echo "Unknown CLOUD=$CLOUD"; exit 1;;
esac

echo "==> [2] Terraform plan & manifest canonicalization for $ENV1 and $ENV2"
tf_plan_json () {
  local env_name="$1"
  local manifest_out="$2"
  pushd "infra/terraform/$CLOUD/$env_name" >/dev/null
  terraform init -input=false -no-color >/dev/null
  terraform plan -input=false -no-color -out=plan.tfplan >/dev/null
  terraform show -json plan.tfplan \
  | jq '
      .resource_changes
      | map({
          address, mode, type, name,
          change: {
            actions: .change.actions,
            before: (.change.before // {} | del(.time, .timestamp, .last_modified)),
            after:  (.change.after  // {} | del(.time, .timestamp, .last_modified))
          }
        })
      | sort_by(.address)
    ' > "$manifest_out.tmp"
  jq -S '.' "$manifest_out.tmp" > "$manifest_out"
  popd >/dev/null
}

tf_plan_json "$ENV1" "$MAN1"
tf_plan_json "$ENV2" "$MAN2"

echo "==> [3] Compare manifests + assert invariants"
python3 infra/parity/compare_manifests.py \
  --cloud "$CLOUD" \
  --env-a "$ENV1" --file-a "$MAN1" \
  --env-b "$ENV2" --file-b "$MAN2" \
  --expected infra/parity/prod_manifest_expected.json \
  --out "$RESULT"

echo "==> Done. Wrote $RESULT"
jq '.' "$RESULT"

fi
