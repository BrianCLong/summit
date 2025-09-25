#!/usr/bin/env bash
set -euo pipefail

: "${AWS_REGION:?Set AWS_REGION}"
: "${CLUSTER_NAME:?Set CLUSTER_NAME}"

AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# discover cluster OIDC
OIDC_JSON=$(scripts/irsa-autodiscover.sh)
echo "Cluster OIDC: $OIDC_JSON"

# Try to discover IRSA roles by name patterns; allow override via env
IRSA_INTELGRAPH_ARN="${IRSA_INTELGRAPH_ARN:-$(aws iam list-roles --query "Roles[?contains(RoleName,'companyos-intelgraph-irsa')].Arn | [0]" --output text)}"
IRSA_MC_ARN="${IRSA_MC_ARN:-$(aws iam list-roles --query "Roles[?contains(RoleName,'companyos-mc-irsa')].Arn | [0]" --output text)}"

# Discover ExternalDNS IRSA role ARN from Terraform
# This assumes infra/iam/externaldns has been applied
TF_EXTERNALDNS_DIR="infra/iam/externaldns"
IRSA_EXTERNAL_DNS_ARN=""
if [ -d "$TF_EXTERNALDNS_DIR" ]; then
    (cd "$TF_EXTERNALDNS_DIR" && terraform init -backend=false >/dev/null)
    IRSA_EXTERNAL_DNS_ARN=$(cd "$TF_EXTERNALDNS_DIR" && terraform output -raw externaldns_role_arn)
    echo "Discovered ExternalDNS IRSA ARN: $IRSA_EXTERNAL_DNS_ARN"
else
    echo "Terraform directory $TF_EXTERNALDNS_DIR not found. Skipping ExternalDNS IRSA discovery."
fi


export AWS_ACCOUNT_ID
export AWS_REGION

# Reuse digest pinning script
if [ -f "scripts/gen-values-prod.sh" ]; then
    IRSA_INTELGRAPH_ARN="$IRSA_INTELGRAPH_ARN" \
    IRSA_MC_ARN="$IRSA_MC_ARN" \
    IRSA_EXTERNAL_DNS_ARN="$IRSA_EXTERNAL_DNS_ARN" \
    scripts/gen-values-prod.sh
    echo "Generated charts/companyos/values-prod.yaml"
else
    echo "scripts/gen-values-prod.sh not found. Skipping."
fi