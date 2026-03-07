# Sprint: Scale the "Boring Deploy" Story

**Sprint Number:** (Next Sprint - Priority)
**Goal:** Scale the “boring deploy” story: hardened stage→prod promotion, broader test coverage, stronger policy/compliance evidence, and reliability/DR posture — without slowing PR velocity.

## Priorities (Ordered)

### 1) Promotion Pipeline: stage→prod becomes push-button

**Outcome:** every release is the same steps, same evidence, same gates.

- **Release train workflow** (cut → canary → soak → promote)
- **Explicit “migration gate”** automation:
  - label-based approvals for schema-affecting PRs
  - dry-run + rollback plan required artifacts
- **Automated post-deploy verification** (smoke suite + golden signals check)
- **Release notes automation** from Conventional Commits + PR labels

**DoD:** A release can be promoted with a single workflow run and produces an auditable evidence bundle.

### 2) Expand “Persisted Ops + ABAC” coverage to all critical surfaces

**Outcome:** no auth “dark corners,” and no surprise queries in prod.

- Persist **all** UI-used GraphQL operations (client manifest coverage >= 95%)
- Enforce **deny-by-default** on remaining resolvers (backfill wrapper)
- Add **policy regression tests**:
  - allow/deny matrix for key roles/tenants
  - “reason-for-access” captured for sensitive actions

**DoD:** New resolver/endpoint cannot ship without wrapper + policy tests + persisted op entry (where applicable).

### 3) SLOs become real gates (canary gets smarter)

**Outcome:** rollback triggers are based on true user pain.

- Define initial SLOs per service (availability + p95 latency)
- Add **SLO burn alerts** wired to canary automation
- Add “poison signals” / anomaly checks:
  - authz deny spikes
  * 5xx spikes
  * queue/backlog growth (if ingest exists)

**DoD:** Canary auto-rollback triggers in stage during a controlled failure injection.

### 4) Reliability / DR: backup, restore, and RTO/RPO proof

**Outcome:** you can recover on purpose, not hope.

- Document RTO/RPO targets per datastore/service
- Implement **backup + restore runbook** + execute a restore drill in stage
- Cross-region replication plan (or at least: documented + tracked as epic)
- Chaos-lite exercise: one dependency failure + graceful degradation

**DoD:** A restore drill is performed and produces evidence (logs + timestamps + verification).

### 5) FinOps & Preview Environment Guardrails

**Outcome:** preview envs stay cheap and predictable.

- TTL enforcement + auto-downshift (scale-to-zero where possible)
- Cost dashboards by namespace/project
- CI policy: block runaway preview resources (limits/quotas)

**DoD:** Preview env costs are bounded by policy and visible on a dashboard.

---

## Deliverables to Demo

1. “Cut release” workflow generates artifacts + notes + evidence
2. Stage canary rolls back automatically on injected regression
3. Restore drill succeeded with clear timestamps and verification
4. Persisted ops coverage report + ABAC coverage report
5. Preview envs auto-expire + cost visible
