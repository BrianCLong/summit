#!/usr/bin/env bash
set -euo pipefail

# Merge Train Orchestrator
# Starts or advances the merge train by running the existing queue workflows.

usage() {
  cat <<'EOF'
Usage: ./scripts/merge-train.sh [--batch-size N] [--target-depth N] [--dry-run]

Options:
  --batch-size N    Number of PRs to label queue:merge-now (default: 25)
  --target-depth N  Desired merge queue depth for feeder (default: 20)
  --dry-run         Show planned actions without mutating state
  -h, --help        Show this help text
EOF
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

batch_size=25
target_depth=20
dry_run=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --batch-size)
      batch_size="$2"
      shift 2
      ;;
    --target-depth)
      target_depth="$2"
      shift 2
      ;;
    --dry-run)
      dry_run=true
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done

require_cmd gh
require_cmd jq

repo="$(gh repo view --json nameWithOwner --jq .nameWithOwner)"
default_branch="$(gh repo view --json defaultBranchRef --jq .defaultBranchRef.name)"

echo "🚂 Merge train kickstart for ${repo}"
echo "ℹ️  Default branch: ${default_branch}"

queue_depth="$(gh pr list --search 'is:pr is:open is:queued' --json number --jq 'length')"
ready_count="$(gh pr list --label 'queue:merge-now' --state open --json number --jq 'length')"
main_status="$(gh run list --branch "${default_branch}" --limit 1 --json conclusion --jq '.[0].conclusion // "unknown"')"

echo "📊 Current queue depth: ${queue_depth}"
echo "📊 Current queue:merge-now count: ${ready_count}"
echo "📊 Latest ${default_branch} workflow conclusion: ${main_status}"

if [[ "${main_status}" != "success" ]]; then
  echo "⛔ ${default_branch} is not green. Resolve branch health before feeding merge queue."
  exit 1
fi

if [[ "${dry_run}" == "true" ]]; then
  echo "🧪 Dry run enabled. Would dispatch workflows:"
  echo "   - Merge train labeler (batch_size=${batch_size})"
  echo "   - Merge Queue Feeder (target depth env uses workflow default, ${target_depth} suggested)"
  exit 0
fi

echo "🏷️  Dispatching Merge train labeler..."
gh workflow run "Merge train labeler" -f batch_size="${batch_size}"

echo "🧭 Dispatching Merge Queue Feeder..."
gh workflow run "Merge Queue Feeder"

echo "✅ Merge train workflows dispatched. Monitor with:"
echo "   gh run list --workflow 'Merge train labeler' --limit 5"
echo "   gh run list --workflow 'Merge Queue Feeder' --limit 5"
echo "   gh pr list --search 'is:pr is:open is:queued' --limit ${target_depth}"
