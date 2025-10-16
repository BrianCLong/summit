# General Counsel Workstream — Q4 Cadence Sprint 3 (v1)

**File:** gc-legal-governance-q4-2025-11-03_to_2025-11-14-sprint-03  
**Role:** I. Foster Dullness, LL.M. — General Counsel (Lawfare, Policy, Governance, Disclosure)  
**Window:** **Nov 3 – Nov 14, 2025**  
**Mandate:** Convert the legal release gate from program → platform. Add automated data‑mapping, DSAR/SAR readiness, continuous export/sanctions screening, red‑team/abuse evals, and external‑auditor "one‑click" bundles. Target 8 repos under the regime with ≥90% green pass rate and zero waivers over 7 days.

---

## 0) Linkage to Prior Sprints

- **Sprint 1:** Gate v0.9, Disclosure Pack v0.9, DPIA, SBOM/license, export check, incident matrix (pilot).
- **Sprint 2:** Gate v1.1 (tiers, TPIA, claims‑diff, fingerprint), Disclosure Pack v1.1 + schema, Explainability stub, Auditor bundle, GH Actions.
- **This Sprint:** Gate **v1.2** with abuse/red‑team evals, auto data‑maps, DSAR instrumentation, continuous export/sanctions watch, and legal hold automation.

---

## 1) Sprint Goal (Two‑Week Outcome)

**“Legal governance becomes a self‑service platform: telemetry‑fed disclosure, automated privacy/export posture, red‑team coverage, and auditor‑ready evidence — at scale.”**

**Definition of Done**

- **Gate v1.2** enforces abuse/red‑team evals at tier L2+ and blocks on unresolved high‑risk findings.
- **Auto Data‑Map** produced per build from code + config to populate Records of Processing (RoPA) + DPIA catalog.
- **DSAR/SAR hooks** (discoverability & export) registered; sample request fulfilled end‑to‑end on a pilot product.
- **Continuous export/sanctions screening** runs daily; deltas recorded in disclosure.
- **Legal Hold Automation** (labels + retention policy) available via CLI; DR tabletop #1 executed with legal timing checks.
- **8 repos** onboarded total; ≥90% pass rate; no waiver older than 7 days.

---

## 2) Deliverables (Ship This Sprint)

1. **Gate v1.2 (OPA/Rego)** — red‑team/abuse eval requirements; unresolved‑risk blocker; DSAR hooks required for PII features.
2. **Data‑Map Generator** — static + runtime signals → `privacy/data_map.json` and `ropa.md`.
3. **DSAR Toolkit** — inventory endpoints, export transformer, access log capture, SLA timers.
4. **Export/Sanctions Watch** — scheduled job + cache of classifications and denied‑party checks; writeback to pack.
5. **Legal Hold CLI** — create/close holds, custodian list, S3/GDrive label instructions, audit log.
6. **Red‑Team/Abuse Eval Battery** — prompts + scenarios + thresholds; attach to `eval_summary.md`.
7. **Auditor Bundle v1.2** — RoPA/DPIA index, export deltas, DSAR proof, red‑team results, gate input/output.

---

## 3) Work Plan (Swimlanes & Tasks)

**Lane A — Gate & CI**

- A1. Extend `gate.rego` with `abuse_evals_ok`, `dsar_hooks_ok`, `unresolved_risk == 0` for L2+.
- A2. Add scheduled workflow to refresh export/sanctions watch and attach deltas to latest pack.
- A3. Auto‑open issues from gate failures with labels `legal:privacy`, `legal:export`, `legal:claims`.

**Lane B — Privacy Platform**

- B1. Implement **Data‑Map Generator**: parse infra (env/residency), code annotations, and schema files → `data_map.json`.
- B2. Generate **RoPA** + **DPIA Catalog** directly from `data_map.json`.
- B3. DSAR hooks: identity verification policy, data export endpoints inventory, redact rules, logging.

**Lane C — Export & Sanctions**

- C1. Persist ECCN matrix and denied‑party evidence; run daily checks; diff into `export/deltas.md`.
- C2. Integrate region flags to prevent accidental enablement; prove via config snapshot.

**Lane D — Red‑Team/Abuse**

- D1. Define scenario sets: prompt injection, covert PII extraction, targeted harassment, jailbreaks, policy violations.
- D2. CI job to run scenarios for L2+ features; require risk triage notes for any Highs.
- D3. Add **Waiver Timer** comment bot for any temporary mitigations.

**Lane E — Incident & Hold**

- E1. **Legal Hold CLI** to create holds, notify custodians, and set retention labels; log to `incident/legal_hold.log`.
- E2. **DR Tabletop #1 (90‑min)** — simulate outage/data movement; verify 72‑hour privacy timers and regulator matrices.

---

## 4) Policy‑as‑Code — Gate v1.2 (Rego, excerpt)

```rego
package legal.gate

default allow := false

# Prior checks from v1.1 assumed (sbom, license, dpia, tpia, evals, export, claims, pack_valid)

# New: DSAR hooks required when PII exists
needs_dsar { some f in input.features; f.pii }

dsar_hooks_ok { not needs_dsar }
dsar_hooks_ok { needs_dsar; input.privacy.dsar_hooks == true }

# New: Abuse/Red‑team evals required for L2+ features
max_tier := max([f.risk_tier | f := input.features][_])
needs_abuse := max_tier >= 2

abuse_evals_ok { not needs_abuse }
abuse_evals_ok {
  needs_abuse
  input.results.abuse_evals.passed
  input.results.abuse_evals.coverage >= 0.9
}

# Block on unresolved high risks
unresolved_risk_zero { input.results.risk_register.high_unresolved == 0 }

allow { base_ok; dsar_hooks_ok; abuse_evals_ok; unresolved_risk_zero }

# base_ok aggregates v1.1 predicates (not shown for brevity)
```

---

## 5) Data‑Map Generator (spec)

```
Inputs: /config/residency.yaml, /schemas/*.json, code annotations (@pii, @processor, @storage:<region>)
Outputs:
- disclosure/privacy/data_map.json
- disclosure/privacy/ropa.md
- disclosure/privacy/dpia_catalog.md
```

**Example annotation**

```python
# @pii: email, ip
# @processor: stripe (billing)
# @storage: eu-west-1
```

---

## 6) DSAR Toolkit (components)

```
- Identity proofing: policy + endpoint (step‑up auth supported)
- Data export: per‑subject zip (json/csv); field‑level redaction rules
- Access logging: immutable event log; include in disclosure
- Timers: SLA clock and escalation alerts
- Templates: customer response letters + regulator notification stubs
```

---

## 7) Export/Sanctions Watch (ops)

```
- Daily job pulls ECCN/denied‑party evidence cache
- Compare → write `export/deltas.md`
- If red, auto‑disable paid features in flagged regions via config PR
- Attach summary to next disclosure pack
```

---

## 8) Red‑Team/Abuse Eval Battery (sketch)

```
- Prompt Injection (5 canonical + repo‑specific)
- PII Exfiltration attempts (direct/indirect)
- Harassment/Toxicity probes
- Self‑harm & illegal guidance refusal checks
- Jailbreak catalog replay
- Thresholds: Coverage ≥90%, High findings = block until mitigated or waiver <7 days
```

---

## 9) Legal Hold CLI (usage)

```
$ legal-hold create --matter "INC-2025-101" --custodians alice@, bob@ --systems gdrive,s3,jira
$ legal-hold close --matter "INC-2025-101"
# Writes: disclosure/incident/legal_hold.md and logs actions in incident/legal_hold.log
```

---

## 10) Acceptance Criteria & Demos

- ✅ Gate v1.2 enforced across **≥8 repos** with pass‑rate ≥90%.
- ✅ Auto **data_map.json** + **ropa.md** present in all packs for PII‑touching products.
- ✅ **DSAR E2E**: request → verify → export → response within SLA on one pilot.
- ✅ **Export/sanctions** watch produces deltas; any red auto‑gates region enablement.
- ✅ **Red‑team battery** runs for L2+; no Highs unresolved.
- ✅ **Legal Hold CLI** used in DR tabletop; audit log attached.

**Demo Script:** Trigger CI on PII product → data‑map + RoPA generated → abuse evals run → gate blocks on seeded High until mitigation → DSAR simulated → export deltas appended → auditor bundle v1.2 exported.

---

## 11) Risks & Mitigations

- **Annotation debt** → ship code‑mod to seed `@pii` tags; fallback heuristics from schema names.
- **False positives in abuse tests** → record exemptions with rationale + 7‑day expiry.
- **DSAR complexity** → start read‑only export; defer delete/rectify flows to Sprint 4.
- **Region toggles drift** → config PRs auto‑generated and reviewed by platform lead.

---

## 12) Operating Cadence

- **Mon:** Kickoff + repo onboarding
- **Tue/Thu:** Privacy + ML joint review (data‑map gaps, abuse evals)
- **Wed:** DSAR clinic
- **Fri:** DR tabletop + export/sanctions delta review

---

## 13) Scaffolding — Repo Drop‑Ins (Sprint 3 additions)

```
/.legal/
  gate.rego                  # v1.2 predicates
  data_map.py                # generator
  dsar/
    export_transformer.py
    policy.md
  jobs/
    export_watch.yml         # scheduled workflow
  tools/legal_hold_cli.sh
/disclosure/privacy/
  ropa.md                    # generated
  data_map.json              # generated
  dpia_catalog.md            # generated
```

---

## 14) Preview — Sprint 4 (Nov 17 – Nov 26, 2025)

- Data subject **delete/rectify** automation; DPIA deep dives on L3 features.
- End‑to‑end **Explainability v0.9** (feature attribution) for L2+ regressions.
- Customer‑facing **Trust Center** auto‑publishing from disclosure packs.
- **ContractOps**: auto‑attach DPA/TIA packs to deals via CRM hooks.

> **Victory is compliance that moves at code speed — and blocks only what deserves to be blocked.**
