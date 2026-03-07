## Summary

This PR integrates a new provenance standard and CI gate into the Summit platform. It establishes a human-editable YAML mapping from OpenLineage + OTel attributes to W3C PROV concepts, generates a deterministic JSON-LD context, and enforces mapping stability in CI via URDNA2015 canonicalization.

Additionally, this PR addresses several critical CI/CD issues:
1.  **Outdated Lockfile**: Updated `pnpm-lock.yaml` to resolve `ERR_PNPM_OUTDATED_LOCKFILE`.
2.  **Missing CI Dependencies**: Added `pnpm/action-setup` to workflows missing it (specifically `LongRunJob Spec Advisory Validation`).
3.  **OPA v1 Compatibility**: Added `import future.keywords.if` and `import future.keywords.in` to all `.rego` files to satisfy OPA v1 syntax requirements.
4.  **Build Failures**: Fixed incorrect relative imports in `packages/orchestrator-store` tests and added missing type definitions.
5.  **Policy Synchronization**: Synchronized prohibited intents across `policies/influence_governance` and `governance` modules.

## Risk & Surface (Required)

**Risk Level**: `risk:medium`

**Surface Area**: `area:ci`, `area:policy`, `area:docs`

## Assumption Ledger

- **Assumptions**: URDNA2015 canonicalization provides a stable proof of mapping integrity.
- **Ambiguities**: None currently.
- **Tradeoffs**: Minor increase in CI runtime (~3s) for provenance validation.
- **Stop Condition**: Provenance proof must pass for PR to land.

## Execution Governor & Customer Impact

- [x] **Single Product Mode**: N/A (CI/Governance only).
- [x] **Frozen Code**: Does not touch frozen products.
- **Customer Impact**: Improved auditability and reproducibility of data lineage.
- **Rollback Plan**: Revert commit; delete generated `spec/prov_context.jsonld`.

## Evidence Bundle

- [x] **Tests**: Provenance validation script `ci/validate_prov_context.py` passes locally.
- [x] **Evidence Generated**: `artifacts/prov_context_check.json` contains canonical hashes.
- [x] **Prompt Hash**: N/A.

## Verification

- [x] Automated Test: Ran `pnpm install`, `python3 ci/validate_prov_context.py`.
- [x] Manual Verification: Verified `.rego` syntax fixes.

<!-- AGENT-METADATA:START -->
{
"promptId": "summit-provenance-integration-v1",
"taskId": "PROV-1234",
"tags": ["provenance", "json-ld", "w3c-prov", "ci-gate", "opa-v1"]
}
<!-- AGENT-METADATA:END -->
