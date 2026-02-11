#!/usr/bin/env bash
set -euo pipefail

tmp_dir=$(mktemp -d)

gh_stub="$tmp_dir/gh"
cat >"$gh_stub" <<'GH'
#!/usr/bin/env bash
cmd="$1"; shift || true
case "$cmd" in
  auth)
    exit 0 ;;
  issue)
    echo "label:0"
    exit 0 ;;
  project)
    if [[ "$1" == "item-list" ]]; then
      if [[ "${MOCK_PROJECT_DENY:-}" == "1" ]]; then
        echo "HTTP 403" >&2
        exit 1
      fi
      echo '{"items": []}'
      exit 0
    fi
    ;;
  api)
    echo "[]"
    exit 0 ;;
  run)
    if [[ "${MOCK_BAD_RUNS:-}" == "1" ]]; then
      echo "not-json"
    else
      echo '[]'
    fi
    exit 0 ;;
  *)
    echo "[]"
    exit 0 ;;
esac
GH
chmod +x "$gh_stub"

run_with_env() {
  local outfile="$1"; shift
  PATH="$tmp_dir:$PATH" "$@" >"$outfile" 2>&1
}

run_with_env "$tmp_dir/out_project_denied" env MOCK_PROJECT_DENY=1 scripts/github_inventory.sh --repo dummy

grep -q "Project access unavailable" "$tmp_dir/out_project_denied"

run_with_env "$tmp_dir/out_bad_runs" env MOCK_BAD_RUNS=1 scripts/github_inventory.sh --repo dummy

grep -q "CI workflow data unavailable" "$tmp_dir/out_bad_runs"

echo "github_inventory.sh resilience tests passed"
