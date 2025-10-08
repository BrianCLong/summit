#!/usr/bin/env bash
set -euo pipefail

# Protect release tags using GitHub repository rulesets
# Usage: ./scripts/ruleset_protect_tags.sh [owner/repo]

REPO="${1:-$(gh repo view --json nameWithOwner --jq .nameWithOwner)}"

echo "🔒 Protecting release tags for $REPO..."

# Create or update ruleset to protect version tags
gh api -X POST "repos/$REPO/rulesets" --input - <<'EOF' || echo "Ruleset may already exist"
{
  "name": "Protect Release Tags",
  "target": "tag",
  "enforcement": "active",
  "bypass_actors": [],
  "conditions": {
    "ref_name": {
      "include": ["refs/tags/v*", "refs/tags/latest"],
      "exclude": []
    }
  },
  "rules": [
    {"type": "deletion"},
    {"type": "non_fast_forward"}
  ]
}
EOF

echo "✅ Tag protection ruleset applied"
