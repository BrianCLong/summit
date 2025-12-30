# Sprint: Greenline + Evidence (Jan 5–Jan 16, 2026)

**Cadence:** 2-week cycle • Golden Path gates required (`make smoke` baseline)

**Sprint Goal:** Restore end-to-end delivery confidence by (1) re-establishing a stable green CI baseline, (2) wiring the first enforceable regression/coverage guardrails, and (3) shipping release attestation evidence on tags.

## Product Backlog (sources)

- #10152 — CI repair / minimal green baseline
- #10149 — Regression test matrix & coverage enforcement (tagging + enforcement)
- #10148 — Compliance & attestation automation (SLSA/provenance/signing)
- (Stretch) #10150 — LLM ops & model evaluation harness
- (Stretch) #10141 — Documentation overhaul (Golden Path + CI expectations)

## Sprint Backlog (committed scope)

### SB-1: Green baseline restored + gated re-entry plan (anchors #10152)

- ✅ Core + Security (light) pipeline green & repeatable; steps documented for local repro
- ✅ Heavy gates re-enabled via phased plan (Phase 1/2/3) with success criteria per phase
- ✅ Single status page/issue comment template for CI state updates
  **Tasks**
- [ ] Top 3 flaky/failing workflows identified; root causes bucketed (infra vs test vs config)
- [ ] Add “CI Baseline” workflow profile (minimal set) + doc on pause/resume rules
- [ ] Define phased gates + criteria (e.g., “10 consecutive green runs” before phase bump)

### SB-2: Regression matrix MVP — tagging + CI reporting + enforceable threshold (anchors #10149)

- ✅ Tagging scheme for core workflows/tests (feature/service)
- ✅ CI emits per-feature coverage report; fails below agreed threshold (start narrow)
- ✅ Minimal dashboard/report artifact linked from docs/README
  **Tasks**
- [ ] Define tagging conventions (`feature:*`, `service:*`, etc.) and retrofit top-N workflows
- [ ] Implement CI step to compute/aggregate coverage by tag
- [ ] Add enforcement rule + timeboxed exception mechanism
- [ ] Publish report artifact + link from docs

### SB-3: Release attestation on tags (SLSA/provenance/signatures) MVP (anchors #10148)

- ✅ On release/tag, pipeline generates provenance + attestation and signs artifacts
- ✅ Evidence stored/published in auditable location (release assets or evidence path)
- ✅ Mapping doc: what evidence is produced, where it lives, how to verify
  **Tasks**
- [ ] Add release workflow steps for provenance/attestation + signing
- [ ] Decide evidence storage location and implement export
- [ ] Document verification steps (developer-friendly)

## Stretch scope (pull only if committed scope on-track)

- ST-1 (#10150): LLM telemetry primitives (latency/errors/cost) + golden-set runner skeleton
- ST-2 (#10141): Docs patch (Golden Path + CI expectations + badges)

## Definition of Done (applies to every story)

- Code merged via PR with review
- CI green on required workflows; no new flakes
- Tests added/updated (unit/integration as appropriate)
- Docs updated (runbook/README/ADR if architectural)
- Observability for new pipeline steps where relevant
- Golden Path remains runnable (`make smoke` passes)

## Ceremony plan

- **Standup prompt:** What moved to Done? What lands today (PR link)? What’s blocked?
- **Mid-sprint (Day 5):** SB-1 & SB-2 trending? Freeze stretch if CI unstable.
- **Sprint Review:** Show CI baseline + phased gates; coverage report/enforcement; tagged release with attestations + verification steps.
- **Retro prompts:** Which gate saved pain? Biggest flake root cause category? One process tweak to reduce CI tax next sprint.

## Risks & mitigations

- CI instability absorbs sprint → Prioritize SB-1; enforce merge discipline.
- Coverage enforcement too broad → Start narrow (top workflows), expand later.
- Attestation/signing secrets complexity → MVP with current secrets; Vault integration later.

## References

- Golden Path & CI cadence: repo README
- Quality gates: `make smoke` as baseline; heavier gates phased per SB-1 plan
- Attestation expectations: release/tag workflows (SB-3)
