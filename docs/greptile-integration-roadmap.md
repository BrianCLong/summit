# Greptile Integration Roadmap

## Executive Summary
Greptile extends Summit (IntelGraph) with AI-driven pull-request reviews, repository-wide semantic graphs, and conversational fix guidance. This roadmap translates the comparison analysis into a delivery program that threads Greptile signals through Summit's Maestro Conductor pipelines, graph data stores, developer interfaces, and compliance reporting surfaces.

## Strategic Goals & Success Metrics
- **Faster Safe Releases** – Cut median PR merge time from 42h to ≤20h while maintaining auditability.
- **Higher Defect Detection** – Increase pre-merge bug capture rate by ≥35% across polyglot services.
- **Adoptable AI Feedback** – Achieve ≥70% developer satisfaction on AI review interactions (thumbs up / resolved).
- **Compliance Continuity** – Preserve existing SOC 2 / GDPR attestations with zero new exceptions logged in quarterly audits.

## Target Architecture
- **Connectors** – OAuth 2.0 client authenticates to Greptile APIs; webhook gateway ingests review and feedback events over signed payloads.
- **Processing** – Event handlers normalize Greptile artifacts (comments, confidence scores, diagrams) into Summit's investigation graph schema via ETL workers.
- **Storage** – Metadata persisted in Neo4j for graph traversal, Postgres for transactional audit logs, and object storage for rich assets (mermaid exports, transcripts).
- **Surfaces** – Maestro Conductor pipelines, Summit React diff viewer, IDE plugins, and compliance dashboards all subscribe to the shared event bus.
- **Observability** – OpenTelemetry traces wrap API calls; Prometheus metrics capture latency, error rates, review acceptance, and feedback loops.

## Phase Roadmap Overview
| Phase | Duration Target | Primary Workstreams | Key Deliverables | Core Dependencies |
| --- | --- | --- | --- | --- |
| 1. API & Webhooks | 2 sprints | OAuth client, webhook receiver, schema mapping | Secure connectors, payload contracts, replay-safe ingestion, unit tests | Greptile credentials, Summit graph schema updates |
| 2. Workflow Automation | 2 sprints | Maestro Conductor plugins, policy hooks, autofix gating | CI triggers, risk scoring integration, policy-configurable auto-merge, smoke tests | Phase 1 connectors, policy definitions |
| 3. UI & IDE Embedding | 3 sprints | React diff components, WebSocket streams, IDE extensions | Unified review timeline, thumbs-up/down telemetry, IDE chat commands | Phase 1 payloads, Phase 2 workflow events |
| 4. Feedback & Learning | 1 sprint | Feedback data mart, scheduled sync jobs, config pack manager | Reinforcement feedback exporter, style pack registry, analytics dashboards | Prior phases’ telemetry, storage adapters |
| 5. Compliance & Reporting | 1 sprint | Audit policy alignment, dashboards, retention automation | Compliance scorecards, retention policies, SOC 2 evidence bundle | Phase 1–4 data availability, security review |

## Detailed Workstreams
### Phase 1 – API & Webhook Connectivity
- **Entry Criteria:** Approved OAuth application in Greptile, Summit secrets stored in Vault, graph schema extension reviewed by data governance.
- **Implementation Tasks:**
  1. Generate OAuth tokens with rotation policy; add retry + exponential backoff wrappers to the TypeScript connector.
  2. Implement webhook gateway with HMAC validation, DLQ fallback, and idempotent replay tokenization.
  3. Normalize review payloads to Neo4j nodes/relationships and persist raw JSON to S3-compatible bucket for reprocessing.
  4. Provide Jest unit tests (happy path, expired token, malformed webhook) and contract tests using captured fixtures.
- **Exit Criteria:** End-to-end test run produces review nodes accessible via GraphQL `reviewContext` query; 99th percentile connector latency <800 ms.

### Phase 2 – Workflow Automation
- **Entry Criteria:** Phase 1 connectors deployed to staging, Maestro Conductor feature flag created.
- **Implementation Tasks:**
  1. Hook PR lifecycle events to invoke Greptile review job with branch metadata and diff references.
  2. Map Greptile severity scores into Summit risk model; block merges above configurable threshold.
  3. Auto-apply Greptile autofix patches behind approval policy with dry-run preview and rollback safeguards.
  4. Author smoke tests that simulate PR creation/update with mocked Greptile responses and verify Maestro orchestration.
- **Exit Criteria:** Staging pipeline executes Greptile review within <5 min of PR push; policy gates enforce risk thresholds; smoke tests pass in CI.

### Phase 3 – UI & IDE Embedding
- **Entry Criteria:** Workflow events streaming to event bus; GraphQL resolvers expose review data.
- **Implementation Tasks:**
  1. Extend React diff viewer to display inline Greptile comments, mermaid diagrams, and confidence heatmaps with markdown rendering.
  2. Add thumbs up/down, reply, and "Apply Fix" actions synced via WebSockets; persist developer sentiment to telemetry.
  3. Update VS Code and JetBrains extensions to stream `@greptileai` conversations, fix suggestions, and contextual prompts.
  4. Write Jest unit tests for UI state management and Playwright specs covering interactive diff review flows.
- **Exit Criteria:** Developers can triage AI comments in Summit UI and IDEs with live updates; automated UI test suite ≥90% pass rate.

### Phase 4 – Feedback & Learning Loop
- **Entry Criteria:** Sentiment reactions persisted; connector can send outbound feedback.
- **Implementation Tasks:**
  1. Aggregate feedback, overrides, and merge outcomes into analytics warehouse (DuckDB + dbt models).
  2. Schedule nightly job that posts curated feedback batches to Greptile reinforcement endpoint with explainable metadata.
  3. Manage team-specific style/rule packs (JSON/YAML) via Git-backed registry with approval workflow.
- **Exit Criteria:** Weekly feedback exports completed without errors; dashboards reflect trend lines on review accuracy; config pack changes audited.

### Phase 5 – Compliance & Reporting
- **Entry Criteria:** Cross-phase telemetry centralized; security review kickoff completed.
- **Implementation Tasks:**
  1. Document data flow diagrams, encryption boundaries, and PII handling updates; route through security architecture review.
  2. Extend compliance dashboards with Greptile KPIs (defects caught, AI override rate, unreviewed PR aging).
  3. Implement retention/expunge routines honoring regional data residency requirements and produce SOC 2 evidence package.
- **Exit Criteria:** Compliance dashboard signed off by GRC; retention automation validated in staging; audit package added to evidence locker.

## Codex UI Prompt Library
- **Connector Scaffold Prompt:** Guides Codex to create the OAuth-enabled TypeScript module, webhook handlers, and Jest coverage as specified in Phase 1.
- **Maestro Automation Prompt:** Directs Codex to build Maestro plugins, risk scoring integration, and smoke tests for Phase 2.
- **UI/IDE Prompt:** Produces React components, WebSocket hooks, and IDE plugin updates aligned with Phase 3.
- **Feedback Loop Prompt:** Generates analytics ETL jobs, config registries, and outbound sync scripts required in Phase 4.
- **Compliance Prompt:** Helps compile retention policies, monitoring rules, and evidence bundling tasks for Phase 5.
Each prompt resides in `/docs/prompts/greptile/` (new directory) with usage instructions for Maestro Codex operators.

## Risk Register & Mitigations
| Risk | Impact | Likelihood | Mitigation |
| --- | --- | --- | --- |
| OAuth token leakage | High | Low | Vault storage, scoped tokens, rotation alarms | 
| Review noise overwhelms teams | Medium | Medium | Use scoped rulesets, collect sentiment, iterate thresholds |
| Auto-merge regression | High | Low | Require policy approval, maintain rollback scripts, run canary merges |
| Data residency constraints | Medium | Medium | Region-aware storage buckets, configurable retention windows |
| IDE extension drift | Low | Medium | Shared SDK module, automated integration tests |

## Dependencies & Staffing
- **Engineering:** 2 platform engineers (connectors & Maestro), 1 frontend engineer, 1 developer tooling engineer, 1 data engineer.
- **Security/GRC:** 0.5 FTE for architecture review and evidence management.
- **Change Management:** Developer enablement sessions and documentation updates during Phases 3–5.

## Immediate Next Actions
1. Approve connector architecture document and register Greptile OAuth application.
2. Create `/docs/prompts/greptile/` with seed Codex prompt templates for Phases 1–3.
3. Stand up staging webhook endpoint and configure signed secret exchange with Greptile.
4. Schedule enablement workshop to align Maestro policy owners on automation gating.
