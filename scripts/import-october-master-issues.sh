#!/usr/bin/env bash
set -euo pipefail

REPO="BrianCLong/summit"
CSV="october2025/october_master_issues.csv"
PROJECT_ID="8"
OWNER="BrianCLong"

echo "📋 Importing October Master Plan issues from CSV..."

# Skip header, read each line
tail -n +2 "$CSV" | while IFS=, read -r title body labels milestone; do
  # Remove quotes and clean up
  title=$(echo "$title" | sed 's/^"//;s/"$//')
  body=$(echo "$body" | sed 's/^"//;s/"$//')
  labels=$(echo "$labels" | sed 's/^"//;s/"$//')

  echo ""
  echo "Creating: $title"

  # Create issue
  ISSUE_URL=$(gh issue create \
    --repo "$REPO" \
    --title "$title" \
    --body "$body" \
    --label "$labels" 2>&1 | grep -o 'https://.*')

  if [ -n "$ISSUE_URL" ]; then
    echo "  ✅ Created: $ISSUE_URL"

    # Add to Project #8
    gh project item-add "$PROJECT_ID" --owner "$OWNER" --url "$ISSUE_URL" 2>/dev/null || echo "  ⚠️  Could not add to project"
  else
    echo "  ❌ Failed to create issue"
  fi

  sleep 1  # Rate limit protection
done

echo ""
echo "✅ Import complete!"
