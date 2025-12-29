# Decision Products Blueprint

## Purpose
Summit must ship reusable decision products instead of single-use answers. Analysts, investigators, and executives need portable artifacts they can share, rerun, and evolve, driving stickiness and account expansion.

## Outcomes
- **Adoption & Stickiness:** Every investigative session yields a saved artifact that can be reopened, iterated, and shared across teams.
- **Expansion:** Artifacts become recurring touchpoints (renewals, upsells, cross-team rollouts) because they preserve evidence, rationale, and lineage.
- **Governance:** Each artifact carries an audit trail (who, what, when) and an evidence bundle with provenance hashes to meet compliance obligations.

## Core Artifacts (packaged outputs)
- **Briefs:** Executive-ready summaries with key findings, confidence, and next actions.
- **Link Charts:** Graph snapshots showing entities, relationships, and supporting evidence.
- **Timelines:** Sequenced events with time bounds, sources, and inferred causality.
- **Entity Dossiers:** Per-entity profiles aggregating attributes, behaviors, and source credibility.
- **Risk Scores:** Scoring cards with factors, weights, and justification snippets.
- **Contradiction Maps:** Detected conflicts between sources, hypotheses, or models with resolution guidance.
- **Watchlists:** Saved monitors with triggers, thresholds, and notification routes.

## One-Click Case File Assembly
- **Action:** "Create case file" button from any artifact view.
- **Contents:** Selected artifacts + evidence bundle (source docs, embeddings/feature vectors, hashes) + full audit log (originating user, prompts/queries, model versions, policy decisions).
- **Traceability:** Immutable provenance entries link every artifact element to its source (URI, timestamp, checksum, policy verdict).
- **Distribution:** Exportable as PDF/HTML plus JSON/NDJSON for machine use; signed manifest for integrity.

## Product/UX Requirements
- Artifact detail pages expose **Save as case file** and **Add to watchlist** actions.
- **Reopen & fork**: Users can clone artifacts, edit scopes/filters, and regenerate outputs while preserving lineage.
- **Collaboration hooks:** Commenting, assignments, shareable links with scoped permissions.
- **Retention controls:** Case files inherit workspace retention; evidence TTL enforced by policy engine.

## System Design Blueprint
- **Artifact Registry:** Service for storing metadata, versions, and signed manifests (schema: `artifact`, `artifact_version`, `evidence_reference`, `provenance_entry`).
- **Evidence Bundler:** Job that collects referenced sources, computes checksums (SHA-256), and packages them with C2PA or similar manifest for tamper evidence.
- **Audit Trail:** Append-only log capturing user identity, prompt/query text, model IDs, policy evaluations, and export/download events.
- **APIs:**
  - `POST /artifacts` to persist briefs, charts, timelines, dossiers, scores, contradictions, and watchlists.
  - `POST /case-files` to bundle selected artifact versions + evidence; returns signed manifest and download links.
  - `GET /case-files/{id}` with lineage graph (artifact versions, sources, policies).
- **Storage & Indexing:**
  - Object storage for bundles; Postgres for metadata; graph index for relationship views; search index for full-text and tags.
  - Versioned artifacts with semantic diffs to support comparisons and rollback.
- **Policy-as-Code:** OPA policies gate exports (redaction, classification, sharing) and log decisions; mandatory audit entries for overrides.
- **Observability:** Metrics for artifact creation rate, reopen/fork rate, case-file exports, and downstream sharing; traces on bundle assembly; alerts on manifest verification failures.

## Rollout Checklist
- Define schemas and migrations for `artifact` and `case_file` domain objects.
- Ship minimal viable artifacts: briefs, link charts, timelines, and dossiers with save + export.
- Add audit log hooks to creation, update, export, and share flows.
- Implement evidence bundling with signed manifest and verify on download.
- Instrument metrics and dashboards for artifact usage and reuse.
- Enable watchlists to auto-generate new briefs when triggers fire.
