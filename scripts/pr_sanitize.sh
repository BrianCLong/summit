#!/usr/bin/env bash
set -euo pipefail

MODE="fix"
if [[ "${1:-}" == "--check" ]]; then
  MODE="check"
  shift || true
elif [[ "${1:-}" == "--fix" ]]; then
  MODE="fix"
  shift || true
fi

ROOT_DIR="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "${ROOT_DIR}" ]]; then
  echo "::error::scripts/pr_sanitize.sh must be run from inside a Git repository" >&2
  exit 1
fi
cd "${ROOT_DIR}"

header() {
  printf '\n\033[1m[%s]\033[0m %s\n' "$1" "$2"
}

log_info() {
  printf '  • %s\n' "$1"
}

file_size() {
  local target="$1"
  local size
  if size=$(stat -c '%s' "$target" 2>/dev/null); then
    printf '%s' "$size"
    return
  fi
  if size=$(stat -f '%z' "$target" 2>/dev/null); then
    printf '%s' "$size"
    return
  fi
  wc -c < "$target"
}

remove_path() {
  local path="$1"
  if git ls-files --error-unmatch "$path" >/dev/null 2>&1; then
    return 0
  fi
  if [[ -e "$path" ]]; then
    log_info "Removing transient artifact $path"
    rm -rf "$path"
  fi
}

sanitise_transients() {
  header "sanitize" "Pruning transient build artifacts"
  local artifacts=(
    client/dist
    client/.svelte-kit
    client/.next
    client/.cache
    client/coverage
    client/playwright-report
    client/test-results
    client/tmp
    server/dist
    server/build
    server/coverage
    server/tmp
    server/.pytest_cache
    server/.turbo
    apps/**/dist
    apps/**/build
    apps/**/.turbo
    apps/**/coverage
    packages/**/dist
    packages/**/build
    packages/**/.turbo
    packages/**/coverage
    tmp
    .turbo
    .next
    coverage
    dist
    build
    .cache
    playwright-report
    test-results
    cypress/screenshots
    cypress/videos
    reports
    logs
    *.log
    pnpm-debug.log
    npm-debug.log
    yarn-error.log
  )

  shopt -s globstar nullglob
  for pattern in "${artifacts[@]}"; do
    for match in $pattern; do
      remove_path "$match"
    done
  done
  shopt -u globstar nullglob
}

collect_changed_files() {
  git diff --name-only --diff-filter=ACMR -z HEAD -- || true
  git ls-files -o --exclude-standard -z || true
}

check_file_policies() {
  header "policies" "Validating staged/untracked files"
  local blocked_regex='\.(png|jpe?g|gif|webp|ico|mp4|mov|pdf|zip|tar|tgz|gz|bmp|psd|ai|heic|dmg|exe|dll)$'
  local max_bytes=$((5 * 1024 * 1024))
  local -a offenders=()
  local -a oversize=()

  while IFS= read -r -d '' file; do
    [[ -f "$file" ]] || continue
    if [[ "$file" =~ ${blocked_regex} ]]; then
      offenders+=("$file")
    fi
    local size
    size=$(file_size "$file")
    if (( size > max_bytes )); then
      oversize+=("$file ($size bytes)")
    fi
  done < <(collect_changed_files)

  if (( ${#offenders[@]} > 0 )); then
    header "blocked" "Binary assets detected"
    printf 'The following files match blocked binary extensions. Please remove them or convert to source artifacts:\n' >&2
    for file in "${offenders[@]}"; do
      printf '  - %s\n' "$file" >&2
    done
    printf '\nSee docs/REGENERATE_ARTIFACTS.md for guidance on keeping large assets out of Git.\n' >&2
    return 1
  fi

  if (( ${#oversize[@]} > 0 )); then
    header "oversize" ">5MB artifacts detected"
    printf 'The following files exceed the 5MB limit:\n' >&2
    for file in "${oversize[@]}"; do
      printf '  - %s\n' "$file" >&2
    done
    printf '\nCompress or generate these files at build time instead of committing them.\n' >&2
    return 1
  fi

  log_info "No blocked binaries or oversize files detected"
}

check_trailing_whitespace() {
  header "format" "Scanning for whitespace issues"
  if ! git diff --check HEAD >/dev/null 2>&1; then
    git diff --check HEAD
    printf '\nFix trailing whitespace or tab/space mixups above.\n' >&2
    return 1
  fi
  log_info "No whitespace issues detected"
}

main() {
  local status=0

  if [[ "$MODE" == "fix" ]]; then
    sanitise_transients
  else
    header "sanitize" "Skipping artifact deletion (check mode)"
  fi

  if ! check_file_policies; then
    status=1
  fi

  if ! check_trailing_whitespace; then
    status=1
  fi

  if (( status == 0 )); then
    header "done" "Repository sanitized successfully"
  else
    header "done" "Sanitization failed"
  fi

  return "$status"
}

main "$@"
