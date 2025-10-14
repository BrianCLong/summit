# General Counsel Workstream — Q4 Cadence Sprint 6 (v1)

**File:** gc-legal-governance-q4-2025-12-15_to_2025-12-23-sprint-06  
**Role:** I. Foster Dullness, LL.M. — General Counsel (Lawfare, Policy, Governance, Disclosure)  
**Window:** **Dec 15 – Dec 23, 2025**  
**Mandate:** Move from "governance that gates" to **governance that optimizes**. Operationalize metrics, kill waiver debt, harden attestations with tamper‑evidence, and deliver a quarter closeout with clean evidence trails and customer‑grade trust signals.

---

## 0) Linkage to Prior Sprints
- **S1–S3:** Gate v0.9 → v1.2; SBOM/license, DPIA/TPIA, DSAR/DSR hooks, abuse evals, export watch.  
- **S4:** Trust Center publisher; ContractOps hooks; Explainability v0.9; DSR automation.  
- **S5:** Gate v1.4 (obligations registry, tenant attestations, marketplace), Explainability v1.0, Reg‑Watch bot, external audit prep.  
- **S6:** Seal the system: **ledgered attestations**, **governance KPIs**, **budget enforcement**, **tenant/regional profiles**, **incident learning loop**, and zero aged waivers.

---

## 1) Sprint Goal (Outcome)
**“Self‑healing compliance: verifiable attestations, measurable governance KPIs, and automated budget enforcement — with customer‑visible progress.”**

**Definition of Done**
- **Gate v1.5** enforces governance budgets (latency/cost for explainability & evals), tenant/regional policy profiles, and **attestation ledger checks**.  
- **Attestation Ledger** (tamper‑evident) records Trust Center publishes, customer attestations, and ContractOps pushes; all receipts linked in packs.  
- **Governance KPIs** dashboard live (pass rate, waiver age, eval coverage, DSAR/DSR SLA, export delta MTTR).  
- **Waiver Debt = 0** items >7 days; auto‑expire/auto‑PR mitigations running.  
- **Quarter Close Pack** generated (rollup across repos/tenants) with signed summary, metrics, and diffs.

---

## 2) Deliverables (Ship This Sprint)
1. **Gate v1.5 (OPA/Rego)** — budgets, profiles, and ledger attestation proofs.  
2. **Attestation Ledger** — append‑only log with hash chain + signer IDs; CLI + verifier.  
3. **Governance KPIs** — exporter that aggregates per‑repo/per‑tenant signals → dashboard JSON + Trust Center tile.  
4. **Waiver Automation** — bot that opens mitigation PRs and escalates before expiry; redline exceptions report.  
5. **Incident Learning Loop** — post‑incident retro template + rule codification path (Reg‑Watch and gate updates).  
6. **Quarter Close Pack** — `q4-2025-evidence.zip` with narratives, metrics, and ledger proofs.

---

## 3) Work Plan (Swimlanes & Tasks)
**Lane A — Gate v1.5**  
- A1. Add `budgets_ok` for explainability & evals (P95 latency/cost).  
- A2. Introduce **tenant/regional profiles** (e.g., `enterprise-eu`, `smb-us`) mapping to obligations subsets & SLOs.  
- A3. Require `attestation_ledger.proof == true` for Trust Center publish and customer attestations.

**Lane B — Attestation Ledger**  
- B1. Design `ledger.ndjson` entries `{type, subject, hash, prev_hash, signer, ts}`.  
- B2. CLI: `ledger add|verify`; store proofs in `disclosure/receipts/ledger/`.  
- B3. Verifier runs in CI and Trust Center build; publish short proof on site.

**Lane C — KPIs & Dashboards**  
- C1. Aggregator gathers: gate pass rate, waiver age histogram, eval coverage, abuse test coverage, DSAR/DSR SLA, export delta MTTR, fingerprint coverage.  
- C2. Emit `governance_metrics.json` + `metrics.md`; render small Trust Center tile and internal dashboard.  
- C3. Alerting: thresholds breach → create issue + notify owners.

**Lane D — Waiver Debt Killer**  
- D1. Bot comments at T‑3/T‑1; auto‑PR mitigation from templates.  
- D2. Expire at 7 days with block unless GC approves extension; ledger entry created.

**Lane E — Incident Learning**  
- E1. Template `post_incident.md` with root cause → gate rule/guideline change.  
- E2. Hook to Reg‑Watch to encode any regulatory learnings; open PR to obligations registry.

**Lane F — Quarter Close**  
- F1. Rollup script to gather all disclosure packs → `q4-2025-evidence.zip`.  
- F2. Management assertion letter + metrics appendix + ledger proof chain.

---

## 4) Policy‑as‑Code — Gate v1.5 (Rego, excerpt)
```rego
package legal.gate

default allow := false

# Assume v1.4 base_ok + obligations + attestation + marketplace

# Budgets for explainability/evals
budgets_ok {
  input.budgets.explainability.p95_ms <= input.policies.budgets.explainability.p95_ms
  input.budgets.explainability.cost <= input.policies.budgets.explainability.cost
  input.budgets.evals.p95_ms <= input.policies.budgets.evals.p95_ms
}

# Tenant/Regional profiles
profile_ok {
  some prof in input.policy_profiles
  prof.name == input.tenant.profile
  # Check required obligations subset declared by profile is satisfied
  prof.required_rules_subset_satisfied
}

# Attestation ledger must prove Trust Center publish and any tenant attestation
ledger_ok {
  input.ledger.trust_center.proof == true
  (input.tenant.type != "enterprise" ) or (input.ledger.tenant_attestation.proof == true)
}

allow { base_ok; budgets_ok; profile_ok; ledger_ok }
```

---

## 5) Attestation Ledger — Spec
```
Entry types: trust_center_publish, tenant_attestation, contractops_push
Fields: id, type, subject, artifact_hash, prev_hash, signer, timestamp, repo, commit
Files:
- .legal/ledger/ledger.ndjson (append‑only)
- disclosure/receipts/ledger/proofs.json (last N heads + chain length)
CLI:
$ ledger add --type trust_center_publish --artifact disclosure-pack.tgz --signer gc@corp
$ ledger verify --chain disclosure/receipts/ledger/proofs.json
```

---

## 6) Governance KPIs — Metrics (v1)
| KPI | Target | Source |
|---|---|---|
| Gate pass rate | ≥ 92% | CI gate outputs |
| Waiver age >7d | **0** | waiver bot log |
| Eval coverage (L2+) | ≥ 90% | eval_summary.md |
| Abuse eval coverage | ≥ 90% | redteam results |
| DSAR/DSR SLA hit | ≥ 95% | dsr receipts |
| Export delta MTTR | ≤ 48h | export watch |
| Fingerprint coverage | 100% on model deltas | fingerprint.txt |

Artifacts:
- `metrics/governance_metrics.json`  
- `metrics/metrics.md`  
- Trust Center tile `metrics.json` (public‑safe subset)

---

## 7) Waiver Automation — Policy
```
- Max lifetime: 7 days
- T‑3/T‑1: auto comments + mitigation PR from template
- Expiry: gate fails unless GC extends w/ justification; ledger entry created
- Report: weekly waiver report added to Trust Center (redacted)
```

---

## 8) Incident Learning Loop — Template
```
# Post‑Incident Retro — <INC‑ID>
- Summary & impact:
- Root causes:
- Control failures/gaps:
- Gate/Obligation rule changes:
- Evidence updates required:
- Owner & due dates:
- Ledger entry ID:
```

---

## 9) Quarter Close Pack — Contents
```
/q4-2025/
  summary.md
  metrics/metrics.json
  ledger/proofs.json
  obligations_delta_log.md
  repos.csv (coverage & pass/fail)
  tenants.csv (attestation status)
  audit/evidence_index.md
```

---

## 10) Acceptance Criteria & Demos
- ✅ Gate v1.5 merged; budgets & profiles enforced; ledger checks pass.  
- ✅ Ledger append/verify operational; Trust Center shows proof badge.  
- ✅ KPIs exported; Trust Center metrics tile live; alerts configured.  
- ✅ Waiver debt cleared; automation active.  
- ✅ Quarter Close Pack produced with signed summary & proofs.

**Demo Script:** Run release → gate v1.5 checks budgets/profile/ledger → Trust Center publish logs ledger entry → dashboard updates KPIs → simulate waiver nearing expiry → bot opens mitigation PR → export Quarter Close Pack and verify ledger chain.

---

## 11) Risks & Mitigations
- **Ledger key management** → use org signing keys; rotate quarterly; store pubkeys in repo.  
- **Metric drift** → define snapshot schedule; freeze at quarter close.  
- **Profile creep** → limit to 3–5 canonical profiles; document diffs.  
- **Cost budget lockouts** → graceful degrade: warn first, then block on persistent breach.

---

## 12) Operating Cadence
- **Mon:** Kickoff; budgets & profiles set.  
- **Tue/Thu:** KPI review & mitigation planning.  
- **Wed:** Ledger verification & Trust Center proofs.  
- **Fri:** Quarter Close Pack build + sign‑off.

---

## 13) Scaffolding — Repo Drop‑Ins (Sprint 6 additions)
```
/.legal/
  gate.rego                        # v1.5 predicates
  profiles/
    enterprise-eu.yaml
    smb-us.yaml
  ledger/
    cli.sh
    verify.py
/metrics/
  collector.py
  metrics.md
/waivers/
  bot.py
  templates/mitigation_pr.md
/incidents/
  post_incident_template.md
/closeout/
  build_q4_pack.py
```

> **We don’t just pass audits — we publish proof, enforce budgets, and zero out excuses.**

