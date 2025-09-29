# Securiteyes IG

Securiteyes IG is the renamed security, DevSecOps, and counterintelligence superintelligence for the Summit stack. It unifies policy-driven risk analysis, defensive automation, and human-in-the-loop controls.

The toolkit in this directory includes:

- `system-prompt.md` &mdash; the authoritative operating prompt (mission, principles, modes, guardrails).
- `oncall-cheatsheet.md` &mdash; a one page responder guide that maps bot output to MTTA/MTTR actions.
- Polygraph heuristics and CI integrations under `scripts/` and `.github/workflows/`.
- Policy bundles under `contracts/policy/securiteyes/` that power merge gates and access decisions.

For deployment details and CI wiring, see `.github/workflows/securiteyes-risk-gate.yml` and the accompanying `scripts/securiteyes` helpers.
