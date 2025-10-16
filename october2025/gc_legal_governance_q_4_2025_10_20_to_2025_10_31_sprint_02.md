# General Counsel Workstream — Q4 Cadence Sprint 2 (v1)

**File:** gc-legal-governance-q4-2025-10-20_to_2025-10-31-sprint-02  
**Role:** I. Foster Dullness, LL.M. — General Counsel (Lawfare, Policy, Governance, Disclosure)  
**Window:** **Oct 20 – Oct 31, 2025**  
**Mandate:** Scale the legal release gate from pilot → program. Add risk‑weighted AI evals, third‑party impact coverage, explainability hooks, automated claims diff, and auditor‑ready control narratives. Two more product repos to green. Zero waivers older than 7 days.

---

## 0) Linkage to Sprint 1 Outcomes

**From Sprint 1:** Gate v0.9, Disclosure Pack v0.9, DPIA short form, basic export check, SBOM/License policy, Incident/Hold matrix, pilots integrated.  
**Carryovers:** Expand AI evals, TPIA, claims diff, fingerprint/Explainability linking, auditor narrative polish.

---

## 1) Sprint Goal (Two‑Week Outcome)

**“Every release candidate produces an auditor‑legible Disclosure Pack v1.1 with enhanced AI risk evals and claims diffs; `.legal/` folder becomes a reusable, versioned product with explainability and fingerprint hooks.”**

**Definition of Done**

- **Gate v1.1** rules enforce: eval risk tiers, TPIA presence for upstream vendors, claims‑diff check, and fingerprint registration.
- **Disclosure Pack v1.1** generated automatically in CI with JSON schema validation.
- **Explainability Stub API** endpoint registered and linked in the pack (even if behind feature flag).
- **Two additional repos** pass v1.1 gate (total ≥4 repos on program).
- **Auditor bundle** (control narratives + evidence links) exportable from pack.

---

## 2) Deliverables (Ship This Sprint)

1. **Gate v1.1 (OPA/Rego)** — add risk tiers, TPIA, claims‑diff, fingerprint required on model bumps.
2. **Disclosure Pack v1.1** — JSON schema + validator; new sections for TPIA and Explainability.
3. **Claims‑Diff Bot** — GH Action that compares `/claims.md` to last release; requires substantiation.
4. **Fingerprint Registry Client** — CLI stub to register model/prompt fingerprints; writes ids into pack.
5. **Explainability Stub** — minimal API contract + 200/501 responses; URL recorded per release.
6. **Auditor Narrative Kit** — SOC2/ISO crosswalk expanded; evidence pointers standardized.
7. **TPIA Template** — third‑party model/vendor assessment short form.
8. **Waiver Lifecycle** — auto‑expire at 7 days; approval + mitigation required.

---

## 3) Work Plan (Swimlanes & Tasks)

**Lane A — Gate & CI**

- A1. Extend `gate.rego` to include `risk_tier`, `tpia_ok`, `claims_diff_ok`, `fingerprint_registered`.
- A2. Add JSON Schema validation step using `disclosure.schema.json`.
- A3. Create reusable GH Action `.github/actions/legal-gate@v1` wrapping `run_gate.sh`.
- A4. Migrate pilots to v1.1; integrate two new repos.

**Lane B — Evidence & Explainability**

- B1. Publish **Explainability Stub** (internal service or function) with contract in `/docs/explainability.md`.
- B2. Add `explainability_endpoint` to `release.json` + healthcheck proof.
- B3. Wire fingerprint client in CI to produce `fingerprint.txt` and update `model_sheet.md`.

**Lane C — AI Risk & TPIA**

- C1. Define **risk tiers** (L0–L3) mapping to eval battery requirements.
- C2. Publish **TPIA.md** template; require for any upstream model/API in bill of materials.
- C3. Update `eval_summary.md` to record tier, thresholds, and pass/fail.

**Lane D — Claims & Auditor Bundle**

- D1. Implement **claims‑diff** GH Action with PR annotations.
- D2. Create **Auditor Bundle** export (`auditor-bundle.zip`) containing `controls_map.md`, SBOM attestation, evals, DPIA/TPIA, export check, incident matrix.
- D3. Flesh out control narratives to “test steps + evidence pointers.”

**Lane E — Governance Ops**

- E1. Waiver policy enforcement (auto‑expire; slack/email alerts).
- E2. Weekly review: red issues, expired waivers, and claims anomalies.
- E3. Training: 30‑min enablement for repo owners on `.legal/` v1.1.

---

## 4) Policy‑as‑Code — Gate v1.1 (Rego)

```rego
package legal.gate

default allow := false

# Inputs
# input.features: [{name, pii, paid, risk_tier}]
# input.models: { delta: bool, fingerprint_registered: bool }
# input.third_parties: [{name, type, requires_tpia, tpia_present}]
# input.results: { license_policy, evals: { passed, tier }, export_check, claims_diff: { changed, substantiated } }
# input.artifacts: { sbom, dpia, tpia, disclosure_valid }

# Baselines
sbom_present { input.artifacts.sbom }
license_ok { input.results.license_policy == "green" }

# DPIA when any feature touches PII
needs_dpia { some f in input.features; f.pii }
dpia_ok { needs_dpia; input.artifacts.dpia }
dpia_ok { not needs_dpia }

# TPIA required when third‑party components are used in decisioning or data processing
needs_tpia { some t in input.third_parties; t.requires_tpia }
tpia_ok { not needs_tpia }
tpia_ok { needs_tpia; input.artifacts.tpia }

# Model changes require evals at or above risk tier threshold and fingerprint registration
model_changed { input.models.delta }

required_tier := max([f.risk_tier | f := input.features][_])

# Map risk tier to eval tier (L0..L3)
# If no features specified, default to L1
required_tier_fallback := 1

has_features { count(input.features) > 0 }

needed := required_tier { has_features }
needed := required_tier_fallback { not has_features }

evals_ok {
  not model_changed
}
evals_ok {
  model_changed
  input.results.evals.passed
  input.results.evals.tier >= needed
  input.models.fingerprint_registered
}

# Export/sanctions when paid features toggle
paid { some f in input.features; f.paid }
export_ok { not paid }
export_ok { paid; input.results.export_check == "green" }

# Claims diff must be substantiated if changed
claims_ok { not input.results.claims_diff.changed }
claims_ok { input.results.claims_diff.changed; input.results.claims_diff.substantiated }

# Disclosure pack must validate against schema
pack_valid { input.artifacts.disclosure_valid }

allow { sbom_present; license_ok; dpia_ok; tpia_ok; evals_ok; export_ok; claims_ok; pack_valid }
```

---

## 5) Disclosure Pack v1.1 — JSON Schema (excerpt)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "DisclosurePack",
  "type": "object",
  "required": [
    "release",
    "privacy",
    "ai",
    "oss",
    "export",
    "incident",
    "controls"
  ],
  "properties": {
    "release": {
      "type": "object",
      "required": [
        "repo",
        "commit",
        "region",
        "features",
        "explainability_endpoint"
      ],
      "properties": {
        "repo": { "type": "string" },
        "commit": { "type": "string" },
        "region": { "type": "string" },
        "features": { "type": "array" },
        "explainability_endpoint": { "type": "string" }
      }
    },
    "ai": {
      "type": "object",
      "required": ["model_sheet", "eval_summary", "fingerprint"],
      "properties": {
        "model_sheet": { "type": "string" },
        "eval_summary": { "type": "string" },
        "fingerprint": { "type": "string" }
      }
    }
  }
}
```

---

## 6) Claims‑Diff Bot — GitHub Action (workflow)

```yaml
name: Claims Diff
on:
  pull_request:
    paths:
      - 'disclosure/claims.md'
jobs:
  claims:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Diff claims against last release
        run: |
          .legal/claims_diff.py --base main --file disclosure/claims.md > claims.diff
      - name: Require substantiation
        run: |
          if grep -q '^+' claims.diff; then
            if [ ! -f disclosure/evidence.md ]; then
              echo 'New/changed claims require evidence.md' >&2
              exit 1
            fi
          fi
      - name: Upload artifact
        uses: actions/upload-artifact@v4
        with:
          name: claims-diff
          path: claims.diff
```

---

## 7) Fingerprint Registry — CLI Stub

```bash
# .legal/fingerprint.sh
set -euo pipefail
MODEL_NAME="$1"; VERSION="$2"; CANON_HASH=$(git rev-parse HEAD)
FPRINT=$(printf "%s:%s:%s" "$MODEL_NAME" "$VERSION" "$CANON_HASH" | sha256sum | awk '{print $1}')
echo "$FPRINT" > disclosure/ai/fingerprint.txt
# TODO: POST to registry when available
```

---

## 8) Explainability Stub — API Contract

```
GET /v1/explainability/health -> 200 {"status":"ok"}
POST /v1/explainability/explain
  { "input_id": "<uuid>", "model": "<name>", "version": "<semver>", "prompt": "<redacted/ref>", "output": "<ref>", "mode": "feature|saliency|trace" }
  -> 501 until fully implemented; record endpoint & auth policy in release.json
```

---

## 9) TPIA — Short Form Template

```
# Third‑Party Impact Assessment (TPIA) — <Vendor/Model>
- Service Description & Use Context:
- Data Categories Shared/Processed:
- Jurisdictions & Subprocessors:
- Security Posture (certs, reports):
- Model/Content Risks (bias, toxicity, leakage):
- Contractual Controls (DPAs, SLAs, flow‑downs):
- Residual Risk & Mitigations:
- Approval (Owner/DPO/GC):
```

---

## 10) Control Narrative Crosswalk (expanded)

| Gate Check          | SOC 2 | ISO 27001 | AI Policy | Evidence Pointer                                     |
| ------------------- | ----- | --------- | --------- | ---------------------------------------------------- |
| Claims Diff         | CC2.3 | A.5       | GOV‑01    | `disclosure/claims.md`, `claims.diff`, `evidence.md` |
| TPIA                | CC3.2 | A.15      | PR‑03     | `disclosure/privacy/tpia.md`                         |
| Explainability Hook | CC7.2 | A.8       | AI‑04     | `release.json:explainability_endpoint`               |
| Fingerprint Reg.    | CC8.1 | A.8       | AI‑05     | `ai/fingerprint.txt`                                 |
| Risk‑Tier Evals     | CC7.3 | A.8       | AI‑03     | `ai/eval_summary.md`                                 |

---

## 11) Acceptance Criteria & Demos

- ✅ Gate v1.1 merged and used by ≥4 repos; CI evidence attached.
- ✅ Disclosure Pack v1.1 validates against schema in CI.
- ✅ Claims‑diff action blocks unsubstantiated changes.
- ✅ Explainability endpoint recorded and health‑checked.
- ✅ Auditor bundle exports with consistent narratives.

**Demo Script:** Trigger release → gate runs → schema validation → claims‑diff passes → fingerprint written → open pack and auditor bundle; show eval tier matrix.

---

## 12) Risks & Mitigations

- **Explainability dependency churn** → keep stub minimal; 501 for compute‑heavy modes; document.
- **False gate failures** → add `--debug` mode; publish sample `gate_input.json`.
- **Team adoption** → ship GH Action + 30‑min training + starter PRs.
- **Vendor opacity** → TPIA requires minimum disclosures; if absent, mark higher risk tier.

---

## 13) Operating Cadence

- **Mon:** Kickoff; migrate pilots to v1.1.
- **Tue/Thu:** Joint stand‑up w/ SecDevOps + ML leads on eval tiers & failures.
- **Wed:** TPIA review clinic.
- **Fri:** Auditor bundle dry‑run; waiver burn‑down.

---

## 14) Scaffolding — Repo Drop‑Ins (Sprint 2 additions)

```
/.legal/
  gate.rego                  # v1.1 rules
  disclosure.schema.json
  fingerprint.sh
  claims_diff.py
/docs/
  explainability.md
.github/
  workflows/claims-diff.yml
  actions/legal-gate/
    action.yml
    entrypoint.sh
```

> **Legitimacy as cover; velocity as strategy. We ship proof, not promises.**
