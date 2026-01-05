#!/usr/bin/env bash
set -euo pipefail

REPO="${1:-""}"
OUTPUT=""
INCLUDE_PROJECT=1

usage() {
  cat <<'USAGE'
GitHub inventory helper for Summit.

Usage:
  scripts/github_inventory.sh [--repo owner/name] [--output file] [--no-project]

Options:
  --repo owner/name   Target repository (default: BrianCLong/summit)
  --output file       Write report to file (also prints to stdout)
  --no-project        Skip Project 19 calls (if access not granted)
  -h, --help          Show this help message

Requires:
  - GitHub CLI (`gh`) authenticated with scopes: repo, project, security_events, workflow.
  - Network access to api.github.com.
USAGE
}

log() { printf "[%s] %s\n" "$(date -Iseconds)" "$*"; }

warn() { printf "[%s] WARN: %s\n" "$(date -Iseconds)" "$*" >&2; }

run_gh() {
  local description="$1"; shift
  local output status
  set +e
  output=$("$@" 2>&1)
  status=$?
  set -e
  if [[ $status -ne 0 ]]; then
    warn "$description unavailable ($output)"
    return 1
  fi
  printf "%s" "$output"
}

safe_jq() {
  local description="$1"; shift
  local status
  set +e
  jq "$@"
  status=$?
  set -e
  if [[ $status -ne 0 ]]; then
    warn "$description parsing failed"
    return 1
  fi
  return 0
}

require_tools() {
  if ! command -v gh >/dev/null 2>&1; then
    echo "error: gh CLI not found. Install from https://cli.github.com/." >&2
    exit 1
  fi
  if ! command -v jq >/dev/null 2>&1; then
    echo "error: jq is required for JSON processing." >&2
    exit 1
  fi
  if ! gh auth status >/dev/null 2>&1; then
    echo "error: gh CLI not authenticated. Run 'gh auth login'." >&2
    exit 1
  fi
}

parse_args() {
  local arg
  while [[ $# -gt 0 ]]; do
    arg="$1"
    case "$arg" in
      --repo)
        REPO="$2"; shift 2 ;;
      --output)
        OUTPUT="$2"; shift 2 ;;
      --no-project)
        INCLUDE_PROJECT=0; shift ;;
      -h|--help)
        usage; exit 0 ;;
      *)
        echo "Unknown option: $arg" >&2
        usage; exit 1 ;;
    esac
  done
  if [[ -z "$REPO" ]]; then
    REPO="BrianCLong/summit"
  fi
}

section() {
  echo ""; echo "## $1"; }

issues_report() {
  section "Open issues by label";
  local labels=("severity:blocker" "severity:high" "release:ga-blocker" "release:ga")
  for label in "${labels[@]}"; do
    if ! gh issue list --repo "$REPO" --state open --label "$label" --limit 200 --json number,title --jq \
      '"'"${label}"'" + ": " + (length|tostring)'; then
      warn "Issue listing failed for label ${label}; skipping entry"
    fi
  done
  if ! gh issue list --repo "$REPO" --state open --limit 0 --json number | jq -r '"total open: " + (length|tostring)'; then
    warn "Issue total unavailable"
  fi
}

project_report() {
  if [[ "$INCLUDE_PROJECT" -ne 1 ]]; then
    section "Project 19"; echo "Skipped (flag --no-project)."; return
  fi
  section "Project 19 snapshot";
  local project_json
  if ! project_json=$(run_gh "Project 19" gh project item-list --owner BrianCLong --number 19 --limit 200 --format json); then
    echo "Project access unavailable; rerun with --no-project to skip."; return
  fi
  if ! echo "$project_json" |
    safe_jq "Project 19" -r '.items[] | {title: .title, type: .type, status: (.fieldValues[]? | select(.field.name=="Status").name)} | "- [" + (.type // "Item") + "] " + (.title // "(untitled)") + " — status: " + (.status // "(unset)")'; then
    echo "Project data unavailable"; return
  fi
}

security_report() {
  section "Security alerts";
  local headers=("-H" "Accept: application/vnd.github+json")
  gh api "repos/$REPO/dependabot/alerts" "${headers[@]}" --paginate --jq '.[] | select(.state=="open") | .security_advisory.severity' 2>/dev/null |
    sort | uniq -c | awk '{printf "Dependabot %s: %s\n", $2, $1}' || echo "Dependabot data unavailable"

  gh api "repos/$REPO/code-scanning/alerts" "${headers[@]}" --paginate --jq '.[] | select(.state=="open") | .rule.severity' 2>/dev/null |
    sort | uniq -c | awk '{printf "CodeQL %s: %s\n", $2, $1}' || echo "CodeQL data unavailable"

  gh api "repos/$REPO/secret-scanning/alerts" "${headers[@]}" --paginate --jq '.[] | select(.state=="open") | .secret_type' 2>/dev/null |
    sort | uniq -c | awk '{printf "Secret type %s: %s\n", $2, $1}' || echo "Secret scanning data unavailable"
}

workflow_report() {
  section "CI workflows (latest runs)";
  local runs
  if ! runs=$(run_gh "CI workflow list" gh run list --repo "$REPO" --limit 10 --json status,conclusion,name,headBranch,event,updatedAt); then
    echo "CI workflow data unavailable"; return
  fi
  if ! echo "$runs" | safe_jq "CI workflow list" -r '.[] | "- " + (.name//"(unknown)") + " [" + (.headBranch//"?") + "] " + (.status//"?") + ": " + (.conclusion//"pending") + " (" + (.updatedAt//"?") + ")"'; then
    echo "CI workflow data unavailable"; return
  fi
}

main() {
  parse_args "$@"
  require_tools
  log "Collecting inventory for $REPO"
  { issues_report; project_report; security_report; workflow_report; } | tee ${OUTPUT:+"$OUTPUT"}
}

main "$@"
