# GA Core Overview

This document is the authoritative reference for IntelGraph GA scope, architecture, backlog, and delivery plan. It aligns the GA vertical slice around governed graphs, provenance-first design, explainable copilot, and a pilot-ready tri-pane UI.

## Table of Contents
- [1. GA Core Overview](#1-ga-core-overview)
  - [1.1 What GA Is](#11-what-ga-is)
  - [1.2 What GA Is Not](#12-what-ga-is-not)
  - [1.3 Explicit GA / Post-GA / Won’t Build](#13-explicit-ga--post-ga--wont-build)
- [2. Architecture & Services](#2-architecture--services)
  - [2.1 High-Level Components](#21-high-level-components)
  - [2.2 Textual Diagrams](#22-textual-diagrams)
- [3. GA Backlog (Epics & Stories)](#3-ga-backlog-epics--stories)
- [4. Ruthless 90-Day Plan (6 Sprints)](#4-ruthless-90-day-plan-6-sprints)
- [5. Tradeoffs – Deferred vs. Non-Negotiable](#5-tradeoffs--deferred-vs-non-negotiable)
- [6. Success Criteria & Usage](#6-success-criteria--usage)

## 1. GA Core Overview

### 1.1 What GA Is
IntelGraph GA proves end-to-end that a cleared analyst can ingest real data, model it as a governed graph, answer complex questions with graph tradecraft and AI assist, and produce auditable, explainable results suitable for rigorous oversight. Concretely GA delivers:

- **Data Intake & Prep (real, narrow scope):** CSV batch uploads, a curated set of structured connectors (e.g., STIX 2.1 and select REST/JSON APIs), schema mapping into a canonical graph model, and light dedupe/entity resolution with basic PII handling and policy labels.
- **Canonical Model & Graph Core:** Multi-tenant graph with Person, Organization, Asset, Location, Event, Indicator, Case/Investigation entities; core relationships (AFFILIATED_WITH, LOCATED_AT, PART_OF, PARTICIPATED_IN, OBSERVED_AT, DERIVED_FROM); temporal edge attributes; provenance/claims tying each node/edge to source, pipeline, timestamp, and confidence.
- **Analytics & Tradecraft Essentials:** Graph exploration (neighbor expansion and filtering), shortest path and k-step neighborhood, degree/simple centrality (with optional betweenness for recent slices), and saved query “tradecraft patterns.”
- **AI Copilot (GA basics):** Natural language → previewed graph query (Cypher/GraphQL-like), execution with explainable results showing the query, highlighted paths, and provenance; RAG over ingested documents/claims with citations; guardrails preventing unpreviewed queries or hallucinated entities.
- **Security & Governance Core:** SSO (OIDC) with RBAC + ABAC; policy engine enforcing tenant/classification/compartment boundaries and reason-for-access prompts; full audit log of logins/imports/queries/exports.
- **Tri-Pane UI:** Left search/filter/workspace list, center graph canvas, bottom/right timeline and map views linked to selection, entity inspector with attributes/provenance/relations, and “explain” overlays for queries and AI suggestions.
- **Operational readiness:** Demo-able, observable (alerts, metrics, logs), and safe for pilot with red-team scrutiny.

### 1.2 What GA Is Not
GA intentionally excludes rich workflow/case management, predictive threat suite capabilities, orchestrated runbooks, advanced graph-XAI, broad connector catalogs, and any black-ops tooling (e.g., offensive cyber, mass deanonymization, ghost queries).

### 1.3 Explicit GA / Post-GA / Won’t Build
- **In GA (must ship):** CSV ingestion, curated connectors, canonical model/multi-tenant storage, provenance for every fact, core graph analytics, NL→query copilot with preview/provenance-aware answers, RAG with citations, SSO+RBAC+ABAC+OPA-style enforcement, full query/export audit logging, tri-pane UI.
- **Post-GA (deferred):** Predictive threat suite, decision dashboards, rich case management, report studio, automation/runbooks, deep connector catalog, advanced entity resolution, graph ML, offline/disconnected mode with cryptographic resync, advanced XAI suite, shared marketplace.
- **Won’t build (ethics gates):** Social credit/risk scoring, kinetic targeting tools, bulk surveillance facial recognition, consent-bypassing features, unlogged access, automated doxxing/deanonymization, dark-pattern UX, ToS-breaking tools, fully opaque models, data monetization of sensitive personal graphs.

## 2. Architecture & Services

### 2.1 High-Level Components
Assumed stack: TypeScript/Node services, React+TS frontend, graph DB (Neo4j/JanusGraph-class), Kafka-style event bus, Kubernetes. Core services:

1. **API Gateway/BFF:** Single entrypoint for SPA, terminates auth, forwards to domain services; rate limiting, logging, feature flags.
2. **Auth & Governance:** OIDC client, session/token management, RBAC/ABAC attribute resolution, OPA-style policy integration evaluating tenant/classification/compartments/justification for every action.
3. **Ingestion & ETL:** CSV upload handler, STIX/REST connector workers, schema mapping UI/API, rule-based dedupe/entity resolution, emits normalized claim events onto Kafka.
4. **Canonical Model & Graph:** Owns schema, REST/GraphQL CRUD + query endpoints, multi-tenant separation in graph DB, provenance ID management.
5. **Provenance & Claim Ledger:** Immutable append-only claim records with source/pipeline/timestamps/confidence/tags, chain-of-custody APIs powering citations.
6. **Analytics & Tradecraft:** Graph algorithms (shortest path, neighborhood expansion, degree/centrality), saved queries/templates.
7. **AI Copilot:** LLM-wrapped API for NL→structured query translation, validation with graph/governance, RAG over claims/docs with citations and execution plan.
8. **UI (React SPA):** Tri-pane layout (nav/search/filter, graph canvas, timeline/map, inspector), copilot chat panel, workspace state management.
9. **Ops/Telemetry:** Centralized logging/metrics/traces and alerting for ingestion failures, slow queries, policy violations.

### 2.2 Textual Diagrams
- **Top-level flow:** Browser → API Gateway → Auth/Graph/Ingest/Copilot/Analytics services, with Graph DB + Provenance Ledger and Kafka event bus backing ingestion/claims.
- **Ingestion pipeline:** CSV/Connector → Ingestion → Normalize/Map → Provenance (claims) → Kafka FACT_INGESTED events → Graph Service upserts with policy tags.
- **Query + Copilot flow:** NL prompt → UI copilot → Gateway → Copilot parsing/schema validation → Auth/Governance → Graph execution → Provenance lookup → UI shows NL, query preview, results, and citations.

## 3. GA Backlog (Epics & Stories)
Epics E1–E7 enumerate ~40 stories across ingestion, canonical model/graph core, provenance ledger, analytics/tradecraft, AI copilot, security/governance, and UX/ops. Use this backlog as the primary source for sprint planning and scope control.

## 4. Ruthless 90-Day Plan (6 Sprints)
Six two-week sprints with themes, key deliverables, and done criteria:

- **Sprint 1:** Skeleton, auth, graph bootstrapping (SSO, canonical schema v1, tri-pane shell, health endpoints).
- **Sprint 2:** Ingestion v1 + graph CRUD + claims (CSV/STIX ingest → canonical graph with provenance, multi-tenant isolation).
- **Sprint 3:** Tradecraft basics & tri-pane UX (neighbor expansion, shortest path, centrality, timeline/map, provenance panel).
- **Sprint 4:** AI Copilot v1 (NL→query, preview/edit UI, audit logging, initial RAG with citations).
- **Sprint 5:** Governance enforcement & exports (OPA integration, ABAC tagging, reason-for-access, audit viewer, exports with citations).
- **Sprint 6:** Hardening/performance/pilot readiness (ingestion monitoring dashboard, metrics/alerts, saved queries, workspace persistence, security review).

## 5. Tradeoffs – Deferred vs. Non-Negotiable
- **Deferred items:** Predictive/decision dashboards, runbooks/automation, deep connector catalog, advanced ER/Graph ML, offline mode, advanced XAI, rich collaboration/reporting, marketplace.
- **Non-negotiable differentiators:** Provenance & claim ledger for every fact, governance-first access (RBAC+ABAC+policy), explainable automation (copilot with query preview/citations), strong multi-tenant compartmentation, comprehensive auditability.

## 6. Success Criteria & Usage
- **Pilot-ready proof points:** Every node/edge tied to claims; all queries/exports gated by policy; copilot shows queries, paths, and citations before execution; tenant boundaries enforced; audit trails reconstruct who did what, when, and why.
- **Operational practices:** Monitor ingestion failures, slow queries, and policy denials; keep connectors curated and governed; prefer saved queries/tradecraft templates for repeatability.
- **How to use this document:** Align engineering scope, demo narratives, and pilot commitments to the GA boundaries above. Treat backlog items as the pull list for sprints; use the non-negotiables as guardrails when making tradeoffs.
