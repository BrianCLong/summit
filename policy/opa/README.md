# OPA Export Guard

- File: `export.rego`
- Purpose: Deny dataset export when source licenses restrict (`DISALLOW_EXPORT`, `VIEW_ONLY`, `SEAL_ONLY`, `SELF_EDIT_SYNTHETIC`).
- How to run: `opa eval -i input.json -d policy/opa 'data.intelgraph.policy.export.allow'`.
- Acceptance: Given input with a restricted source, policy returns false and emits a human‑readable reason in `deny`.

- File: `cve_budget.rego`
- Purpose: Enforce CVE budgets and attestation requirements emitted by the Track B CI gate (`policy.cve_budget.allow`).
- How to run: `opa eval -i runs/cve-budget-latest.json -d policy/opa 'data.policy.cve_budget.allow'`.
- Acceptance: When any service exceeds its budget or lacks SBOM/signature evidence, `allow` is false and `data.policy.cve_budget.violations` lists the blockers.

- File: `contracting_compliance.rego`
- Purpose: Gate regulated workflows (releasability packs, assessment evidence, incidents, connector execution, and coalition egress) for scope tokens, egress budgets, attestation, SBOM/license validation, and incident reporting windows.
- How to run: `opa eval -i input.json -d policy/opa 'data.intelgraph.policy.contracting.allow'`.
- Acceptance: Requests missing scope tokens, exceeding budgets, lacking attestations/SBOMs, or violating incident reporting windows are denied with explicit reasons in `deny`.
