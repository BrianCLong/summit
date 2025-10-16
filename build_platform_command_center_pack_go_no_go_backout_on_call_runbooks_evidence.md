# Command Center Pack — Go/No‑Go, Backout, On‑Call, Evidence

> Purpose: One-stop, copy/paste-ready operational playbook tightly coupled to the build/deploy hardening we just added. Use for every release train.

---

## 1) Go/No‑Go Checklist (T‑0:30 → T‑0)

**Inputs:** target release (tag/commit), environment (staging/prod), evidence bundle artifact ID.

**Gate A — CI Hygiene**

- [ ] All required checks green (typecheck, coverage ≥ thresholds, Trivy fs scan, helm‑digest policy, terraform validate if infra changes).
- [ ] Images published; **cosign sign + attest** steps succeeded (build‑publish‑sign workflow).
- [ ] Evidence bundle downloaded; contains `manifest.json`, `sbom.spdx.json`, `provenance.json`.

**Gate B — Drift/Policy**

- [ ] Chart(s) reference **digest** only (no mutable tags).
- [ ] OPA/Rego checks for `image.digest` and `tag==""` pass.

**Gate C — Perf Budgets**

- [ ] Lighthouse budgets: perf ≥ 0.80, LCP ≤ 2.5s, total bytes ≤ 450KB (or approved waiver).
- [ ] k6 canary plan staged (target URL, thresholds p95<700ms, fail<1%).

**Decision:** If any gate fails without an approved exception (see §6), call **No‑Go** and remediate.

---

## 2) Deploy Procedure (Happy Path)

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
   - Core GraphQL queries/mutations (persisted queries) return expected shapes (AC in §5).

**Promote:** If all green, tag release in `release-notes-template.md` and announce (see §7).

---

## 3) Fast Backout / Rollback

**Signals to Rollback Immediately**

- PRR: Production error rate >1% sustained 5m.
- SLO burn rate >2× over budget for 10m.
- Cosign verification failure post‑deploy (cluster image mismatch), or policy breach in Gatekeeper.

**Rollback Steps**

1. `helm rollback <release> <previous-revision> -n <ns>`
2. Invalidate edge caches/CDN if web assets changed.
3. Verify health + rerun k6 canary on previous.
4. File incident ticket with timeline + attach logs and Grafana snapshots.

**Data Migrations**

- Prefer **forward‑only** migrations with no DROP in same release; if backward‑incompatible, schedule maintenance + feature flags.
- If backward break shipped, activate read‑only mode and run `down.sql` (only if explicitly safe and tested). Document in §5.4.

---

## 4) On‑Call Runbooks (Triage)

### 4.1 GraphQL/API 5xx Burst

**Symptoms:** sudden spike in 5xx, latency regressions.

- Check OTel traces for the top offender route.
- Compare image digest in cluster vs values (`kubectl get deploy -o yaml | grep image:`).
- Scale up 1× temporarily if CPU>80%.
- If caused by new release: rollback (see §3).

**Evidence:** attach trace IDs, p95 graphs, deployment revision.

### 4.2 Ingest Backlog / Queue Lag

**Symptoms:** Kafka/stream lag, delayed updates.

- Inspect consumer group lag; scale consumers; verify Redis/DB health.
- Check new image limits/requests; throttle upstream if needed.
- If schema mismatch: pause ingestion, revert producer/consumer to previous digest.

### 4.3 Neo4j Health & Failover

- Run health probe; if leader flaps, cordon node and failover.
- Ensure APOC/GDS versions match app image expectations; if mismatch after deploy, rollback app first.

### 4.4 Provenance / Signature Failure

- Run `cosign verify` against running image reference. If unsigned: quarantine namespace via NetworkPolicy; rollback.

---

## 5) Acceptance & Verification Packs

### 5.1 Functional Smokes (GraphQL)

- `health { ok }` → `true`
- Persisted query: **GetUserDashboard** returns 200 with fields `[widgets{id,type}, alerts{level}]`.
- Mutation: **CreateNote** returns `id` and appears in `GetNotes` within 1s.

### 5.2 Non‑Functional (SLO)

- API p95 ≤ 350ms (reads), ≤ 700ms (writes) during canary.
- Subscriptions fan‑out ≤ 250ms server→client for 100 concurrent clients (sample).

### 5.3 Security

- Trivy image scan: 0 CRIT/HIGH or approved exception.
- Cosign verify + attest pass; SBOM available in artifacts.

### 5.4 Data Ops

- Migrations applied idempotently; `down.sql` documented (if exists) with risk rating.

---

## 6) Policy Exceptions (Time‑boxed)

- Use `docs/policy-exceptions.md`. Required fields: Owner, Rationale, Risk, Expiry ≤ 7 days.
- CI must link the exception row in failure message.

---

## 7) Communications Templates

**Stakeholder Go/No‑Go (Slack)**

```
:rocket: Release <vX.Y.Z> — GO/NO‑GO @ <time>
• CI gates: ✅
• Attestations: ✅ (SPDX+SLSA)
• Helm digests: ✅
• k6 canary plan: ready
If no objections in 10 min, proceeding to deploy.
```

**Post‑Deploy Update (Slack)**

```
:white_check_mark: Release <vX.Y.Z> deployed.
• k6 canary p95: 412ms (target 700ms), error 0.2%
• Lighthouse perf: 0.87 (LCP 2.2s)
Evidence: <artifact link> | Images: <repo@sha256:…>
```

**Rollback Notice (Slack)**

```
:warning: Rolling back <vX.Y.Z> to <vX.Y.(Z-1)> due to p95>1.2s and 5xx>1%. ETA 5 min.
Incident: <link> | Owner: @oncall
```

---

## 8) Evidence Bundle Contents

- `manifest.json` — image→digest map.
- `sbom.spdx.json` — per image SBOM.
- `provenance.json` — SLSA predicate.
- k6 output (junit or summary) — attach to release notes.
- Lighthouse report HTML (if run).

---

## 9) Dashboards & Alerts (placeholders)

**Metrics to chart:**

- API p95/p99, error rate, saturation (CPU/mem), queue lag, GC pause, DB/Neo4j latency.
- Release marker (annotation) on deploy start/finish.

**Alerts (suggested thresholds):**

- API 5xx > 0.5% for 5m (warn), >1% for 5m (page).
- p95 > +30% vs 7d baseline for 10m (warn) / +60% (page).
- Unsigned image detected in namespace (page).

---

## 10) Appendices

- **A:** Helm/RBAC snippets for temporary quarantine policy.
- **B:** Sample `kubectl` one‑liners for image/digest verification.
- **C:** CDN cache bust commands.

**A. Quarantine NetworkPolicy**

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: quarantine
  namespace: <ns>
spec:
  podSelector: {}
  policyTypes: [Egress, Ingress]
```

**B. Verify Digest in Cluster**

```bash
kubectl get deploy -n <ns> -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.template.spec.containers[*].image}{"\n"}{end}'
```

**C. CDN Bust**

```bash
curl -X POST https://api.cdn/purge -H 'Authorization: Bearer …' -d '{"paths":["/*"]}'
```
