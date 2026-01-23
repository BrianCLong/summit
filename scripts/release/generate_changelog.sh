#!/usr/bin/env bash
# generate_changelog.sh
#
# Generates a changelog from commits between two tags or refs.
# Supports conventional commits, PR integration, and multiple output formats.
#
# Usage:
#   ./scripts/release/generate_changelog.sh [OPTIONS]
#
# Options:
#   --from <ref>       Start ref (tag or commit, default: previous tag)
#   --to <ref>         End ref (tag or commit, default: HEAD)
#   --policy <path>    Path to policy file
#   --out <path>       Output file path
#   --format <type>    Output format: markdown, json (default: markdown)
#   --prepend          Prepend to existing CHANGELOG.md
#   --dry-run          Generate without writing files
#   --help             Show this help message
#
# See docs/ci/CHANGELOG_GENERATOR.md for full documentation.

set -euo pipefail

# Default values
FROM_REF=""
TO_REF="HEAD"
POLICY_FILE="docs/ci/CHANGELOG_POLICY.yml"
OUTPUT_FILE=""
OUTPUT_FORMAT="markdown"
PREPEND=false
DRY_RUN=false
STATE_FILE="docs/releases/_state/changelog_state.json"

# Repository info
REPO="${GITHUB_REPOSITORY:-$(git remote get-url origin 2>/dev/null | sed 's/.*github.com[:/]\(.*\)\.git/\1/' || echo 'unknown/repo')}"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --from)
      FROM_REF="$2"
      shift 2
      ;;
    --to)
      TO_REF="$2"
      shift 2
      ;;
    --policy)
      POLICY_FILE="$2"
      shift 2
      ;;
    --out)
      OUTPUT_FILE="$2"
      shift 2
      ;;
    --format)
      OUTPUT_FORMAT="$2"
      shift 2
      ;;
    --prepend)
      PREPEND=true
      shift
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --help)
      head -25 "$0" | tail -20
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      exit 1
      ;;
  esac
done

# Get previous tag if FROM_REF not specified
get_previous_tag() {
  local current="$1"
  git describe --tags --abbrev=0 "$current^" 2>/dev/null || echo ""
}

# Get latest tag
get_latest_tag() {
  git describe --tags --abbrev=0 2>/dev/null || echo ""
}

# Categorize a commit message
categorize_commit() {
  local message="$1"

  # Check for breaking change
  if echo "$message" | grep -qE "^.*!:|BREAKING CHANGE"; then
    echo "Breaking Changes"
    return
  fi

  # Check standard categories
  if echo "$message" | grep -qiE "^feat|^feature"; then
    echo "Features"
  elif echo "$message" | grep -qiE "^fix|^bugfix"; then
    echo "Bug Fixes"
  elif echo "$message" | grep -qiE "^security|^sec"; then
    echo "Security"
  elif echo "$message" | grep -qiE "^perf|^performance"; then
    echo "Performance"
  elif echo "$message" | grep -qiE "^docs|^doc"; then
    echo "Documentation"
  elif echo "$message" | grep -qiE "^refactor|^refact"; then
    echo "Refactoring"
  elif echo "$message" | grep -qiE "^test|^tests"; then
    echo "Tests"
  elif echo "$message" | grep -qiE "^build|^ci|^chore\(ci\)|^chore\(build\)"; then
    echo "Build & CI"
  elif echo "$message" | grep -qiE "^deps|^chore\(deps\)|^bump"; then
    echo "Dependencies"
  else
    echo "Other"
  fi
}

# Check if commit should be excluded
should_exclude() {
  local message="$1"
  local author="$2"

  # Exclude patterns
  if echo "$message" | grep -qE "^chore\(release\):|^Merge branch|^Merge pull request|\[skip ci\]|\[skip changelog\]|^chore\(release-ops\):|^WIP:|^wip:"; then
    return 0
  fi

  # Exclude bot authors
  if echo "$author" | grep -qE "dependabot\[bot\]|github-actions\[bot\]"; then
    return 0
  fi

  return 1
}

# Get emoji for category
get_category_emoji() {
  local category="$1"
  case "$category" in
    "Breaking Changes") echo "💥" ;;
    "Features") echo "✨" ;;
    "Bug Fixes") echo "🐛" ;;
    "Security") echo "🔒" ;;
    "Performance") echo "⚡" ;;
    "Documentation") echo "📚" ;;
    "Refactoring") echo "♻️" ;;
    "Tests") echo "🧪" ;;
    "Build & CI") echo "🔧" ;;
    "Dependencies") echo "📦" ;;
    *) echo "📝" ;;
  esac
}

# Get category priority
get_category_priority() {
  local category="$1"
  case "$category" in
    "Breaking Changes") echo "1" ;;
    "Features") echo "2" ;;
    "Bug Fixes") echo "3" ;;
    "Security") echo "4" ;;
    "Performance") echo "5" ;;
    "Documentation") echo "6" ;;
    "Refactoring") echo "7" ;;
    "Tests") echo "8" ;;
    "Build & CI") echo "9" ;;
    "Dependencies") echo "10" ;;
    *) echo "99" ;;
  esac
}

# Clean commit message (remove conventional commit prefix scope)
clean_message() {
  local message="$1"
  # Remove prefix like "feat(scope):" or "fix!:"
  echo "$message" | sed -E 's/^[a-z]+(\([^)]+\))?!?:\s*//' | sed 's/^./\U&/'
}

# Extract PR number from commit
extract_pr_number() {
  local message="$1"
  echo "$message" | grep -oE '\(#[0-9]+\)' | grep -oE '[0-9]+' | head -1 || echo ""
}

# Main generation logic
main() {
  echo "Generating changelog..." >&2

  # Determine refs
  if [[ -z "$FROM_REF" ]]; then
    if [[ "$TO_REF" == "HEAD" ]]; then
      FROM_REF=$(get_latest_tag)
    else
      FROM_REF=$(get_previous_tag "$TO_REF")
    fi
  fi

  if [[ -z "$FROM_REF" ]]; then
    echo "Warning: No previous tag found, using initial commit" >&2
    FROM_REF=$(git rev-list --max-parents=0 HEAD | head -1)
  fi

  echo "  From: $FROM_REF" >&2
  echo "  To: $TO_REF" >&2

  # Get version name
  local version_name="$TO_REF"
  if [[ "$TO_REF" == "HEAD" ]]; then
    version_name="Unreleased"
  fi

  # Get commits
  local commits
  commits=$(git log "$FROM_REF..$TO_REF" --pretty=format:"%H|%s|%an|%ae|%ad" --date=short 2>/dev/null || echo "")

  if [[ -z "$commits" ]]; then
    echo "No commits found between $FROM_REF and $TO_REF" >&2
    return 0
  fi

  # Count commits
  local commit_count
  commit_count=$(echo "$commits" | wc -l | tr -d ' ')
  echo "  Found $commit_count commits" >&2

  # Categorize commits
  declare -A categories
  declare -A category_commits
  local contributors=""
  local included_count=0

  while IFS='|' read -r hash message author email date; do
    if [[ -z "$hash" ]]; then
      continue
    fi

    # Check exclusion
    if should_exclude "$message" "$author"; then
      continue
    fi

    included_count=$((included_count + 1))

    # Categorize
    local category
    category=$(categorize_commit "$message")
    categories["$category"]=1

    # Clean message
    local clean_msg
    clean_msg=$(clean_message "$message")

    # Extract PR number
    local pr_num
    pr_num=$(extract_pr_number "$message")

    # Build entry
    local entry="$clean_msg"
    if [[ -n "$pr_num" ]]; then
      entry="$entry ([#$pr_num](https://github.com/$REPO/pull/$pr_num))"
    fi
    entry="$entry - @$author"

    # Add to category
    if [[ -z "${category_commits[$category]:-}" ]]; then
      category_commits["$category"]="$entry"
    else
      category_commits["$category"]="${category_commits[$category]}"$'\n'"$entry"
    fi

    # Track contributors
    if [[ ! "$contributors" =~ "$author" ]]; then
      if [[ -n "$contributors" ]]; then
        contributors="$contributors, "
      fi
      contributors="${contributors}@$author"
    fi

  done <<< "$commits"

  echo "  Included $included_count commits (after filtering)" >&2

  # Generate output
  local now_iso
  now_iso=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  local now_date
  now_date=$(date -u +"%Y-%m-%d")

  local output=""

  if [[ "$OUTPUT_FORMAT" == "markdown" ]]; then
    # Markdown output
    output+="## [$version_name] - $now_date"$'\n'
    output+=""$'\n'

    # Sort categories by priority and output
    local sorted_categories
    sorted_categories=$(for cat in "${!categories[@]}"; do
      echo "$(get_category_priority "$cat")|$cat"
    done | sort -t'|' -k1 -n | cut -d'|' -f2)

    while read -r category; do
      if [[ -n "$category" && -n "${category_commits[$category]:-}" ]]; then
        local emoji
        emoji=$(get_category_emoji "$category")
        output+="### $emoji $category"$'\n'
        output+=""$'\n'

        while IFS= read -r entry; do
          output+="- $entry"$'\n'
        done <<< "${category_commits[$category]}"

        output+=""$'\n'
      fi
    done <<< "$sorted_categories"

    # Contributors
    if [[ -n "$contributors" ]]; then
      output+="### 👥 Contributors"$'\n'
      output+=""$'\n'
      output+="$contributors"$'\n'
      output+=""$'\n'
    fi

    # Comparison link
    output+="**Full Changelog**: https://github.com/$REPO/compare/$FROM_REF...$TO_REF"$'\n'

  elif [[ "$OUTPUT_FORMAT" == "json" ]]; then
    # JSON output
    local json_categories="[]"
    for category in "${!category_commits[@]}"; do
      local entries="[]"
      while IFS= read -r entry; do
        entries=$(echo "$entries" | jq --arg e "$entry" '. += [$e]')
      done <<< "${category_commits[$category]}"

      json_categories=$(echo "$json_categories" | jq \
        --arg name "$category" \
        --argjson entries "$entries" \
        '. += [{name: $name, entries: $entries}]')
    done

    output=$(jq -n \
      --arg version "$version_name" \
      --arg date "$now_date" \
      --arg from "$FROM_REF" \
      --arg to "$TO_REF" \
      --argjson categories "$json_categories" \
      --arg contributors "$contributors" \
      '{
        version: $version,
        date: $date,
        from_ref: $from,
        to_ref: $to,
        categories: $categories,
        contributors: $contributors
      }')
  fi

  # Output
  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[DRY RUN] Would generate:" >&2
    echo "$output"
    return 0
  fi

  # Determine output file
  if [[ -z "$OUTPUT_FILE" ]]; then
    if [[ "$PREPEND" == "true" ]]; then
      OUTPUT_FILE="CHANGELOG.md"
    else
      mkdir -p "artifacts/release-train"
      OUTPUT_FILE="artifacts/release-train/release-notes.md"
    fi
  fi

  mkdir -p "$(dirname "$OUTPUT_FILE")"

  if [[ "$PREPEND" == "true" && -f "$OUTPUT_FILE" ]]; then
    # Prepend to existing file
    local existing
    existing=$(cat "$OUTPUT_FILE")
    {
      echo "# Changelog"
      echo ""
      echo "$output"
      echo ""
      # Remove old header if present
      echo "$existing" | tail -n +3
    } > "$OUTPUT_FILE"
  else
    echo "$output" > "$OUTPUT_FILE"
  fi

  echo "Generated changelog: $OUTPUT_FILE" >&2

  # Update state
  if [[ -f "$STATE_FILE" || "$DRY_RUN" != "true" ]]; then
    mkdir -p "$(dirname "$STATE_FILE")"
    local state
    state=$(cat "$STATE_FILE" 2>/dev/null || echo '{"version":"1.0.0","generation_history":[]}')

    state=$(echo "$state" | jq \
      --arg time "$now_iso" \
      --arg from "$FROM_REF" \
      --arg to "$TO_REF" \
      --arg file "$OUTPUT_FILE" \
      '.last_generated = $time |
       .last_from_tag = $from |
       .last_to_tag = $to |
       .generation_history = ([{timestamp: $time, from: $from, to: $to, output: $file}] + .generation_history[:49])')

    echo "$state" > "$STATE_FILE"
  fi

  echo "" >&2
  echo "Changelog generation complete!" >&2
  echo "  Version: $version_name" >&2
  echo "  Commits: $included_count" >&2
  echo "  Categories: ${#categories[@]}" >&2
}

main "$@"
