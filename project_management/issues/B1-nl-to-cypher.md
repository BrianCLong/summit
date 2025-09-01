# B1: NL→Cypher with Preview & Sandbox

Track: B (Copilot/RAG)
Branch: feature/nl-to-cypher
Labels: track:B, area:copilot

Overview

- Prompt→Cypher generator with cost/row estimates and diff vs manual queries.
- Sandbox execution with rollback/undo; persisted queries.

Acceptance Criteria

- ≥95% syntactic validity on test prompts; preview-only by default.
- Sandbox restrictions enforced; persisted query IDs generated.
