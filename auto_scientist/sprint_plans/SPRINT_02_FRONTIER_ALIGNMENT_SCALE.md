# Sprint 02: Frontier Alignment & Oversight Scale-Up

## Sprint Goal

Ship **one IP-grade, benchmarked, integration-ready prototype** of the **Telemetry-Driven Alignment Loop** that demonstrates a defensible moat (Self-Correcting Telemetry Protocol) and can be demoed end-to-end in Summit/IntelGraph.

## Workstreams

### 1) SCOUT — Prior Art + Gap Attack

**Outcome:** a tight novelty map + 2–3 “attack vectors” with claim surface.

- [ ] Build **prior-art shortlist (10–20)**: Focus on "Human-in-the-loop RLHF" and "Telemetry-Aware DPO".
- [ ] Write **Novelty Matrix**: Our "Real-time Telemetry Feedback" vs generic "Dataset-based DPO".
- [ ] Define **benchmark target**: DPO success rate on real `server/src/telemetry` logs.
      **DoD:** `/auto_scientist/ip/prior_art.csv` + `/auto_scientist/design/novelty_matrix.md`.

### 2) ARCHITECT — Method + Spec + Interfaces

**Outcome:** an implementable spec that’s modular and defensible.

- [ ] Write formal **method spec**: `TelemetryConnector` -> `PreferenceBuilder` -> `AlignmentTrainer`.
- [ ] Define **interfaces**: `HumanReviewAPI` (inputs/outputs, telemetry hooks, policy hooks).
- [ ] Draft **threat model + mitigations**: Data poisoning via fake telemetry, PII leakage.
      **DoD:** `/auto_scientist/spec/method.md` + `/auto_scientist/integration/api_contract.md`.

### 3) EXPERIMENTALIST — Repro Harness + Baselines + Ablations

**Outcome:** reproducible benchmark delta (or a clear fail-fast result + pivot).

- [ ] Stand up **repro harness**: Simulate 10k telemetry events with known faults.
- [ ] Implement **baseline(s)**: Standard DPO without telemetry context.
- [ ] Run **core grid** + **ablations**: Telemetry-weighting factors.
      **DoD:** `make bootstrap && make test && make run` works; `/auto_scientist/experiments/results/*`.

### 4) IMPLEMENTATION — Reference Code + Tests + CI

**Outcome:** clean-room reference implementation with packaging hygiene.

- [ ] Implement core `TelemetryConnector` and `HumanReviewService`.
- [ ] Add unit tests + golden tests for `PreferenceBuilder`.
- [ ] Add CI (GitHub Actions) + lint/format + basic perf check.
      **DoD:** `/auto_scientist/impl/` library + `/tests/` + `.github/workflows/ci.yml`.

### 5) PATENT-COUNSEL — Claim Surface + Embodiments

**Outcome:** filing-ready scaffold, not just ideas.

- [ ] Draft `/auto_scientist/ip/draft_spec.md`: Figures showing "Telemetry Feedback Loop".
- [ ] Write `/auto_scientist/ip/claims.md`: **≥2 independent + ≥8 dependent** claims on "Self-Correcting Telemetry".
- [ ] Add design-arounds + enablement notes.
      **DoD:** claim set ties directly to method + integration + eval hooks.

### 6) COMMERCIALIZER — Licensable Unit + Partner Targets + Pricing Hypothesis

**Outcome:** a sellable “unit” and a short list of buyers.

- [ ] Identify **licensable units**: "Alignment-as-a-Service" SDK.
- [ ] Draft **one-page commercial brief** + ROI narrative.
- [ ] Build target list: 10–30 potential partners (Model Labs, Enterprises).
      **DoD:** `/auto_scientist/go/brief.md` + license menu.

### 7) COMPLIANCE/PROVENANCE — SBOM + Data Governance + Safety Hooks

**Outcome:** audit-ready traces and licensing hygiene from day 1.

- [ ] Generate third-party inventory + SPDX/SBOM stub.
- [ ] Document dataset provenance + PII handling policy for Preference Data.
- [ ] Add policy hooks (OPA) for Human Review escalation.
      **DoD:** `/auto_scientist/compliance/sbom.md` + `/auto_scientist/compliance/data_governance.md`.

## Sprint Backlog (Kanban Checklist)

**Must-have (commit):**

- [ ] Prior-art shortlist + novelty matrix
- [ ] Method spec + API contract
- [ ] Repro harness + baseline + our method MVP
- [ ] One benchmark report with ≥1 ablation
- [ ] Patent scaffold + claims (2 indep / 8 dep)
- [ ] Integration stub + demo script

**Should-have (stretch):**

- [ ] Perf optimization pass (p95/p99) for `AlignmentTrainer`
- [ ] Second dataset (Synthetic Telemetry)

**Won’t-do (explicitly out of scope):**

- [ ] Production UI (using simple CLI/API for now)
- [ ] Multi-region deployment

## Cadence

- **Day 1–2:** Scout + Architect lock spec + benchmark target
- **Day 3–6:** Implement MVP + harness + baseline
- **Day 7:** First results → go/no-go + pivot if needed
- **Day 8–10:** Ablations + integration stub + demo
- **Day 11–12:** Patent scaffold + claims finalize
- **Day 13–14:** Commercial brief + compliance pack + sprint review
