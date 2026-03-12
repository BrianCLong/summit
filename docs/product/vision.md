# Summit Product Vision & Strategy

## Product Vision

To become the undeniable operating system for verifiable, agent-driven open-source intelligence (OSINT) and complex investigations. Summit aims to transform opaque, ad-hoc research into a mathematically provable, automated science.

## Mission Statement

To empower intelligence teams, investigators, and researchers to uncover truth rapidly. We achieve this through deterministic, audit-grade AI orchestration that replaces manual analytical toil with an immutable chain-of-custody.

## Target Users and Use Cases

### Enterprise Intelligence & SOC Teams

* **Brand Protection & Takedowns:** Seamless workflows for typosquat detection, automated screenshot capture, DNS/certificate analysis, and the generation of cryptographically signed evidence bundles ready for legal submission.
* **Vulnerability Prioritization:** Intelligence feeds enriched with deterministic scoring based on explainable lifecycle stages, rejecting opaque vendor algorithms in favor of clear evidence.

### Government & Defense

* **Regulated Investigations:** Conducting complex, multi-hop link analysis with strict, code-enforced governance (e.g., "no mass scraping", API limits).
* **Audit & Replay:** Every step of an investigation can be replayed byte-for-byte, proving exactly how a conclusion was reached, meeting strict legal and compliance thresholds.

### Research & Legal

* **Casework & Compliance:** Deep graph analysis and evidence collection for legal cases. Summit eliminates manual data entry and unstructured note-taking, automatically compiling nodes and edges into immutable evidence artifacts.

## Current Capabilities Overview

* **Agentic AI Orchestration:** Autonomous multi-agent coordination (e.g., Jules, Codex, Observer) executing specific investigation playbooks.
* **Knowledge Graphs & GraphRAG:** Neo4j-backed multi-hop graph traversal and vector similarity search (Qdrant) to connect disparate intelligence markers.
* **Real-time Data Ingestion:** Streaming "Switchboard" connectors for REST APIs, CSVs, S3, Postgres/Neo4j replication, and Webhooks.
* **Deterministic Evidence Ledger:** An evidence-first audit trail generating immutable, verifiable artifacts (e.g., `report.json`, `stamp.json`).
* **Code-Enforced Governance:** Strict sandbox policies and MCP integration frameworks ensuring that agent tool usage remains compliant and trackable.

## Known Limitations

* **Bring Your Own Key (BYOK) Model:** Summit is an intelligence operating system, not a data broker. It relies on customers providing their own subscriptions and API keys for premium data feeds (e.g., Social Links, Orpheus).
* **Playbook Rigidity:** To maintain high determinism and evidentiary standards, agent execution relies heavily on predefined, structured playbooks rather than entirely open-ended, unconstrained exploration.
* **Graph Scale Overheads:** Extremely massive, unbounded multi-hop ad-hoc queries require careful optimization and schema tuning within Neo4j to maintain real-time responsiveness.

## Competitive Differentiation

* **vs. Recorded Future:** While Recorded Future provides broad intelligence graph feeds with opaque risk scores, Summit provides the *workspace* where that intelligence is fused with internal data and scored deterministically, based on clear, verifiable logic.
* **vs. Maltego:** Maltego is the standard for manual link analysis. Summit leapfrogs it by treating the investigation as code: autonomous agents build the graph, allowing for replayability, policy-aware redaction, and automated evidence generation.
* **vs. ShadowDragon / Social Links:** Competitors emphasize OPSEC and raw data breadth. Summit subsumes these capabilities (via API adapters) but surrounds them with an "Evidence Ledger" and code-enforced policy engine, turning ad-hoc scraping into reproducible casework.
* **vs. Palantir:** Palantir is a generalized operational platform with high integration overhead. Summit provides an *investigation-native* schema out-of-the-box, specifically optimized for the evidentiary rigor required by intelligence and SOC teams.
