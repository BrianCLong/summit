# PR: asset-inventory — Hardening & Validation

**Type**: Feature + Security Hardening  
**Scope**: services/asset-inventory, deploy/argocd, policy/, .github/workflows  
**Tracking**: CompanyOS Railhead ➝ Golden Path Platform

---

## Summary
Production‑grade hardening for the **asset-inventory** service. Adds metrics, policy gates, image verification, digest pinning, egress controls, SLO/alerts, SBOM + SLSA provenance, and Backstage hooks. Brings the service to paved‑road status.

---

## Changes
- API: Prometheus `/metrics`, request counters/histograms middleware.
- CI/CD: SBOM artifact upload, Trivy gate, keyless cosign signing, SLSA provenance.
- ArgoCD: PreSync cosign verify hook; Image Updater annotations → **digest‑pinned** releases.
- Policy: Kyverno `verifyImages` (enforce signed images); OPA/Gatekeeper (if present) untouched.
- Networking: Cilium egress FQDN policy to AWS/GHCR/Prom/Grafana.
- Observability: ServiceMonitor + PrometheusRule for API availability + collector freshness.
- Backstage: TechDocs ref + dashboard/monitoring annotations.

---

## Risk & Rollback
- **Risk**: Image admission now gated by signature → unsigned images will be blocked (intended).  
- **Rollback**: `argocd app rollback asset-inventory 1` or `kubectl -n companyos rollout undo deploy/asset-inventory`.
- **Blast radius**: asset-inventory namespace only; no cross‑service coupling.

---

## Validation (evidence)
Paste outputs/links when running these steps:
```bash
# 1) Health & metrics
kubectl -n companyos port-forward svc/asset-inventory 8080:80 &
curl -fsS localhost:8080/healthz
curl -fsS localhost:8080/metrics | head -n5

# 2) Kyverno blocks unsigned image
# (temporarily set image to an unsigned tag, apply; expect deny)
# capture: kubectl -n companyos describe policyreport | grep asset-inventory -A4

# 3) Argo Image Updater pinned digest
kubectl -n companyos get deploy asset-inventory -o jsonpath='{.spec.template.spec.containers[0].image}'
# expect: ghcr.io/...@sha256:*

# 4) Alerts
kubectl -n monitoring get prometheusrule asset-inventory -o yaml | grep -e CollectorStale -e AssetAPIErrorBudgetBurn
# force a burn: scale replicas 0 -> watch alert fire, then scale back
kubectl -n companyos scale deploy asset-inventory --replicas=0 && sleep 600 && kubectl -n companyos scale deploy asset-inventory --replicas=2

# 5) Cron freshness (last succeeded ts)
kubectl -n companyos get jobs -l job-name=collector-aws --sort-by=.status.startTime | tail -n1

# 6) Release evidence
# SBOM artifact present on GH run; SLSA provenance asset attached
```

---

## Diff Highlights (human‑readable)
- `api/main.py`: +metrics middleware & endpoint.
- `.github/workflows/asset-inventory.yml`: +SBOM upload, +SLSA generator step.
- `deploy/argocd/apps/asset-inventory.yaml`: +image updater annotations; PreSync hook applied via k8s hook Job.
- `policy/kyverno-verify-cosign.yaml`: new, **Enforce**.
- `services/asset-inventory/k8s/*`: ServiceMonitor, PrometheusRule, CiliumNetworkPolicy added; Deployment keeps IRSA.

---

## Acceptance Criteria (tick before merge)
- [ ] ServiceMonitor targets up; `/metrics` scraped.
- [ ] PrometheusRule loaded; alert(s) test-fired and recovered.
- [ ] Kyverno denies unsigned image; allows signed from GH OIDC subject.
- [ ] Deployment pinned to image **digest** (no floating tags in live spec).
- [ ] Release shows SBOM + SLSA provenance assets.
- [ ] Runbook updated with new policies and failure tests.

---

## Release Notes
**asset-inventory v0.2.0**
- Added metrics, SLOs, and alerting.
- Enforced signed images and digest pinning.
- Added egress policy and autoscaling hardening.
- Attached SBOM + SLSA provenance to releases.

---

## Reviewers / Owners
- Platform (A): @owner-platform
- Security (R): @owner-security
- SRE (C): @owner-sre
- Product Ops (I): @owner-prodops

---

## Links
- Dashboard UID: `asset-inventory-main`  
- Argo App: `asset-inventory`  
- Backstage entity: `component:asset-inventory`

