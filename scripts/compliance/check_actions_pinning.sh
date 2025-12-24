#!/bin/bash

# Define directories to check
WORKFLOWS_DIR=".github/workflows"

# Exit code
EXIT_CODE=0

echo "Checking GitHub Actions for pinned SHAs..."

# Iterate over all YAML files in workflows directory
for file in "$WORKFLOWS_DIR"/*.yml "$WORKFLOWS_DIR"/*.yaml; do
    [ -e "$file" ] || continue

    # Read file line by line
    line_num=0
    while IFS= read -r line; do
        ((line_num++))

        # Remove leading whitespace
        clean_line=$(echo "$line" | sed 's/^[ \t]*//')

        # Check if line starts with "uses:" and not a comment
        if [[ "$clean_line" == uses:* ]] && [[ ! "$clean_line" == \#* ]]; then
            # Extract the action reference
            action=$(echo "$clean_line" | sed 's/uses: //')

            # Ignore local actions
            if [[ "$action" == ./* ]]; then
                continue
            fi

            # Ignore docker://
            if [[ "$action" == docker://* ]]; then
                continue
            fi

            # Check if it has a SHA (40 hex chars)
            # Regex: @[0-9a-f]{40}
            if ! [[ "$action" =~ @[0-9a-fA-F]{40} ]]; then
                echo "❌ Unpinned Action in $file:$line_num -> $action"
                EXIT_CODE=1
            fi
        fi
    done < "$file"
done

if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ All GitHub Actions are pinned to SHAs."
else
    echo "⚠️  Found unpinned GitHub Actions. Please pin to a specific commit SHA."
    exit 1
fi
