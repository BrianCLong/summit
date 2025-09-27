# Epic Acceptance Pack – Policy & Supply Chain Automation

## Context
This epic enforces supply-chain visibility and policy-as-code quality gates so every deploy contains an SBOM, license attestations, and policy simulation output. The pack captures the automated checks that must pass before release.

## Acceptance Criteria Mapping
| AC | Description | Automated Evidence |
| --- | --- | --- |
| AC1 | SBOM generated per build and validated for restricted licenses | `scripts/ci/run-quality-gates.sh` SBOM step, `tests/acceptance/epics/policy-supply-chain/evidence.yaml` |
| AC2 | Policy simulation blocks merges if coverage, chaos, or SBOM evidence missing | OPA tests `policies/tests/quality_gates_test.rego` |
| AC3 | Acceptance artefacts zipped and attached to release record | `tests/acceptance/epics/policy-supply-chain/scenarios.yaml` packaging step |

## Execution
Run `bash scripts/ci/run-quality-gates.sh --epic policy-supply-chain`. Upload the generated `acceptance-pack.zip` to governance storage.

## Manual Fallback
If automation fails, manually run:
1. `npm run sbom` and archive the resulting `sbom.json` with a SHA256 digest.
2. `npm run policy:test -- --run=test.quality_gates` to rerun OPA locally.
3. Update `evidence.yaml` with manual reviewer name and attach to change ticket.
