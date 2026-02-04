#!/usr/bin/env bash
set -euo pipefail

# Verify Summit Dev Station tools and emit evidence JSON.
#
# Usage:
#   scripts/devstation/verify-tools.sh --lock scripts/devstation/tools.lock.yaml --out devstation.evidence.json
#
# Output:
# - JSON includes command path, version (best-effort), sha256 of binary (if readable), and timestamp.

LOCK="scripts/devstation/tools.lock.yaml"
OUT="devstation.evidence.json"

while [ $# -gt 0 ]; do
  case "$1" in
    --lock) LOCK="$2"; shift 2 ;;
    --out)  OUT="$2"; shift 2 ;;
    *) echo "Unknown arg: $1"; exit 2 ;;
  esac
done

need_cmd() { command -v "$1" >/dev/null 2>&1; }

# Minimal dependencies: bash + coreutils + jq (preferred)
if ! need_cmd jq; then
  echo "ERROR: jq is required for verify-tools.sh"
  exit 1
fi

ts="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
host="$(hostname 2>/dev/null || echo unknown)"
kernel="$(uname -srmo 2>/dev/null || uname -a)"

# Canonical tool list (align this with installer modules)
TOOLS=(
  git git-lfs gh git-sizer
  jq yq rg fd fzf tmux shellcheck
  pre-commit act actionlint
  syft grype trivy gitleaks cosign slsa-verifier oras scorecard
  opa conftest regal cue kubeconform kube-linter
  kubectl helm k9s kustomize
  terraform tflint tfsec
  aws gcloud az
  promtool otelcol-contrib
  sqlite3 psql redis-cli duckdb dot
  hadolint goreleaser dyff mlr sg hyperfine
  codex claude gemini qwen
)

get_version() {
  local cmd="$1"
  # best-effort; different tools print versions differently
  case "$cmd" in
    git) "$cmd" --version 2>/dev/null ;;
    gh) "$cmd" --version 2>/dev/null | head -n1 ;;
    kubectl) "$cmd" version --client --short 2>/dev/null ;;
    helm|k9s|kustomize|terraform|tflint|tfsec|aws|gcloud|az|cosign|oras|gitleaks|syft|grype|trivy|opa|conftest|regal|cue|kubeconform|kube-linter|promtool|otelcol-contrib|hadolint|goreleaser|dyff|mlr|sg|hyperfine|scorecard|slsa-verifier|act|actionlint|pre-commit|duckdb|sqlite3|psql|redis-cli|codex|claude|gemini|qwen)
      "$cmd" --version 2>/dev/null || "$cmd" version 2>/dev/null || true
      ;;
    *)
      "$cmd" --version 2>/dev/null || true
      ;;
  esac
}

sha256_of() {
  local p="$1"
  if [ -r "$p" ] && need_cmd sha256sum; then
    sha256sum "$p" 2>/dev/null | awk '{print $1}'
  else
    echo ""
  fi
}

items_json="[]"

for t in "${TOOLS[@]}"; do
  if command -v "$t" >/dev/null 2>&1; then
    p="$(command -v "$t")"
    v="$(get_version "$t" | tr -d '\r' | head -n 5)"
    h="$(sha256_of "$p")"
    items_json="$(jq -c --arg name "$t" --arg path "$p" --arg ver "$v" --arg sha "$h" \
      '. + [{"name":$name,"path":$path,"version":$ver,"sha256":$sha}]' <<<"$items_json")"
  else
    items_json="$(jq -c --arg name "$t" '. + [{"name":$name,"path":"","version":"","sha256":"","missing":true}]' <<<"$items_json")"
  fi
done

lock_hash=""
if [ -f "$LOCK" ] && need_cmd sha256sum; then
  lock_hash="$(sha256sum "$LOCK" | awk '{print $1}')"
fi

jq -n \
  --arg schema "summit.devstation.evidence/v1" \
  --arg generated_at "$ts" \
  --arg host "$host" \
  --arg kernel "$kernel" \
  --arg lock_path "$LOCK" \
  --arg lock_sha256 "$lock_hash" \
  --argjson tools "$items_json" \
  '{
    schema: $schema,
    generated_at: $generated_at,
    host: { hostname: $host, kernel: $kernel },
    lock: { path: $lock_path, sha256: $lock_sha256 },
    tools: $tools
  }' > "$OUT"

echo "Wrote: $OUT"
jq -r '
  .tools
  | map(select(.missing==true))
  | if length==0 then "Missing tools: none"
    else "Missing tools:\n" + (map(" - " + .name) | join("\n"))
    end
' "$OUT"
