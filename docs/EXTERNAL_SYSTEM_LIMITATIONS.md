# External System Access Limitations

This repository runs in an isolated environment. CI and local builds cannot reach external
services (e.g., Linear, Jira, Notion, NotebookLM, GitHub issue APIs), and no credentials are
provisioned. All backlog orchestration must therefore be performed **offline** using manual
exports that are normalized into in-repo summaries.

## Operating constraints

- **No outbound network calls** from CI or local builds.
- **No credentials** or tokens stored in-repo.
- **No raw exports** committed to Git history.
- **Regulatory/compliance logic** must be expressed as policy-as-code and logged when decisions
  require compliance or ethics review.

## Offline orchestration workflow (end-to-end)

1. **Export upstream data**
   - Generate CSV/JSON exports from Linear/Jira/Notion using their native export tools.
   - Store raw exports in `artifacts/exports/<source>/<date>.json` (ensure `.gitignore` coverage).
   - Capture export metadata: source, date, exporter identity, hash, and row count.

2. **Normalize to canonical schema**
   - Convert exports into a single canonical backlog format (see
     `docs/roadmap/OFFLINE_BACKLOG_MIGRATION.md`).
   - Record schema version and transformation tool versions.

3. **Sanitize & review**
   - Strip PII, secrets, private URLs, or internal-only content.
   - Redact or hash user identifiers unless explicitly required.
   - Log any compliance or ethics decisions in `docs/roadmap/DECISION_LOG.md`.

4. **Derive analytics artifacts**
   - Generate summaries, dependency graphs, and prioritization tables under
     `docs/roadmap/derived/` or `artifacts/derived/`.
   - Include provenance headers that cite export source and date.

5. **Commit derived state only**
   - Commit **summaries and derived views**, not raw exports.
   - Update `docs/roadmap/STATUS.json` with the latest snapshot date and revision note.

6. **Deterministic, repeatable runs**
   - Pin tool versions for import scripts.
   - Ensure the pipeline is deterministic given the same input export.
   - Provide sample, sanitized inputs under `test-data/` for CI verification.

## Guardrails

- Do not attempt to authenticate or reach upstream services from CI.
- Do not cache tokens, cookies, or raw exports in the repository.
- When referencing upstream items, cite stable URLs plus export date.
- Escalate ambiguous compliance requirements to governance; do not workaround.

## Recommended artifacts

- Canonical schema documentation and mappings: `docs/roadmap/OFFLINE_BACKLOG_MIGRATION.md`.
- Operational checklist and folder layout: `docs/roadmap/README.md`.
- Decision/ethics log: `docs/roadmap/DECISION_LOG.md`.
- Provenance log template: `docs/roadmap/PROVENANCE_LOG.md`.

## Minimum evidence for backlog snapshots

Each snapshot should include:

- Export metadata (source, date, hash, row counts).
- Canonical schema version.
- Summary totals and change deltas vs. previous snapshot.
- Dependency map and critical path summary.
- Compliance/ethics decision log entries (if any).
