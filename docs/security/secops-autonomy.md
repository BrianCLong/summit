# Summit SecOps Autonomy Blueprint

This document translates the Menlo "Agents for Security" thesis into an agent-native capability for the Summit/IntelGraph platform. It assumes safety-first autonomy, immutable provenance, and ROI instrumentation from day one.

## AI Employees Model

| Agent Role | Core Mandate | Allowed Tools | Budget/Step Limits | Required Evidence | Escalation Path |
| --- | --- | --- | --- | --- | --- |
| T1 Triage Agent | Normalize alerts/events, de-duplicate, assign hypotheses | log parsers, graph writer (read-only), summarizer, policy evaluator | 50 steps, $1.50 | linked alert, parsed signals, confidence score | auto to Investigation Agent on low confidence or high impact |
| Investigation Agent | Build investigation graph, propose containment options | graph traversal, enrichment connectors, OPA simulate, containment simulator | 75 steps, $3.00 | hypotheses, evidence chain, blast radius | human incident commander for production containment |
| Detection Engineer Agent | Correlate signals, generate/tune detections | SIEM query builder, rule generator, test harness, policy evaluator | 60 steps, $2.50 | rule rationale, test cases, FP/FN estimate | security architect for deployment |
| Vuln Prioritization Agent | Contextual risk scoring, exploitability triage | asset inventory, CVE/TI fetch, control coverage checker | 50 steps, $2.00 | prioritized list with business context | risk owner for disputes |
| Remediation Planner Agent | Map fixes to owners, generate runbooks and tickets | playbook selector, ticketing writer (draft), change-calendar lookup | 40 steps, $1.50 | playbook mapping, owner, blast radius, rollback plan | change advisory board for high-impact |

**Reporting structure:** Agents report to the SecOps Autonomy Control Plane, which enforces per-tenant scopes and routes escalations to human DRIs. **Performance metrics:** median time-to-triage/contain (simulated), FP rate, SLA adherence, approval turnaround, tool cost per incident, and policy-compliance score. **Escalation:** Mandatory for any action tagged high-impact, cross-tenant, or cost > configured budget.

## Summit Graph Data Model

Nodes: `Alert`, `Event`, `Finding`, `Asset` (including packages, extensions, models, containers), `Identity` (human/non-human), `Control`, `Incident`, `Playbook`, `Remediation`, `AgentAction`.

Edges: `ALERT_OF` (Alert→Asset), `TRIGGERS` (Event→Alert), `RELATES_TO` (Finding↔Asset), `ASSOCIATED_WITH` (Incident↔{Identity, Asset}), `REMEDIATES` (Remediation→Finding/Incident), `EXECUTED_BY` (AgentAction→Identity/Agent), `DERIVED_FROM` (Finding→Evidence), `USES_CONTROL` (Asset→Control), `RUNBOOK_FOR` (Playbook→Incident). Provenance attaches hypothesis IDs and policy decisions to every edge.

Identity supports `actorType` (user/service/agent), `assuranceLevel`, `scopes`, and `approvals`. `AgentAction` stores requested mode (read/advise, recommend/plan, act), evidence URIs, and policy evaluation results.

## Control Plane & Policies

- **Policy engine:** OPA/ABAC with tenancy, risk level, action type, and evidence completeness. Policies live in versioned bundles with signatures. 
- **Default:** `read_advise` only. `act` requires scope + justification + linked evidence + approval (CAB or security admin). High-impact actions demand dual-control and post-action rollback hook.
- **Step-up:** For `containment`, require `impact <= threshold` AND `approval.granted == true` AND `traceId` binding. 
- **Ticketing:** Ticket creation drafts allowed; live dispatch gated by approval and blast-radius policy.

## Observability & Auditability

- **OpenTelemetry spans** wrap every agent step: planner decisions, tool calls, policy evaluations, cost meters. Span attributes: `agent.role`, `mode`, `tenant`, `policy.decision`, `evidence.count`, `budget.remaining`.
- **Audit trail** is deterministic: Alert/Event → Finding → Hypothesis → AgentAction → Playbook/Remediation. All nodes emit provenance to the graph and append-only ledger. 
- **Cost accounting:** per-span cost meters, aggregated per incident and per agent role.

## Modes of Operation

1. **Read/Advise (default):** passive correlation, draft outputs only.
2. **Recommend/Plan:** proposes playbooks and tickets, enforces evidence completeness.
3. **Act (gated):** allowed only with approved scope, reversible intent, rollback playbook, and verified policy decision.
4. **Continuous Monitoring:** replay/synthetic incidents feed evaluation harness; drift alerts trigger policy re-validation.

## Evaluation Harness

- **Replay:** synthetic and captured incidents with ground truth labels.
- **Metrics:** time-to-triage, time-to-contain (simulated), FP rate, policy violations, analyst time saved (tickets auto-drafted), and cost per incident.
- **Quality checks:** hypothesis-evidence chain completeness, detection rule precision/recall on replay data, and containment recommendation safety (no unapproved act steps).

## Proposed File Tree & Stubs

```
packages/security-agents/
  package.json
  tsconfig.json
  README.md
  src/
    index.ts
    agent-runtime/{index.ts,runtime.ts,memory.ts,tool-router.ts}
    connectors/{ingest-webhook.ts,siem-log.ts,ticketing.ts}
    policy/{index.ts,opa/secops-autonomy.rego}
    schemas/{index.ts,entities.ts}
apps/web/src/features/security/IncidentWorkbench.tsx
server/src/routes/security/secops-autonomy.ts
```

## Backlog (impact-ordered)

| Priority | Title | Description | Acceptance Criteria |
| --- | --- | --- | --- |
| P0 | SOC Autopilot MVP | Alert ingest → triage → investigation graph → containment recommendations with approvals | Demo workflow runs in read/advise; graph nodes + audit trail created; approvals enforced for act mode |
| P0 | Governance & Approvals | OPA bundles, dual-control, tenancy scopes; policy debug endpoint | Policies versioned; `/security/policies/evaluate` returns decision with inputs; act mode blocked without approval |
| P0 | Eval Harness & Synthetic Data | Replay harness with synthetic incidents and metrics | Synthetic seeds load; harness outputs TTR/FP metrics; regression script available |
| P1 | SIEM Coprocessor MVP | Correlate events and draft detection rules/tests | Correlation summaries generated; draft detections stored; FP estimate provided |
| P1 | VulnOps Intelligence MVP | Contextual prioritization + remediation planning | CVE/context merged; prioritized list with rationale; remediation plan and owners produced |
| P1 | Detection Rule Testing Harness | Draft detection-as-code with unit/regression tests | Rules stored with tests; failures reported with evidence links |
| P1 | Non-binary Software Asset Coverage | Model packages/extensions/models/containers as first-class assets | Assets ingested with type `software-layer`; linked to findings and controls |
| P1 | Ticketing Drafts & Ownership Routing | Draft tickets with owner mapping and approval requirements | Ticket drafts produced with owner group, approval gates captured |
| P1 | Policy Debug Console | UI + API for policy evaluation traces | Requests show input, decision, obligations, and evidence references |
| P2 | Continuous Monitoring & Drift | Policy/detection drift alerts; cost guardrails | Drift alerts emitted; budgets enforced; cost per incident recorded |
| P2 | Playbook Lifecycle | Playbook catalog + simulation and rollback hooks | Playbooks versioned; simulations logged; rollback defined for act paths |
| P2 | Cost Guardrails & Budget Telemetry | Track per-agent spend and enforce ceilings | OTel spans carry cost; requests rejected when budget exceeded |
| P2 | Agent Memory & Case Learning Store | Persist learnings per incident for reuse | Summaries stored per incident; exposed via API and graph links |
| P2 | Containment Simulator (Safety) | Sandbox containment actions with approval workflow | Simulated outcomes recorded; act mode blocked without approval |
| P2 | Incident Metrics Export | Export MTTR/TTR/FP metrics to Prom/OTel | Metrics endpoint available; dashboards refresh with new KPIs |
| P3 | Threat Intel Enrichment Hooks | Enrich findings with TI and control coverage | Enrichments attached to findings with provenance |
| P3 | Human-in-the-Loop Approval Console | UI for approvals with evidence previews | Approvals captured with actor, scope, decision, timestamp |
| P3 | ROI Dashboard | Surface analyst time saved, MTTR reduction, tool usage | Dashboard renders ROI deltas with source metrics |
| P3 | Synthetic Scenario Generator | Generate replayable incidents across asset types | Generator outputs labeled datasets and seeds harness |
| P3 | Documentation & Runbooks | Runbooks for modes, approvals, rollback | Docs published; runbooks linked from UI |

## First PR Plan

1. Commit architecture doc + schemas and runtime stubs. 
2. Add secure REST scaffolding (`/security/ingest`, `/security/incidents`, `/security/agents/run`, `/security/policies/evaluate`) behind authentication and policy evaluation stubs.
3. Provide Incident Workbench UI stub to visualize timeline, evidence graph, hypotheses, playbooks, and approvals.
4. Wire OPA sample bundle and policy debug helper; ensure auditability metadata on responses.
