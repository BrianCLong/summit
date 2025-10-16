# IntelGraph + Maestro — GA v2025.09.19

## Highlights

- 331 → 8 “golden” workflows (CI/CD simplification)
- Zero-secrets policy (sealed-secrets end-to-end)
- Coverage gates: 80% lines / 75% branches (repo-wide)
- Signed containers (Cosign keyless) + SBOM (SPDX & CycloneDX)
- Policy-as-code (OPA/Conftest + Kyverno admission)
- Golden signals: Prometheus SLO burn alerts + Grafana dashboards
- Progressive delivery: Flagger canary 10% → 50% → 100% with auto-rollback

## Artifacts

- Images (signed): `ghcr.io/brianclong/<svc>:v2025.09.19-ga`
- Helm chart: `infra/helm/intelgraph` (chart version aligned to GA)
- SBOMs: attached (per image) & stored under `SECURITY/sbom/v2025.09.19-ga/`
- Provenance: GitHub OIDC certificates (Cosign verify)

## SLOs (Prod)

- API p95 < 1.5s
- Error rate < 1% (5xx)
- Burn-rate alerts configured (fast/slow windows)

## Migrations

- Executed under migration gate on stage before prod; backout validated.

## Rollback

- Automatic rollback during canary on gate breach; post-promotion rollback via `helm rollback`.

## Runbooks

- Latency: `docs-site/runbooks/latency.md`
- Errors: `docs-site/runbooks/errors.md`
- SLO burn: `docs-site/runbooks/slo-burn.md`
- Rollback: `docs-site/runbooks/rollback.md`
