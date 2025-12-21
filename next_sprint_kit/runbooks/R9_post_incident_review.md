# R9 Runbook — Post-Incident Review & Chaos Drill Closeout

## Purpose
Document learnings from chaos drills and incidents impacting preview, ledger, or cost guard; align with governance and provenance requirements.

## KPIs
- Postmortem published within 48 hours.
- Action items created with owners; ≥80% closed before next sprint planning.
- Verification results (KPIs, exports) attached to incident record.

## Steps
1. **Collect evidence:** Gather traces, ledger export manifest, cost guard decision logs, and dashboard snapshots.
2. **Validate provenance:** Run `verify.sh` against latest export; store checksum and signer details in incident folder.
3. **Root cause analysis:** Apply 5-Whys including policy/explainability factors; identify human factors and tooling gaps.
4. **Action items:** Create stories in `stories.csv` backlog for gaps (e.g., missing alert, unclear XAI messaging).
5. **Chaos replay:** Re-run the triggering scenario using `chaos/experiments.md` steps with current patches; record KPIs.
6. **Governance sign-off:** Share summary with Governance and FinOps; ensure policy deviations are documented with rationale and rollback notes.
7. **Publish:** Add summary to `status` channel; archive artifacts under `runbooks/appendix/r9-{date}` with hashes.

## Failure Modes & XAI Notes
- **Explainability gaps:** If `Explain this view` lacked clarity, log examples and update preview payload schema.
- **Provenance export missing events:** Flag as critical; backfill from service logs if feasible and document uncertainty.
- **Cost guard override not captured:** Manually log override with actor, reason, and expected policy path for future auditing.
