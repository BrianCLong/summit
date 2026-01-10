# Sprint 26 — Release Integrity + Audit Readiness (Planning Pack)

**Window:** 2026-01-05 → 2026-01-16 (10 working days)  
**Theme:** Evidence-first releases + docs gates  
**Sprint Goal:** Ship auditor-verifiable release evidence (GA tagging + signing + bundle) while keeping Golden Path green (`make smoke`).

This pack captures the issue body for planning, backlog mapping, board policies, acceptance criteria, and execution plan for Sprint 26. It aligns to the repo's Golden Path standard (`make smoke`) and 2-week cadence documented in the README.

---

## Paste-ready Sprint Planning Issue Body

Use this body when creating the GitHub issue titled `Sprint 26 — Release Integrity + Audit Readiness`:

```md
# Sprint 26 — Release Integrity + Audit Readiness

**Dates:** 2026-01-05 → 2026-01-16 (10 working days)  
**Theme:** Evidence-first releases + docs gates  
**Sprint Goal:** Ship auditor-verifiable release evidence (GA tagging + signing + evidence bundle) while keeping Golden Path green (`make smoke`).

---

## Scope (Committed)

### A) Release automation (GA tag + signing)

- [ ] Deliver: GA tag & release automation (#14701)
  - [ ] GA tagging script
  - [ ] Artifact signing integrated into release automation
  - [ ] Release pipeline publishes GA tag + signed artifacts

### B) Evidence bundle templates + per-release generation

- [ ] Deliver: Auditor-ready evidence bundle templates (#14698)
  - [ ] Define evidence bundle structure (contents + naming)
  - [ ] Auto-generate bundle per release/tag
  - [ ] Ensure traceability (commit SHA, workflow run id, checksums)

### C) Minimal docs + audit readiness slice (only what unblocks shipping)

- [ ] Epic slice: Documentation & Audit Readiness (#14697)
  - [ ] README truth audit (only sections impacted by release/evidence)
  - [ ] Security/operator guidance delta (only as needed to verify evidence)
  - [ ] SOC-style control mapping _stub_ (controls list + evidence pointers)

---

## Stretch (Pull only if committed work is green by Day 6)

- [ ] Epic slice: CI/CD, Supply Chain & Release Integrity (#14696)
  - [ ] SBOM generation MVP (attach to release)
  - [ ] Dependency vuln gating (warn-only → fail-later plan)
  - [ ] Build reproducibility check (documented plan + first runnable check)

---

## Definition of Done (DoD)

A story is Done only when:

- [ ] PR merged with review
- [ ] CI required checks pass
- [ ] Golden Path passes (`make smoke`)
- [ ] Evidence is reproducible: steps documented + verification command provided
- [ ] Release notes/doc delta updated (if behavior changes)
- [ ] No Sev1/Sev2 regressions introduced

---

## Capacity + WIP rules

- **Planned capacity:** 75–85% feature work, 15–25% interrupts/review/CI
- **WIP limit:** Max 2 items “In Progress” per dev; swarm to finish

---

## Risks / Mitigations

- Risk: Secret/signing integration blocks automation → Mitigate: start with repo-supported signing path; add follow-up for secrets hardening.
- Risk: Evidence bundle scope explodes → Mitigate: template first; add optional sections later.

---

## Ceremony notes

- Daily: 10 min standup focused on Sprint Goal
- Day 5: mid-sprint checkpoint (commitment vs reality)
- Review: demo “tag → pipeline → signed artifacts → evidence bundle → verify”
- Retro: 1 process improvement only (owner + due date)
```

---

## Sprint Backlog (Mapped to Existing Issues)

**Committed deliverables**

1. **#14701** Task: Produce GA tag & release automation.
2. **#14698** Task: Emit auditor-ready evidence bundle templates.
3. **#14697** Epic slice: Documentation & Audit Readiness (focused on verification enablement).

**Stretch**

- **#14696** Epic: CI/CD, Supply Chain & Release Integrity (SBOM/vuln gating/repro checks as MVPs).

---

## Board Setup (Kanban on GitHub Issues)

Columns: **Backlog** → **Ready** → **In Progress** → **In Review** → **Verify** → **Done**

Policies:

- **Ready** requires: owner + acceptance criteria + link to epic/task issue.
- **In Review** requires: CI green + test notes.
- **Verify** means: someone other than author ran the verification commands.

---

## Acceptance Criteria

### #14701 (GA tag + signing)

- A tagged release produces signed artifacts via automation.
- A verifier can confirm signatures using documented steps.

### #14698 (evidence bundle)

- Every release/tag produces an evidence bundle with at least commit SHA, workflow run reference, checksums, and signature verification instructions.
- Bundle location is consistent and discoverable (release assets or defined path).

### #14697 (docs slice)

- README/verification docs explicitly show how to run Golden Path (`make smoke`) and how to verify release evidence outputs.

---

## Day-by-Day Execution Plan

- **Days 1–2:** implement GA tag script + signing path (first end-to-end “tag → signed artifact”).
- **Days 3–4:** design evidence bundle template + generate bundle on release/tag.
- **Day 5:** checkpoint demo: “tag → pipeline → evidence” (even if rough).
- **Days 6–8:** docs slice: verification + README truth audit delta.
- **Days 9–10:** harden + polish; optionally pull one MVP from #14696.

---

## Notes for Sprint Creation

- Aligns to Golden Path guardrail (`make smoke`) and the published 2-week sprint cadence in the README.
- Keep evidence reproducibility in scope for every item: require verification commands in PR descriptions and in the evidence bundle template.
- If additional subtasks are needed, generate them as children of #14701 and #14698 to preserve traceability.
