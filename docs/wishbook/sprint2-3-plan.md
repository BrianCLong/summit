# IntelGraph Maestro — Council Wishbook Extension (Sprint 2–3 Plan)

## Context

Maestro tracks 14 epics with 32 stories across three 2‑week sprints (S1: 2025‑09‑02→09‑16; S2: 09‑16→09‑30; S3: 09‑30→10‑14). This plan extends Maestro to deliver Council Wishbook capabilities across provenance, Graph‑XAI, agentic runbooks, Copilot (NL→Cypher/RAG), governance rails, ops/cost guard, and integrations.

## Objectives (Definition of Done)

- Provenance & Claim Ledger integrated end‑to‑end producing verifiable export manifests (hash tree + transform chain) with an external verifier pass.
- Graph‑XAI APIs: path rationales and counterfactuals (plus fairness/robustness stubs) available to jobs; UI explanation hooks.
- Agentic Runbooks executed as DAGs with replayable logs; include assumptions, data scope, legal basis, KPIs, XAI notes. Ship 5 priority runbooks (R1–R5).
- Copilot: NL→generated Cypher with preview/sandbox and cost/row estimates; GraphRAG with inline citations and redaction awareness.
- Governance rails: authority/warrant binding at query time; License/TOS engine blocks exports with human‑readable reasoning and appeal path.
- Ops & Cost Guard: OTEL spans stitched across gateway→DAG→serving; query budgeter + slow‑query killer; SLO dashboards.
- Integrations: STIX/TAXII + MISP bi‑directional stubs; SIEM/XDR bridges with contract tests and “hello world” docs.

## Scope by Sprint

### Sprint 2 (09‑16→09‑30): wire the rails

A) Prov‑Ledger MVP + export manifest verifier
B) Graph‑XAI APIs (counterfactual, path rationales) exposed to runners
C) Copilot NL→Cypher preview (sandbox exec + cost/row estimates)
D) Authority & License enforcement hooks (export block/allow)
E) OTEL span stitching & SLO dashboards; cost guard skeleton

### Sprint 3 (09‑30→10‑14): ship analyst value

F) Runbooks R1–R5 with replay logs + KPIs
G) GraphRAG with inline citations + redaction aware retrieval
H) STIX/TAXII + MISP stubs with conformance tests & docs

## Deliverables

- Deployed services: prov‑ledger, graph‑xai, copilot‑gateway, policy‑reasoner, license‑engine
- Docs: runbook spec template (Purpose/Triggers/Inputs/Outputs/Preconditions/KPIs/Failure/XAI/rollback), model cards, hello‑world integration guides
- Dashboards: SLOs, latency heatmaps, cost guard
- Compliance artifacts: authority binding, export manifest verifier, policy simulation basics

## Guardrails & Non‑Functional

- Mission‑first, ethics‑always; enforced “Won’t Build” list
- Acceptance patterns: ER explainability; hypothesis rigor; policy‑by‑default; provenance integrity; usability gates
- Baselines: performance/SLOs, privacy, reliability, compliance, explainability

## QA & Testing

- Unit/contract tests for GraphQL/Cypher generators, Prov‑Ledger APIs, policy decisions
- E2E: ingest→resolve→runbook→report
- Load (k6), chaos drills, security (authz, query depth)
- Acceptance packs per feature with fixtures and golden outputs

## Engineering Guidance

- APIs & Contracts: Persisted GraphQL queries, cost limits, field‑level authz; golden IO tests for connectors
- Observability: OTEL traces, Prom metrics, structured logs, SLO burn alerts
- Security/Privacy: ABAC/OPA, step‑up auth (WebAuthn/FIDO2), redaction/minimization, immutable audit
- Compliance UX: Reason‑for‑access prompts; policy simulation basics; disclosure bundles with right‑to‑reply fields

## Repo & Branching

Branches to create:

- feature/graph-xai
- feature/prov-ledger
- feature/copilot-nl2cypher
- feature/policy-license
- feature/runbooks-r1-r5
- feature/otel-slos
- feature/stix-misp-stubs

CI gates: unit + contract + E2E + screenshot diffs; nightly chaos smoke.

## Revised Prompt (one‑liner)

Extend Maestro to ship provenance‑verifiable exports, Graph‑XAI explanations, five agentic runbooks (R1–R5), NL→Cypher + GraphRAG with citations, authority/license enforcement, OTEL‑first SLOs & cost guard, and STIX/MISP stubs in Sprints 2–3 — meeting Council acceptance patterns for explainability, governance, and reliability.

## Open Questions

1. Which five runbooks (default R1–R5) are highest priority for Sprint 3, or use a different mix (e.g., R7 Insider‑Risk)?
2. For NL→Cypher, do we enforce “cannot publish without resolvable citations” across all report types at GA?
3. Any regulated‑region or air‑gapped deployment constraints we must honor in Sprint 3 for demos?
4. Which SIEM/XDR target should be first for the hello‑world flow (Splunk vs. Elastic)?
