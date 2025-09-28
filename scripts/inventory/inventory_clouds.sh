#!/usr/bin/env bash
set -euo pipefail
mkdir -p artifacts

# AWS (Organizations + SSO if present)
if command -v aws >/dev/null 2>&1; then
  aws organizations list-accounts --query 'Accounts[].{Name:Name,Id:Id,Email:Email}' --output table \
    | tee artifacts/aws.accounts.table.txt || true
  aws sso list-accounts --output table | tee artifacts/aws.sso.accounts.table.txt || true
fi

# GCP
if command -v gcloud >/dev/null 2>&1; then
  gcloud projects list --format='table(PROJECT_ID, NAME, PROJECT_NUMBER)' \
    | tee artifacts/gcp.projects.table.txt || true
fi

# Azure
if command -v az >/dev/null 2>&1; then
  az account list --output table | tee artifacts/azure.subscriptions.table.txt || true
fi

