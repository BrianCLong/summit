# Deploy Procedure (Happy Path)

## Steps

1. **Verify Attestations Before Helm**
   - Run `deploy-verify-attest` workflow with inputs: `chart`, `namespace`, `release`.
   - Ensure `cosign verify` and `verify-attestation` (SPDX+SLSA) both pass.

2. **Helm Upgrade**
   - `helm upgrade --install <release> <chart> -n <ns> -f values.release.yaml` (digest pinned).

3. **Post‑Deploy Validation (T+5 min)**
   - Health endpoints 200/OK.
   - Migrate tasks completed (if any), idempotent logs.

4. **SLO Canary (k6)**
   - Run `slo-canary` with `targetUrl=https://…`
   - Thresholds: p95<700ms, p99<1.5s, error<1%.

5. **Functional Smoke**
   - Core GraphQL queries/mutations (persisted queries) return expected shapes.

**Promote:** If all green, tag release in `release-notes-template.md` and announce.
