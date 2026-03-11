# Literature Review: GraphRAG and Narrative Intelligence

## Metadata
- **Assumptions:** The underlying technologies (LLMs, Knowledge Graphs, Network Science) evaluated in this review remain valid building blocks for scalable cognitive defense systems. Summit's architecture can inherently execute multi-hop reasoning over temporal graphs as theorized in the literature.
- **Limitations:** This review prioritizes operational applicability over theoretical purity. It relies primarily on unclassified, publicly available literature and may not reflect the absolute frontier of classified adversarial information operations.
- **Explicit Non-Claims:** This review does not claim that GraphRAG alone solves the problem of narrative intelligence. It explicitly acknowledges that computational narrative detection is probabilistic and cannot independently adjudicate ground truth without human-in-the-loop oversight.

## Domain 1: GraphRAG and Knowledge Graph-Augmented Retrieval

### Summary of Key Papers
The integration of Large Language Models (LLMs) with Knowledge Graphs (KGs) has emerged as a critical architectural pattern, often termed GraphRAG, to overcome the hallucination and reasoning limitations of standard Vector RAG systems. Foundational work by Lewis et al. (2020) established retrieval-augmented generation, but recent research highlights the necessity of structured data for complex tasks. Edge et al. (2024) demonstrated "From Local to Global" query-focused summarization, illustrating how hierarchically structured communities in a graph provide superior context for global queries than simple semantic search.

Similarly, frameworks like QA-GNN (Yasunaga et al., 2021) and Think-on-Graph (Sun et al., 2023) highlight the capacity for "multi-hop" reasoning. By grounding LLM inference on explicit edges (relationships) rather than implicit proximity (vectors), these models can trace logical paths, ensuring the generated text is both faithful to the data and interpretable.

### Relevance to Summit's Approach
Summit relies heavily on a Neo4j-backed Knowledge Graph to construct verifiable, evidence-linked contexts. The literature strongly validates this architectural choice. Papers like MindMap (Wen et al., 2023) and G-Retriever (He et al., 2024) directly support Summit's hypothesis that LLMs act most effectively as "reasoning engines" over a constrained, graph-structured domain rather than as primary knowledge stores. The transition from vector similarity to topological graph traversal enables Summit to perform deterministic context assembly, a critical requirement for enterprise and defense applications.

### Gaps Summit Addresses
While academic literature focuses on static benchmarks (e.g., standard QA datasets), it frequently ignores the temporal and adversarial realities of real-world knowledge graphs. Academic GraphRAG often assumes a clean, perfectly extracted KG.
Summit bridges this gap by addressing:
1. **Dynamic Ingestion:** Summit processes high-throughput, noisy streams (via feed:ingest and Redis) into the graph, continuously updating state.
2. **Adversarial Resilience:** Summit introduces multi-tenant, zero-trust context isolation (JWT validation, tenant-scoped Cypher queries), whereas academic GraphRAG models typically operate in single-tenant, fully trusted sandbox environments.
3. **Verifiability:** Summit enforces a strict chain of custody (Evidence IDs) linking generated responses back to source artifacts, crucial for cognitive security but often omitted in academic prototypes.

---

## Domain 2: Narrative Intelligence and Information Operations Detection

### Summary of Key Papers
The study of information operations (IO) has transitioned from identifying simple bots to mapping complex, participatory narratives. Starbird et al. (2019) conceptualize disinformation as "collaborative work," showing how state actors and organic crowds co-create narratives. Ferrara et al. (2016) and Shao et al. (2018) mapped the infrastructure of social bots that artificially amplify these narratives, while Vosoughi et al. (2018) demonstrated the alarming speed at which false news propagates organically.

More recent initiatives, such as the DARPA INCAS program (Dar et al., 2022) and the emerging field of "social cybersecurity" (Carley, 2020), emphasize moving beyond mere "fake news detection" to identifying the overarching "narratives" and "tropes" being weaponized. This requires analyzing the propagation networks, the rhetoric (Da San Martino et al., 2019), and the cognitive impact of the messaging (Weninger et al., 2023).

### Relevance to Summit's Approach
Summit's narrative intelligence engine is designed to operationalize the findings of this literature. Rather than attempting binary "true/false" classification—which the literature shows is brittle and easily bypassed—Summit focuses on structural mapping. By leveraging GraphRAG, Summit maps the entities, the actors, the rhetorical strategies, and the propagation vectors of a narrative as a sub-graph. This aligns perfectly with the multi-dimensional approach advocated by Carley (2020) and Starbird et al. (2019).

### Gaps Summit Addresses
The primary gap in the current literature is the lack of scalable, automated orchestration capable of unifying narrative detection with active, GraphRAG-driven analysis.
Summit addresses these gaps through:
1. **Agentic Orchestration:** Where academic studies often rely on manual, post-hoc analysis of static datasets (e.g., Twitter scrapes), Summit utilizes an active swarm of agents (LangGraph, AutoGen) orchestrated to continuously monitor and parse evolving narratives in near real-time.
2. **Subsumption Architecture:** Summit's multi-agent hierarchy allows for concurrent extraction of different narrative facets (e.g., sentiment, network topology, rhetorical devices) which are then synthesized centrally.
3. **Economic/Prioritization Models:** Academic models rarely consider the "cost" of investigation. Summit integrates prioritization logic (akin to its RepoOS Patch Market) to dynamically allocate LLM and Graph compute resources to the most significant or structurally anomalous narratives, effectively triaging the cognitive threat landscape.
