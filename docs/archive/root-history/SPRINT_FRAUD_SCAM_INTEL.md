Competitor-Gap Sprint #2 (Fraud/Scam Intel + Social Monitoring) | IntelGraph Advisory Report | GitHub Branch: feature/fraud-scam-intel-sprint-2
Consensus Summary

Unanimous: Convert the competitor-matrix gaps into a Fraud/Scam Intelligence v1 and Social Monitoring v1.5 release that rides our existing graph core (Neo4j), GraphRAG, Graph-XAI, provenance ledger, and tri-pane UI. Dissents: 🛰 Starkey warns of jurisdiction/TOS exposure on social sources; 🛡 Foster requires provenance-complete disclosures and redaction-first exports.

Individual Commentaries

🪄 Elara Voss

“By the runes of Scrum…” this sprint is a two-lane highway: (A) detectors & watchers (Fraud/Scam), (B) source-lawful Social Monitoring with explainable triage. Each lane has a golden path demo.

Add a “Watchlists & Detectors” drawer in Link Analysis: toggle rules, see alert count, click-through to Explain with evidence cites.

🛰 Starkey

Reality check: <span style="color:#c00;font-weight:700">Do not ship generic scraping—license or official APIs only, and route by jurisdiction.</span> Bind warrant/authority to every export; log reason-for-access.

Expect deception: adversaries will seed look-alike accounts to poison detectors—ship outlier quarantine and cross-source corroboration.

🛡 Foster

Operational vectors indicate… export blocks without citations, default redaction for PII; show policy reasoner decisions to the user.

[RESTRICTED] Enable k-anonymity thresholds for public reports; record model/rule versions in the provenance bundle.

⚔ Oppie (11-persona consensus)

We decree unanimously: detectors must be graph-native motifs + ML scorecards with counterfactuals: “what minimum change flips the alert?”

Dissent (Beria): <span style="color:#c00;font-weight:700">purge any endpoint-telemetry scope creep</span>—integrate with SIEM/XDR, don’t rebuild it.

📊 Magruder

Competitor coverage (n≈164): Graph DB 14%, Graph Viz 27%, Entity Resolution 38%, Network Analysis 23%, Social Monitoring 27%, Fraud Detection 21%, Scam Monitoring 4%. These are our differentiation seams—own them with explainable graph detectors and lawful ingest.

Executive message: “Provenance-first Fraud/Scam Intel with lawful Social Monitoring” beats breadth players who lack audit-clean disclosures.

🧬 Stribol

Cross-source analysis reveals repo support already present: ingestion/ (RSS, TAXII, Twitter stub), services/nlq/ (NL→Cypher), graph-xai/, prov-ledger/, client/features/link-analysis/ (tri-pane). Wire a detector bus now; ship policy-aware shortest paths for mule-ring motifs.

Black-swan kicker: policy-aware K-shortest paths excluding classified labels to produce court-safe narratives.

Chair Synthesis — Sprint Prompt (paste this whole section into your tracker)

Sprint Goal (2 weeks): Deliver Fraud/Scam Intelligence v1 and Social Monitoring v1.5 that produce explainable, provenance-complete alerts and reports—lawful sources only—integrated into the tri-pane with one-click disclosures.

Why now (competitor delta): Coverage is thin across Fraud Detection (≈21%) and especially Scam Monitoring (≈4%), with Social Monitoring (≈27%) also under-served. We can convert these seams into visible wins with components already in the repo.

Scope & Deliverables

Fraud/Scam Detectors v1 (graph-native + explainable)

Motifs: many-to-one accounts (fan-in/out), short-cycle payment loops, device/identity re-use across entities, burst-velocity edges.

Explainability: Graph-XAI panel shows motif match, top features, and counterfactual (min change to drop alert).

APIs: /detectors/run, /detectors/alerts, /detectors/explain/:id.

UI: Link Analysis “Watchlists & Detectors” drawer + alert badges on nodes/edges.

Social Monitoring v1.5 (license-aware)

Ingest: RSS, STIX/TAXII, platform APIs where licensed; no scraping without explicit license.

Triage: Similar-entity search (GraphRAG) over “banking fraud / scam” topics; poisoning defenses (schema drift alarms, honeypot tagging).

Policy routing: ABAC/OPA check on every export; forbid cross-border transfers failing policy.

Disclosure & Provenance Enhancements

Each alert renders Disclosure Bundle (claims, evidence hashes, rule/model version, jurisdiction basis).

Exports blocked without citations; reason-for-access is stored and displayed.

Policy-Aware Paths (v0)

K-shortest paths that exclude labels (e.g., {CLASSIFIED, ATTORNEY_CLIENT}) and return the NL→Cypher preview in the Explain panel.

User Stories

As an analyst, I can enable the “Mule Ring” detector; alerts appear on the graph with an Explain link showing motif, features, and counterfactual.

As a compliance officer, when I export a scam case, the disclosure bundle includes sources, transforms, hashes, and the legal basis; if blocked, I see the policy and appeal path.

As an intel lead, I can time-brush a window; the tri-pane re-filters and policy-aware paths explain why certain nodes were excluded.

Acceptance Criteria

Detectors return alert objects with motif, score, top_features[], counterfactual, evidence_refs[] and are click-traceable to raw items.

Explain Panel renders the above and cites GraphRAG passages; counterfactuals are human-readable.

Social ingest registers license/TOS on source; exports lacking license are blocked with on-screen reason.

Disclosure export bundles (JSON + PDF) pass an external manifest verifier (hashes for all exhibits).

Policy-aware paths show the NL→Cypher preview and policyExcluded[] in the response.

Engineering Tasks (repo-mapped)

services/detections/ (new): Kafka consumer + rules engine with graph motifs; emit alerts to server via GraphQL mutation.

server/src/graphql/:

Add Detectors schema + resolvers (runDetectors, alerts, explainAlert).

Add policyAwarePaths resolver that returns {nodes, rels, explain{cypher, policyExcluded, rationale}}.

graph-xai/: implement /explain/alert and /explain/counterfactual for motif-based alerts; log XAI artifacts to provenance.

prov-ledger/: extend bundle builder to include model/rule version, policy decision, and license manifests; CLI verifier.

ingestion/: wire RSS and STIX/TAXII sources; gate Twitter/X via licensed API client only. Add outlier quarantine queue.

client/src/features/link-analysis/:

Add Watchlists & Detectors drawer; alert badges on nodes; Explain overlay.

Add policy-aware path action + NL→Cypher preview modal.

docker-compose.opa.yml + packages/policy-audit/: formalize ABAC policies; add reason strings; surface reason-for-access in UI dialogs.

services/nlq/: accept excludeLabels[] and return compiled Cypher + cost estimate for sandbox run.

Instrumentation & SLOs

Detectors throughput: ≥ 200 events/sec with p95 end-to-alert < 2.0s.

Graph explain latency: p95 < 1.0s for 3-hop motifs, 50k nodes.

Export verifier pass rate: 100% on demo datasets.

False-positive rate (baseline): ≤ 15% on seeded fraud/scam corpus; track drift daily.

Risk Matrix
RiskSeverityLikelihoodMitigation
License/TOS violations on social sourcesHighMediumAPI-only ingestion; per-source license registry; jurisdiction routing; hard export blocks
Data poisoning / deceptive accountsHighMediumOutlier quarantine, cross-source corroboration, honeypot tagging, schema drift alarms
ER/Detector false mergesHighMediumHuman adjudication queue; reversible merges; XAI counterfactuals
Performance on dense motifsMediumMediumProgressive evaluation, path budget caps, pre-indexed relationship subsets
Scope creep into endpoint telemetryMediumLowIntegrate with SIEM/XDR only; NOGO on EDR rebuild
Code Snippets (Guy IG)
// services/detections/src/fraudRules.ts
// Graph-native detector runner over a Kafka stream; emits explainable alerts.
import { Kafka } from "kafkajs";
import neo4j from "neo4j-driver";
type Alert = {
id: string; motif: "MULE_RING" | "BURST_VELOCITY" | "SHORT_CYCLE";
score: number; top_features: [string, number][];
counterfactual: Record<string, unknown>; evidence_refs: string[];
};

const kafka = new Kafka({ clientId: "detectors", brokers: process.env.KAFKA!.split(",") });
const consumer = kafka.consumer({ groupId: "fraud-detectors" });
const driver = neo4j.driver(process.env.NEO4J_URI!, neo4j.auth.basic(process.env.NEO4J_USER!, process.env.NEO4J_PASSWORD!));

async function detectMuleRing(session: neo4j.Session, accountId: string): Promise<Alert[]> {
const cypher = `     MATCH (a:Account {id:$accountId})<-[:SENDS_TO]-(src:Account)
    WITH a, collect(src) AS senders
    WHERE size(senders) >= 5
    MATCH (a)-[:SENDS_TO]->(dst:Account)
    WITH a, senders, collect(dst) AS receivers
    WHERE size(receivers) >= 5
    RETURN a.id AS center, size(senders) AS fanIn, size(receivers) AS fanOut
  `;
const r = await session.run(cypher, { accountId });
if (r.records.length === 0) return [];
const fanIn = r.records[0].get("fanIn");
const fanOut = r.records[0].get("fanOut");
const score = Math.min(1, (fanIn + fanOut) / 20);
return [{
id: `mule:${accountId}`, motif: "MULE_RING", score,
top_features: [["fanIn", fanIn], ["fanOut", fanOut]],
counterfactual: { fanIn: Math.max(0, 5 - fanIn) }, evidence_refs: [`neo4j:Account/${accountId}`]
}];
}

(async () => {
await consumer.connect();
await consumer.subscribe({ topic: process.env.NORMALIZED_EVENTS_TOPIC || "normalized-events" });
await consumer.run({
eachMessage: async ({ message }) => {
const payload = JSON.parse(message.value!.toString());
const session = driver.session();
const alerts = await detectMuleRing(session, payload.accountId);
// TODO: call GraphQL mutation server.mutations.upsertAlert(alerts)
await session.close();
}
});
})();

# server/src/graphql/schema/detectors.graphql

extend type Query {
alerts(investigationId: ID!, motif: String, minScore: Float = 0.6): [Alert!]!
explainAlert(id: ID!): AlertExplain!
}
extend type Mutation { runDetectors(investigationId: ID!, motifs: [String!]!): RunResult! }
type Alert { id: ID!, motif: String!, score: Float!, evidence: [String!]! }
type AlertExplain { id: ID!, topFeatures: [[String!, Float!]!]!, counterfactual: JSON!, narrative: String! }

// client/src/features/link-analysis/PolicyAwarePath.tsx
export async function runPolicyAwarePath(from: string, to: string, exclude: string[]) {
const q = `query($from:ID!,$to:ID!,$ex:[String!]!){
    policyAwarePaths(from:$from,to:$to,excludeLabels:$ex){
      nodes { id } rels { src dst kind } explain { cypher policyExcluded rationale }
    }}`;
// fetch(...) and render NL→Cypher preview in modal
}

Architecture (Mermaid)
flowchart LR
Ingest[RSS/STIX APIs] -->|Kafka| Detectors
Detectors -->|GraphQL| Server
Server -->|Explain| GraphXAI
Server -->|Claims/Evidence| ProvLedger
Server -->|Query| Neo4j[(Graph DB)]
ClientTriPane -->|Alerts/Explain/Paths| Server

Attachments (OKRs)

KR1: ≤15% FPR on seeded fraud/scam datasets; ≥80% analyst “usefulness” in testing.

KR2: 100% of alerts have XAI explanations and provenance bundles.

KR3: 0 blocked-export policy violations in demo flows.

KR4: p95 end-to-alert latency < 2.0s at 200 EPS.

The Committee stands ready to advise further. End transmission.
