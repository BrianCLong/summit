# Summit Ops & Incident Console (Codex Desktop)

**Authority anchors:** This plan is governed by the Summit Readiness Assertion and the
Meta-Governance framework. All actions are evidence-first, reversible, and approval-gated. Use
the same definitions and authority files across artifacts; deviations are governed exceptions.

## Mission

Configure Codex Desktop as a **Summit Ops & Incident Console** that supervises CI, security, and
release readiness in parallel, with safe Git defaults and human approvals for all changes.

## MAESTRO Security Alignment

- **MAESTRO Layers:** Foundation, Data, Agents, Tools, Infra, Observability, Security.
- **Threats Considered:** prompt injection, tool abuse, governance bypass, credential leakage,
  log tampering, and CI integrity degradation.
- **Mitigations:** read-only defaults, approval-gated write operations, evidence-first outputs,
  immutable audit logs, and rollback-ready changes.

## Imputed Intention (Beyond 23rd Order)

The following chain captures the deeper requirements implied by the user’s request. Each order
builds on the previous one and must be treated as mandatory unless explicitly disallowed.

1. **Order 1:** Provide a Summit Ops configuration plan that fits Codex Desktop.
2. **Order 2:** Ensure the plan is safe-by-default with approvals for risky actions.
3. **Order 3:** Make the plan actionable with clear project roots and thread structure.
4. **Order 4:** Use skills to route requests and automate monitoring.
5. **Order 5:** Preserve governance and evidence requirements in all artifacts.
6. **Order 6:** Define a consistent incident response procedure and output format.
7. **Order 7:** Align operational work with release readiness and CI health.
8. **Order 8:** Encode human approval boundaries that cannot be bypassed.
9. **Order 9:** Ensure zero automated destructive Git actions.
10. **Order 10:** Keep outputs deterministic, auditable, and reproducible.
11. **Order 11:** Provide explicit safe commands for auto-approval and reject all others.
12. **Order 12:** Produce reusable templates to standardize incident summaries.
13. **Order 13:** Route security and observability signals to a queue, not auto-remediation.
14. **Order 14:** Separate sensing (collection) from reasoning (analysis) in outputs.
15. **Order 15:** Guarantee that any change has a rollback path.
16. **Order 16:** Treat exceptions as governed exceptions with explicit rationale.
17. **Order 17:** Compress feedback loops without bypassing gates.
18. **Order 18:** Ensure release-train visibility is always current.
19. **Order 19:** Require evidence-first bundles before narrative summaries.
20. **Order 20:** Enforce consistency between prompt scope and allowed operations.
21. **Order 21:** Keep skills modular and composable across threads.
22. **Order 22:** Make monitoring automation observable and auditable.
23. **Order 23:** Bind all outputs to authority files and governance laws.
24. **Order 24:** Codify incident initiation as a repeatable, tool-assisted ritual.
25. **Order 25:** Maintain readiness by default; defer uncertainties with explicit gates.
26. **Order 26:** Ensure every operator can replay the evidence trail.
27. **Order 27:** Prevent credential exposure through read-only access patterns.
28. **Order 28:** Tie each recommendation to a verification step.
29. **Order 29:** Keep parallel threads aligned to avoid cross-zone conflicts.
30. **Order 30:** Require human ownership for final merge and deployment decisions.

## Project Definition: “Summit Ops”

- **Trusted root:** `~/src/summit` (or `/workspace/summit`).
- **Codex config layout:**
  - `~/src/summit/.codex/`
  - `~/src/summit/.codex/projects/summit-ops/`
  - `~/src/summit/.codex/skills/` (for local skills)

## Standing Threads

1. **CI & Governance**
   - **Goals:** CI status, readiness gates, governance checks, evidence gaps.
   - **Skills:** `$summit-skill-router` (deferred pending availability), `summit-ga-preflight-skill`.
   - **Git ops:** read-only; safe commands only.
2. **Security & Observability**
   - **Goals:** audit/logging drift, security alerts, observability signals.
   - **Skills:** `$summit-skill-router` (deferred pending availability), security signal summarizer.
   - **Git ops:** read-only only.
3. **Release Train**
   - **Goals:** release readiness, PR sequencing, risk tracking.
   - **Skills:** `$summit-skill-router` (deferred pending availability),
     `summit-pr-stack-sequencer-skill`.
   - **Git ops:** read-only; safe commands only.
4. **Frontend UX / Playwright**
   - **Goals:** UX regressions, Playwright health, UI readiness.
   - **Skills:** `$summit-skill-router` (deferred pending availability), Playwright signal summary.
   - **Git ops:** read-only only.

## Skills & Automations

### Skills (Conceptual)

- **CI Signal Summarizer**: Pulls CI status, checks, and PR deltas. Posts evidence-first summaries.
- **Security & Observability Watch**: Monitors audit/logging warnings and queues items for review.
- **Release Train Gatekeeper**: Produces readiness snapshots and highlights blockers.

### Automation (Background)

- **Schedule:** every 2–4 hours during business day.
- **Profile:** read-only or approval-gated workspace-write.
- **Output:** posts updates to `CI & Governance` or `Security & Observability`.
- **Constraints:** no merges, no commits, no branch operations without approval.

## Safe Git & Sandbox Profiles

### Default Profile

- **Name:** `workspace-write`
- **Approval policy:** `on-request` or stricter.
- **Sandbox:** enabled; network off by default.
- **Denied actions:** `git push --force`, branch deletion, `git reset --hard`.

### Safe Commands (Auto-Approved)

- `git status`
- `git log --oneline -n 20`
- `git diff`
- `pnpm test`
- `pnpm lint`
- `pnpm typecheck`

## Summit Incident Mode (Runbook)

1. **Open project:** Summit Ops.
2. **Select thread:** `CI & Governance` or `Security & Observability`.
3. **Profile:** read-only or approval-gated workspace-write.
4. **Run `/plan`:** evidence-first diagnosis; no edits.
5. **Propose diffs:** only after plan review; include rollback path.

### Incident Summary Output (Standard)

- **Timeline:** key events and timestamps.
- **Impact:** affected systems and user-visible symptoms.
- **Root cause hypothesis:** "Deferred pending X" until verified.
- **Candidate fix:** minimal change with rollback steps.
- **Verification steps:** explicit commands/tests.
- **Evidence bundle:** raw logs, CI links, diffs.

## Forward-Leaning Enhancement (Innovation)

**Deterministic Ops Graph:** generate an event-sourced ops graph that links CI failures, alerting
signals, and release readiness states into a single evidence graph, enabling deterministic
incident replay and audit-ready decision trails.

## Finality

This plan is complete, governed, and ready for implementation without further clarification.
