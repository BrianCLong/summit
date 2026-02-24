# Sprint 07 Evidence Bundle Checklist

This folder is the canonical manifest for Sprint 07 (Switchboard Approvals + Provenance GA Internal).

## Required Artifacts

1. `receipt-schema-v1.json` (source: `docs/contracts/switchboard/receipt-schema-v1.json`)
2. `policy-bundle-version.txt`
3. `dashboards-switchboard-approvals.json`
4. `sbom.json`
5. `slsa-attestation.intoto.jsonl`
6. `dr-test-log.md`
7. `performance-benchmark-approval-flow.md`

## Gate Mapping

- Spec Ready:
  - Receipt schema v1 frozen.
  - OAS contract updated (`docs/contracts/switchboard/openapi-switchboard-approvals-v1.yaml`).
  - Policy coverage gate script available (`scripts/ci/switchboard-policy-coverage-gate.mjs`).
- Build Complete:
  - Unit/integration tests green.
  - SBOM + SLSA attached.
- Provenance Complete:
  - Receipt verification pass.
  - Selective disclosure tests pass.
- Operate Ready:
  - Dashboards and alerts live in staging.
- Package Ready:
  - Helm/Terraform validation evidence attached.
