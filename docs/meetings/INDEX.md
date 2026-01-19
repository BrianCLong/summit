## Summit Standing Meetings Index

Canonical purpose: define the recurring operating cadence, owners, required artifacts, and cross-system synchronization targets (GitHub Projects, Linear, Jira, Notion).

Determinism note: this index is stable and should only change when cadence, naming, or artifact contracts change.

### Conventions

* **Primary owner agent**: the agent responsible for running the orchestrator and producing artifacts.
* **Artifact root**: where each meeting writes its required markdown/json/stamp outputs.
* **Cross-system parity**: each meeting outputs an explicit checklist to update GitHub Projects, Linear, Jira, and Notion.

### Cadence Table (Priority Order)

|  # | Meeting                                                | Cadence                                | Primary Owner Agent | Artifact Root                        | Primary Goal                                                |
| -: | ------------------------------------------------------ | -------------------------------------- | ------------------- | ------------------------------------ | ----------------------------------------------------------- |
|  1 | Daily Standup (Orchestrator)                           | Daily                                  | Jules               | `docs/standup/`                      | Align execution, produce daily plan, dispatch agents        |
|  2 | CI Health & Merge Readiness Triage                     | Daily                                  | Jules               | `docs/ci/triage/`                    | Keep required checks green; burn down CI failures           |
|  3 | PR Merge Board Review (Oldest-First)                   | Daily                                  | Jules               | `docs/merge/standup/`                | Maximize merge throughput without breaking gates            |
|  4 | GA Evidence & Governance Gate Review                   | Daily until stable, then 2–3x/week     | Antigravity         | `docs/ga/review/`                    | Evidence completeness, governance integrity, determinism    |
|  5 | Release Captain Checkpoint                             | 2–3x/week; daily in release week       | Atlas               | `docs/releases/checkpoint/`          | Candidate selection, go/no-go, merge train, cut plan        |
|  6 | Security Posture & Supply-Chain Integrity Standup      | Weekly; 2x/week pre-GA                 | Antigravity         | `docs/security/standup/`             | Vulnerabilities, SBOM/provenance, policy violations         |
|  7 | Architecture & Design Review Board                     | Weekly                                 | Claude Code         | `docs/architecture/review/` (+ ADRs) | Durable decisions, interface contracts, risk-managed change |
|  8 | Roadmap / Backlog Grooming & Scoring                   | Weekly                                 | Jules               | `docs/roadmap/grooming/`             | Keep “Next” saturated with executable, scored work          |
|  9 | Operational Readiness Review (ORR)                     | Weekly; 2x/week pre-GA                 | Jules               | `docs/ops/orr/`                      | SLOs, runbooks, alerting, deploy verification, DR readiness |
| 10 | Demo / Narrative Readiness Sync                        | Weekly; ramp before demos              | Jules               | `docs/demo/sync/`                    | Demo reliability, seeded states, fallback package           |
| 11 | Retrospective & Process Improvement                    | Biweekly                               | Jules               | `docs/process/retro/`                | Convert failure modes into durable improvements             |
| 12 | Compliance & Audit Pack Review                         | Weekly; 2x/week pre-GA                 | Antigravity         | `docs/compliance/review/`            | Control coverage, evidence freshness, exceptions lifecycle  |
| 13 | Incident Review & Postmortem Triage                    | Weekly; after Sev1/Sev2                | Jules               | `docs/ops/incidents/review/`         | Root causes, corrective actions, prevention gates           |
| 14 | Performance, Reliability, and Cost Review (FinOps)     | Biweekly; weekly pre-scale             | Claude Code         | `docs/perf/review/`                  | Budgets, regressions, hotspots, cost controls               |
| 15 | Documentation & Knowledge Base Hygiene Review          | Weekly                                 | Jules               | `docs/docs-hygiene/review/`          | Reduce drift, broken links, policy violations               |
| 16 | Customer Signal & Feedback Triage                      | Weekly; 2–3x/week in pilots            | Jules               | `docs/feedback/triage/`              | Convert feedback into prioritized, testable work            |
| 17 | Data Quality, Provenance, and Graph Integrity Review   | Weekly; 2x/week during heavy ingest    | Claude Code         | `docs/data/review/`                  | Correctness, provenance, ER stability, integrity tests      |
| 18 | Access, Permissions, and Secrets Governance Review     | Weekly; 2x/week pre-GA                 | Antigravity         | `docs/security/access-review/`       | Least privilege, secrets hygiene, CI token posture          |
| 19 | Integrations & Partner Reliability Review              | Weekly; more during onboarding         | Claude Code         | `docs/integrations/review/`          | Contract stability, resilience, deterministic test strategy |
| 20 | Test Strategy, Coverage, and Flake Governance Review   | Biweekly; weekly during stabilization  | Jules               | `docs/testing/review/`               | Flake burn-down, hang mitigation, risk-based coverage       |
| 21 | Privacy, Data Retention, and Deletion Lifecycle Review | Monthly; biweekly pre-GA               | Antigravity         | `docs/privacy/review/`               | Retention/deletion policy, verification, no-PII artifacts   |
| 22 | UX Consistency & Design System Review                  | Biweekly; weekly during UI churn       | Jules               | `docs/ux/review/`                    | Prevent UI drift; a11y; flow reliability                    |
| 23 | Developer Experience, Tooling, and Workflow Review     | Biweekly                               | Jules               | `docs/dx/review/`                    | Reduce setup friction; CI/local parity; tooling guardrails  |
| 24 | Dependency Lifecycle, Upgrade, and Deprecation Review  | Monthly; biweekly during stabilization | Antigravity         | `docs/deps/review/`                  | Predictable upgrades, lockfile integrity, policy checks     |

### Required Artifact Contract (All Meetings)

Each meeting produces:

* `{artifact_root}/{YYYY-MM-DD}.md` (human-readable, deterministic)
* `{artifact_root}/{YYYY-MM-DD}.json` (machine-readable summary, deterministic)
* `{artifact_root}/{YYYY-MM-DD}.stamp.json` (non-deterministic metadata allowed)

Each meeting must include a “Cross-System Actions” checklist that updates:

* GitHub Projects (card status, owner, priority, links)
* Linear (issue creation/update, sprint/priority, links)
* Jira (ticket creation/update, components, fixVersion where applicable, links)
* Notion (canonical pages/databases updated with links)

### Agent Role Mapping

* **Jules**: Coordinator/PM execution; daily standups; merge/board triage; roadmap; docs hygiene; demos; retros; DX.
* **Atlas**: Release Captain; merge sequencing; branch protection/required checks; cut/go-no-go facilitation.
* **Antigravity**: Supply-chain integrity; governance/evidence; compliance/audit pack; access/secrets; privacy; deps policy.
* **Claude Code**: Architecture reviews; performance/cost; data/provenance; integrations contracts; risk-managed refactors.
* **Codex CLI**: Targeted PR-ready implementation work orders produced by the meetings.
* **Qwen**: Optional analysis only in replay/cache mode; never used to introduce nondeterminism on critical path.
