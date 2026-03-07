# Engineering Change Workflow v0

**North Star:** Ship small, well-reviewed, well-instrumented changes with predictable flow and visible risk/impact.

## 1. Change lifecycle

| Stage                   | Purpose                           | Expected artifacts                                                                                     | Risk-sensitive rules                                                                                      |
| ----------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| Idea / Intake           | Capture intent and align on value | Lightweight ticket with problem, desired outcome, stakeholders, rough scope                            | Risk rating selected (Low/Med/High). High risk requires early lead approval.                              |
| Design / ADR            | Decide approach and interfaces    | ADR (or design doc) with options, decision, tradeoffs, security/privacy considerations, telemetry plan | High risk: formal ADR with reviewers from security + reliability; Low risk: inline design note in ticket. |
| Implementation          | Build the change                  | Code + tests, feature flags/toggles, telemetry hooks, migration scripts as needed                      | High risk: pair/mob or design walkthrough; Low: solo ok.                                                  |
| Review                  | Validate correctness & readiness  | PR with description, scope of change, risk summary, test evidence, rollout/rollback notes              | High risk: 2 approvals incl. domain owner or security; Medium: 1 domain owner; Low: 1 reviewer.           |
| Merge                   | Land safely to main               | CI green, conventional commit, labels set, changelog entry (if user-facing)                            | High risk: protected branch with required checks + signed commits.                                        |
| Release                 | Deliver to users                  | Release plan (phased/flagged), runbook, monitoring dashboards/alerts updated                           | High risk: staged rollout + canary; Medium: progressive; Low: direct deploy allowed.                      |
| Post-release validation | Confirm impact & learn            | Telemetry review, incident log if issues, retro item if defects found                                  | High risk: 24–48h focused watch with SLOs and alert review.                                               |

### Risk levels

- **Low:** Small, revertible, no auth/data model changes; guarded by flags. Follows lightweight design (ticket note), 1 reviewer, smoke tests.
- **Medium:** Moderate scope or user-visible UX changes. Requires brief design/ADR, owner review, regression tests, rollout notes.
- **High:** Security/auth/data migrations, billing, availability, or multi-team impact. Requires formal ADR, dual review (incl. security or reliability), canary plan, rollback procedure, and post-release watch.

## 2. Code review standards

Reviewers are responsible for:

- **Correctness & clarity:** logic is sound, edge cases covered, code is readable and scoped narrowly.
- **Security & privacy:** input validation, authz, data handling, secrets, dependency risk.
- **Performance & scalability:** complexity, hot paths, N+1 queries, resource limits.
- **Reliability & operability:** observability (logs/metrics/traces), feature flags, rollback story, migrations safety.
- **Testing:** unit/integration/e2e updated; negative cases; flakiness risk mitigated; CI evidence present.
- **Accessibility/UX (when applicable):** ARIA/keyboard, responsive behavior, copy clarity.

### Expectations for PRs

- **Size/structure:** Prefer <300 lines changed; larger changes split by feature flag or staged PRs. Keep commits logically grouped; avoid drive-by changes.
- **Description:** Problem, approach, risk level, screenshots for UI, test plan (commands + results), rollout/rollback notes, links to ticket/ADR.
- **Scope hygiene:** No unrelated refactors; generated files excluded; migrations clearly called out.

### Review SLAs & ownership

- **SLA:** First response within 1 business day; high-risk or blocking fixes within 4 business hours.
- **Ownership:** Codeowners auto-assigned; domain owners review high-risk changes in their area.
- **Disagreements:** Use “request changes” with rationale; escalate to tech lead after two rounds or 24h deadlock; document decision in PR/ADR.

## 3. Workflow tooling & automation

- **Templates:**
  - Ticket template: problem, outcome, risk level, constraints, dependencies, acceptance criteria.
  - ADR template: context, options, decision, consequences, security/privacy notes, telemetry plan.
  - PR template: change summary, risk, tests, rollout/rollback, observability, screenshots/links.
- **Bots/automation:**
  - Auto-label by scope (service/feature) and risk level from PR body.
  - Checklist bot ensures tests, ADR links, and rollout notes present for medium/high risk.
  - CI gating: lint/test/typecheck, migration dry-run, dependency scan, bundle size (web), and required approvals by risk.
  - Size guard: warn >300 LOC; block >800 LOC unless `#large-pr-approved` label.
- **Dashboards:**
  - Lead time (commit to prod), review latency, deployment frequency, and change-fail rate.
  - Review SLA tracker (open PRs by age/risk) and rollback metrics.
  - Observability coverage: flags vs. unflagged, telemetry hooks per change, alert adoption.

## 4. Artifacts

### 4.1 Engineering Change Workflow v0 outline

- Lifecycle stages, risk definitions, approval matrix, and required artifacts summarized above.
- Default release patterns: trunk-based, feature-flag-first, canary for high risk.

### 4.2 Example PR template (risky change)

```
## Summary
- What problem are we solving?
- Scope: components/services touched
- Risk level: High (why?)

## Design / ADR link
- [ADR-123](link) – key decision

## Testing
- Commands + results (attach logs/screens where relevant)
- Negative/pathological cases

## Rollout / Rollback
- Flag name(s) and default state
- Deploy strategy (canary %, ramp plan)
- Rollback steps and data/migration reversal

## Observability
- Metrics/logs/traces added; alert thresholds
- Dashboards/links

## Security & Compliance
- Authz model, PII handling, dependency changes

## Reviewer checklist
- [ ] Logic & edge cases
- [ ] Security/privacy reviewed
- [ ] Perf/scale implications
- [ ] Tests sufficient (incl. regressions)
- [ ] Observability & rollback verified
```

### 4.3 Governance pass checklist

- Risk level declared and matches scope.
- Ticket and (if medium/high) ADR linked; decisions recorded.
- PR description complete (summary, risk, tests, rollout/rollback, observability, security notes).
- Required approvals by risk obtained; codeowners involved for owned areas.
- CI green; migrations/tests documented; no stray generated files.
- Feature flags/kill switches in place for user-impacting changes.
- Telemetry/alerts set for success and failure paths; dashboards linked when high risk.
- Release plan executed (phased/canary as required) with rollback documented.
- Post-release validation performed or scheduled; issues/retro items captured if defects found.
