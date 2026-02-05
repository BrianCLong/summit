# Runbook — Graph-KG Platforms CI 2026-02-05

## Enable Neptune Managed GraphRAG Mode

1. Confirm feature flag `graphrag.neptuneManaged` is enabled for the target environment.
2. Provide Bedrock Knowledge Base credentials and endpoint via config.
3. Run the managed adapter smoke test to validate connectivity.
4. Execute `pnpm summit:bench graphrag --profile=mws` and verify artifacts.

## Diagnose Retrieval Quality Regressions

1. Compare `artifacts/bench/graphrag/mws/metrics.json` across runs.
2. Review `report.json` for candidate ordering drift.
3. Re-run the bench with the same profile to confirm determinism.

## Rotate Credentials / Disable Integration

1. Disable `graphrag.neptuneManaged` feature flag.
2. Rotate Bedrock Knowledge Base credentials in the secret manager.
3. Confirm adapter requests fail closed with feature flag disabled.

## Rollback Plan

- Toggle feature flag OFF.
- Revert to internal hybrid retrieval contract for testing.
- Re-run benchmark to ensure evidence artifacts remain deterministic.

## MAESTRO Alignment

- **Layers**: Tools, Observability, Security
- **Threats Considered**: credential leakage, uncontrolled agent integrations
- **Mitigations**: feature-flag gating, smoke tests, deterministic evidence
