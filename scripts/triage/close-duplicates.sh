#!/bin/bash
set -e

# Check for gh CLI
if ! command -v gh &> /dev/null; then
    echo "Error: 'gh' CLI is not installed."
    exit 1
fi

# Usage: ./close-duplicates.sh --duplicate <num> --canonical <num>

DUPLICATE=""
CANONICAL=""

while [[ $# -gt 0 ]]; do
  key="$1"
  case $key in
    --duplicate)
      DUPLICATE="$2"
      shift
      shift
      ;;
    --canonical)
      CANONICAL="$2"
      shift
      shift
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

if [[ -z "$DUPLICATE" ]] || [[ -z "$CANONICAL" ]]; then
  echo "Error: Both --duplicate and --canonical are required"
  exit 1
fi

# Remove leading '#' if present
DUPLICATE="${DUPLICATE/\#/}"
CANONICAL="${CANONICAL/\#/}"

echo "Closing #$DUPLICATE as duplicate of #$CANONICAL..."

gh issue close "$DUPLICATE" --comment "Closing as duplicate of #$CANONICAL." --reason "not planned"

echo "Done."
