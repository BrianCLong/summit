#!/bin/bash

# Rigorous shell checks
set -euo pipefail

# Configuration
FROZEN_PATHS_CONFIG="config/ga-frozen-paths.txt"
BASELINE_DOC="docs/releases/MVP-4_GA_BASELINE.md"
OVERRIDE_FILE="docs/releases/GA_DRIFT_OVERRIDE.md"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# --- Helper Functions ---

# Extracts the baseline commit hash from the baseline document.
# Exits with an error if the hash is not found.
get_baseline_commit() {
    local commit_hash
    commit_hash=$(grep '^GA_BASELINE_COMMIT:' "$BASELINE_DOC" | awk '{print $2}')
    if [[ -z "$commit_hash" ]]; then
        echo -e "${RED}Error: GA_BASELINE_COMMIT not found in $BASELINE_DOC.${NC}" >&2
        exit 1
    fi
    echo "$commit_hash"
}

# Checks if a file path is listed in the override file.
# Arguments:
#   $1: The file path to check.
# Returns:
#   0 if the file is listed and allowed to drift, 1 otherwise.
is_override_allowed() {
    local file_path="$1"
    # Use grep with -x to match the whole line and -q for quiet mode.
    grep -qx "$file_path" "$OVERRIDE_FILE"
}

# --- Main Logic ---

main() {
    echo "--- GA Artifact Drift Sentinel ---"

    # 1. Get the baseline commit hash
    local baseline_commit
    baseline_commit=$(get_baseline_commit)
    echo "Baseline commit: $baseline_commit"

    # 2. Check for drifted files
    local drifted_files=()
    while IFS= read -r file_path; do
        # Skip empty lines or comments in the config file
        [[ -z "$file_path" || "$file_path" =~ ^# ]] && continue

        if ! git diff --exit-code --quiet "$baseline_commit" -- "$file_path"; then
            drifted_files+=("$file_path")
        fi
    done < "$FROZEN_PATHS_CONFIG"

    # 3. Handle drift and overrides
    if [[ ${#drifted_files[@]} -eq 0 ]]; then
        echo -e "${GREEN}Success: No drift detected in GA-frozen artifacts.${NC}"
        exit 0
    fi

    echo -e "\n${YELLOW}Warning: Drift detected in the following GA-frozen artifacts:${NC}"
    for file in "${drifted_files[@]}"; do
        echo "- $file"
    done

    # 4. Check for a valid override
    if [[ ! -f "$OVERRIDE_FILE" ]]; then
        echo -e "\n${RED}Error: Drift detected, and no override file found at $OVERRIDE_FILE.${NC}"
        exit 1
    fi

    echo -e "\nOverride file found. Validating..."
    local unapproved_drift=()
    for file in "${drifted_files[@]}"; do
        if ! is_override_allowed "$file"; then
            unapproved_drift+=("$file")
        fi
    done

    # 5. Final exit status
    if [[ ${#unapproved_drift[@]} -gt 0 ]]; then
        echo -e "\n${RED}Error: The following drifted files are NOT approved in the override file:${NC}"
        for file in "${unapproved_drift[@]}"; do
            echo "- $file"
        done
        exit 1
    fi

    echo -e "\n${GREEN}Success: All drifted files are approved in the override file.${NC}"
    exit 0
}

# Execute the main function
main
