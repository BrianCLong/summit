Owner: Governance
Last-Reviewed: 2026-02-24
Evidence-IDs: GOV-AGENT-WORKFLOW-001
Status: active

# Summit Agent Workflow Model

This extends the existing Summit operating model without replacing current governance artifacts.

## Workflow

Jules (architect) -> Codex (implementer) -> Observer (verification) -> Human approval -> Merge.

## Core Principles

1. Determinism first: governed runs must be reproducible.
2. Provenance everywhere: every output carries source and trust context.
3. Policy enforcement by default: OPA and CI gates are mandatory.
4. Human override authority: operators retain final decision control.

## Roles and Authorities

| Agent | Authority | Restrictions |
| --- | --- | --- |
| Jules | Define architecture and acceptance criteria | Cannot merge code |
| Codex | Implement code, tests, and docs | Cannot bypass CI or policy gates |
| Observer | Validate runs, produce analysis, flag anomalies | Cannot modify runtime code |
| Human | Final approval and accountability | Must sign off governed exceptions |

## Guardrails

### Mandatory

- Run manifests are required for governed executions.
- Policy checks are logged in trace/evidence outputs.
- Decision traces are retained with replay metadata.
- Budget/cost controls are enforced by gate policy.

### Prohibited

- Untracked memory writes.
- Policy bypass without approved exception record.
- Non-deterministic execution in GA mode.

## Enforcement Points

- CI gates.
- Policy engine checks.
- Cost guard thresholds.
- Run-manifest validation.

## Audit Trail Requirements

Each governed run must include:

- Manifest.
- Decision trace.
- Memory provenance.
- Policy checks.
- Cost summary.
- Replay verification result.

## Agent Pipeline Rules

### Jules

- Defines architecture, schemas, and acceptance criteria.
- Opens implementation-ready Codex issues.

### Codex

- Implements code and tests.
- Includes test results, compliance artifacts, and diff summary in PR.

### Observer

- Verifies determinism, cost, policy, and provenance outcomes.
- Flags anomalies and records evidence references.

## Observer Validation Checklist

- Determinism verified.
- Cost within budget policy.
- Decision trace complete.
- Policy enforcement verified.
- Memory provenance intact.

## PR Labeling and Routing

Routing is label-driven and enforced via `.github/workflows/pr-labeler.yml` and `.github/workflows/pr-routing.yml`.

| Label | Auto-Assign | Reviewer |
| --- | --- | --- |
| codex | Repo owner (default) | Repo owner (default) |
| security | Repo owner (default) | Repo owner (default) |
| ci | Repo owner (default) | Optional via `ROUTE_CI_REVIEWERS` |
| docs | Optional via `ROUTE_DOCS_ASSIGNEES` | Optional via `ROUTE_DOCS_REVIEWERS` |

## Agent Lifecycle

1. Proposal (Jules).
2. Implementation (Codex).
3. Verification (Observer).
4. Approval (Human).
5. Monitoring (Observer).
6. Retirement or upgrade.

## MAESTRO Alignment

- **MAESTRO Layers**: Agents, Observability, Security, Data, Tools.
- **Threats Considered**: prompt injection, goal manipulation, tool abuse, policy drift.
- **Mitigations**: policy gates, evidence-first outputs, bounded tool access, replay checks.
