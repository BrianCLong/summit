# Codified Context: A Three-Tier Memory Architecture for Summit

## Overview

The "single `AGENTS.md`" pattern fundamentally fails as multi-agent ecosystems scale. As codebases evolve across numerous services, architectures, and policies, attempting to cram all directives into a monolithic instruction file results in context compression, prompt-window exhaustion, and critical instruction drift.

To solve this, Summit Intelligence OS adopts the **Codified Context** model—a three-tier memory architecture designed specifically for the Agent Control Plane (ACP). This approach structures agent context hierarchically, semantically, and transactionally, ensuring agents remain highly capable, specialized, and reliable without hallucination or context degradation.

## The Three-Tier Architecture

Analogous to traditional computer memory systems (RAM, Cache, Disk), the ACP routes context dynamically:

### Tier 1: Hot Memory (Constitutional Core)

The "always-on" operating system kernel for Summit agents.

*   **Function:** Defines the foundational identity, ethical bounds, mandatory architectural constraints, and unbreakable repository rules.
*   **Scale:** Extremely concise (< 1,000 lines). Fully loaded into the LLM context window at the beginning of every interaction.
*   **Examples in Summit:**
    *   Strict adherence to `Squash and Merge`.
    *   Requirement for S-AOS headers in PR bodies (`## Assumption Ledger`, `## Diff Budget`, etc.).
    *   Mandatory use of the `summit` namespace for metrics/traces (replacing legacy `intelgraph`).
    *   Core agent roles (Codex, Antigravity, Palette, Jules).
*   **Location:** Resides in a heavily governed central prompt (e.g., `prompts/sys/CONSTITUTION.md` or the ACP core initializer).

### Tier 2: Domain Memory (Expert Agents)

The "on-demand specialists" invoked based on semantic task classification.

*   **Function:** Implements narrow, deep expertise for specific service boundaries or subsystems. The ACP routes tasks to the appropriate domain expert rather than overloading a generalist.
*   **Scale:** Moderate size (e.g., 2k-5k lines). Loaded dynamically.
*   **Examples in Summit:**
    *   **Evidence & Integrity Domain:** Instructions for cryptographically signed bundles, hash-stable artifacts, and the Lineage Gate (`prompts/agents/domain/evidence-integrity-agent.md`).
    *   **Merge Governance Domain:** Instructions for the deterministic Merge Engine, lane assignments (`LANE/auto-merge-now`), and CI queue pressure (`prompts/agents/domain/merge-engine-agent.md`).
    *   **GraphRAG Domain:** Rules for deterministic retriever contracts, NFKC normalization, and stable sorting (`prompts/agents/domain/graphrag-retriever-agent.md`).
*   **Location:** Categorized prompt files within `prompts/agents/domain/`.

### Tier 3: Cold Memory (Knowledge Base & Retrieval Layer)

The "persistent storage" queried selectively via MCP (Model Context Protocol) or RAG.

*   **Function:** Holds structured specs, JSON schemas, historical Governance Acceptance Records (GARs), architectural blueprints, and raw telemetry data.
*   **Scale:** Practically unlimited. Stored entirely out-of-context.
*   **Access:** The agent actively queries this tier using tools (`read_file`, `grep`, `run_in_bash_session`, or specific MCP integrations) when specific details are required to complete a task.
*   **Examples in Summit:**
    *   Retrieving a specific JSON Schema (Draft 2020-12) from `docs/governance/schemas/` to validate an output.
    *   Querying the latest evaluation benchmarks (`evals/metrics.json`) to check the `provable_actionability_index`.
    *   Reading an older GAR from `docs/governance/acceptance/` to understand a previous architectural decision.
    *   Reviewing the exact `EXPLAIN` Cypher plan sampled in `.github/workflows/neo4j-plan-sample.yml`.
*   **Location:** Scattered across `docs/`, `evals/`, `tools/`, and external systems, retrieved programmatically.

## Applied Workflow: Implementing a New Policy

When implementing a new feature—for example, updating the Agent Evaluation & Governance System (AEGS) anomaly detection logic—the Codified Context architecture operates as follows:

1.  **Routing & Hot Memory:** The ACP receives the request and initializes the agent with the **Hot Memory**, establishing its role (e.g., Jules) and the strict requirement to generate deterministic evidence bundles with `EVID-<id>` tags.
2.  **Domain Injection:** The ACP semantically classifies the task as "Governance/AEGS" and injects the **Domain Memory** for AEGS (`prompts/agents/domain/aegs-agent.md`), which outlines the rules for LLM-as-judge evaluations and policy gates.
3.  **Cold Memory Retrieval:** During execution, the agent realizes it needs the exact format of a Governance Acceptance Record (GAR). It executes an MCP tool call to read the **Cold Memory** template (`docs/governance/acceptance/_template.md`) and the specific policy schema (`docs/governance/schemas/policy_v2.json`).
4.  **Synthesis:** The agent synthesizes the code change, perfectly adhering to global constraints (Hot), domain-specific logic (Domain), and exact formatting (Cold), minimizing hallucination and context bloat.

## Directory Topology

The directory structure perfectly mirrors the three-tier philosophy:

```
├── prompts/                    # Execution Context (Hot & Domain)
│   ├── sys/
│   │   └── CONSTITUTION.md     # Tier 1: Hot Memory (Core OS)
│   ├── agents/
│   │   └── domain/             # Tier 2: Domain Memory (Specialists)
│   │       ├── merge-engine-agent.md
│   │       ├── evidence-integrity-agent.md
│   │       └── graphrag-retriever-agent.md
│   └── registry.yaml           # Metadata for all prompts
│
├── docs/                       # Tier 3: Cold Memory (Knowledge Base)
│   ├── architecture/           # Blueprints & ADRs
│   ├── governance/
│   │   ├── acceptance/         # Historical GARs
│   │   ├── contracts/          # Governance Contracts
│   │   └── schemas/            # Validation Schemas
│   └── ...
│
├── evals/                      # Tier 3: Cold Memory (Benchmarks)
│   └── metrics.json
│
└── subsumption/                # Tier 3: Cold Memory (Integration Plans)
    └── project-a/
        ├── manifest.yaml
        └── plan.md
```
