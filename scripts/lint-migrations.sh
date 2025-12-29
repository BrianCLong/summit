#!/usr/bin/env bash
# Lints SQL migrations for unsafe patterns.
set -u
set -o pipefail

ROOT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
TARGET_DIR=${1:-"$ROOT_DIR"}
ALLOW_TAG="lint-migrations: allow-risky"

# Collect migration SQL files while skipping bulky vendor directories.
mapfile -t migration_files < <(find "$TARGET_DIR" \
  -path "$TARGET_DIR/node_modules" -prune -o \
  -path "$TARGET_DIR/.git" -prune -o \
  -path "$TARGET_DIR/vendor" -prune -o \
  -type f -name "*.sql" -path "*/migrations/*" -print | sort)

if [[ -z "${LINT_MIGRATIONS_FULL:-}" ]] && git -C "$ROOT_DIR" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  mapfile -t git_changed < <(cd "$ROOT_DIR" && {
    git diff --name-only --diff-filter=AM HEAD || true
    git diff --name-only --diff-filter=AM --cached || true
  })

  if [[ ${#git_changed[@]} -gt 0 ]]; then
    declare -A changed_set
    for path in "${git_changed[@]}"; do
      changed_set["$ROOT_DIR/$path"]=1
    done

    mapfile -t migration_files < <(for f in "${migration_files[@]}"; do
      [[ -n "${changed_set[$f]:-}" ]] && echo "$f"
    done)
  fi
fi

if [[ ${#migration_files[@]} -eq 0 ]]; then
  echo "No migration SQL files found under $TARGET_DIR (or no migration changes detected)."
  exit 0
fi

total_issues=0

echo "Linting ${#migration_files[@]} migration files for risky patterns..."

grep_allowlist() {
  grep -qi "$ALLOW_TAG" "$1"
}

print_hits() {
  local header=$1
  local hits=$2
  echo "  - $header"
  printf '%s\n' "$hits" | sed 's/^/      > /'
}

for file in "${migration_files[@]}"; do
  echo "\n• Checking $file"

  if grep_allowlist "$file"; then
    echo "  Skipped (allowlisted with $ALLOW_TAG)."
    continue
  fi

  drop_hits=$(grep -nPi '^\s*drop\s+(table|view|index|schema|type|function)\s+(?!if\s+exists)' "$file" || true)
  alter_hits=$(grep -nPi '^\s*alter\s+table(?!.*\bif\s+not\s+exists\b)(?!.*\bif\s+exists\b)(?!.*\bconcurrently\b)' "$file" || true)

  has_drop_or_alter=0
  [[ -n "$drop_hits" || -n "$alter_hits" ]] && has_drop_or_alter=1

  if [[ -n "$drop_hits" ]]; then
    ((total_issues++))
    print_hits "DROP without IF EXISTS detected. Add IF EXISTS or document with -- $ALLOW_TAG" "$drop_hits"
  fi

  if [[ -n "$alter_hits" ]]; then
    ((total_issues++))
    print_hits "Unbounded ALTER TABLE detected. Prefer IF EXISTS/IF NOT EXISTS, concurrent strategies, or staged rollouts." "$alter_hits"
  fi

  if [[ $has_drop_or_alter -eq 1 ]]; then
    has_transaction=$(grep -qiE '\bbegin\b|start\s+transaction' "$file" && grep -qiE '\bcommit\b' "$file" && echo true || echo false)
    if [[ $has_transaction == false ]]; then
      ((total_issues++))
      echo "  - Risk: DDL without explicit transaction wrapping. Add BEGIN/COMMIT or annotate with -- $ALLOW_TAG"
    fi
  fi

done

if [[ $total_issues -gt 0 ]]; then
  echo "\nMigration lint failed: $total_issues issue(s) found."
  echo "To bypass intentionally risky migrations, add a comment containing '$ALLOW_TAG' to the file with rationale."
  exit 1
fi

echo "\nMigration lint passed: no risky patterns detected."
