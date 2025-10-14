# Local MC + COS E2E

## Prereqs
- Docker Desktop or Docker Engine
- cosign & opa CLIs (for contract tests)

## Steps
1. Build & sign policy pack: `make pack sign`
2. Boot stack: `make up-local && make logs-local`
3. Verify pack seam: `curl -I http://localhost:4000/v1/policy/packs/policy-pack-v0`
4. Watch COS logs for `[policy] hot-reloaded pack digest ...`
5. Publish sample evidence: `npm --workspace=companyos run evidence:sample`
6. Grafana: `http://localhost:3001` (admin / admin) → load CompanyOS SLOs dashboard
7. Tear down: `make down-local`

## Expected
- COS polls pack and hot-reloads in ≤30s
- Evidence mutation succeeds and appears in MC logs
- Grafana panels show p95 & error rate (may be empty until traffic)

