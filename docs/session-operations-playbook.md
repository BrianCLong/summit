# Session Operations Playbook

This playbook defines the day-to-day operating model for running Jules-style sessions at scale so Summit/IntelGraph workstreams stay unblocked, continuously produce PR-ready output, and maintain quality across security, data integrity, graph correctness, and UX.

## Success Criteria
- Continuous forward motion: every cycle either closes a PR or advances a session with a concrete, high-value step.
- Clean, reviewable diffs: no drift, no noise, and clear commit/PR messages.
- Verified health: relevant tests, lint, and safety checks run before marking PR-ready.
- Balanced coverage: no “cold” category; rotation keeps security, data, golden path, CI, graph, infra, UX, and analytics advancing.

## Core Loop
1. Sweep all active sessions (max 15).
2. For each session, decide if it is PR-ready:
   - **If yes:** run targeted checks, clean diffs, craft PR title/body, and open the PR.
   - **If PR already exists:** archive the session after confirming status and follow-ups.
   - **If not ready:** record the single highest-value next action (code, tests, docs, unblock).
3. Ensure at least one slot stays free; if full, fast-track the nearest-to-finish session.
4. Immediately start the next priority prompt when a slot is open.

### Per-Cycle Runbook
- **Start clean:** `git status` empty, branch up-to-date, sanitizer scripts run if present.
- **Close the ready ones first:** finish PR-ready sessions before picking new work.
- **Refresh backlog pointers:** confirm the next prompt per category is still valid; replace stale prompts.
- **Enforce hygiene:** sanitize diffs (no binaries/secrets), rerun quick checks after last-minute edits.
- **Publish updates:** post the session update template after each sweep so stakeholders see progress.

### When a Session Stalls
- Re-evaluate scope; trim to a shippable slice that still moves the main objective.
- Add the blocker to the update; if the blocker is external, switch sessions after logging the ask.
- If two cycles pass without movement, start a short-lived **rescue** or **unblocker** session.

## Capacity Management
- Maximum concurrent sessions: **15**.
- Free a slot by:
  - Closing sessions with completed PRs (confirm checks/approvals merged).
  - Fast-tracking the closest-to-done session (stabilize, test, PR, archive).
  - Merging or archiving stale/blocked sessions once blockers are documented.
- Keep a standing “fast lane” slot for urgent fixes or governance prompts.

### Capacity Safety Rails
- Never open a new prompt until at least one session is archived or merged.
- If capacity is hard-capped, **finish the shortest path to a PR**, not the most ambitious scope.
- Rotate the fast lane among categories so security/data/golden-path items do not starve.

## Rotation Model
Keep all categories warm and security-first:
- Priority order when selecting the next prompt: **Security → Data Integrity → Golden Path → CI Stability → Graph → Infrastructure → UX → Analytics**.
- Inject governance/documentation upgrades every 12 cycles; upgrade scheduler/orchestrator every 30 cycles.
- If a category is “cold” (no movement in the last two sweeps), pick from that backlog even if lower priority.
- After any incident or regression, schedule a follow-up hardening prompt within the next two cycles.

### Backfill Discipline
- Maintain an **active** and **reserve** backlog per category; pull from active, refill from reserve weekly.
- After closing a PR in any category, immediately enqueue the next prompt from that category.
- If a prompt becomes obsolete, replace it with a fresher variant before the next sweep.

## Update & Communication Template
Use this exact format for status broadcasts:
```
=== SESSION UPDATE: <session name> ===

STATUS:
<PR-ready | needs more work | PR created | archived>

ACTIONS PERFORMED:
- <bullet list of tangible work completed>

NEXT ACTION:
<the single highest-value step to advance the session>

IF PR CREATED:
<PR title>
<PR body>
<changes summary>
```

## PR-Readiness Checklist
- **Diff hygiene:** no stray files, secrets, or large/binary artifacts unless required.
- **Quality gates:** run relevant unit/integration/e2e tests; add lint/format checks if code touched.
- **Security posture:** confirm authz/authn, policy, and data-handling changes are covered by tests.
- **Docs:** update READMEs/runbooks/ADR snippets when behavior or workflows change.
- **Rollout & rollback:** describe deployment impact, toggles/flags, and a simple rollback plan.
- **Conventional Commit + PR clarity:** succinct title/body that highlights risk, testing, and scope.

### Fast PR Path
- Prefer small, reviewable slices that land quickly; chain follow-ups rather than holding a monolithic change.
- Attach minimal proof (test output or lint summary) to the PR description.
- Re-run the smallest meaningful check set after any rebase or conflict resolution.

## Blocker Handling
- If blocked externally, log the blocker in the session update and switch to the next session.
- If multiple sessions are blocked in the same area, spin up a short-lived **unblocker** session to clear the path.
- Escalate aging blockers after two cycles with a proposed mitigation or dependency owner.

## Observability & Quality Signals
- Capture minimal proof of health before marking PR-ready: test output, lint summary, or targeted check logs.
- Note flakiness or slow steps; queue deflake/hardening prompts in the next rotation.
- Track category-level drift (e.g., rising test duration, falling coverage) and schedule corrective prompts.

### Backpressure & Performance Safeguards
- Watch for queue buildup (too many in “needs more work”); prioritize those with the fewest remaining steps.
- If test or lint runtimes spike, carve out a deflake/optimization prompt within the next two cycles.
- When observability gaps surface, file a follow-up with explicit metrics/traces to add.

## Post-Merge Follow-Through
- Spot-check merged changes in the target environment when feasible (smoke or synthetic run).
- Confirm monitors/dashboards/alerts reflect the new behavior or SLOs.
- Record lessons learned and update the rotation/backlog to prevent repeat regressions.

### Sustain Momentum After Merge
- Keep a tiny backlog of “post-merge polish” tasks (docs, dashboards, toggles) and clear them within 48 hours.
- If an incident surfaced during rollout, schedule a retro + hardening prompt in the next cycle.

## Rapid Rescue Path (When Behind or At Capacity)
- Select the fastest-to-finish session; enforce a 3-step sprint: stabilize → test → PR/merge.
- Shed low-value or stale prompts; replace with high-leverage fixes or governance items.
- Temporarily narrow scope to land incremental PRs that unblock broader work.

## Automation: Session Sweeper Utility
Use `tools/session_sweeper.py` to generate an actionable plan that frees capacity and backfills cold categories.

### Expected Input
JSON array of session objects:
```json
[
  {
    "name": "timeline-ui",
    "status": "pr-ready",
    "category": "UX",
    "remaining_steps": 1,
    "blocked": false
  },
  {
    "name": "ci-hardening",
    "status": "needs-more-work",
    "category": "CI Stability",
    "remaining_steps": 3,
    "blocked": true,
    "blocker": "waiting for infra fix"
  }
]
```

### Runbook Commands
- Generate the plan (keeps 1 urgent slot by default):
  - `python tools/session_sweeper.py sessions.json`
- Adjust capacity or reserved slots:
  - `python tools/session_sweeper.py sessions.json --capacity 12 --reserve-slot 2`
- Interpret output:
  - `Sessions observed` and `Free slots needed` show current pressure.
  - `Close/ship in this order` lists the fastest exits (PR-ready and PR-open first).
  - `Backfill queue` lists categories without coverage so the next prompt can be pulled immediately.

### When to Run
- At the start of each sweep to pick which PR to finish and which category to backfill.
- Whenever capacity hits 15/15 to identify the quickest free slot.
- After incidents or long blockers to reprioritize hardening prompts.

## Minimal Metrics to Track
- Sessions: open vs. archived; age distribution; blocked count.
- Throughput: PRs per cycle; median cycle time to PR.
- Quality: pass/fail rates, flaky test list, lint errors trend.
- Coverage: category heat map (security/data/golden path/CI/graph/infra/UX/analytics).
