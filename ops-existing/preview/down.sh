#!/usr/bin/env bash
set -euo pipefail
ID="${1:?preview id}"
NS="${2:?namespace}"

kubectl delete ns "$NS" --ignore-not-found
