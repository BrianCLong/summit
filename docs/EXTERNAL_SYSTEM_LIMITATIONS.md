# External System Access Limitations

This environment is fully isolated from third-party services (e.g., Linear, Jira, Notion, NotebookLM, GitHub issue APIs). No outbound network calls can be made from CI or local builds, and no credentials are available. All roadmap or backlog migrations must therefore rely on manual exports that are imported into the repository.

## Required workflow

1. **Export upstream data:** Generate CSV or JSON exports from Linear, Jira, and Notion using their native export tools. Store exports in `artifacts/exports/<source>/<date>.json` (added to `.gitignore`) for local processing.
2. **Normalize:** Use repository scripts (or add new ones) under `scripts/imports/` to convert exports into the canonical backlog schema used in `docs/roadmap/`. Avoid embedding secrets in scripts; prefer environment variables for local runs.
3. **Review & sanitize:** Strip PII, credentials, and internal-only links before committing derived artifacts. Keep raw exports out of Git history.
4. **Commit derived state:** Only commit normalized summaries (e.g., counts, dependency maps, prioritization tables) under `docs/roadmap/` or `artifacts/derived/`. Include provenance notes describing the export source and date.
5. **Re-runable pipelines:** Any transformation script must be deterministic given the same input export and pinned tool versions. Document commands in `docs/roadmap/README.md` and provide sample inputs under `test-data/` for CI verification.

## Guardrails

- Do not attempt to authenticate or reach upstream services from CI.
- Do not cache tokens, cookies, or exported raw data in the repository.
- When referencing upstream items, cite stable URLs and the export date rather than copying sensitive content.
- Prefer policy-as-code for any compliance requirements that emerge from imported work items.

## Recommendations

- Add schema validation for imported backlogs (e.g., JSON Schema in `schemas/backlog-import.schema.json`).
- Provide checksum verification for exports to detect drift between processing runs.
- Maintain a changelog entry when backlog snapshots are updated to keep auditability.
