# Go/No‑Go Checklist (T‑0:30 → T‑0)

**Inputs:** target release (tag/commit), environment (staging/prod), evidence bundle artifact ID.

## Gate A — CI Hygiene

- [ ] All required checks green (typecheck, coverage ≥ thresholds, Trivy fs scan, helm‑digest policy, terraform validate if infra changes).
- [ ] Images published; **cosign sign + attest** steps succeeded (build‑publish‑sign workflow).
- [ ] Evidence bundle downloaded; contains `manifest.json`, `sbom.spdx.json`, `provenance.json`.

## Gate B — Drift/Policy

- [ ] Chart(s) reference **digest** only (no mutable tags).
- [ ] OPA/Rego checks for `image.digest` and `tag==""` pass.

## Gate C — Perf Budgets

- [ ] Lighthouse budgets: perf ≥ 0.80, LCP ≤ 2.5s, total bytes ≤ 450KB (or approved waiver).
- [ ] k6 canary plan staged (target URL, thresholds p95<700ms, fail<1%).

**Decision:** If any gate fails without an approved exception (see policy-exceptions.md), call **No‑Go** and remediate.
