# Codex Desktop Project: Summit GA Control Room

**Authority anchor:** [Summit Readiness Assertion](../SUMMIT_READINESS_ASSERTION.md).

## Project Setup (Codex Desktop)

- **Name:** `Summit GA Control Room`
- **Root:** `<local>/summit`
- **Default branch:** `main`
- **Safe commands (allowlist):**
  - `git status`, `git fetch`, `git switch`
  - `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm run test:e2e`, `pnpm run playwright` (read-only test execution)
  - `gh pr view`, `gh run view`, `gh run list`, `gh run watch` (read-only)
  - **No destructive writes without explicit approval.**

## Thread Catalog (Saved Threads + Checklists)

### 1) GA CI Monitor

**Mission:** Provide daily GA CI health status + blockers with evidence-backed links.

**Checklist (run in order):**
1. Pull `main` and refresh local state.
2. Read GA CI gates + required check name mappings:
   - `required_checks.todo.md`
   - `.github/workflows/pr-quality-gate.yml`
3. Review GA readiness tracker:
   - `GA_TRACKING.md`
4. Output a **“Today’s GA Blockers”** note with:
   - Status summary
   - Any red/amber CI signals
   - Actionable next step for owners

### 2) Security Evidence Auditor

**Mission:** Confirm GA security/evidence posture; separate GA blockers vs post-GA gaps.

**Checklist (run in order):**
1. Read security gate documentation and local verification steps:
   - `SECURITY_GA_GATE.md`
   - `scripts/check-ga-policy.sh`
2. Validate compliance evidence index and mappings:
   - `COMPLIANCE_EVIDENCE_INDEX.md`
   - `COMPLIANCE_CONTROLS.md`
3. Inspect governance/OPA references:
   - `policy/ga-gate.rego`
   - `docs/policies/trust-policy.yaml`
4. Emit two lists:
   - **GA-blocking gaps** (must be fixed before GA)
   - **Post-GA gaps** (candidate backlog)

### 3) Ops & Incident Console

**Mission:** Convert Ops/Incident guidance into executable GA checklists.

**Checklist (run in order):**
1. Open GA war-room cadence + roles:
   - `docs/GA_WAR_ROOM.md`
2. Open operational incident response procedures:
   - `docs/operations/INCIDENT_RESPONSE.md`
   - `docs/operations/ON_CALL_GUIDE.md`
3. Produce **three explicit checklists** with commands/dashboards:
   - **Pre-GA**
   - **GA Cut**
   - **Hypercare**

## Daily GA Loop Wiring

1. Launch Codex Desktop → open **Summit GA Control Room**.
2. Run **GA CI Monitor** first (publish blockers note to Notion / `docs/roadmap/STATUS.json`).
3. Run **Security Evidence Auditor** when security or compliance work is planned.
4. Run **Ops & Incident Console** on launch-week days or when a P0/P1 incident starts.

## Evidence-First Output Standard (UEF)

**Output standards:** Evidence-first notes, link to files, and mark any missing data as **“Deferred pending X”** or **“Intentionally constrained.”** Treat external API access gaps as **Governed Exceptions** with explicit follow‑up owners.

**UEF Template (use in every thread output):**
- **UEF / Sensing:** raw evidence list with file paths + commands.
- **UEF / Reasoning:** judgments, gaps, actions, and owners.

## MAESTRO Alignment (Required)

- **MAESTRO Layers:** Foundation, Agents, Tools, Observability, Security.
- **Threats Considered:** goal manipulation, prompt injection, tool abuse, evidence drift.
- **Mitigations:** evidence-first outputs, prompt registry enforcement, DecisionLedger entry with rollback path, and boundary checks.
