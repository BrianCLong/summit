# Governance Docs Integrity v2 Prompt

## Mission

Implement governance documentation integrity gates with a canonical INDEX.yml, drift enforcement,
Evidence ID consistency checks, and stable CI job names. Ensure artifacts and runbooks are updated
and integrate checks into the unified governance gate.

## Scope

- `governance/`
- `docs/ci/`
- `scripts/ci/`
- `.github/workflows/`

## Constraints

- Use deterministic, auditable outputs.
- Do not mark checks as required until stability is proven.
- Ensure evidence maps and index files stay synchronized.
- Ship clear runbooks describing remediation and artifacts.
