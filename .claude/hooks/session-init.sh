#!/bin/bash
# Summit SessionStart hook — ANTIGRAVITY Day Captain context injection
#
# Fires on every new session. Emits context that Claude sees at the top
# of the conversation, orienting every session toward the ANTIGRAVITY
# workflow without requiring the user to manually invoke /antigravity.
#
# To disable: remove the SessionStart entry from .claude/settings.json

set -euo pipefail

# Read hook input from stdin (contains session_id, source, model, etc.)
INPUT=$(cat)
SOURCE=$(echo "$INPUT" | jq -r '.source // "startup"' 2>/dev/null || echo "startup")

# Only inject on fresh startup (not resume/clear/compact — those retain context)
if [[ "$SOURCE" != "startup" ]]; then
  exit 0
fi

cat <<'CONTEXT'
ANTIGRAVITY Day Captain active. Workflow: Orientation → Plan → Apply → Verify → Evidence → PR.

Key references:
- /antigravity — full master prompt (invoke for detailed workflow)
- .claude/README.md — Golden Path contract
- .prbodies/claude-evidence.md — PR body template (fill every section)
- CLAUDE.md — S-AOS operating standard

Non-negotiables: atomic PRs, evidence-first, deterministic, deny-by-default.
Golden path: make bootstrap → make up → make smoke → make ga.
CONTEXT
