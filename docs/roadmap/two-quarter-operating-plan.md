# Two-Quarter Operating Plan: Reliability, Flow, and Ownership

## Purpose

Create a two-quarter campaign that links incentives to measurable outcomes, improves decision hygiene, and drives disciplined execution. The plan selects the highest-leverage elements across Incentives, Decision Hygiene, Ownership, Flow, Quality, Reliability, Documentation, Meetings, and Deletion to deliver durable improvements in reliability, velocity, and cost posture.

## Outcomes and Targets

- **Reliability:** Ship domain SLOs with error budgets and reduce repeat Sev-1/2 incidents by 50% by end of Q2.
- **Velocity:** Reduce median cycle time by 35% and enforce WIP limits and ≤5-day slices on all in-flight initiatives.
- **Cost and Simplification:** Hit quarterly delete quotas, retire at least 3 systems/major surfaces, and prevent net-new systems without retirement plans.
- **Decision Latency:** Publish decision rights, log decisions, and bring median decision latency under 48 hours.
- **On-Call Health:** Track pages per shift, sleep impact, and toil; keep on-call KPIs within healthy bands with quarterly bonuses tied to improvements.

## Operating Principles (Always-On)

- Incentives reward outcome SLOs (reliability, cycle time, churn, cost) over feature volume.
- Error budgets gate roadmap scope; no permanent exceptions—every exception has an expiry and owner.
- Ownership is explicit: every domain has code owners, runbooks, dashboards, and a single-threaded owner for critical initiatives.
- Flow discipline first: limit WIP, make blockers the visible backlog, and stop hidden work.
- Quality as design: prevent defects via canaries, auto-rollback, regression suites, and “stop-the-line” when change-failure spikes.
- Culture of deletion: celebrate retired systems, simplified paths, and deletion shipped.

## Quarter 1 (Weeks 1–13)

1. **Foundations and Guardrails (Weeks 1–3)**
   - Publish domain ownership map (systems, data, KPIs, on-call) with code owners enforced.
   - Define user-journey SLOs and error budgets; replace alert spam with SLO burn alerts and runbooks only.
   - Stand up decision rights matrix with time boxes and decision-log template (owner, rationale, revisit date).
   - Introduce release envelopes for Tier 0/1 work (metrics, rollback, owner) and require ADRs for one-way doors.
2. **Incentives and Scoreboards (Weeks 4–6)**
   - Launch domain scoreboards: outcomes (SLO burn, cycle time, churn, cost) + owners; publish weekly.
   - Add debt burn and deletion shipped to promotion packets; create recognition for quiet wins and boring ops.
   - Introduce error budget spend as a gate for roadmap scope; require exception registry with owners + expiries.
3. **Flow and Decision Hygiene (Weeks 7–9)**
   - Measure baseline flow (cycle time, WIP, blocked time, rework rate) and set WIP limits per team.
   - Enforce ≤5-day slices; ban two-week tasks and drive “definition of ready” (metric + owner + rollback) before start.
   - Install 48-hour escalation ladder for cross-team blockers and ban drive-by scope changes without logged decisions.
4. **Reliability Rituals (Weeks 10–13)**
   - Run monthly GameDay and DR drill; require postmortems for Sev-1/2 with one systemic prevention item shipped.
   - Add canaries + auto-rollback for Tier 0/1 releases; standardize timeouts/retries/circuit breakers via shared libs.
   - Track repeat incidents and escalate when recurrence exceeds threshold; ship one “reliability release” per domain.

## Quarter 2 (Weeks 14–26)

1. **Scale and Enforcement (Weeks 14–18)**
   - Tie leadership and manager goals to reliability + velocity + cost; introduce quarterly comp/bonus modifiers for outcome targets.
   - Enforce WIP limits with bots; add PR size limits and reviewer rotations; unblock ritual (15 min daily with decision-maker).
   - Require runbooks + dashboards for all Tier 0/1 systems as part of “done”; maintain kill-switch registry and test quarterly.
2. **Deletion and Simplification (Weeks 19–21)**
   - Execute quarterly delete quota; maintain public sunset list with dates/owners and prevent new systems without retirement plans.
   - Add rework tax: repeated churn triggers root-cause fixes; stop work that is not paying off via weekly kill list.
   - Reward teams for retiring systems and consolidating to canonical patterns (auth, logs, jobs).
3. **Quality and Knowledge Hygiene (Weeks 22–24)**
   - Establish regression suite from real incidents; enforce “no silent failures” and performance budgets in CI.
   - Move runbooks/docs to docs-as-code with freshness checks and stale-doc alerts; require runbooks for any new alert.
   - Create one-page architecture overviews per domain and link to alerts/tools; maintain searchable knowledge base.
4. **Decision & Communication Reset (Weeks 25–26)**
   - Replace status meetings with weekly written operating updates; measure decision latency and publish it.
   - Maintain incident comms templates/channels; reduce notification spam with paging rules and quiet hours.
   - Run quarterly ownership audit to merge/retire anything unowned; publish monthly reliability scorecard.

## Scoreboard & Gating Mechanics

- **Per-Domain Scoreboard (weekly):** SLO burn, error budget spend, cycle time, WIP vs limit, blocked time, rework rate, cost per unit, on-call health (pages/sleep/toil), deletion shipped, debt burn, repeat incidents.
- **Gates:** Error budget spend gates roadmap scope; exceptions require registry entry with owner + expiry. PR size limits and release envelopes enforced via automation.
- **Recognition:** Quarterly awards for quiet wins (boring ops, reduced toil), deletion shipped, and best decision latency improvements.

## Cadences & Governance

- **Weekly:** Written operating update; scoreboard publication; kill-list review; blocker backlog review.
- **Monthly:** GameDay, DR drill/restore test, reliability release, ownership updates.
- **Quarterly:** Ownership audit, delete quota review, compensation modifiers against outcome targets, knowledge purge/refresh, quality review with top root causes.

## Risks & Mitigations

- **Overload from new rituals:** Keep meetings short (25/50 minutes), async-first RFCs, and office hours for cross-team questions.
- **Hidden work resurfacing:** Enforce “no hidden work” via single backlog and visible blockers; escalation ladder for cross-team delays.
- **Metric gaming:** Pair leading indicators (cycle time, WIP) with outcome measures (SLO burn, repeat incidents) and manual reviews on exception registry.

## Success Criteria

- Error budgets respected with <2% uncontrolled spend; roadmap scope adjusted when budgets burn.
- Median decision latency <48 hours; logged decisions with revisit dates and outcomes.
- Cycle time -35%, blocked time -40%, change failure rate down with canaries/rollback; repeat incidents reduced by 50%.
- At least 3 systems retired and delete quota met; runbooks/docs freshness score improving with stale alerts cleared.
- On-call health metrics within agreed bands and recognized in performance/promo decisions.
