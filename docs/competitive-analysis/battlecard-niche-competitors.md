## Battlecard: Summit vs. Niche Competitors

| Dimension           | Summit / IntelGraph (target)                                                                                                | Flowsint                                                                                                                                        | ShadowDragon (Horizon + SocialNet/MalNet)                                                                                                                                                                                                                        | Maltego                                                                                                                                                          | Graphwise                                                                                                                                                           | Altair Graph Studio                                                                                                                                                   | TigerGraph                                                                                                                                                           |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Core product        | Operational intel graph with multi-source fusion + agents for missions (threat finance, supply chain, influence, SaaS risk) | Graph-based OSINT investigation tool with visual exploration + automated transforms and n8n automation. [flowsint](https://www.flowsint.io)     | All-in-one OSINT platform with 225+ data sources, 1500+ pivots, and advanced link analysis/monitoring across open, deep, and dark web. [businesswire](https://www.businesswire.com/news/home/20240413210644/en/ShadowDragon-Releases-The-OSINT-Platform-Horizon) | Desktop/client OSINT & cyber investigation workbench with transforms, link analysis, and graph views. [wiz](https://www.wiz.io/academy/threat-intel/osint-tools) | Enterprise “GraphRAG + agents” platform: semantic backbone, knowledge graphs, and agents for trustworthy AI over enterprise data. [graphwise](https://graphwise.ai) | Enterprise semantic/knowledge-graph fabric for integrating and modeling diverse data with scalable graph processing. [altair](https://altair.com/altair-graph-studio) | AI-powered graph database for real-time graph analytics (fraud, cyber, supply chain), usually embedded in custom solutions. [tigergraph](https://www.tigergraph.com) |
| Primary users       | Intel/cyber teams, IC/DoD, high-sensitivity commercial intel and risk teams                                                 | OSINT/cyber analysts, journalists, researchers, corporate intel. [flowsint](https://www.flowsint.io)                                            | Law enforcement, intel units, brand protection, fraud teams wanting broad PAI coverage. [businesswire](https://www.businesswire.com/news/home/20240413210644/en/ShadowDragon-Releases-The-OSINT-Platform-Horizon)                                                | OSINT/cyber analysts who need flexible link analysis and transforms on their desktop. [wiz](https://www.wiz.io/academy/threat-intel/osint-tools)                 | Enterprise data/AI teams building GraphRAG apps and agents. [graphwise](https://graphwise.ai)                                                                       | Data architects, IT for enterprise data integration and semantic modeling. [altair](https://altair.com/altair-graph-studio)                                           | Data engineering / analytics teams needing scalable graph computations. [tigergraph](https://www.tigergraph.com)                                                     |
| Data scope          | OSINT + proprietary + internal data: systems-of-record, telemetry, files, graph-native                                      | OSINT/PAI; local-first storage; relies on external APIs via transforms. [flowsint](https://www.flowsint.io)                                     | Huge PAI scope: social, chat, forums, breach data, dark web, geo, etc. [businesswire](https://www.businesswire.com/news/home/20240413210644/en/ShadowDragon-Releases-The-OSINT-Platform-Horizon)                                                                 | OSINT-oriented; many transforms but depends on external sources/licenses. [wiz](https://www.wiz.io/academy/threat-intel/osint-tools)                             | Primarily internal enterprise data sources; focus on semantics and governance. [graphwise](https://graphwise.ai)                                                    | Internal enterprise systems and diverse structured/unstructured sources. [altair](https://altair.com/altair-graph-studio)                                             | Any graph-shaped data ingested into DB; OSINT only via upstream tools. [tigergraph](https://www.tigergraph.com)                                                      |
| Automation & agents | Native multi-agent workflows over the graph (collection, triage, enrichment, alerting, narrative-building)                  | Strong transform chaining; integrates with n8n and webhooks for automation but no native multi-agent layer. [flowsint](https://www.flowsint.io) | Automated monitoring, alerts, keyword and actor tracking; rules-driven rather than general-purpose agents. [businesswire](https://www.businesswire.com/news/home/20240413210644/en/ShadowDragon-Releases-The-OSINT-Platform-Horizon)                             | Supports automation via transforms; agents/workflows mainly scripted by users. [wiz](https://www.wiz.io/academy/threat-intel/osint-tools)                        | Explicit “agent-based systems” on top of knowledge graph and GraphRAG. [graphwise](https://graphwise.ai)                                                            | Some workflow/pipeline orchestration, not agent-first. [altair](https://altair.com/altair-graph-studio)                                                               | No native agents; integrates with external ML/agent frameworks. [tigergraph](https://www.tigergraph.com)                                                             |
| Deployment posture  | Secure, gov-ready, multi-tenant, on-prem/Fed cloud; designed for sensitive missions                                         | Local-first privacy, open-source, self-host; more lab/tool than enterprise platform. [flowsint](https://www.flowsint.io)                        | SaaS and hosted solutions; designed for investigators with training offering; not a general data fabric. [businesswire](https://www.businesswire.com/news/home/20240413210644/en/ShadowDragon-Releases-The-OSINT-Platform-Horizon)                               | Desktop/server; used inside larger environments but not full infra. [wiz](https://www.wiz.io/academy/threat-intel/osint-tools)                                   | Enterprise SaaS / managed; integrates with major LLMs and AI frameworks. [graphwise](https://graphwise.ai)                                                          | Enterprise deployments with heavy IT involvement. [altair](https://altair.com/altair-graph-studio)                                                                    | DB engine + cloud; depends on others for full intel stack. [tigergraph](https://www.tigergraph.com)                                                                  |
| Scale fit vs you    | Matches or exceeds your graph & workload scale by design                                                                    | Similar or smaller; focused on investigations rather than persistent, multi-tenant ops. [flowsint](https://www.flowsint.io)                     | Similar scale at team/department deployments; heavy data coverage, narrower workflow scope. [businesswire](https://www.businesswire.com/news/home/20240413210644/en/ShadowDragon-Releases-The-OSINT-Platform-Horizon)                                            | Similar or smaller; analyst-centric deployments. [wiz](https://www.wiz.io/academy/threat-intel/osint-tools)                                                      | Similar/greater in infra, but different (enterprise AI) domain. [graphwise](https://graphwise.ai)                                                                   | Similar/greater infra; not mission-intel-focused. [altair](https://altair.com/altair-graph-studio)                                                                    | Similar/greater infra; infra-only role. [tigergraph](https://www.tigergraph.com)                                                                                     |

## Takedown & Surpass Tactics

### Versus Flowsint

**Their hook**: modern, open-source OSINT graph tool with automation and privacy-first local storage. [flowsint](https://www.flowsint.io/docs/overview)

**Takedown narrative (sales/bd)**

- “Great for exploratory OSINT; not for running a live intelligence mission over multi-source, high-side + low-side data.”
- “Transforms and n8n workflows are powerful, but they don’t give you governed, multi-tenant intel operations.”

**Surpass moves**

- Ship:
  - Native agent orchestration that can _call_ Flowsint-like transforms as steps.
  - Case/mission model (entities + hypotheses + tasks + narratives) backed by the graph.
- Position:
  - Offer a “Flowsint-compatible” mode where analysts can import/export graphs and run comparable transforms.
  - Publish a benchmark showing: same OSINT dataset, Summit graph + agents get to answer in fewer steps and with better recall/precision.

### Versus ShadowDragon (Horizon / SocialNet / MalNet)

**Their hook**: unparalleled PAI coverage (225+ sources, 1500+ pivots) and mature link analysis/monitoring. [businesswire](https://www.businesswire.com/news/home/20240413210644/en/ShadowDragon-Releases-The-OSINT-Platform-Horizon)

**Takedown narrative**

- “Amazing data hose and OSINT workbench, but it stops at OSINT; it doesn’t become your central intelligence operating picture.”
- “Great pivots, weak where you need fusion with internal systems, secure enclaves, and downstream automation.”

**Surpass moves**

- Partner posture:
  - Integrate their APIs/exports as feeds into Summit; show “ShadowDragon inside, but with full mission context.” [shadowdragon](https://shadowdragon.io)
- Product:
  - Build first-class adapters for dark-web, breach, and social feeds (including ShadowDragon) into a unified entity/story view.
  - Add agentic monitoring over _all_ sources (not just OSINT) with playbooks: “Sanctions risk,” “Narrative emergence,” “Insider + external signals.”

### Versus Maltego

**Their hook**: ubiquitous analyst tool, huge transform ecosystem, deep adoption in OSINT/cyber communities. [wiz](https://www.wiz.io/academy/threat-intel/osint-tools)

**Takedown narrative**

- “Maltego is an excellent **workbench**, Summit is the **room full of screens** powering multiple workbenches.”
- “Desktop-centric transforms vs. centrally governed, continuously updated intelligence fabric.”

**Surpass moves**

- Ship:
  - Maltego connector that lets analysts push/pull subgraphs to/from Summit for case work.
  - Central transform registry plus agent-run transforms, with logging, approvals, and audit suitable for IC/DoD.
- GTM:
  - “Maltego-friendly” marketing: ‘Keep your Maltego, power it with a grown-up intel graph.’

### Versus Graphwise

**Their hook**: semantic backbone + GraphRAG + agents; message is “trusted AI you can verify.” [graphwise](https://graphwise.ai)

**Takedown narrative**

- “Enterprise AI assistant for knowledge work, not an end-to-end intelligence platform with operational tradecraft baked in.”
- “Great semantics, limited understanding of adversarial behavior, threat models, and multi-source OSINT + classified contexts.”

**Surpass moves**

- Borrow messaging:
  - Adopt the “trusted semantic backbone for agents” language, but tie it directly to adversary modeling and risk. [techintelpro](https://techintelpro.com/news/ai/enterprise-ai/graphwise-launches-graph-ai-suite-to-power-trustworthy-enterprise-ai)
- Product:
  - Offer a semantic layer (ontologies, taxonomies) tuned for intel domains (threat actors, campaigns, infrastructure, narratives).
  - Provide pluggable GraphRAG endpoints and policies so enterprise AI teams can use Summit as their “intel RAG” node.

### Versus Altair Graph Studio

**Their hook**: serious enterprise semantic/knowledge-graph fabric with strong integration and modeling capabilities. [altair](https://altair.com/altair-graph-studio)

**Takedown narrative**

- “Infra for data teams; they give you tools to build a fabric, you’re buying a finished operating picture for intel.”
- “You can pour months into modeling, or adopt a platform that already encodes relevant intel patterns.”

**Surpass moves**

- Offer prebuilt schemas and ETL templates for intel/OSINT and cyber use cases.
- Provide “Altair-compatible” export/import of RDF/OWL/JSON-LD, positioning Summit as the mission-layer above generic fabrics. [altair](https://altair.com/altair-graph-studio)

### Versus TigerGraph

**Their hook**: high-performance, AI-oriented graph DB for real-time analytics. [tigergraph](https://www.tigergraph.com)

**Takedown narrative**

- “TigerGraph is a powerful engine, but you still have to build _everything else_ around it to do intel work.”
- “Database vs. mission system.”

**Surpass moves**

- Architect Summit so TigerGraph (or Neo4j, Memgraph, etc.) can be an internal backend option, making you “graph-agnostic but mission-opinionated.” [tigergraph](https://www.tigergraph.com)
- Offer curated graph algorithms (path-finding, centrality, community detection) and tie them into analyst and agent workflows rather than just exposing them as APIs.

## Positioning & Messaging Layer

Use these framing lines repeatedly:

- “**Operational intelligence graph**, not just a graph tool or OSINT client.”
- “From OSINT and telemetry to **decisions and actions**, via agents and workflows.”
- “Bring your Maltego/Flowsint/ShadowDragon – Summit is the shared **mission context** they all plug into.”
- “Semantic backbone and GraphRAG tuned not for HR or marketing, but for adversaries, narratives, and risk.” [graphwise](https://graphwise.ai/event/automate-knowledge-trust-your-ai/)
