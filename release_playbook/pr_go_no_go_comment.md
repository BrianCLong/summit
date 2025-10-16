## ✅ Go/No-Go — Phase 7 Canary to GA

**PR:** #1290  
**Branch:** `main` after merge  
**Candidate SHA:** `<fill from runbook>`  
**GA Tag:** `v2025.09.19-ga`  
**Prod URL:** `${{ vars.PROD_URL }}`

### Gates

- [x] CI (“CI”) + Policy Gate ✅
- [x] OPA/Conftest PASS (prod renders)
- [x] Admission enforcing: Kyverno signed-images + no privileged
- [x] k6 smoke (prod endpoint) PASS
- [x] Flagger canary 10% → 50% → 100% without SLO burn
- [x] Prometheus p95 < 1.5s, 5xx < 1% (10m windows)
- [x] Cosign verify images (OIDC keyless) ✅
- [x] SBOMs attached (SPDX + CycloneDX)

### Evidence Links

- Deploy run(s): `<actions run links>`
- Flagger events: `<kubectl describe canary output attached>`
- Grafana: `<dashboard link>`
- Prometheus alert history (burn-rate test): `<link/screenshot>`
- Cosign verify output: `<artifact>`
- SBOMs: `SECURITY/sbom/${GA_TAG}/*` + attached to Release

**GO/NO-GO:** ✅ GO
