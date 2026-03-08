# MOOSE-Star mapped to Summit Autonomous Research Pipeline

This architecture maps the concepts from the **MOOSE-Star** paper (*Unlocking Tractable Training for Scientific Discovery by Breaking the Complexity Barrier*) onto the **Summit** multi-agent ecosystem. It illustrates how hierarchical literature retrieval and bounded hypothesis composition can drive a fully autonomous research system.

## Architecture Diagram

```mermaid
graph TD
    %% Define Styles
    classDef intelgraph fill:#0d47a1,stroke:#64b5f6,stroke-width:2px,color:#fff;
    classDef maestro fill:#1b5e20,stroke:#81c784,stroke-width:2px,color:#fff;
    classDef agent fill:#e65100,stroke:#ffb74d,stroke-width:2px,color:#fff;
    classDef external fill:#4a148c,stroke:#ba68c8,stroke-width:2px,color:#fff;

    %% Components
    subgraph "IntelGraph: Epistemic Knowledge Base"
        LitDB[(Scientific Literature<br/>Graph Database)]
        Embeddings[Semantic Embeddings<br/>e.g., SPECTER2]
        HierarchicalTree[Hierarchical Retrieval Tree<br/>Root -> Domain -> Subfield -> Paper]
        LitDB --> Embeddings --> HierarchicalTree
    end
    class LitDB,Embeddings,HierarchicalTree intelgraph

    subgraph "Maestro: Orchestration & Uncertainty Control"
        Orchestrator{Society of Thought<br/>Engine}
        Uncertainty[Uncertainty Registry<br/>Epistemic & Aleatoric]
        Orchestrator <--> Uncertainty
    end
    class Orchestrator,Uncertainty maestro

    subgraph "MOOSE-Star Driven Multi-Agent Ecosystem"
        IR_Agent(Inspiration Retrieval Agent<br/>*IR Module*)
        HC_Agent(Hypothesis Composition Agent<br/>*HC Module*)
        Val_Agent(Validation & Simulation Agent)

        IR_Agent -- "Motivation Planning<br/>O(log N) Search" --> HierarchicalTree
        HierarchicalTree -- "Ranked Inspirations" --> IR_Agent

        IR_Agent -- "Background + Inspirations" --> HC_Agent
        HC_Agent -- "Bounded Stepwise Composition" --> Val_Agent
    end
    class IR_Agent,HC_Agent,Val_Agent agent

    subgraph "External Lab & War COP Integration"
        LabSim[[Robotic Lab / Simulation Engine]]
        WarCOP>War COP Decision Briefs<br/>Temporal Hypothesis Tracking]

        Val_Agent -- "Testable Experiments" --> LabSim
        HC_Agent -- "Generated Hypotheses" --> WarCOP
    end
    class LabSim,WarCOP external

    %% Orchestrator Control
    Orchestrator -.->|Task Delegation| IR_Agent
    Orchestrator -.->|Verification Loop| HC_Agent
    Orchestrator -.->|Result Evaluation| Val_Agent

    %% Closed-loop learning
    LabSim -.->|Experimental Results &<br/>Dynamic Knowledge Expansion| LitDB
```

## Subsystem Mapping

### 1. IntelGraph (Knowledge Foundation)
In MOOSE-Star, directly composing hypotheses from all papers is $O(N^k)$ and intractable. IntelGraph solves this by acting as the **Hierarchical Retrieval Tree**, reducing search space to $O(\log N)$.
- **Implementation**: Uses Qdrant for semantic vector retrieval and Neo4j for graph-based taxonomy (Root $\rightarrow$ Domain $\rightarrow$ Subfield $\rightarrow$ Paper).

### 2. Maestro Orchestrator (Cognitive Control)
The orchestrator manages the **Motivation Planning** step. Before searching, it defines the scientific field and constraints, pruning irrelevant branches. It also integrates with Summit's **Uncertainty Control Plane** to measure epistemic uncertainty (missing literature) and aleatoric uncertainty (noisy experimental data).

### 3. Core Agents (The MOOSE-Star Engine)
- **Inspiration Retrieval (IR) Agent**: Takes the research question and background, navigating IntelGraph to retrieve the most pertinent inspirations.
- **Hypothesis Composition (HC) Agent**: Takes the retrieved inspirations and incrementally composes the new hypothesis ($H_1 = \text{compose}(H_0 + \text{inspiration}_1)$). Trained to be robust to imperfect retrieval.
- **Validation Agent**: Translates the composed hypothesis into testable parameters or simulation configurations.

### 4. Lab Integration & War COP (The Autonomous Loop)
- **Lab Simulation / Automation**: Executes the experiments proposed by the Validation Agent. Crucially, the results from these experiments flow back into IntelGraph, providing **Dynamic Knowledge Expansion**.
- **War COP**: Generates deterministic, time-versioned decision briefs (`report.json`, `brief.md`) containing the tracked hypotheses, their provenance, and associated metrics. Human-in-the-loop operators review these artifacts within the War Room.

## Evolution toward 2026 Autonomous Research
By isolating **retrieval** from **composition**, this architecture prevents LLM context-collapse. As new robotic lab APIs become available, the loop closes completely: the system reads literature, deduces novel combinations, tests them empirically, and writes its findings back into its own graph memory, establishing a continuous cycle of scientific discovery.
