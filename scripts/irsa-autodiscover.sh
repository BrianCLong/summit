#!/usr/bin/env bash
set -euo pipefail
: "${CLUSTER_NAME:?set CLUSTER_NAME}"
: "${AWS_REGION:?set AWS_REGION}"

OIDC_URL=$(aws eks describe-cluster --name "$CLUSTER_NAME" --region "$AWS_REGION" --query "cluster.identity.oidc.issuer" --output text)
OIDC_URL=${OIDC_URL#https://}
THUMBPRINT=$(openssl s_client -servername ${OIDC_URL} -showcerts -connect ${OIDC_URL}:443 </dev/null 2>/dev/null | openssl x509 -fingerprint -sha1 -noout | cut -d= -f2 | tr -d ':')

cat <<JSON
{
  "oidc_url": "https://${OIDC_URL}",
  "thumbprint": "${THUMBPRINT}",
  "sa_subject_example": "system:serviceaccount:companyos:intelgraph-api-sa"
}
JSON
