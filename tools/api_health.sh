#!/usr/bin/env bash
# Check GitHub API health and rate limits
set -euo pipefail

log() { printf "[%s] %s\n" "$(date -Iseconds)" "$*"; }

# Check if gh is authenticated
if ! gh auth status >/dev/null 2>&1; then
  log "❌ Not authenticated with GitHub CLI"
  exit 1
fi

# Check rate limits
RATE_LIMIT=$(gh api rate_limit 2>/dev/null || echo "")

if [[ -z "$RATE_LIMIT" ]]; then
  log "❌ Could not fetch rate limit info"
  exit 1
fi

CORE_REMAINING=$(echo "$RATE_LIMIT" | jq -r '.resources.core.remaining // 0')
CORE_LIMIT=$(echo "$RATE_LIMIT" | jq -r '.resources.core.limit // 0')
GRAPHQL_REMAINING=$(echo "$RATE_LIMIT" | jq -r '.resources.graphql.remaining // 0')
GRAPHQL_LIMIT=$(echo "$RATE_LIMIT" | jq -r '.resources.graphql.limit // 0')

log "Core API: ${CORE_REMAINING}/${CORE_LIMIT}"
log "GraphQL API: ${GRAPHQL_REMAINING}/${GRAPHQL_LIMIT}"

# Require at least 500 core requests and 500 GraphQL requests
MIN_CORE=500
MIN_GRAPHQL=500

if [[ $CORE_REMAINING -lt $MIN_CORE ]]; then
  RESET=$(echo "$RATE_LIMIT" | jq -r '.resources.core.reset')
  log "❌ Insufficient core API quota (${CORE_REMAINING}/${MIN_CORE} required)"
  log "   Resets at: $(date -r "$RESET" 2>/dev/null || echo "$RESET")"
  exit 1
fi

if [[ $GRAPHQL_REMAINING -lt $MIN_GRAPHQL ]]; then
  RESET=$(echo "$RATE_LIMIT" | jq -r '.resources.graphql.reset')
  log "❌ Insufficient GraphQL API quota (${GRAPHQL_REMAINING}/${MIN_GRAPHQL} required)"
  log "   Resets at: $(date -r "$RESET" 2>/dev/null || echo "$RESET")"
  exit 1
fi

log "✅ API health OK"
exit 0
