# IntelGraph GA Release Notes — Sprint 26 Cutover

**Release ID:** GA‑S26‑RC → GA‑S26  
**Target Date:** Oct 3, 2025  
**Release Type:** GA Cutover & Scale  
**Change Window:** per `ops/freeze-windows.yaml` with override path documented  

---

## Overview
This GA release completes core hardening and activates guardrails across CI/CD, Gateway/NLQ/Cypher execution, ER adjudication, security step‑up, policy enforcement, observability SLOs, cost alerts, and provenance verification. It aligns runtime SLOs to org defaults and delivers evidence needed for audit and production sign‑off.

---

## What’s Included

### Highlights
- **SLO Alignment:** GraphQL reads ≤ 350 ms p95, writes ≤ 700 ms p95 (staging evidence @ 2× expected RPS).  
- **Guardrails:** Read‑only NL→Cypher constraints; WebAuthn step‑up on `@sensitive` mutations; Verify‑Bundle required in CD.  
- **Policy:** Retention tiers + purpose tags; license/TOS export gate; human‑readable explains.  
- **ER Productionization:** Confidence bands with auto‑merge (HIGH), backpressure/DLQ, lag/error alerts.  
- **Observability & Cost:** Burn‑rate alerts; dashboards for Gateway/ER; telemetry cost reduction via sampling/cardinality hygiene.  

### Component Versions
| Component | Version | Notes |
|---|---:|---|
| Gateway (Node/Apollo) | `v1.26.0` | Persisted queries, plan cache, `@sensitive` directive |
| ER Service | `v1.18.0` | Intake idempotency, DLQ replay |
| Policy Pack (OPA) | `v0.9.0` | `retention.rego`, `export_license.rego`, tests |
| Verify‑Bundle CLI | `v0.7.0` | Cosign/SLSA proofs + policy checks |
| Observability Pack | `v1.6.0` | Prometheus rules + Grafana dashboards |

> Note: Semvers refer to service submodules; repo tag is `v1.0.0‑ga‑s26`.

### Breaking Changes
- Gateway requires persisted queries for high‑RPS endpoints (toggle via feature flag).  
- Sensitive mutations must include `X‑StepUp‑Assert` header; requests without it fail with `Step‑Up required`.  

### Deprecations
- Legacy direct text‑query NLQ endpoint marked **deprecated**; removal in S28.  

### Known Issues
- Initial PQ cache is in‑memory in single‑pod dev; enable Redis for multi‑pod deployments.  
- Rare false positives on export license checks when metadata is missing; resolved by adding `license` to dataset manifest.  

---

## SLOs & Error Budgets (Org Defaults)
- **Gateway Reads:** p95 ≤ 350 ms (p99 ≤ 900 ms); **Writes:** p95 ≤ 700 ms.  
- **Availability:** 99.9% monthly.  
- **Neo4j:** 1‑hop p95 ≤ 300 ms; 2–3 hop p95 ≤ 1,200 ms.  
- **Ingest:** ≥ 1,000 events/s/pod; processing p95 ≤ 100 ms pre‑storage.  
- **API Error Budget:** 0.1%; **Ingest:** 0.5%.

**Burn‑Rate Alerts:** Fast (5m/1h) page; Slow (1h/6h) ticket. Rules in `ops/observability/slo-alerts.yaml`.

---

## Security & Privacy
- **Step‑Up Auth (WebAuthn):** Enforced for `@sensitive` mutations; audit includes challenge IDs.  
- **Provenance:** SLSA L3 provenance verification; cosign signatures; trust policy enforced in CD.  
- **Policy‑as‑Code:** Retention tiers, purpose tags, license/TOS gates with readable explains.  
- **Scanning:** Trivy, secret detection, dependency audits run in CI baseline.  

---

## Deployment & Rollback

### Prereqs
- Prometheus/Alertmanager deployed; dashboards applied.  
- Redis (or equivalent) configured for Gateway PQ cache in multi‑pod.  
- Cosign public keys and SLSA trust policy stored in CI secrets.  

### Steps (Canary → Rollout)
1. **Freeze window check:** `node tools/ci/check_freeze.js --validate`.  
2. **Staging deploy:** run CD; verify policy/provenance gates.  
3. **k6 perf gates:** execute S26 profiles; compare p95/99 to thresholds.  
4. **Canary 5% traffic:** monitor burn‑rate & saturation; expand to 25% → 100%.  
5. **Post‑deploy validation:** run acceptance pack; attach evidence to release.  

### Rollback
- One‑click Helm rollback to `RELEASE‑1`.  
- Disable persisted‑queries enforcement flag; fall back to full text (temporary).  
- Toggle feature flag to bypass `@sensitive` (emergency only; requires CISO approval).  
- Revert policy pack to previous commit with `policy-ci` dry‑run.  

---

## Compliance & Audit Mapping
- **Provenance & Supply Chain:** SLSA L3 → Verify‑Bundle attestation, cosign verification.  
- **Privacy:** Retention tiers (`short‑30d` default for PII), purpose limitation, export licensing.  
- **Security:** WebAuthn step‑up for privileged ops; mTLS; ABAC/OPA.  
- **Observability:** SLO evidence, burn‑rate alerts, trace exemplars linked in audit logs.  

---

## Evidence Bundle Index

**Bundle Name:** `intelgraph-ga-s26-evidence.tgz`  
**Root:** `/evidence`  

### Layout
```
/evidence
  /perf
    k6-s26-pq.json
    k6-s26-writes.json
    k6-s26-graph.json
    grafana-gateway-slo.json
    grafana-er-queue.json
    traces/
  /policy
    decisions.log
    explains/
    opa-test-report.txt
  /security
    webauthn-stepup.log
    rotation-receipts/
  /provenance
    attestations/
    tamper-test.log
    cosign.verify.txt
  /er
    throughput.csv
    lag-dlq.json
  /cost
    before.csv
    after.csv
  /dr
    dr-drill.md
  /freeze
    freeze-window-dryrun.md
manifest.json
checksums.sha256
```

### `manifest.json` Schema
```json
{
  "$schema": "https://intelgraph.dev/schemas/evidence-manifest-v1.json",
  "release": "v1.0.0-ga-s26",
  "generated_at": "2025-10-03T00:00:00Z",
  "artifacts": [
    { "path": "perf/k6-s26-pq.json", "type": "k6-report", "slo": { "p95_ms": 350, "p99_ms": 900 } },
    { "path": "perf/grafana-gateway-slo.json", "type": "grafana-export" },
    { "path": "policy/decisions.log", "type": "opa-decisions" },
    { "path": "provenance/cosign.verify.txt", "type": "provenance" }
  ]
}
```

### Checksums
Generate sha256 over each file and the tarball; store in `checksums.sha256`.

```bash
find evidence -type f -print0 | xargs -0 shasum -a 256 > checksums.sha256
```

### Cosign / SLSA Verification (record output in evidence)
```bash
# Cosign verify (OCI artifact or file signatures)
cosign verify-blob \
  --key cosign.pub \
  --signature dist/bundle.tgz.sig \
  dist/bundle.tgz | tee evidence/provenance/cosign.verify.txt

# Verify SLSA provenance (example)
slsa-verifier verify-artifact \
  --provenance dist/bundle.intoto.jsonl \
  --source-uri github.com/org/repo \
  --builder-id https://github.com/actions/runner | tee evidence/provenance/slsa.verify.txt
```

### SBOM & Scanning Artifacts
```bash
# SBOM (Syft) + Vulnerability scan (Grype/Trivy)
syft packages:./ -o json > evidence/provenance/sbom.syft.json
trivy fs --quiet --format json . > evidence/provenance/trivy.json
```

---

## Release Checklist
- [ ] Freeze window validated or approved override recorded.  
- [ ] Policy‑CI: unit tests + simulation passed; explains attached.  
- [ ] Verify‑Bundle: pass on all deploy artifacts; tamper test fails as expected.  
- [ ] k6 S26 profiles pass thresholds; Grafana exports captured.  
- [ ] Burn‑rate alerts firing in simulation; routes to on‑call.  
- [ ] ER throughput/lag meets AC; DLQ < 0.1%.  
- [ ] Step‑up enforced on `@sensitive`; audit shows challenge IDs.  
- [ ] SBOM + scans attached; criticals triaged.  
- [ ] Evidence tarball built; checksums committed; release notes published.  

---

## Post‑Deploy Validation (Prod)
1. Smoke tests for Gateway reads/writes; verify p95 at steady‑state.  
2. Trigger synthetic ER load (10% of peak) and observe lag/throughput.  
3. Exercise one `@sensitive` mutation to confirm step‑up path and audit logs.  
4. Confirm burn‑rate alerts silent; dashboards within SLO bands.  
5. Cost dashboards show expected per‑unit spend; alerts not triggered.  

---

## Support & On‑Call
- Primary: SRE (week 1), Gateway TL (week 2)  
- Escalations: AppSec for step‑up, Platform TL for policy, DevEx for CD/provenance  
- Runbooks: `runbooks/dr-drill.md`, `runbooks/freeze-window-dryrun.md`

---

## Appendix: Evidence Bundle Build

**Makefile target**
```make
EVID=evidence
BUNDLE=intelgraph-ga-s26-evidence.tgz

.PHONY: evidence

$(EVID):
	mkdir -p $(EVID)/{perf,policy,security,provenance,er,cost,dr,freeze}
	echo "{}" > $(EVID)/manifest.json

bundle: $(EVID)
	find $(EVID) -type f -print0 | xargs -0 shasum -a 256 > $(EVID)/checksums.sha256
	tar czf $(BUNDLE) $(EVID)
	@echo "Bundle: $(BUNDLE)"
```

