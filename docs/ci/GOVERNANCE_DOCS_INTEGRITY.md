# Governance Docs Integrity (v2)

**Status:** Active (non-required while stabilizing)
**Owner:** Platform Engineering

## Purpose

This gate guarantees governance documentation is indexed, drift-free, and aligned to a
canonical Evidence Map. It enforces a single source of truth (`governance/INDEX.yml`) and
verifies that Evidence IDs referenced by governance docs are backed by the evidence map.

## CI Jobs (Stable Names)

- `Governance / Docs Integrity`
- `Governance / Docs Integrity (Tests)`
- `Governance / Evidence ID Consistency`

Promotion to required is **Deferred pending three consecutive green runs on `main`** and
recorded in branch protection policy updates.

## Source of Truth

- `governance/INDEX.yml` – canonical index with required metadata.
- `governance/EVIDENCE_MAP.json` – canonical Evidence ID map for governance docs.

## Local Commands

```bash
pnpm ci:docs-governance
pnpm ci:docs-governance:fix
pnpm ci:evidence-id-consistency
node --test scripts/ci/__tests__/governance_docs_verifier.test.mjs
```

## Artifacts

Artifacts are emitted for auditability:

- `artifacts/governance/docs-integrity/`
- `artifacts/governance/evidence-id-consistency/`

Each folder contains `report.json`, `summary.md`, and `stamp.json`.

## Remediation Flow

1. Run `pnpm ci:docs-governance` to identify drift or missing metadata.
2. If needed, run `pnpm ci:docs-governance:fix` to sync `governance/INDEX.yml`.
3. Align evidence IDs by updating `governance/EVIDENCE_MAP.json`.
4. Re-run the checks until the reports show **PASS**.

## Change Control

- Do not mark the jobs as required until stability is proven.
- All claims must remain backed by entries in the evidence map.
- Updates to governance docs must include index alignment in the same PR.
