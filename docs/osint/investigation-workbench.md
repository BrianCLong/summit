# OSINT Investigation Workbench (Browser-First, Deterministic Replay)

## Summary

Summit adopts a **browser-first investigation workbench** that preserves provenance and
replayability. The workbench is defined as a deterministic, content-addressed case replay bundle
plus a lightweight workspace model. The browser UI is optional; the CLI + replay bundle are the
canonical control surface today, enabling collaborative review without sacrificing auditability.

## Investigation Workspace Specification

A workspace is the union of:

- **Entities:** stable IDs for people, orgs, locations, assets, accounts.
- **Claims:** assertions tied to evidence and confidence.
- **Evidence:** immutable references to source artifacts (URLs, fixtures, attachments).
- **Transforms:** deterministic steps producing new entities/claims (enrichment, dedupe, link).
- **Replay:** a content-addressed event log (JSONL) plus a manifest hash.

### Minimal Data Model

- `entity`: `id`, `type`, `label`, `aliases`, `source_refs`.
- `claim`: `id`, `subject`, `predicate`, `object`, `confidence`, `evidence_ids`.
- `evidence`: `id`, `uri`, `hash`, `source`, `license`, `captured_at`.
- `transform`: `id`, `name`, `version`, `inputs`, `outputs`, `trace_id`.
- `replay`: `case_id`, `schema_version`, `content_hash`, `jsonl_path`.

## Deterministic Case Replay Format

Summit’s case replay is a **JSONL event stream** that is **content-addressed** and stable:

- Each event is hashed to produce `event_id` (SHA-256 of the normalized payload).
- The bundle manifest stores `content_hash` for the entire JSONL file.
- Non-deterministic metadata (like runtime retrieval timestamps) is stored separately.

**Schema:** see `packages/osint-replay/schema/case-replay.schema.json`. A lightweight renderer
(`renderReplaySummary`) produces deterministic summaries for review and audit.

## Example End-to-End Investigation Workflow

1. **Seed**: Ingest fixture-backed social posts and enrichment responses.
2. **Transforms**:
   - Normalize entities and evidence URLs.
   - Dedupe by external IDs.
   - Attach provenance metadata + trace IDs.
3. **Graph**: Emit replay events that can be rendered into entity/relationship views.
4. **Report**: Produce a case replay bundle that reviewers can filter by time, platform, entity,
   and language.

## Browser-First Operations (CLI-Driven Today)

- The replay bundle is the canonical artifact for collaboration.
- Web UI can render the JSONL, but the CLI is authoritative.
- This guarantees deterministic replay and auditability even without a running UI.

## Governance Alignment

- Every transform is traceable with `trace_id` and provenance metadata.
- Case replay bundles map directly into the Provenance Ledger for chain-of-custody.
- Determinism is enforced via CI gates to prevent timestamp leakage.
