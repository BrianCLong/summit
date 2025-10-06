# Reconciliation Report — October 2025 (HALLOWEEN)

## Scope
- Repo alignment for naming consistency (`summit` repository path, IntelGraph product branding)
- README quick-start and documentation pointers refreshed for October 2025 release
- Makefile hardened with fail-fast deploy targets and health-gated smoke automation
- Security guardrails and release documentation linked from project entry points

## Fixes in This Pass
- Updated README clone instructions and GitHub URLs to reference the `summit` repository
- Linked the 2025.10.HALLOWEEN release notes and documentation index from the README
- Introduced deploy targets (`make bootstrap`, `make up`, `make smoke`, etc.) with health checks and golden-flow validation
- Added `scripts/golden-smoke.sh` to exercise the golden path after environment bring-up
- Ensured monitoring stack participation in core `make up` flow for Grafana/Prometheus visibility
- Created `.github/workflows/helm-health-smoke.yml` to assert Helm-rendered probes/ports and added a first-class server service manifest

## Verification
- `make bootstrap && make up && make smoke` — Pending rerun on workstation with Docker available (blocked in current sandbox)
- `scripts/golden-smoke.sh` — Pending (included in `make smoke` once services are up)
- `trivy fs --scanners vuln,secret,misconfig .` — Recommended as part of CI (`trivy.yml` enforces HIGH/CRITICAL fail)
- `gitleaks detect --no-git` — Recommended pre-flight check (enforced via `gitleaks.yml`)
- `cosign verify-attestation` against 2025.10.HALLOWEEN release artifacts — See release notes for command template
- `helm template smoke infra/helm/intelgraph` (via `helm-health-smoke.yml`) — Validates `/health` probes and metrics port exposure

## Follow-Ups
- Extend golden smoke coverage for AI/Kafka optional services once compose overlays are finalized
- Automate SBOM + provenance regeneration in nightly workflows to capture dependency deltas
- Expand README troubleshooting with environment-specific resource limits observed during smoke runs

## Appendix — Local Helm Quick Commands

- `make helm-lint`
- `make helm-smoke` (uses `dev.dummySecrets=true` for template-only secrets)
- `helm template smoke infra/helm/intelgraph --namespace smoke`
- Inspect output via `less /tmp/smoke.yaml` or `rg -n "Service|/health|prometheus" /tmp/smoke.yaml`

## 🔎 Reviewer Checklist

- [ ] `make helm-lint` and `make helm-smoke` both pass
- [ ] `/tmp/smoke.yaml` contains the server Service on port 4000, Prometheus scrape annotations, and `/health` probes in the Deployment
- [ ] CI gates (Trivy, Gitleaks, CodeQL) succeed with no new high-severity findings
- [ ] `scripts/golden-smoke.sh` reports `GOLDEN_FLOW=PASS INV_ID=<value>`
