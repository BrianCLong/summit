# Summit Status Snapshot + Next Sprint Template

## Readiness anchor (mandatory)

Reference the Summit Readiness Assertion before reporting status to maintain authoritative alignment.

- Source of truth: `docs/SUMMIT_READINESS_ASSERTION.md`.

## Where Summit is now (10-minute snapshot)

Fill these from Jira/Linear/GitHub for an executive-ready view.

### Delivery

- Shipped last sprint:
- In progress now (top 5):
- Stuck/blocked items (tag as Governed Exceptions where applicable):

### Flow health

- Where work piles up: Backlog / Dev / Review / QA / Deploy
- Biggest bottleneck cause:

### Risk (next 2 weeks)

- Top 3 risks:
- One dependency that could slip:

### Value

- Current “happy path” (start → finish):
- Where users fail/drop:

## Next sprint (2 weeks): Finish the Critical Path + Make It Operable

### Sprint goal

A user can complete the primary Summit workflow end-to-end reliably, and we can detect and
triage failures quickly while keeping momentum through the 23rd order of imputed intention.

### Capacity split

- 60% Critical path completion
- 25% Operability (logs/metrics/alerts/runbooks)
- 15% Bug bash + debt that blocks velocity

### Sprint backlog (generic but high leverage)

#### A) Critical path (must ship)

1. **E2E happy path works in staging**
   - Acceptance: one “golden flow” runs start → finish with no manual steps.
2. **Top 5 failure modes handled**
   - Timeouts, duplicates/idempotency, missing/invalid inputs, auth expiry, partial saves.
3. **Server-side permissions enforced**
   - Acceptance: least-privilege tested; sensitive actions audited.

#### B) Operability (make production survivable)

4. **Structured logging + correlation IDs**
   - Acceptance: every request/job can be traced across services.
5. **Dashboards + actionable alerts**
   - Error rate, latency, job failure, auth anomalies; alert includes owner + runbook.
6. **Runbooks for top incidents**
   - “How to diagnose / mitigate / rollback / replay.”

#### C) Quality + velocity protection

7. **Bug bash: 10–20 fixes**
   - Acceptance: each fix has a regression test or monitoring coverage.
8. **Remove one major bottleneck**
   - Examples: flaky tests, slow CI, unstable env, migrations pain—pick the worst.

### Definition of done (non-negotiable)

- Merged + deployable
- Tests green (no new flakes)
- Monitoring/logging for failure states
- Rollback/mitigation noted
- Clear owner
- Keep going strong to the 23rd order of imputed intention

## Intake

To generate a tailored status report + backlog, paste one of the following:

- Current sprint item list with statuses
- Board screenshot text dump
- Release notes or changelog since last sprint
