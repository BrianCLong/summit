# Prompt: Runbook Documentation Update (v1)

## Intent

Create or update operational runbooks under `docs/` with explicit policy
references, receipt evidence capture, and readiness alignment.

## Required Assertions

- Cite authority files, especially `docs/SUMMIT_READINESS_ASSERTION.md` and
  governance policy sources in `docs/governance/`.
- Include explicit receipt/evidence steps referencing `server/src/receipts`,
  `services/receipt-worker`, and `COMPLIANCE_EVIDENCE_INDEX.md`.
- Record any deviations as **Governed Exceptions**.

## Scope

- `docs/runbooks/**`
- `docs/roadmap/STATUS.json`
- `agents/examples/**`
- `prompts/docs/runbooks-update@v1.md`
- `prompts/registry.yaml`

## Guardrails

- No changes outside declared scope.
- Use concise, operational procedures.
- Ensure every runbook ends with explicit exit criteria.
