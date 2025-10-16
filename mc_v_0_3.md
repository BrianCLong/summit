# MC v0.3.3 Planning Pack — Epics, Acceptance, CI Gates, Evidence & Runbooks

> Scope: Tenant Drilldowns & Budgets · Config Integrity Attestations · Egress Gateway Mode · Agentic RAG + Grounding Attestations · Autonomy Tier‑3 Expansion (TENANT_003)

---

## Conductor Summary

**Goal:** Safely scale multi‑tenant ops, harden provenance, and embed grounding attestations—without breaking persisted‑only/OPA/audit guardrails.  
**Non‑Goals:** Rewriting existing services; relaxing privacy/residency or cost SLOs.  
**Constraints:** Existing SLOs & error budgets; prod change‑freeze windows; residency tags must remain enforced in all flows.  
**Risks:** Config drift, egress sprawl, grounding false‑positives, autonomy compensation spikes.  
**Definition of Done:** All epics meet AC + CI gates + evidence hooks; canary gates PROMOTE; error budget burn remains <20% during rollout windows.

---

## Roadmap & Cadence

- **Duration:** 6 weeks
- **Milestones:**
  - **W1:** Drilldown dashboards; budget evaluators; config attestation prototype
  - **W2:** Egress gateway mode (dev→staging), RAG pipeline skeleton
  - **W3:** Grounding verifiers + evidence hooks; config attestation → CI
  - **W4:** TENANT_003 Tier‑3 pilot (read‑only + computed); budgets → Slack
  - **W5:** Staging canary (A/B) for egress gateway + RAG path
  - **W6:** Prod canary + GA; evidence bundle v0.3.3‑mc

---

## Epics → Stories → Tasks (with AC & Verification)

### E1 — Tenant Drilldowns & Budgets

**Stories**

1. Per‑tenant Grafana rows (autonomy, policy denies, cost, A/A lag, p95)  
   **AC:** Panels render for `TENANT_001..005`; refresh ≤10s; no >5% Prom QPS increase.  
   **Verify:** Screenshots + JSON exports attached to evidence.
2. Budget evaluator with alerts (warn ≥80%, page ≥90%)  
   **AC:** Alerts fire on synthetic load; Slack/Email+PagerDuty routes correct.  
   **Verify:** Alert test logs + rule YAML in evidence.
3. Budget ledger & deltas in evidence  
   **AC:** Daily budget delta JSON appended to nightly evidence.

**Tasks**

- Dash JSON additions; recording rules; alert rules; Slack routes; tests using promtool; add `budget/*.json` uploader to nightly job.

---

### E2 — Config Integrity Attestations

**Stories**

1. Hash/sign Helm values, HPA, NetPol, ServiceMonitor on every deploy  
   **AC:** `evidence/config/config-snapshot.json` + signature created; verify step fails on drift.
2. Gate in CI on config drift  
   **AC:** PR fails if snapshot differs from baseline without `CHANGE_APPROVED=1`.

**Tasks**

- Node or Python signer (`ops/config-attest.py`)
- GitHub Action: `config-attest.yml` (pre‑deploy + post‑deploy)
- Evidence hook updates.

---

### E3 — Egress Gateway Mode (LLM)

**Stories**

1. Route all LLM traffic via NAT/egress gateway; NetPol allow‑lists gateway CIDR only  
   **AC:** Direct provider IPs blocked; gateway path allowed; latency delta ≤+5%.
2. Health checks & failover to secondary gateway  
   **AC:** Simulated primary failure triggers secondary within ≤60s.

**Tasks**

- Helm values for gateway host/CIDR; NetPol update; readiness/health probe; synthetic curl checks in CI; runbook for gateway rotation.

---

### E4 — Agentic RAG + Grounding Attestations

**Stories**

1. Agentic RAG pipeline (retrieval → re‑rank → plan → execute)  
   **AC:** Re‑rank enabled; persisted‑only enforced; OPA simulated; audit per step.
2. Grounding verifier + attestation  
   **AC:** Answers failing grounding checks are rejected; attestation embedded in evidence; ≥95% grounding pass rate on gold set.
3. Trajectory golden‑sets (ReAct)  
   **AC:** CI compares Reason/Act/Observe sequence; drift fails PR.

**Tasks**

- `services/agentic-rag/*` scaffolds; `ops/grounding/check-grounding.py`; golden tests in `tests/trajectory/*.yaml`; CI wiring; evidence glue.

---

### E5 — Autonomy Tier‑3 Expansion (TENANT_003)

**Stories**

1. Simulate Tier‑3 (computed) for TENANT_003  
   **AC:** sim success ≥99.9%; comp ≤0.5%; policy/residency 0 violations.
2. Enact with HITL + tripwires  
   **AC:** 48h canary; auto‑halt on thresholds; evidence logs created.

**Tasks**

- Scenarios JSON; overrides; enable script; SLO/cost monitors; runbook updates.

---

## CI/CD Gates (quality → policy → canary)

- **Quality:** lint, type, unit/integration, promtool rules, trajectory golden‑set, grounding verifier
- **Policy:** OPA simulation must allow; residency & purpose OK; persisted‑only index verified
- **Config Attestation:** pre‑deploy snapshot; fail on drift
- **Canary:** Kayenta-style p95 gate (≤+5%); error rate gate; Slack PROMOTE/HOLD
- **Evidence:** bundle signed; includes config snapshot, dashboards, alerts, budgets, RAG attestations

---

## Evidence Model (additions for v0.3.3)

- `evidence/v0.3.3/config/config-snapshot.json` + `config-signature.txt`
- `evidence/v0.3.3/observability/dashboard-mc-platform.json` (export)
- `evidence/v0.3.3/budgets/*.json` (per-tenant)
- `evidence/v0.3.3/rag/grounding-attest.json` + `trajectory-results.json`
- `evidence/v0.3.3/autonomy/TENANT_003/*.json`

---

## Runbooks (delta)

- **Config Drift Response:** revert to last signed config; require `CHANGE_APPROVED=1` for hotfix
- **Gateway Failover:** flip to secondary CIDR; verify NetPol; run synthetic probes; attach proof
- **Grounding Failures:** quarantine prompts; re‑fetch context; update re‑rank model; re‑run golds
- **Autonomy Spike:** halt enactments, dump comp cases, replay sims, patch exclusions

---

## RACI

| Stream                  | R            | A   | C            | I   |
| ----------------------- | ------------ | --- | ------------ | --- |
| Drilldowns & Budgets    | DevEx        | MC  | SRE, FinOps  | PM  |
| Config Attestations     | Platform Sec | MC  | SRE          | PM  |
| Egress Gateway Mode     | NetSec       | MC  | DevEx, SRE   | PM  |
| Agentic RAG + Grounding | AI Eng       | MC  | Sec, DevEx   | PM  |
| Autonomy T3 TENANT_003  | SRE          | MC  | Platform Sec | PM  |

---

## ADRs (draft)

1. **ADR‑001:** Adopt config attestation as a release gate (pre/post deploy snapshots, signed)
2. **ADR‑002:** Enforce egress gateway mode for LLM providers
3. **ADR‑003:** Introduce grounding attestations for agentic outputs (deploy‑blocking)

---

## Deliverables Checklist

- [ ] Dashboards + budgets live; alerts tested
- [ ] Config attestation CI + signer committed; drift gate active
- [ ] Gateway mode with failover; NetPol updated; latency delta ≤+5%
- [ ] Agentic RAG path with re‑rank + grounding verifier; golds passing ≥95%
- [ ] TENANT_003 Tier‑3 enacted with evidence; thresholds green
- [ ] Evidence bundle `dist/evidence-v0.3.3-mc.json` signed

---

## Quick Commands (operator)

```bash
# Start branch + seed evidence
git checkout -b release/v0.3.3 && mkdir -p evidence/v0.3.3

# Run config attestation locally
python3 ops/config-attest.py snapshot --out evidence/v0.3.3/config/config-snapshot.json
python3 ops/config-attest.py verify evidence/v0.3.3/config/config-snapshot.json --signature evidence/v0.3.3/config/config-signature.txt

# Simulate TENANT_003 autonomy
mc autonomy simulate --tenant TENANT_003 --op-set derived_updates --evidence out/T3-sim.json

# Run grounding + gold tests
python3 ops/grounding/check-grounding.py --report out/grounding-report.json
pytest -q tests/trajectory
```
