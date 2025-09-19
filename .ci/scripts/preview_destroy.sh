#!/usr/bin/env bash
set -euo pipefail
PR_NUMBER=$1
kubectl delete ns pr-${PR_NUMBER} --wait=false || true