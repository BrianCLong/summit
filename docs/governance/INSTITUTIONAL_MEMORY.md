Owner: Governance
Last-Reviewed: 2026-01-14
Evidence-IDs: none
Status: active

# Institutional Memory & Knowledge Preservation

**Mission**: Ensure absorbed knowledge **compounds**, and nothing is lost during convergence.

## The Knowledge Graph

We do not just absorb code; we absorb _context_.
All decisions, rationales, and histories must be preserved and integrated into Summit's Institutional Memory.

### 1. Documentation Migration

- **Centralization**: Move all docs to `docs/` repository.
- **Indexing**: Index content for the AI Copilot.
- **Redirection**: Redirect old wikis/sites to the new central location.

### 2. Decision Logs (ADR)

- **Harvest**: Extract architectural decisions from emails, chats, and wikis.
- **Format**: Convert to Summit's ADR format (`docs/ADR/`).
- **Tagging**: Tag with `origin: <system-name>` for lineage.

### 3. Attribution & Lineage

- **Code Credit**: Preserve git history where possible, or add `Co-authored-by` trailers.
- **Concept Credit**: Acknowledge the origin of absorbed ideas in the documentation.

## Knowledge Integration Workflow

1.  **Inventory**: Scan the source system for docs, diagrams, and decisions.
2.  **Triage**:
    - _Keep_: Valuable, current info. -> **Migrate**.
    - _Archive_: Historical context. -> **Store in `docs/archive/`**.
    - _Discard_: Obsolete or duplicate. -> **Delete**.
3.  **Synthesis**: Update Summit's Core Concepts (`docs/concepts/`) with new learnings.
4.  **Distribution**: Broadcast new capabilities to the broader team.

## "The Library"

The ultimate goal is a queryable "Library of Babel" for the organization—a single source where an AI agent can answer: "Why did we choose X over Y in 2023?"
