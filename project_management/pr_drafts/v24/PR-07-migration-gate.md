# PR 7 — Migration Gate (DB & Backfill)

Title: feat(db): add migration gate with dry‑run & manual approval

Files:

- .maestro/pipeline.yaml (already modified in PR 4)
- scripts/migration_gate.sh (added in PR 4)
- docs/runbooks/migration-gate.md (new)

Content: explain manual approval with reason‑for‑access; link to audit trail.

Acceptance: PRs touching `migrations/**` show gate evidence in CI; prod requires approval.

---

Shared: See SHARED-SECTIONS.md for risk, evidence, and operator commands.
