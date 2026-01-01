# Sprint N+3 — Freeze, Certify, Release (Planning Pack)

**Window:** 2 weeks (targeting immediate next sprint)
**Theme:** Feature freeze discipline, certification evidence, reproducible release mechanics
**Sprint Goal:** Produce a release candidate that is certifiable, reproducible, and boring—safe to ship to a serious pilot with no caveats.

This pack turns the provided brief into paste-ready GitHub issues, acceptance gates, and execution scaffolding. Use it to instantiate the sprint board without further interpretation.

---

## Paste-ready Sprint Planning Issue Body

Use this body when creating the GitHub issue titled `Sprint N+3 — Freeze, Certify, Release`:

```md
# Sprint N+3 — Freeze, Certify, Release

**Window:** 2 weeks (current cadence)
**Sprint Goal:** Produce a certifiable, reproducible, boring release candidate.

---

## Commitments (Themes A–E)

### A) Feature Freeze & Change Control (Non-Negotiable)

- [ ] A1: Enforce feature freeze via `FEATURE_FREEZE=true` and CI gates (GraphQL schema, graph labels/edges, env var additions require ADR + approval).
- [ ] A2: PR change classification gate (`docs-only`, `bug-fix`, `refactor`, `breaking`), blocking `breaking` during freeze.

### B) Certification Pack (Evidence, Not Claims)

- [ ] B1: Security evidence pack (SBOM CycloneDX, CodeQL SAST summary, SCA summary, ZAP DAST baseline) with `docs/CERTIFICATION/security.md` documenting what/when/where.
- [ ] B2: Data integrity evidence: deterministic ingest→ER→canonical graph→simulation overlay run with canonical + overlay hashes and invariants documented.

### C) Release Candidate Hardening

- [ ] C1: Reproducible build & deploy: lock runtime versions, package lockfiles, Docker base digests; `make release-build` builds images, runs invariant gate, emits versioned artifacts.
- [ ] C2: Backup/restore proof: run backup + restore end-to-end, capture timings, success criteria, and RTO/RPO.

### D) Operator Readiness (Zero Guesswork)

- [ ] D1: Go/No-Go checklist finalized (`RUNBOOKS/go_no_go.md`) plus `make go-no-go` command that executes gates.
- [ ] D2: Known limits declaration (`docs/LIMITS.md`) linked from README.

### E) Release Mechanics

- [ ] E1: Semantic versioning introduced; cut `vX.Y.0-rc1` from main; release notes generated from PR labels.

---

## Acceptance Gates

- Feature surface is frozen and enforced; CI visibility + README badge for freeze status.
- No `breaking` changes during freeze; PR classification is mandatory.
- Security + data integrity evidence is captured and discoverable in one folder.
- Build/deploy is reproducible; artifact hashes are stable.
- Backup/restore works end-to-end with documented RTO/RPO.
- Operators have a deterministic Go/No-Go signal; limits are declared and linked.
- RC tag builds cleanly; release notes reflect actual labeled changes only.

---

## Working Agreements

- Keep Golden Path green; no scope creep beyond Themes A–E.
- Evidence > claims: every gate must produce an artifact or deterministic command.
- Document changes in-line (ADR for new env vars; change log updates alongside code).
```

---

## GitHub Issue Seeds (ready to copy)

1. **Feature Freeze & Change Classification Gate**
   - Scope: Implement `FEATURE_FREEZE=true`, CI guards for GraphQL/graph schema/env vars, PR type gate with `breaking` blocked under freeze; README badge for freeze status.
   - Acceptance: Net-new surface area blocked unless whitelisted; classification required on every PR.
   - Deliverables: CI jobs + docs update; whitelist mechanism documented.

2. **Security & Data Integrity Certification Pack**
   - Scope: Generate SBOM (CycloneDX), CodeQL SAST summary, SCA dependency summary, ZAP baseline; deterministic ingest→ER→canonical graph→overlay run with hashes; document all in `docs/CERTIFICATION/security.md` and `docs/CERTIFICATION/integrity.md`.
   - Acceptance: Single folder answers “Show me your security posture” and “Is the canonical graph deterministic?”
   - Deliverables: Evidence artifacts or CI links; documented commands + invariants.

3. **Reproducible Release Build + Backup/Restore Proof**
   - Scope: Lock Node/Python versions, package lockfiles, Docker base digests; add `make release-build`; execute backup→wipe→restore drill with timings.
   - Acceptance: Two clean machines yield identical artifact hashes; restore succeeds without manual steps; RTO/RPO recorded.
   - Deliverables: Make target, lock updates, restore report.

4. **Go/No-Go Tooling + Limits Declaration**
   - Scope: Finalize `RUNBOOKS/go_no_go.md` checklist; implement `make go-no-go`; declare `docs/LIMITS.md` and link from README.
   - Acceptance: One command reports ship/no-ship with gate statuses; limits clearly stated.
   - Deliverables: Runbook, make target, limits doc + README link.

5. **Versioning, RC Tag, Release Notes**
   - Scope: Introduce semantic versioning policy; produce `vX.Y.0-rc1` tag from main; generate release notes from PR labels.
   - Acceptance: RC tag builds cleanly; release notes mirror labeled changes only.
   - Deliverables: Versioning doc/update, tagging script or instructions, release notes pipeline output.

---

## Execution Checklist (Day-by-Day Skeleton)

- **Day 1–2:** Enable `FEATURE_FREEZE=true`, land CI guards, require PR classification; add README badge.
- **Day 2–4:** Produce security evidence (SBOM, SAST, SCA, ZAP); document in `docs/CERTIFICATION/security.md` with artifact locations.
- **Day 4–6:** Run deterministic ingest→canonical→overlay flow; record hashes + invariants in `docs/CERTIFICATION/integrity.md`.
- **Day 6–8:** Lock runtime versions, base images; wire `make release-build`; execute backup→wipe→restore drill and log timings.
- **Day 8–10:** Finalize Go/No-Go checklist + `make go-no-go`; publish `docs/LIMITS.md` and link from README.
- **Day 10:** Tag `vX.Y.0-rc1`, generate release notes from labels; verify RC build and evidence bundle.

---

## Acceptance Evidence Bundle (recommended layout)

```
docs/CERTIFICATION/
├── security.md           # Evidence summary + artifact links
├── integrity.md          # Deterministic run, hashes, invariants
└── artifacts/
    ├── sbom/             # CycloneDX output(s)
    ├── sast/             # CodeQL reports
    ├── sca/              # Dependency scan results
    └── dast/             # ZAP baselines
```

Keep artifacts referenced by stable relative paths so CI and auditors can fetch them.

---

## PR Plan

- **PR-1:** Feature freeze + change classification gate.
- **PR-2:** Security & data integrity certification pack.
- **PR-3:** Reproducible release build + backup/restore proof.
- **PR-4:** Go/No-Go tooling + limits declaration.
- **PR-5:** Versioning + RC tag + release notes.

Each PR must label change type and attach evidence for its gates.

---

## Risks & Mitigations

- **Risk:** New surface area slips through schema diff. **Mitigation:** Schema snapshot comparison + whitelist file reviewed per PR.
- **Risk:** Evidence artifacts drift. **Mitigation:** Pin tool versions; store hashes alongside artifacts; verify in CI.
- **Risk:** Backup/restore not deterministic. **Mitigation:** Run drill twice; compare hashes and timings; gate `go-no-go` on success.
- **Risk:** Release notes mismatch reality. **Mitigation:** Enforce PR labels; generate notes from labels only; review before tagging.

---

## Definition of Done (Sprint level)

- Freeze gates block unauthorized surface changes; badge visible in README/CI output.
- Security and data integrity packs present with verifiable artifacts and commands.
- `make release-build` produces identical artifacts across two clean machines.
- Backup/restore drill passes with documented RTO/RPO.
- `make go-no-go` reports all gates green; limits declared and linked.
- `vX.Y.0-rc1` tag exists, builds cleanly, and release notes align with PR labels.
