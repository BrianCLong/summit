# [JADE] Directorate J ∑ — Durga IG Workstream Prompt, Sprint Plan & Cadence (Oct–Dec 2025)

**Classification:** INTERNAL // OPS // PCS-Auditable  
**Prepared:** 2025-09-30 (America/Chicago)  
**Source Corpus Reviewed:** `/mnt/data/october2025.zip` and `/mnt/data/summit-main (1).zip` (full archive scan)  
**Provenance Hashes:**

- `october2025.zip` → `92ab340ee190b0078199dad06befe50ca15e7537347f6100b7cd5a7bdd726702`
- `summit-main (1).zip` → `27f925b91197b7354da23bbf09b5c4a9d45803d5d39fca7acd058355e7679388`

---

## A) Exec Thesis (Decisive Idea & Next Best Actions)

- **Thesis:** Lock a **Proof‑Carrying Strategy (PCS)** across Summit/IntelGraph so every artifact (graphs, briefs, exports, decisions) ships with lineage, license, authority, and policy‑bytecode checks; thereby converting the Q4 plan into a **defensible, reversible release train**.
- **Decisive Points:** (1) **Provenance‑First Core** (attestations + policy compiler + bitemporal registry), (2) **Guard‑railed Federation** (read→write with OPA/LAC), (3) **Narrative Defense Kit** (pre‑bunk/de‑bunk + receipts), (4) **Release Verification & Rollback** (canary + SLOs + cost guardrails).
- **Next Best Actions (NBA):**
  1. Stand up **PCS rails**: PR templates, PCQ manifests, source hashing, license binders, OPA/LAC dry‑run gates.
  2. Finish **Federation Write Sandbox** and NL→Cypher **preview‑with‑cost**; enable **feature‑flagged** rollout.
  3. Ship **Q4 Cadence Lock** dashboards: Daily Dispatch, Weekly Portfolio/Risk, Monthly Strategy, Quarterly Board.
  4. Close **runtime gaps**: pagerduty/statuspage wiring, audit export, Helm consumer docs, release verification alerts.

---

## B) COAs — Good / Better / Best

**Good (low effort, moderate impact)**

- Enable **PCS‑lite** (hash + license + citations) on all graph exports and PRs.
- Freeze **cadence rituals**; publish checklists + owners.
- NL→Cypher **read‑only** with cost preview; **policy dry‑run** only.  
  **Risks:** optics w/o full enforcement; partial telemetry.  
  **Decision Gate:** demo receipts on 3 representative workflows.

**Better (medium effort, high impact)**

- **Policy compiler** emits bytecode; enforce **governed‑field blocks** in stage; **federation write‑sandbox** idempotent mutations.
- **Attestation ledger** (build, ingest, query) + **bitemporal schema registry**.
- Release **verification bundle** (OPA alerts + SLO tripwires + auto‑rollback).  
  **Risks:** throughput dips during enforcement; migration complexity.  
  **Decision Gate:** pass stage chaos + audit replay; <1h rollback tested.

**Best (higher effort, durable moat)**

- **Prov‑First GA** with **external verifier** replay, **consent/contract gates** on exports, and **predictive suite pilot** behind flags.
- Full **narrative defense kit** + **red‑team tabletop** + coalition draft for standards influence.  
  **Risks:** scope/coordination; training and comms load.  
  **Decision Gate:** GA sign‑off with board‑level brief & receipts.

---

## C) Sprint 0 (Kickoff) — 3 days (Oct 1–3, 2025)

**Goal:** Initialize PCS rails and cadence mechanics.

- **Deliverables:**
  - `PCS_TEMPLATE/` PR template + PCQ manifest + provenance hash generator.
  - `cadence/` checklists: Daily, Weekly, Monthly, Quarterly; owner matrix.
  - Telemetry baseline: ingest→query DAG timing, cost, error budget SLOs.
- **Owners:** Durga IG (lead), Gov/Ops (gating), Trust Fabric (OPA/LAC), QA/Release (CI).

---

## D) Sprint 1 — Oct 6–Oct 17, 2025 (10 biz days)

**Sprint Goal:** **Guard‑railed Federation (R→W) + PCS‑enforced exports** and **NL→Cypher preview‑with‑cost**.  
**Definition of Victory (DoV):**

- Queries execute via deterministic DAG, emit **PCQ manifest**; **external verifier** replays successfully.
- **Governed‑field** access blocked by policy bytecode; visible **diff + rationale** in tri‑pane UI.
- Federation **write‑sandbox** supports idempotent mutations with **replay + rollback**; flags default **OFF**.
- Daily/Weekly/Monthly cadence dashboards live with SLOs and risk heat.

**Scope (In):**

1. **Provenance Rails**: source hashing, license binding, citation capture, export consent/contract gates (dry‑run).
2. **Policy Compiler v0.9**: ABAC/RBAC rules → bytecode + side‑by‑side diff; enforce in stage.
3. **Federation Write Sandbox**: idempotent mutation runner, journal + bitemporal registry.
4. **NL→Cypher** preview pane + **cost meter**; blocked actions labeled.
5. **Release Verification Bundle v0.1**: OPA alerts, SLO tripwires, canary+rollback script.
6. **Runtime Gaps Sweep #1**: pagerduty/statuspage wiring; Helm consumer docs; audit export pipeline.

**Out of Scope:** Predictive ranking, multi‑tenant budgets, external partner APIs (stubbed).

**Risks & Mitigations:**

- **Policy brittleness** → start in dry‑run, add test corpus; daylight diffs to owners.
- **Write‑path regressions** → sandbox only + feature flags + <1h rollback drill.
- **Cost spikes** → cost meter thresholds + guardrail abort.

---

## E) Sprint 2 — Oct 20–Oct 31, 2025

**Goal:** **Enforce** governed fields in prod behind flags; ship **attestation ledger** + **bitemporal registry**; **Narrative Defense Kit v0.9**.

- Expand export consent/contract from dry‑run to **enforce** for select flows.
- Add external verifier to CI; publish receipts in demo.

---

## F) Rolling Cadence (Q4 2025)

**Daily (H1):** CEO Dispatch (yesterday/today/blockers, cash runway, pipeline delta).  
**Weekly (H2):** Portfolio (product/GTM/ops), Risk & Compliance (incidents, policy drift, attestations), Release Readiness.  
**Monthly (H3):** Strategy/Metrics review; standards/policy map update; budget/OKR tune.  
**Quarterly (H4):** Board Brief with PCS receipts, GA gating decision, moat score.

**Ritual Artifacts:** shared agenda, checklists, decision logs, receipts bundle, red/amber/green heat.

---

## G) Gap Sweep — “See Around Corners” (Closeouts)

1. **Release Verification & OPA Alerts** — ensure alert fidelity, runbook links, test cases; wire rollback automation.
2. **PagerDuty ↔ Statuspage ↔ Helm** — complete consumer docs; add synthetic monitors; verify incident comms loop.
3. **Audit‑Ready Exports** — uniform consent, license, and third‑party contract gates with machine‑readable manifests.
4. **Schema Registry & Time‑Travel** — finalize bitemporal store + diff tooling.
5. **Budget Guardrails** — tenant budget profiles + cost SLOs surfaced in NL→Cypher preview; aborts on breach.
6. **Narrative Hygiene** — prebunk/debunk scripts, fact pattern one‑pagers, Q&A, channel hygiene check.

---

## H) Scorecard & Tripwires

**Objective OKRs (Q4):**

- O1: **PCS coverage** ≥ 90% of PRs/exports with receipts.
- O2: **Policy enforcement** on governed fields in prod (flags ON for 3 high‑value paths).
- O3: **Rollback** < 60 minutes (drill twice/month).
- O4: **SLO adherence**: error budget burn < 20%; p95 DAG latency within target.
- O5: **Narrative kit** shipped; <24h response to misinformation incident.

**KRIs & Tripwires:** policy false‑block rate > 2% → freeze expansion; cost meter > threshold → auto‑abort; attestations < 85% → block release; incident MTTR > target → trigger ops review.

---

## I) Evidence & PCS (assumptions, confidence, falsifiers)

- **Evidentiary Basis:** the two archives (hashes above) including sprint plans for IntelGraph (e.g., _PROVENANCE FIRST_, _Federation Write Sandbox_, cadence lock docs), numerous sprint and runbooks, and repo assets (README, CODEOWNERS, CI configs).
- **Assumptions:** current repo mirrors operational truth; external GitHub access constraints acknowledged; environments dev→stage→prod intact; feature flags available.
- **Confidence:** **High** on near‑term sprint fit; **Medium** on org bandwidth for Best COA.
- **Falsifiers/Tests:** inability to emit PCQ manifests across 3 sample workflows; stage policy enforcement causes >2% false blocks; rollback >60m in drill; receipts not reproducible by external verifier.

---

## J) Artifacts (to be produced this sprint)

- **Scenario Set:** _Trust Hardening vs Velocity Erosion_ (axes: enforcement strictness × telemetry maturity); signposts + early warnings captured.
- **Campaign Tree (Synthetic):** adversary TTPs vs controls map (ATT&CK‑style) for mis/disinfo & policy bypass; coverage/telemetry/policy overlay.
- **Game Matrix:** release strategy (Flags‑Off, Canary, Progressive‑ON) × risk cells with regret bounds.
- **Narrative Defense Kit:** claim‑evidence‑warrant tables, prebunk/debunk scripts, comms checklist.
- **Roadmap & RACI:** 30/60/90 swimlanes for Prov‑First GA, Federation Writes, Narrative Kit, Release Verification.

---

## K) 30/60/90 (Swimlanes)

**30 days (to Oct 31):** PCS‑lite in prod; policy enforce behind flags; ledger + registry live; narrative kit v0.9.  
**60 days (to Nov 30):** expand enforcement to 5 flows; predictive suite pilot gated; coalition draft.  
**90 days (to Dec 28):** Prov‑First GA receipts; board brief; progressive flags‑ON per risk sign‑off.

---

## L) Governance & Provenance

- **Publishable‑by‑default** with redactions.
- **OPA policy stubs/tests** checked in; CI enforces PCS presence.
- **Provenance manifest** (who/what/when/hash) attached to demos and briefs.

---

## M) Definition of Done (DoD‑J)

- Win conditions defined; COA selected with scorecard live; rollback drill completed; receipts present; owners/dates set; PCS attached.

---

## N) Sprint 3 — Nov 3–Nov 14, 2025 (10 biz days)

**Sprint Goal:** Move from **enforced‑behind‑flags** to **progressive enablement** on 3 priority flows; complete **Attestation Ledger v1.0**, **Bitemporal Registry v1.0**, and ship **Narrative Defense Kit v1.0** with prebunk live.

**Definition of Victory (DoV):**

- Flags ON to 25–50% traffic for governed‑field enforcement across 3 flows with <2% false‑block; automated rollback <60m proven in drill.
- All build/ingest/query/export jobs emit **attestations** captured in ledger; external verifier passes on 5 golden paths.
- Bitemporal registry records schema and policy versions with human‑diff UI.
- Narrative kit used in 1 live or simulated incident within SLA (<24h) with receipts.

**Scope (In):**

1. **Policy Compiler v1.0**: rulepacks versioning; bytecode stability tests; signed policy bundles.
2. **Federation Write Sandbox** → **Guarded Writes GA** for idempotent types; conflict resolution playbook.
3. **Attestation Ledger v1.0**: materialized views for receipts; export to audit binder (pdf+jsonl) with stable schema.
4. **Bitemporal Registry v1.0**: time‑travel queries; schema/policy/contract diffs; CLI + UI pane.
5. **Narrative Defense Kit v1.0**: prebunk articles, claim‑evidence‑warrant tables, response macros, channel hygiene checklist.
6. **Release Verification Bundle v0.9**: OPA alerts tuned; synthetic monitors; statuspage automation; runbook links.
7. **Cost Guardrails**: tenant budgets surfaced in NL→Cypher preview; abort on breach; weekly cost report.

**Out of Scope:** multi‑tenant predictive suite; partner API integrations beyond stubs; cross‑org federation writes.

**Stories & Tasks (condensed):**

- _PCS/Provenance_
  - Add attestation emitters to `ingest-*` and `query-*` DAGs; hash set & license rail unified.
  - External verifier CI job for 5 golden paths; red/amber reporting.
- _Policy & Enforcement_
  - Compiler: deterministic ordering; code‑signing; bundle trust test.
  - Enforce: flow‑1 (customer export), flow‑2 (analyst share), flow‑3 (NL→Cypher write) behind progressive rollout 10→25→50%.
- _Registry_
  - Bitemporal tables + diff UI (schema & policy); CLI `regctl` with `snapshot`, `diff`, `replay`.
- _Narrative_
  - Prebunk: 3 posts + FAQ; debunk scripts; incident rehearsal.
- _Ops_
  - Rollback drill; PagerDuty/statuspage wiring; Helm consumer docs finalized; synthetic monitors.

**Acceptance Criteria:**

- 95%+ of relevant jobs emit attestations; 0 schema drift in receipts; verifier green on 5/5 golden paths.
- False‑block ≤ 2%, true‑block ≥ baseline; decision diffs visible in tri‑pane.
- Registry time‑travel returns expected snapshots; human‑readable diffs; CLI usable by ops.
- Narrative incident handled within SLA; receipts attached.

**Metrics & Tripwires:**

- Error budget burn <20%; p95 DAG latency within target.
- Cost guardrail trips → auto‑abort + ticket.
- Policy false‑block >2% → freeze rollout and open rulepack review.
- Attestation coverage <90% → block release train until remediated.

**Risks & Mitigations:**

- Policy churn → rulepack review cadence; shadow mode comparison; sampling.
- Ledger perf hot spots → partitioning & compaction; rollup views.
- Narrative blowback → prebunk first; lawyered facts; single‑source comms.

**Owners (RACI):**

- **R**: Durga IG (coordination), Trust Fabric (policy/compiler), Data Eng (ledger/registry), App Eng (tri‑pane & NL→Cypher), SRE (alerts/rollback), Comms Lead (narrative).
- **A**: Head of Eng, COO (cadence), GC (narrative sign‑off).
- **C**: Security, Sales Ops, Design.
- **I**: Exec staff, Board observers.

**Calendar (cadence overlay):**

- _Mon 11/3_: Kickoff + risk review; flags 10% on flow‑1.
- _Wed 11/5_: Verifier demo; flags 25% on flow‑1; 10% on flow‑2.
- _Mon 11/10_: Rollback drill; flags 50% on flow‑1; 25% on flow‑2; 10% on flow‑3.
- _Thu 11/13_: Narrative rehearsal; attestation export review.
- _Fri 11/14_: Sprint review w/ receipts; go/no‑go for Sprint 4 enablement.

**Demo Script:**

1. Run NL→Cypher with governed field; show cost meter + policy diff; attempt write → blocked with rationale.
2. Export flow passes consent/contract; attestation bundle opens in verifier; bitemporal snapshot diff.
3. Trigger synthetic incident → statuspage + PagerDuty; show rollback within 60m receipt.

**DoD‑Sprint 3:**

- Flags progressively enabled within thresholds; receipts present; external verifier green; narrative kit v1.0 live; rollback drill passed.

---

## O) Sprint 4 — Nov 17–Nov 28, 2025 (8 biz days, holiday adjusted)

**Sprint Goal:** Expand governed‑field enforcement to **5 flows**, light **predictive suite pilot** behind flags, and ship **standards coalition draft + comment schedule**. Tune **budget guardrails** and prepare **board‑brief scaffolding** with receipts.

**Definition of Victory (DoV):**

- Five priority flows under progressive enforcement with false‑block ≤2% and auto‑rollback verified.
- Predictive pilot (ranking/alerts) runs in **shadow mode** with receipts and **no external decisions**.
- Coalition draft circulated to target standard bodies/alliances with internal sign‑offs.
- Budget guardrails tuned to maintain cost SLOs with incident auto‑tickets.

**Scope (In):**

1. Enforcement expansion to flows 4–5; refine rulepacks; add exception workflow & time‑boxed overrides.
2. Predictive pilot: data contracts, feature registry stub, inference receipts.
3. Coalition/standards: issues list, position paper (2p), comment schedule, outreach list.
4. Cost guardrails: per‑tenant policy, monthly budget notebooks, alert thresholds.
5. Board brief scaffolding: PCS receipts bundle + risk heat + enablement plan.

**Acceptance Criteria:** enforcement telemetry stable; predictive shadow ROC logged with receipts; coalition draft + calendar published; cost guardrail trips within ±10% of target; board scaffolding ready.

**Calendar:** Kickoff 11/17; Coalition draft 11/20; Predictive shadow demo 11/25; Review 11/27 (asynch); Close 11/28.

**DoD‑Sprint 4:** Receipts included for all demos; standards draft sent; predictive pilot shadow complete; cost guardrails tuned.

---

## P) PCS PR Template (\.github/pull_request_template.md)

```markdown
# PCS PR Checklist

**Purpose & Scope**

- [ ] Problem statement + linked issue/OKR
- [ ] Change type: [ ] Feature [ ] Fix [ ] Policy [ ] Docs [ ] CI

**Proof‑Carrying Strategy (PCS)**

- [ ] Provenance manifest added/updated (`/pcs/provenance/*.json`)
- [ ] Source hashes + licenses captured
- [ ] Policy impact assessed; rulepack references included
- [ ] Attestation emitters added (build/ingest/query/export)

**Risk & Rollback**

- [ ] Feature flags/toggles listed
- [ ] Rollback plan (<60m) documented and tested in stage
- [ ] SLO impact + error budget analysis

**Security & Compliance**

- [ ] Governed fields touched? [ ] Yes [ ] No → If yes, policy test(s) added
- [ ] Data contracts/consent gates updated

**Testing & Receipts**

- [ ] Unit/integration tests
- [ ] External verifier job passes (link)
- [ ] Artifacts attached: receipts (jsonl/pdf), screenshots

**Checklist Complete**

- [ ] Approvals: Eng, Trust, Ops, Comms (as applicable)
```

---

## Q) PCS / PCQ Manifests & Schemas

```
/pcs/
  pcq_manifest.schema.json
  provenance.schema.json
  examples/
    pcq_manifest.example.json
    provenance.example.json
```

**pcq_manifest.schema.json (excerpt)**

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "PCQ Manifest",
  "type": "object",
  "required": [
    "id",
    "actor",
    "graph",
    "inputs",
    "policy_bundle_digest",
    "attestations"
  ],
  "properties": {
    "id": { "type": "string", "pattern": "^[a-f0-9-]{16,}$" },
    "actor": {
      "type": "object",
      "required": ["sub", "roles"],
      "properties": {
        "sub": { "type": "string" },
        "roles": { "type": "array", "items": { "type": "string" } }
      }
    },
    "graph": {
      "type": "object",
      "required": ["env", "dag", "version"],
      "properties": {
        "env": { "enum": ["dev", "stage", "prod"] },
        "dag": { "type": "string" },
        "version": { "type": "string" }
      }
    },
    "inputs": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["uri", "hash", "license"],
        "properties": {
          "uri": { "type": "string" },
          "hash": { "type": "string" },
          "license": { "type": "string" }
        }
      }
    },
    "policy_bundle_digest": { "type": "string" },
    "governed_fields": { "type": "array", "items": { "type": "string" } },
    "attestations": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["type", "digest", "timestamp"],
        "properties": {
          "type": { "type": "string" },
          "digest": { "type": "string" },
          "timestamp": { "type": "string", "format": "date-time" }
        }
      }
    },
    "receipts": { "type": "array", "items": { "type": "string" } }
  }
}
```

**provenance.schema.json (excerpt)**

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Provenance Manifest",
  "type": "object",
  "required": ["artifact", "hash", "created", "sources", "licenses"],
  "properties": {
    "artifact": { "type": "string" },
    "hash": { "type": "string" },
    "created": { "type": "string", "format": "date-time" },
    "sources": { "type": "array", "items": { "type": "string" } },
    "licenses": { "type": "array", "items": { "type": "string" } }
  }
}
```

---

## R) OPA Policy Bundle Scaffolds

```
/policy/
  bundles/
    governed-fields/
      manifest.yaml
      rules.rego
      tests.rego
    export-consent/
      manifest.yaml
      rules.rego
      tests.rego
  ci/
    verify_policy_bundle.sh
```

**bundles/\*/manifest.yaml (template)**

```yaml
apiVersion: policy.openpolicyagent.org/v1
kind: Bundle
metadata:
  name: governed-fields
spec:
  entrypoint: policies.governed
  version: v1
  annotations:
    owner: trust-fabric
    checksum: ${BUNDLE_SHA256}
    created: ${BUILD_TIMESTAMP}
```

**governed-fields/rules.rego (excerpt)**

```rego
package policies.governed

default allow = false

# Input shape: {
#   "actor": {"sub": "...", "roles": ["analyst"]},
#   "action": "write",
#   "resource": {"field": "pii.email", "tenant": "acme"},
#   "context": {"env": "stage"}
# }

role_perms := {
  "analyst": ["read"],
  "admin": ["read","write"],
  "auditor": ["read"]
}

allow {
  some r
  r := input.actor.roles[_]
  input.action == role_perms[r][_]
  not blocked_field
}

blocked_field {
  startswith(input.resource.field, "pii.")
  input.action == "write"
}
```

**export-consent/rules.rego (excerpt)**

```rego
package policies.export

# block export unless consent + contract ok
allow {
  input.action == "export"
  input.consent == true
  input.contract in {"standard","enterprise"}
}
```

**tests.rego (snippet)**

```rego
test_block_write_on_pii {
  deny := not data.policies.governed.allow with input as {"actor": {"roles":["analyst"]}, "action": "write", "resource": {"field":"pii.email"}}
  deny
}
```

**ci/verify_policy_bundle.sh (excerpt)**

```bash
#!/usr/bin/env bash
set -euo pipefail
opa test policy/bundles -v
BUNDLE_SHA=$(tar cf - policy/bundles | sha256sum | awk '{print $1}')
echo "BUNDLE_SHA256=$BUNDLE_SHA" >> $GITHUB_OUTPUT
```

---

## S) CI Wiring (GitHub Actions)

```
/.github/workflows/pcs.yml
```

```yaml
name: PCS & Policy
on: [push, pull_request]
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - name: Install OPA
        run: |
          curl -L -o opa https://openpolicyagent.org/downloads/latest/opa_linux_amd64
          chmod +x opa && sudo mv opa /usr/local/bin/opa
      - name: Validate Schemas
        run: node scripts/validate-schemas.mjs
      - name: Policy Tests
        run: bash policy/ci/verify_policy_bundle.sh
      - name: External Verifier
        run: node scripts/verifier.js --golden ./pcs/examples
      - name: Attach Receipts
        if: always()
        run: node scripts/emit-receipts.mjs
```

---

## T) Rollback Drill Script (scripts/rollback_drill.sh)

```bash
#!/usr/bin/env bash
# Purpose: Prove <60m rollback from policy/enforcement change.
set -euo pipefail

CHANGE_ID=${1:-"unknown"}
START=$(date +%s)

log() { echo "[rollback][$CHANGE_ID] $(date -Is) $1"; }

log "Begin drill"
# 1) Capture state
STATE_FILE="/tmp/state-$CHANGE_ID.json"
cli snapshot --env=stage --out "$STATE_FILE"

# 2) Trigger change (canary)
flags set governed.write=on --percent=10
sleep 60

# 3) Detect regression
if scripts/check-slo.sh; then
  log "SLO OK"
else
  log "SLO breached → rolling back"
  flags set governed.write=off
fi

# 4) Verify restoration
if scripts/check-slo.sh; then
  log "Restored"
else
  log "Restoration FAILED"; exit 1
fi

# 5) Restore snapshot if needed
cli replay "$STATE_FILE" || true

END=$(date +%s)
DUR=$((END-START))
log "Drill complete in ${DUR}s"
[ $DUR -lt 3600 ] || { echo "Exceeded 60m"; exit 1; }
```

---

## U) Tabletop — Policy Rulepacks & Rollback Drill (2 Failure Scenarios)

**Mode:** [JINX] Adversary Emulation × [JANUS] Double‑Loop Learning  
**Objective:** Stress policies and rollback runbook; validate receipts and decision diffs.

### Scenario 1 — Silent Over‑Block on Governed Field

- **Setup:** Flags at 25% on Flow‑2 (analyst share). Rulepack v1 blocks `pii.*` writes; new mapping flags `derived.email_hash` as governed inadvertently.
- **Injects:**
  1. Schema update introduces `derived.email_hash`.
  2. Analyst batch update fails without user‑visible rationale (UI toast dropped).
  3. Cost meter shows spike due to retries.
- **Expected Controls:** policy diff pane highlights new governed field; false‑block ratio alarm >2% triggers freeze; rollback <60m.
- **Observed (simulated):**
  - False‑block **3.1%** over 15 min; rationale not surfaced; retries x3; SLO at risk.
  - Rollback drill executed in **37m**; traffic restored.
- **Receipts:** attestation journal + policy bundle digest mismatch recorded; external verifier replay ✔.
- **Remediation:**
  - Add **allow‑list** for hashed fields; require explicit governance tag `governed=true` in schema registry.
  - UI: guarantee rationale rendering; add toast watchdog.
  - Tripwire: false‑block >2% for 5 min → auto‑rollback (no manual step).

### Scenario 2 — Consent Regression on Export

- **Setup:** Flow‑1 export path; consent service upgrades; header `x‑consent-scoped` omitted intermittently.
- **Injects:**
  1. 1 in 50 requests missing header.
  2. Partner SLA window active (high sensitivity).
- **Expected Controls:** policy `export-consent` denies; incident ties to Statuspage; contract log links.
- **Observed (simulated):**
  - Deny working; **error budget burn 12%** in 20 min; PagerDuty fired; statuspage updated.
  - Rollback not needed; **hotfix** to gateway restores header within 25m.
- **Receipts:** consent check traces + denial artifacts captured; verifier ✔ on golden path.
- **Remediation:**
  - Add **sticky validation** at gateway; schema contract test in CI; SLO guard on deny‑rate slope.

### Policy Deltas (to apply)

- Rulepack: `derived.email_hash` treated as **non‑governed** by default; require governance tag.
- Add rule `deny unless rationale reachable` → if UI fails to show diff, block rollout escalation.
- Export policy requires `x‑consent-scoped` **and** signed JWT claim `consent=true`.

### Runbook Deltas (rollback)

- Automate freeze on false‑block tripwire; remove human approval for first 15 min.
- Snapshot TTL increased to 4h; add `dry‑run post‑rollback verifier` step.

---

## V) Sprint 5 — Dec 1–Dec 12, 2025 (10 biz days)

**Sprint Goal:** Industrialize controls after tabletop: **auto‑trip rollback**, **UI rationale guarantees**, **schema governance tags**, and **export consent hardening**. Begin **limited internal decisions** for predictive pilot behind flags.

**Definition of Victory (DoV):**

- False‑block auto‑rollback works in stage and prod canary; mean rollback ≤30m in drill.
- Tri‑pane UI always renders policy rationale within 300ms (p95) or blocks action with clear error.
- Bitemporal registry enforces governance tags; migrations emit diffs + owners.
- Export path validates header + JWT claim; deny‑rate slope alarm live.
- Predictive pilot makes **internal** recommendations only; receipts recorded.

**Scope (In):**

1. **Auto‑Trip Rollback**: implement controller that watches KRIs; integrate with `rollback_drill.sh`; add dry‑run verifier step.
2. **UI Rationale Guarantees**: heartbeat + watchdog for toast; API must deliver `policy_diff` payload; e2e tests.
3. **Schema Governance Tags**: registry changes; linter in CI; `regctl` enforcement mode; dataset owners listed.
4. **Export Consent Hardening**: gateway sticky validation; JWT claim check; CI contract tests; slope alarm.
5. **Predictive Pilot (Internal Decisions)**: enable top‑N recommendations to ops dashboards; flags at 10% internal.
6. **Receipts UX**: one‑click download bundle (jsonl+pdf) for demos and audits.

**Out of Scope:** external partner decisions; cross‑org federation write GA.

**Stories & Tasks (high‑level):**

- Auto‑trip controller service; plug into OPA alerts and SLO exporter.
- UI diff rendering contract; add failure sentinel and block.
- Registry: tag enforcement; backfill tags; owner mapping.
- Gateway: header + JWT checker; chaos tests for missing headers.
- Predictive: feature registry tie‑in; shadow vs internal decisions toggles; receipts.

**Acceptance Criteria:**

- 3 drills with mean rollback ≤30m; p95 ≤45m.
- 0 “no rationale” actions in canary; synthetic test passes.
- 100% new schema changes carry governance tags; backfill ≥95% legacy.
- Export consent tests pass; deny‑rate slope alarm fires in chaos test and auto‑tickets.
- Predictive dashboard live to internal ops; receipts attached.

**Metrics & Tripwires:**

- False‑block >2% (5 min) → auto‑rollback; error budget burn >20% → freeze.
- “No rationale” events >0 → deployment halt.
- Consent header miss rate >0.5% over 10 min → incident.

**Risks & Mitigations:**

- Over‑sensitivity causing flaps → hysteresis + cooldown windows.
- Tagging backlog fatigue → owner incentives + linter autofix.
- Predictive creep → flags + clear prohibition of external decisions.

**Owners (RACI):** R: Trust Fabric, App Eng, Data Eng, SRE; A: Head of Eng; C: Security, GC; I: Exec.

**Calendar:** Kickoff 12/1; Chaos & rollback drills 12/3 and 12/10; Predictive internal demo 12/9; Review 12/12.

**DoD‑Sprint 5:** Auto‑rollback active; UI rationale guarantees enforced; schema governance tags live; export consent hardened; predictive internal decisions active; receipts bundle shipped.

---

## W) PCS: Evidence, Assumptions, Confidence, Falsifiers (Tabletop)

- **Evidence:** simulated runs with receipts logic; prior sprint artifacts in repo; updated policy snippets & runbooks herein.
- **Assumptions:** staging mirrors prod canary; flags available; CI green on policy tests.
- **Confidence:** Medium‑High (controls tested in sim; prod behavior may differ under load).
- **Falsifiers:** auto‑rollback fails to trigger in chaos test; UI rationale latency >300ms p95; consent slope alarm misses spike; registry allows untagged governed fields.

---

## X) Code — Policy Rulepack Changes (Rego Diffs)

**Path:** `policy/bundles/governed-fields/rules.rego`

```diff
@@
-package policies.governed
-
-default allow = false
+package policies.governed
+
+default allow = false
@@
-blocked_field {
-  startswith(input.resource.field, "pii.")
-  input.action == "write"
-}
+blocked_field {
+  input.action == "write"
+  some f
+  f := input.resource.field
+  # Only block when explicitly tagged governed in registry
+  data.registry.fields[f].governed == true
+}
+
+# Backward-compatible deny for legacy explicit pii.* fields until tag backfill ≥95%
+legacy_block {
+  input.action == "write"
+  startswith(input.resource.field, "pii.")
+}
+
+allow {
+  legacy_allow
+}
+
+legacy_allow {
+  not legacy_block
+}
```

**Path:** `policy/bundles/export-consent/rules.rego`

```diff
@@
-package policies.export
+package policies.export
@@
-allow {
-  input.action == "export"
-  input.consent == true
-  input.contract in {"standard","enterprise"}
-}
+default allow = false
+
+allow {
+  input.action == "export"
+  input.consent == true
+  input.contract in {"standard","enterprise"}
+  input.headers["x-consent-scoped"] == "true"
+  verify_jwt(input.headers["authorization"]) == true
+}
+
+verify_jwt(auth) {
+  some token
+  startswith(auth, "Bearer ")
+  token := substring(auth, 7, -1)
+  parsed := io.jwt.decode_verify(token, {"cert": data.jwt.public_key})
+  parsed.payload.consent == true
+}
```

**Tests:** `policy/bundles/*/tests.rego`

```rego
package policies.export

import data.policies.export.verify_jwt

# consent header missing → deny
trace("missing x-consent-scoped header should deny")

# nominal allow
@test_allow_nominal {
  allow with input as {
    "action": "export",
    "consent": true,
    "contract": "enterprise",
    "headers": {"x-consent-scoped": "true", "authorization": "Bearer <valid>"}
  } with data.jwt.public_key as "<dev-pub-key>"
}
```

---

## Y) Code — Consent Gateway Checker (Node/TypeScript)

**Path:** `services/gateway/src/middleware/consentChecker.ts`

```ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export function consentChecker(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (req.method !== 'POST' && req.method !== 'GET') return next();
  if (req.path.startsWith('/export') === false) return next();

  const scoped = req.header('x-consent-scoped') === 'true';
  const auth = req.header('authorization') || '';

  try {
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    const claims = token
      ? (jwt.verify(token, process.env.CONSENT_JWT_PUB || '', {
          algorithms: ['RS256'],
        }) as any)
      : {};
    const ok = scoped && claims?.consent === true;
    if (!ok) {
      res.status(412).json({
        error: 'consent_required',
        details: { scoped, hasJwt: !!token },
      });
      return;
    }
    return next();
  } catch (e) {
    return res.status(401).json({ error: 'invalid_token' });
  }
}
```

**Unit Test:** `services/gateway/test/consentChecker.test.ts`

```ts
import { consentChecker } from '../src/middleware/consentChecker';
import httpMocks from 'node-mocks-http';
import jwt from 'jsonwebtoken';

const pub = (process.env.CONSENT_JWT_PUB = `-----BEGIN PUBLIC KEY-----
...
-----END PUBLIC KEY-----`);
const priv = (process.env.CONSENT_JWT_PRIV = `-----BEGIN PRIVATE KEY-----
...
-----END PRIVATE KEY-----`);

function token(payload: any = { consent: true }) {
  return jwt.sign(payload, priv, { algorithm: 'RS256' });
}

test('blocks when header missing', async () => {
  const req = httpMocks.createRequest({
    method: 'POST',
    url: '/export',
    headers: { authorization: `Bearer ${token()}` },
  });
  const res = httpMocks.createResponse();
  const next = jest.fn();
  consentChecker(req as any, res as any, next);
  expect(res.statusCode).toBe(412);
});

test('allows when header and JWT consent=true', async () => {
  const req = httpMocks.createRequest({
    method: 'POST',
    url: '/export',
    headers: {
      'x-consent-scoped': 'true',
      authorization: `Bearer ${token({ consent: true })}`,
    },
  });
  const res = httpMocks.createResponse();
  const next = jest.fn();
  consentChecker(req as any, res as any, next);
  expect(next).toBeCalled();
});
```

**Chaos Test (missing header slope):** `scripts/chaos/consent_slope.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail
N=${1:-1000}
MISS_EVERY=${2:-50}
M=0
for i in $(seq 1 $N); do
  if (( i % MISS_EVERY == 0 )); then M=$((M+1)); curl -s -o /dev/null -w "%{http_code}
" -H "Authorization: Bearer $JWT" https://gw/export; else curl -s -o /dev/null -w "%{http_code}
" -H "x-consent-scoped: true" -H "Authorization: Bearer $JWT" https://gw/export; fi
done
echo "missed=$M/$N" >&2
```

---

## Z) Code — UI Rationale Watchdog (React/TypeScript)

**Path:** `apps/console/src/lib/usePolicyRationale.ts`

```ts
import { useEffect, useRef } from 'react';

export function usePolicyRationale(actionId: string, ms: number = 300) {
  const shown = useRef(false);
  useEffect(() => {
    const t = setTimeout(() => {
      if (!shown.current) {
        // Block action escalation and emit telemetry
        document.dispatchEvent(
          new CustomEvent('policy:rationale:missing', { detail: { actionId } }),
        );
        // Replace action with fatal banner
        const ev = new CustomEvent('policy:halt', {
          detail: { actionId, reason: 'Rationale not available' },
        });
        document.dispatchEvent(ev);
      }
    }, ms);
    return () => clearTimeout(t);
  }, [actionId, ms]);

  return {
    markShown: () => {
      shown.current = true;
    },
  };
}
```

**Path:** `apps/console/src/components/PolicyDiffPane.tsx`

```tsx
import React from 'react';
import { usePolicyRationale } from '../lib/usePolicyRationale';

export default function PolicyDiffPane({
  diff,
  actionId,
}: {
  diff: any;
  actionId: string;
}) {
  const { markShown } = usePolicyRationale(actionId);
  React.useEffect(() => {
    if (diff) markShown();
  }, [diff]);
  if (!diff) return null;
  return (
    <div role="alert" aria-live="assertive" data-testid="policy-diff">
      {/* render diff */}
    </div>
  );
}
```

**E2E (Playwright):** `apps/console/e2e/policy-rationale.spec.ts`

```ts
import { test, expect } from '@playwright/test';

test('blocks when rationale missing', async ({ page }) => {
  await page.goto('/action/write');
  const halted = page.waitForEvent('console', {
    predicate: (m) => m.text().includes('policy:halt'),
  });
  await expect(page.getByTestId('policy-diff')).toHaveCount(0);
  await halted;
});
```

---

## AA) Sprint 6 — Dec 15–Dec 23, 2025 (7 biz days, holiday adjusted)

**Sprint Goal:** **Partner‑readiness** and **performance hardening**: expose **read‑only partner API** with receipts, finalize **standards comment** submission, ship **receipts showcase** site, and optimize **ledger/registry** performance.

**Definition of Victory (DoV):**

- Partner API (read‑only) live for 1 pilot partner under contract; all responses carry PCS receipts.
- Standards comment submitted with reference tests; coalition sign‑offs recorded.
- Receipts showcase microsite published internally (and public‑ready with redactions).
- Ledger compaction and indexing reduce hot path p95 by ≥25% in stage.

**Scope (In):**

1. **Partner API v0.9 (Read‑Only)**: endpoints `/v0/entities/:id`, `/v0/paths/:id/receipts`; OAS3 spec; consent & license headers echoed.
2. **Performance Hardening**: attestation ledger compaction; bitemporal registry indexing; query hints.
3. **Standards Comment**: finalize text + reference tests repo; submission tracker.
4. **Receipts Showcase**: static site with 3 case studies + downloadable bundles.
5. **Ops**: pagerduty playbooks updated for partner API; statuspage component added.

**Acceptance Criteria:**

- Pilot partner can integrate in sandbox; contract headers verified.
- p95 improvement ≥25% on hot paths; error budget stable.
- Comment submitted; confirmation captured; reference tests green.
- Microsite passes accessibility checks; bundles downloadable.

**Risks & Mitigations:** partner scope creep → read‑only only; perf regression → feature flag & rollback; public site optics → redactions and legal review.

**Calendar:** Kickoff 12/15; Perf review 12/18; Standards submission 12/19; Pilot demo 12/22; Close 12/23.

**DoD‑Sprint 6:** Partner API read‑only live to pilot; performance gains verified; standards comment submitted; showcase site shipped with receipts.

---

## AB) Initial PRs — Folders, Stubs, and CI Wiring

**Branches:**

- `feature/pcs-policy-bundles`
- `feature/consent-gw-checker`
- `feature/ui-rationale-watchdog`

**Repo Layout (new/updated paths):**

```
policy/
  bundles/
    governed-fields/
      manifest.yaml
      rules.rego
      tests.rego
    export-consent/
      manifest.yaml
      rules.rego
      tests.rego
  ci/verify_policy_bundle.sh
pcs/
  pcq_manifest.schema.json
  provenance.schema.json
  examples/
    pcq_manifest.example.json
    provenance.example.json
scripts/
  rollback_drill.sh
  chaos/consent_slope.sh
services/gateway/
  src/middleware/consentChecker.ts
  test/consentChecker.test.ts
apps/console/
  src/lib/usePolicyRationale.ts
  src/components/PolicyDiffPane.tsx
  e2e/policy-rationale.spec.ts
.github/workflows/
  pcs.yml
```

**Git Bash (copy‑paste ready):**

```bash
# bootstrap
git checkout -b feature/pcs-policy-bundles
mkdir -p policy/bundles/{governed-fields,export-consent} policy/ci pcs/examples scripts/chaos
mkdir -p services/gateway/src/middleware services/gateway/test
mkdir -p apps/console/src/lib apps/console/src/components apps/console/e2e .github/workflows
# (paste files from Canvas into the repo accordingly)

git add policy pcs scripts .github
git commit -m "PCS: add policy bundles, schemas, receipts emitters, rollback drill"
git push -u origin feature/pcs-policy-bundles

# PR 1
gh pr create --fill --title "PCS & OPA bundles + rollback drill" --base main --head feature/pcs-policy-bundles --label pcs,policy,ci

# Branch 2
git checkout -b feature/consent-gw-checker
# (paste gateway middleware + tests + chaos script)

git add services/gateway scripts/chaos .github/workflows
git commit -m "Gateway: consent checker middleware + tests + chaos slope script"
git push -u origin feature/consent-gw-checker

gh pr create --fill --title "Gateway consent checker (JWT+header)" --base main --head feature/consent-gw-checker --label gateway,security,consent

# Branch 3
git checkout -b feature/ui-rationale-watchdog
# (paste UI hook, pane, e2e)

git add apps/console
git commit -m "Console: policy rationale watchdog + diff pane + e2e"
git push -u origin feature/ui-rationale-watchdog

gh pr create --fill --title "UI: policy rationale watchdog + e2e" --base main --head feature/ui-rationale-watchdog --label ui,policy
```

**PR Descriptions (templates auto‑filled by our PR template):**

- _Key changes_: rulepack diffs; consent checker; watchdog; receipts.
- _Risk & Rollback_: flags gated; rollback script path; <60m target.
- _Receipts_: attach verifier output + screenshots + jsonl bundles.

**GH Actions:** `.github/workflows/pcs.yml` already scaffolded earlier — ensure Node, OPA, schema validation, verifier, and receipts steps are active.

**Owner Routing (CODEOWNERS snippet):**

```
/policy/ @trust-fabric
/pcs/ @durga-ig @head-of-eng
/services/gateway/ @platform-eng
/apps/console/ @app-eng-lead
```

**CI Path Wiring:**

- Tests matrix runs `opa test`, Node unit tests, and Playwright e2e on affected paths only.
- On PRs, artifacts upload: `receipts/*.jsonl`, coverage, screenshots.
- Required checks for merge: `Policy Tests`, `Consent Checker Unit`, `Console E2E`, `External Verifier`.

---

## AC) Sprint 7 — Jan 5–Jan 16, 2026 (10 biz days)

**Sprint Goal:** **Externalize safely**: open **Partner API pilot feedback loop**, graduate **predictive internal decisions** to **limited external insights** (read‑only), and **compliance audit pack** generation.

**Definition of Victory (DoV):**

- Partner pilot shipping live feedback via receipts; 3 integration issues resolved.
- Predictive insights visible to partners as **read‑only** annotations; no automated partner actions.
- Compliance audit pack (Q4) generated from attestations and registry, downloadable in one click.

**Scope (In):**

1. **Partner API Feedback**: webhook for receipts acks; schema change notices (governance tags) to partners.
2. **Predictive Insights (External Read‑Only)**: expose ranked hints with receipts; flags at 5% for pilot partner.
3. **Compliance Audit Pack**: assemble SOC‑style binder (attestations, policies, runbooks, drills) with hashes.
4. **Perf/Cost**: budget guardrail recs; anomaly detector preview.

**Acceptance Criteria:**

- 3 partner feedback items triaged and closed; receipts linked.
- External insights pages render with rationale; no write endpoints.
- Audit pack passes internal GC/Sec review; shareable under NDA.

**Risks & Mitigations:** partner scope creep → stick to read‑only; audit scope sprawl → binder template; predictive misread → strong disclaimers + receipts.

**Calendar:** Kickoff 1/5; Partner feedback review 1/12; Predictive demo 1/14; Close 1/16.

**DoD‑Sprint 7:** Partner feedback loop active; external insights read‑only live for pilot; audit pack downloadable.

---

## AD) OAS3 — Partner API v0.9 (Read‑Only)

**Path:** `partner-api/openapi.yaml`

```yaml
openapi: 3.0.3
info:
  title: Summit Partner API (Read‑Only)
  version: 0.9.0
  description: >-
    Read‑only endpoints for entity retrieval and receipts. All responses include
    PCS receipt links and consent/license headers. No write operations.
servers:
  - url: https://api.summit.example.com
    description: Production
  - url: https://sandbox.api.summit.example.com
    description: Sandbox
security:
  - bearerAuth: []
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
  headers:
    X-Consent-Scoped:
      description: Indicates consent scope applied to the response.
      schema: { type: string, enum: ['true', 'false'] }
    X-License:
      description: License identifier for included content.
      schema: { type: string }
    X-PCS-Receipt-Id:
      description: Receipt identifier for this response.
      schema: { type: string }
  schemas:
    Entity:
      type: object
      properties:
        id: { type: string }
        type: { type: string }
        attributes: { type: object }
        relationships: { type: object }
      required: [id, type]
    Receipt:
      type: object
      properties:
        id: { type: string }
        pcq_manifest: { $ref: '#/components/schemas/PCQ' }
        policy_bundle_digest: { type: string }
        created: { type: string, format: date-time }
        attestations:
          { type: array, items: { $ref: '#/components/schemas/Attestation' } }
      required: [id, created]
    PCQ:
      type: object
      properties:
        id: { type: string }
        actor: { type: object }
        graph: { type: object }
        inputs: { type: array, items: { type: object } }
    Attestation:
      type: object
      properties:
        type: { type: string }
        digest: { type: string }
        timestamp: { type: string, format: date-time }
paths:
  /v0/entities/{id}:
    get:
      summary: Get an entity by ID
      parameters:
        - in: path
          name: id
          required: true
          schema: { type: string }
      responses:
        '200':
          description: OK
          headers:
            X-Consent-Scoped: { $ref: '#/components/headers/X-Consent-Scoped' }
            X-License: { $ref: '#/components/headers/X-License' }
            X-PCS-Receipt-Id: { $ref: '#/components/headers/X-PCS-Receipt-Id' }
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Entity' }
              examples:
                sample:
                  value:
                    id: ent_123
                    type: organization
                    attributes: { name: 'Acme' }
        '404': { description: Not Found }
        '401': { description: Unauthorized }
  /v0/paths/{id}/receipts:
    get:
      summary: List receipts for a graph path or entity
      parameters:
        - in: path
          name: id
          required: true
          schema: { type: string }
        - in: query
          name: limit
          schema: { type: integer, default: 20, minimum: 1, maximum: 200 }
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: object
                properties:
                  items:
                    type: array
                    items: { $ref: '#/components/schemas/Receipt' }
  /v0/receipts/{receiptId}:
    get:
      summary: Fetch a specific receipt
      parameters:
        - in: path
          name: receiptId
          required: true
          schema: { type: string }
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Receipt' }
        '404': { description: Not Found }
```

---

## AE) One‑Click Compliance Audit Pack — Assembler Script

**Path:** `scripts/audit/make_audit_pack.py`

```python
#!/usr/bin/env python3
"""
Builds a signed, hash‑indexed audit pack (zip) from attestations, policy bundles,
runbooks, and drill receipts. Outputs pack path and a manifest with SHA‑256.
"""
import argparse, json, os, pathlib, hashlib, zipfile, datetime, subprocess

ROOT = pathlib.Path(__file__).resolve().parents[2]
SRC = {
  "attestations": ROOT/"receipts",
  "policies": ROOT/"policy"/"bundles",
  "runbooks": ROOT/"scripts",
  "slo": ROOT/"slo",
}

INDEX = {
  "generated": datetime.datetime.utcnow().isoformat()+"Z",
  "files": [],
  "hash": "",
}

def sha256p(path: pathlib.Path) -> str:
  h = hashlib.sha256()
  with open(path, 'rb') as f:
    for chunk in iter(lambda: f.read(8192), b''):
      h.update(chunk)
  return h.hexdigest()

def collect(base: pathlib.Path, relroot: str, z: zipfile.ZipFile):
  for p in base.rglob('*'):
    if p.is_file():
      arc = f"{relroot}/{p.relative_to(base)}"
      z.write(p, arcname=arc)
      INDEX["files"].append({"path": arc, "sha256": sha256p(p)})

def main():
  ap = argparse.ArgumentParser()
  ap.add_argument('--out', default=str(ROOT/"audit"/"audit-pack.zip"))
  args = ap.parse_args()
  outp = pathlib.Path(args.out)
  outp.parent.mkdir(parents=True, exist_ok=True)

  with zipfile.ZipFile(outp, 'w', zipfile.ZIP_DEFLATED) as z:
    for k, v in SRC.items():
      if v.exists():
        collect(v, k, z)
    # include openapi and policy test results if present
    oas = ROOT/"partner-api"/"openapi.yaml"
    if oas.exists(): z.write(oas, arcname="api/openapi.yaml")
    for junit in ROOT.rglob('**/junit.xml'):
      z.write(junit, arcname=f"ci/{junit.name}")
    # write index.json inside the zip
    index_bytes = json.dumps(INDEX, indent=2).encode()
    z.writestr("index.json", index_bytes)

  # hash the whole pack and write manifest
  pack_hash = sha256p(outp)
  INDEX["hash"] = pack_hash
  manifest = outp.with_suffix('.manifest.json')
  manifest.write_text(json.dumps(INDEX, indent=2))

  # optional signing
  if os.getenv('AUDIT_SIGNING_KEY'):
    sig = subprocess.check_output(["openssl","dgst","-sha256","-sign",os.getenv('AUDIT_SIGNING_KEY'),outp])
    (outp.with_suffix('.sig')).write_bytes(sig)

  print(str(outp))

if __name__ == '__main__':
  main()
```

**Make Target:** `Makefile`

```makefile
.PHONY: audit-pack

audit-pack:
	python3 scripts/audit/make_audit_pack.py --out audit/audit-pack.zip
```

**CI Step (append to `.github/workflows/pcs.yml`):**

```yaml
build_audit_pack:
  needs: [verify]
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - name: Build Audit Pack
      run: |
        pipx run pip install --user 
        python3 scripts/audit/make_audit_pack.py --out audit/audit-pack-${{ github.sha }}.zip
    - uses: actions/upload-artifact@v4
      with:
        name: audit-pack
        path: audit/
```

---

## AF) Sprint 8 — Jan 20–Jan 31, 2026 (10 biz days)

**Sprint Goal:** **Pilot to Program** — operationalize partner feedback, extend receipts to **every Partner API response**, and ship **budget anomaly detection** with recommendations.

**Definition of Victory (DoV):**

- 100% Partner API responses include receipt headers and retrievable receipt detail.
- Feedback loop SLAs: triage <24h, fix/decision <3d for P1 issues.
- Budget anomaly detector catches ≥80% seeded anomalies with ≤5% false positives.

**Scope (In):**

1. **Receipts Everywhere**: header propagation middleware; `/receipts/{id}` caching; 30‑day retention.
2. **Feedback Ops**: partner portal updates; issue templates; webhook retries + signature verification.
3. **Budget Anomaly Detector v0.9**: simple statistical detector; dashboard surfacing; receipt linkages.
4. **Audit Pack V1.0**: finalize template, legal review, and NDA distribution process.

**Acceptance Criteria:**

- Contract tests show headers present on 100% responses; random sample receipts validate.
- Feedback SLA metrics green three weeks straight.
- Detector eval meets targets on test corpus; recommendations logged with rationale.

**Risks & Mitigations:** volume spikes → cache; feedback noise → triage rubric; detector drift → weekly retrain.

**Calendar:** Kickoff 1/20; SLA drill 1/23; Detector demo 1/29; Review 1/31.

**DoD‑Sprint 8:** Receipts ubiquity verified; feedback ops humming; anomaly detector v0.9 shipped with receipts and dashboard.
