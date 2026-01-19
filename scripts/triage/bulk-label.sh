#!/bin/bash
set -e

# Check for gh CLI
if ! command -v gh &> /dev/null; then
    echo "Error: 'gh' CLI is not installed."
    exit 1
fi

# Usage: ./bulk-label.sh --label <label_name> --issues <issue_number_1> <issue_number_2> ...

LABEL=""
ISSUES=()

while [[ $# -gt 0 ]]; do
  key="$1"
  case $key in
    --label)
      LABEL="$2"
      shift
      shift
      ;;
    --issues)
      shift
      # Collect all remaining arguments as issues
      ISSUES+=("$@")
      break
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

if [[ -z "$LABEL" ]]; then
  echo "Error: --label is required"
  exit 1
fi

if [[ ${#ISSUES[@]} -eq 0 ]]; then
  echo "Error: No issues provided"
  exit 1
fi

echo "Applying label '$LABEL' to issues: ${ISSUES[*]}"

for issue in "${ISSUES[@]}"; do
  # Remove leading '#' if present
  clean_issue="${issue/\#/}"
  echo "Processing #$clean_issue..."
  gh issue edit "$clean_issue" --add-label "$LABEL"
done

echo "Done."
