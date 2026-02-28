#!/usr/bin/env bash
# image-size-budget.sh — Container Image Size Budget Enforcement
#
# Enforces maximum image sizes for production containers.
# Used as a P0 gate to prevent image bloat.
#
# Usage:
#   ./scripts/ci/image-size-budget.sh [--registry REGISTRY] [--budget FILE]
#
# Requires: docker (or skopeo for remote inspection)

set -euo pipefail

REGISTRY="${REGISTRY:-ghcr.io/brianclong/summit}"
BUDGET_FILE="${BUDGET_FILE:-config/image-budgets.yaml}"

# Image size budgets (in MB) — override via config/image-budgets.yaml
declare -A BUDGETS
BUDGETS["api"]=500
BUDGETS["worker"]=500
BUDGETS["ingest"]=400
BUDGETS["search-indexer"]=350
BUDGETS["websocket-server"]=350
BUDGETS["client"]=200

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASS=0
FAIL=0
WARN=0

echo "Container Image Size Budget Check"
echo "=================================="
echo "Registry: ${REGISTRY}"
echo ""

# Parse budgets from config if available
if [ -f "$BUDGET_FILE" ]; then
  echo "Loading budgets from: ${BUDGET_FILE}"
  while IFS=': ' read -r image size; do
    [ -z "$image" ] || [ "${image:0:1}" = "#" ] && continue
    BUDGETS["$image"]="$size"
  done < <(grep -E '^\s+\w+:' "$BUDGET_FILE" 2>/dev/null | sed 's/[[:space:]]*//;s/://' || true)
fi

echo ""
printf "%-25s %-12s %-12s %-10s\n" "IMAGE" "SIZE (MB)" "BUDGET (MB)" "STATUS"
printf "%-25s %-12s %-12s %-10s\n" "-----" "--------" "----------" "------"

for image in "${!BUDGETS[@]}"; do
  BUDGET_MB="${BUDGETS[$image]}"

  # Try to get image size via docker
  SIZE_BYTES=0
  if command -v docker &>/dev/null; then
    SIZE_BYTES=$(docker image inspect "${REGISTRY}/${image}:latest" \
      --format='{{.Size}}' 2>/dev/null || echo 0)
  fi

  # Try skopeo if docker fails
  if [ "$SIZE_BYTES" -eq 0 ] && command -v skopeo &>/dev/null; then
    SIZE_BYTES=$(skopeo inspect "docker://${REGISTRY}/${image}:latest" 2>/dev/null \
      | jq -r '.Layers | map(.Size) | add // 0' 2>/dev/null || echo 0)
  fi

  if [ "$SIZE_BYTES" -eq 0 ]; then
    printf "%-25s %-12s %-12s ${YELLOW}%-10s${NC}\n" "$image" "N/A" "${BUDGET_MB}" "SKIP"
    WARN=$((WARN + 1))
    continue
  fi

  SIZE_MB=$((SIZE_BYTES / 1024 / 1024))

  if [ "$SIZE_MB" -le "$BUDGET_MB" ]; then
    printf "%-25s %-12s %-12s ${GREEN}%-10s${NC}\n" "$image" "${SIZE_MB}" "${BUDGET_MB}" "PASS"
    PASS=$((PASS + 1))
  else
    printf "%-25s %-12s %-12s ${RED}%-10s${NC}\n" "$image" "${SIZE_MB}" "${BUDGET_MB}" "FAIL"
    FAIL=$((FAIL + 1))
  fi
done

echo ""
echo "=================================="
echo -e "Results: ${GREEN}${PASS} passed${NC}, ${RED}${FAIL} failed${NC}, ${YELLOW}${WARN} skipped${NC}"

if [ "$FAIL" -gt 0 ]; then
  echo -e "${RED}GATE: FAILED — ${FAIL} image(s) exceed budget${NC}"
  echo ""
  echo "To fix: reduce image size via multi-stage builds, .dockerignore, or Alpine base"
  exit 1
fi

if [ "$PASS" -eq 0 ] && [ "$WARN" -gt 0 ]; then
  echo -e "${YELLOW}GATE: SKIPPED — no images available locally (build images first)${NC}"
  exit 0
fi

echo -e "${GREEN}GATE: PASSED${NC}"
exit 0
