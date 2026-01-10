# Offline Backlog Migration & Orchestration

This runbook defines the **offline** (export → normalize → publish) workflow for migrating
roadmap data into this repo without direct access to external PM systems.

## 1) Canonical backlog schema (v1)

> Use this schema as the single source of truth for normalized backlog records derived from
> Linear/Jira/Notion exports. The schema is intentionally platform-agnostic.

**Required fields**

- `id`: canonical unique ID (string, stable across snapshots)
- `source`: `{"system": "linear|jira|notion|github", "native_id": "..."}`
- `title`: short, actionable title
- `description`: sanitized Markdown
- `state`: one of `backlog|planned|in_progress|blocked|done|canceled`
- `priority`: `P0|P1|P2|P3|P4`
- `type`: `initiative|epic|feature|task|bug`
- `owner`: `{ "name": "...", "team": "..." }` (or `unassigned`)
- `labels`: string[]
- `relationships`:
  - `parent_ids`: string[]
  - `child_ids`: string[]
  - `blocks`: string[]
  - `blocked_by`: string[]
- `timestamps`: `{ "created_at": "...", "updated_at": "...", "due_at": "..." }`
- `links`: `{ "canonical_url": "...", "references": ["..."] }`
- `provenance`: `{ "export_date": "...", "export_hash": "...", "schema_version": "v1" }`

**Optional fields**

- `estimate`: number (story points or hours)
- `cycle`: sprint/cycle label
- `security`: `{ "classification": "public|internal|restricted", "review_required": boolean }`
- `compliance`: `{ "policy_refs": ["..."] }`

## 2) Mapping guidance (by platform)

| Canonical Field       | Linear               | Jira                   | Notion              |
| --------------------- | -------------------- | ---------------------- | ------------------- |
| `id`                  | `id` or `identifier` | `key`                  | `page_id`           |
| `state`               | `state.name`         | `status.name`          | `status` property   |
| `priority`            | `priorityLabel`      | `priority.name`        | `priority` property |
| `owner`               | `assignee.name`      | `assignee.displayName` | `owner` property    |
| `links.canonical_url` | `url`                | issue URL              | page URL            |

> For any unmapped fields, store `null` and capture a note in the snapshot summary.

## 3) Workflow phases

1. **Inventory**
   - Validate export files, record hashes, count items, and detect duplicates.

2. **Normalize**
   - Map platform-specific fields to canonical schema.
   - Enforce `state`, `priority`, and `type` enums.

3. **Enrich**
   - Attach labels and domain taxonomy (Infrastructure, Security, AI/ML, UI/UX, etc.).
   - Resolve parent/child and dependency relations.

4. **Schedule**
   - Compute critical path and sequencing constraints.
   - Produce cycle assignments and target completion windows.

5. **Publish**
   - Commit derived summaries under `docs/roadmap/derived/`.
   - Update `docs/roadmap/STATUS.json` with snapshot metadata.

## 4) Snapshot deliverables

Each snapshot should include the following artifacts:

- `docs/roadmap/derived/backlog-summary.md`
  - Counts by state, priority, and type
  - Top blockers and critical path summary
- `docs/roadmap/derived/dependency-map.md`
  - Cross-team dependency matrix
- `docs/roadmap/derived/initiative-rollup.md`
  - Initiative-level scope, owners, and progress
- `docs/roadmap/derived/import-provenance.json`
  - Export metadata and checksums

## 5) Compliance & decision logging

- Record any compliance/ethics decisions in `docs/roadmap/DECISION_LOG.md`.
- Any regulatory logic must be expressed as policy-as-code and referenced in the summary.

## 6) Quality gates

- No raw exports committed.
- All derived artifacts include provenance headers.
- All blockers and critical-path items annotated with owner and next action.
- Decision log updated when compliance review is required.
