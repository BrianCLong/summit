# Definition of Ready & Definition of Done

## DoR

- ADR drafted for toolchain updates (see `adr/ADR-001-toolchain.md`).
- Policy budget thresholds recorded in `docs/policy-budgets.yaml`.
- Artifact registry credentials available (GitHub OIDC or workload identity).

## DoD

- New repo generated via Railhead builds green on first CI run.
- Cosign signature + SBOM uploaded to the release artifact.
- OPA merge gate passing with evidence stored under `.evidence/`.
- Rollback playbook documented in `docs/rollback-playbook.md`.
