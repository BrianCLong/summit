#!/usr/bin/env bash
set -euo pipefail

: "${AWS_ACCOUNT_ID:?Set AWS_ACCOUNT_ID}"
: "${AWS_REGION:?Set AWS_REGION}"
: "${IRSA_INTELGRAPH_ARN:?Set IRSA_INTELGRAPH_ARN}"
: "${IRSA_MC_ARN:=}"
: "${IRSA_EXTERNAL_DNS_ARN:=}" # New variable

ECR="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
API_REPO="${ECR}/summit-company/core-intelgraph-api"
CONSOLE_REPO="${ECR}/summit-company/core-console"
MC_REPO="${ECR}/summit-company/core-mc-runner"

# Get latest digest for "latest" tag; adjust as needed.
get_digest() {
  local repo="$1"
  aws ecr describe-images --repository-name "$(echo "$repo" | sed -E 's#^.*/##')" \
    --query 'imageDetails[?contains(imageTags, `latest`)]|[0].imageDigest' \
    --output text
}

API_DIGEST=$(get_digest "$API_REPO")
CONSOLE_DIGEST=$(get_digest "$CONSOLE_REPO")
MC_DIGEST=$(get_digest "$MC_REPO")

cat > charts/companyos/values-prod.yaml <<YAML
intelgraph-api:
  image:
    repository: ${API_REPO}
    digest: ${API_DIGEST}
  ingress:
    enabled: true
    className: nginx
    hosts: [{ host: api.topicality.co, paths: [{ path: /, pathType: Prefix }] }]
    tls: [{ secretName: intelgraph-api-tls, hosts: [api.topicality.co] }]
    annotations: { cert-manager.io/cluster-issuer: letsencrypt-prod }
  serviceAccount:
    create: true
    annotations:
      eks.amazonaws.com/role-arn: ${IRSA_INTELGRAPH_ARN}

companyos-console:
  image:
    repository: ${CONSOLE_REPO}
    digest: ${CONSOLE_DIGEST}
  ingress:
    enabled: true
    className: nginx
    hosts: [{ host: console.topicality.co, paths: [{ path: /, pathType: Prefix }] }]
    tls: [{ secretName: companyos-console-tls, hosts: [console.topicality.co] }]
    annotations: { cert-manager.io/cluster-issuer: letsencrypt-prod }

mc-runner:
  image:
    repository: ${MC_REPO}
    digest: ${MC_DIGEST}
  serviceAccount:
    create: true
    annotations:
      eks.amazonaws.com/role-arn: ${IRSA_MC_ARN}

external-dns: # New section for ExternalDNS
  serviceAccount:
    annotations:
      eks.amazonaws.com/role-arn: ${IRSA_EXTERNAL_DNS_ARN}
YAML

echo "Wrote charts/companyos/values-prod.yaml with image digests."
