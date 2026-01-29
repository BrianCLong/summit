#!/usr/bin/env bash
set -euo pipefail

# Auto-pin images in Kubernetes/Compose manifests to immutable digests using 'crane'.
# - Pins tag or :latest references to repo@sha256:...
# - Skips Helm charts and templates by default.
# - Optionally sets Maestro digest placeholders when MAESTRO_DIGEST is provided.
#
# Requirements: ripgrep (rg), GNU sed/perl, crane, optionally yq for future enhancements.

DRY_RUN="${DRY_RUN:-false}"
MAESTRO_DIGEST="${MAESTRO_DIGEST:-}"

shopt -s nullglob

say() { echo -e "$*"; }

pin_line() {
  local file="$1"; shift
  local lineno="$1"; shift
  local value="$1"; shift
  local clean
  clean=$(echo "$value" | sed -E "s/[\"']//g" | xargs)

  # Already digest-pinned
  if [[ "$clean" == *@sha256:* ]]; then
    return 0
  fi

  # Resolve digest via crane
  local digest
  if ! digest=$(crane digest "$clean" 2>/dev/null); then
    say "⚠️  Skip (digest not found): $file:$lineno → $clean"
    return 0
  fi

  # Build immutable
  local repo
  repo="${clean%%:*}"
  local immutable="${repo}@${digest}"

  say "📌 Pinning: $file:$lineno → $immutable"
  if [[ "$DRY_RUN" != "true" ]]; then
    # Replace only the matching line occurrence
    perl -0777 -pe "s/^(\s*image:\s*)[\"']?\Q$clean\E[\"']?\s*
/$1$immutable\n/sm" -i "$file"
  fi
}

process_file() {
  local f="$1"
  # For maestro placeholders
  if [[ -n "$MAESTRO_DIGEST" ]]; then
    if rg -q "maestro-control-plane@sha256:__DIGEST_TO_SET__" "$f"; then
      say "🔧 Setting Maestro digest placeholder in $f"
      if [[ "$DRY_RUN" != "true" ]]; then
        sed -i.bak -E "s#(maestro-control-plane@)sha256:__DIGEST_TO_SET__#\1$MAESTRO_DIGEST#g" "$f" && rm -f "$f.bak"
      fi
    fi
  fi

  while IFS=: read -r lineno line; do
    # Extract image value
    local val
    val=$(echo "$line" | sed -E 's/^\s*image:\s*//; s/#.*$//')
    [[ -z "$val" ]] && continue
    # Skip templated values
    if [[ "$val" == *"{{"* ]]; then continue; fi
    pin_line "$f" "$lineno" "$val"
  done < <(rg -n "^\s*image:\s*" "$f" | rg -v "^\s*#")
}

main() {
  mapfile -t FILES < <(
    git ls-files '*.yml' '*.yaml' 2>/dev/null \
      | rg -v '^(charts/|docs/|client/|server/|conductor-ui/|policy/gatekeeper/.*template|k8s/policies/gatekeeper/templates/|deploy/helm/)' -n
  )

  if ! command -v rg >/dev/null 2>&1; then echo "ripgrep (rg) required" >&2; exit 1; fi
  if ! command -v crane >/dev/null 2>&1; then echo "crane required" >&2; exit 1; fi

  for f in "${FILES[@]}"; do
    process_file "$f"
  done

  say "✅ Auto-pin completed (DRY_RUN=$DRY_RUN)"
}

main "$@"

