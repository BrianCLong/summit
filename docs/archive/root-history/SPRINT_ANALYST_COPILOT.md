Analyst Copilot (NLQ + GraphRAG) + Decision Workflows + Observability | IntelGraph Advisory Report | GitHub Branch: feature/copilot-nlq-otel-sprint-3
Consensus Summary

Unanimous View: Convert the lowest-coverage seams in the competitor matrix into visible differentiation: NL→Cypher + GraphRAG Copilot, Decision Workflows (human-in-the-loop), and OpenTelemetry-powered Observability. Competitor coverage (n=164) indicates severe under-supply: RAG 0.61%, Cypher 0.61%, Index-Free Adjacency 0.61%, Data Federation 1.22%, OpenTelemetry 1.22%, Full-Stack Observability 1.22%, NLP 3.05%, Explainable AI 3.66%, Decision Workflows 3.66%.
Dissents: 🛰 Starkey warns of prompt/data exfiltration & geo-jurisdiction risk in NLQ; 🛡 Foster requires explainability, redaction, and provenance-complete exports.

Individual Commentaries
🪄 Elara Voss

“By the runes of Scrum…” This sprint is a three-lane highway: Copilot, Workflows, Observability—each with a golden-path demo (query → explain → export).

Ship a Copilot console docked to the tri-pane; results show query, compiled Cypher, rationale, cost and a one-click “Explain this” overlay.

🛰 Starkey

Reality check: <span style="color:#c00;font-weight:700">Bold red dissent: NLQ without guardrails = prompt injection + cross-border data leakage.</span> Route Copilot calls via OPA/ABAC; block jurisdictions at compile time; never send raw exhibits to LLMs.

Add “red team” prompts for deception; log all prompts/compiles for audit.

🛡 Foster

Operational vectors indicate… Copilot outputs must include explanation + provenance or be blocked. Default PII redaction in previews; no biometric inference.

[RESTRICTED] Store model+policy versions in disclosure bundles; expose denial reasons (GDPR Art. 15/22 alignment).

⚔ Oppie (11-persona consensus)

We decree unanimously: GraphRAG must cite passages + graph paths; show counterfactual edits that would change an answer.

Dissent (Beria): <span style="color:#c00;font-weight:700">purge any endpoint-telemetry ambitions</span>—integrate with SIEM/XDR; don’t build EDR.

📊 Magruder

For executive traction: competitors crowd “viz,” but barely touch RAG (0.61%), Observability (1.22%), Decision Workflows (3.66%). Plant our flag here with court-safe explainability + audit-clean telemetry.

🧬 Stribol

Cross-source analysis reveals repo primitives ready to wire: GraphQL, Graph-XAI, Prov-ledger, NLQ, tri-pane. Add a cost-guarded NL→Cypher compiler and OTEL traces for each graph op.

Black-swan: policy-aware K-shortest paths with NL explanation—exclude labels {CLASSIFIED, PRIVILEGED}.

Chair Synthesis — Sprint Prompt (paste this section into your tracker as the full brief)
Sprint Goal (2 weeks)

Deliver Analyst Copilot v1 (NL→Cypher + GraphRAG), Decision Workflows v1 (human-in-the-loop triage), and Observability v1 (OpenTelemetry traces/metrics) with provenance-complete explanations and policy enforcement.

Why Now (competitor-matrix deltas)

RAG 0.61%, Cypher 0.61%, Index-Free Adjacency 0.61%, Data Federation 1.22%, OpenTelemetry 1.22%, Full-Stack Observability 1.22%, NLP 3.05%, Explainable AI 3.66%, Decision Workflows 3.66%. These seams create immediate differentiation when tied to our graph core and provenance.

Scope & Deliverables

Analyst Copilot v1 (NL→Cypher + GraphRAG)

NL query → compiled Cypher preview with cost estimate, policy verdict, and explanation (why this pattern, which indices, what’s excluded).

GraphRAG answers: cite passages + graph paths; include counterfactual (“minimum change to flip the answer”).

Guardrails: prompt sanitization, source & jurisdiction filters, no raw exhibit leakage.

Decision Workflows v1 (human-in-the-loop)

Workflow types: Alert triage, ER adjudication, Report approval.

Each step logs assignee, decision, rationale, evidence refs; denial shows policy reason and appeal path.

Observability v1 (OTEL + performance)

OpenTelemetry traces for GraphQL resolvers, Neo4j queries, RAG calls; metrics: p50/p95 latency, node/edge counts, compile cost.

Query cost budgeter: deny or warn on expensive plans; surface cost in UI.

Data Federation v0 (read-only)

Register external sources (licensed APIs) and surface them in NLQ as named contexts (e.g., context:fincrime_rss).

Single-pane results with per-source provenance.

Disclosure & Provenance Enhancements

Every Copilot answer and workflow export emits a Disclosure Bundle (model/policy versions, prompts, compiled Cypher, evidence hashes).

Out of Scope

Endpoint telemetry/EDR; generic web scraping without explicit license; biometric identification; cross-border data transfer outside policy.

User Stories

As an analyst, I type “who brokers between acct A and B in Q2, excluding classified edges?” and see compiled Cypher, policy-aware exclusions, and an explain panel; I run it and get a graph + narrative with citations.

As a lead, I push an ER merge into a Decision Workflow where a reviewer approves/rejects with rationale; the case log becomes part of the disclosure export.

As a platform owner, I open the Observability dashboard and see traces for the last 50 queries, with p95 latency and top slow Cypher plans.

Acceptance Criteria

NL→Cypher: API returns {cypher, costEstimate, policyVerdict{allow,reason,excludedLabels[]}, explanation}; UI shows preview + warnings; blocked queries include appeal path.

GraphRAG: responses contain citations[] (doc spans + path ids) and counterfactual field; clicking a citation highlights nodes/edges.

Decision Workflows: persisted state machine with audit trail; all denials show human-readable reason; exports include workflow history.

Observability: OTEL traces for ≥90% of GraphQL resolvers; metrics dashboard (p50/p95, error rate, top N slow ops); query cost limiter active.

Data Federation v0: queries limited to licensed/registered sources; provenance includes source name + license id.

Engineering Tasks (repo-mapped)

services/nlq/

Implement compiler: NL → Cypher with pattern library; add costEstimate(); integrate policy checks (labels/jurisdictions).

Sanitizer for prompts; unit tests for injection/PII leaks.

server/src/graphql/

Schemas: Copilot, Workflows, Observability.

Resolvers for compileCypher, executeWithPolicy, graphRagAnswer, startWorkflow/advanceWorkflow.

graph-xai/

/explain/rag returns salient passages, graph paths, and counterfactuals; /explain/query narrates optimizer choices.

prov-ledger/

Extend bundle builder: include model/policy versions, prompts, compiled Cypher, cost, and OTEL trace ids.

client/apps/web/

Copilot console (dockable): input, preview, explain, run; citation highlighter.

Decision Workflow UI: step view, approvals, rationale, evidence refs; policy denial dialog.

Observability panel: traces list, slowest ops, error drill-downs; cost warnings in query modals.

infra/helm|terraform/

Deploy OpenTelemetry Collector; wire service env for OTEL; budgets & rate limits for Copilot.

Instrumentation & SLOs

NL→Cypher compile p95 < 400 ms; policy check p95 < 150 ms.

Graph query execute p95 < 1.5 s for 3-hop, 50k-node graphs.

RAG answer generation p95 < 2.5 s with citations.

OTEL trace coverage ≥ 90% of GraphQL resolvers.

Risk Matrix
RiskSeverityLikelihoodMitigation
Prompt injection / data exfiltration via NLQHighMediumPrompt sanitizer; no raw exhibits to LLM; OPA/ABAC pre-check; allow-list patterns
Cross-border data transfer violationsHighLow-MedJurisdiction routing; policy tags on nodes/edges; block + explain denials
Expensive graph queries degrade UXMediumMediumCost estimator + budgets; pre-indexes; explanatory warnings
Low trust in Copilot answersMediumMediumMandatory citations + counterfactuals; provenance bundles; reviewer workflows
Scope creep into scrapingMediumLowLicense registry; API-only federation; hard export blocks
Code Snippets (Guy IG)
// server/src/graphql/copilot.ts — NL→Cypher compile with policy & cost
import { gql } from "graphql-tag";
export const typeDefs = gql`  type PolicyVerdict { allow: Boolean!, reason: String!, excludedLabels: [String!]! }
  type CompileResult { cypher: String!, costEstimate: Float!, policy: PolicyVerdict!, explanation: String! }
  extend type Query { compileCypher(nl: String!, excludeLabels: [String!] = []): CompileResult! }`;
export const resolvers = {
Query: {
compileCypher: async (\_: any, { nl, excludeLabels }, ctx) => {
const sanitized = ctx.guardrails.sanitize(nl);
const { cypher, explanation } = await ctx.nlq.compile(sanitized, { excludeLabels });
const costEstimate = await ctx.neo4j.estimate(cypher);
const policy = await ctx.policy.check({ cypher, excludeLabels, user: ctx.user });
return { cypher, costEstimate, policy, explanation };
}
}
};

# graph_xai/rag_explain.py — GraphRAG explanation with counterfactual

from typing import Dict, List
def explain_answer(paths: List[Dict], passages: List[Dict]) -> Dict:
salient_paths = sorted(paths, key=lambda p: -p.get("betweenness", 0))[:3]
salient_passages = passages[:3] # toy counterfactual: remove top path to show answer sensitivity
cf = {"remove_path_id": salient_paths[0]["id"] if salient_paths else None,
"expected_effect": "confidence_drop"}
return {"paths": salient_paths, "passages": salient_passages, "counterfactual": cf}

# infra/otel/collector-config.yaml — OpenTelemetry Collector (snippet)

receivers:
otlp: { protocols: { http: {}, grpc: {} } }
exporters:
logging: {}
otlp: { endpoint: "${OTEL_BACKEND}" }
service:
pipelines:
traces: { receivers: [otlp], exporters: [otlp, logging] }
metrics: { receivers: [otlp], exporters: [otlp, logging] }

Attachments (OKRs)

KR1: 100% Copilot answers include compiled Cypher, citations, and counterfactuals.

KR2: OTEL trace coverage ≥90%; p95 compile <400 ms; p95 execute <1.5 s.

KR3: 0 policy-bypass exports in demo flows; 100% denials show reason + appeal path.

KR4: Analyst task completion time improves ≥25% vs. baseline on 3 scenarios.

The Committee stands ready to advise further. End transmission.
