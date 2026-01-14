# Summit Research Notes

Summit is an **agentic runtime** for orchestration, safety, and governance of AI agents operating over real systems. This document tracks the key research that informs Summit’s design and roadmap.

## 1. Core conceptual frame

### 1.1 Agentic AI architecture

- **The Path Ahead for Agentic AI: Challenges and Opportunities**
  - Link: https://arxiv.org/abs/2601.02749
  - Influence on Summit:
    - Use their perception–memory–planning–tool-execution decomposition as Summit’s core concept model.
    - Treat “verifiable planning”, “scalable multi-agent coordination”, and “persistent memory architectures” as explicit design goals and roadmap themes.

  #### Summit alignment with research roadmap

  | Research Priority (from Paper) | Summit Implementation Strategy |
  | :--- | :--- |
  | **Verifiable Planning** | Plan validation hooks pre-execution; step-by-step audit logs. |
  | **Scalable Multi-Agent Coord** | Hierarchical dispatchers; strictly typed inter-agent message buses. |
  | **Persistent Memory Arches** | Pluggable `MemoryAdapter` with support for vector, graph, and KV stores. |
  | **Robust Tool Execution** | Sandboxed execution environments; strict schema validation for IO. |

### 1.2 Summit primitives

- Map the paper’s components onto Summit:
  - Tasks → Summit task graphs and workflow specs.
  - Agents → Summit agent types and roles.
  - Environment/tools → Summit connectors, tools, and execution adapters.
  - Governance → Summit policy, audit, and override mechanisms.

## 2. Memory design

### 2.1 Unified STM/LTM

- **Agentic Memory: Learning Unified Long-Term and Short-Term Memory for LLM Agents (AgeMem)**
  - Link: https://arxiv.org/abs/2601.01885
  - Influence on Summit:
    - Introduce a `MemoryAdapter` abstraction with explicit STM/LTM stores.
    - Implement write/update strategies (e.g., importance, novelty, outcome-driven) modeled on AgeMem.
    - Log memory operations in traces for replay, debugging, and evaluation.

  #### Design Note: Memory Backends

  The `MemoryAdapter` abstraction isolates the agent logic from storage implementation.
  - **Short-Term Memory (STM)**: In-process circular buffers or Redis for high-speed context window management.
  - **Long-Term Memory (LTM)**:
    - **Vector**: pgvector/Pinecone for semantic retrieval.
    - **Graph**: Neo4j/NetworkX for relationship and entity tracking.
    - **File/Blob**: S3/Local FS for raw archival of large context artifacts.

### 2.2 Memory as a first-class policy surface

- Treat memory as:
  - A governed resource (who can write/read what, under which policies).
  - A target for security controls (see backdoor and safety papers below).

## 3. Safety, security, and tool use

### 3.1 Safe tool use

- **Towards Verifiably Safe Tool Use for LLM Agents**
  - Link: https://arxiv.org/abs/2601.08012
  - Influence on Summit:
    - Extend tool schemas with preconditions, postconditions, side-effect classes, and risk levels.
    - Add “dry-run/simulation” mode and policy checks around tool calls.
    - Expose a policy API so orgs can encode local constraints over tools and parameters.

### 3.2 Backdoor and threat model

- **BackdoorAgent: A Unified Framework for Backdoor Attacks on LLM-based Agents**
  - Link: https://arxiv.org/abs/2601.04566
  - Influence on Summit:
    - Adopt their three-stage threat model: planning, memory, tool-use attacks.
    - Instrument orchestration so each stage can be monitored and analyzed for anomalies.
    - Maintain a test suite inspired by their benchmark (Agent QA, Agent Code, Agent Web, Agent Drive).

  #### Security Test Plan

  Summit will ship with a "Red Teaming Pack" containing canned test scenarios derived from BackdoorAgent benchmarks:
  - **Poisoned Plan Injection**: Tests where the prompt injects malicious sub-goals; Summit must detect deviation from the allowed policy.
  - **Memory Corruption**: Scenarios attempting to write false facts to LTM; Summit must verify write authority.
  - **Tool Abuse**: Tests attempting to use valid tools for invalid purposes (e.g., `rm -rf /`); Summit must catch this via Policy/Dry-run layers.

## 4. Multi-agent patterns and workflows

### 4.1 Concrete MAS patterns

- **Multi-Agent Systems for Robust Software Quality Assurance**
  - Link: https://arxiv.org/abs/2601.02454
  - Influence on Summit:
    - Use their test-generation / execution / analysis loop as a canonical Summit MAS example.
    - Provide a reusable “generate–execute–analyze–refine” workflow template.

### 4.2 Hybrid symbolic + agentic systems

- **Hybrid Agentic AI and Multi-Agent Systems in Smart Manufacturing**
  - Link: https://arxiv.org/abs/2511.18258
  - Influence on Summit:
    - Model domain controllers and legacy systems as first-class tools with safety envelopes.
    - Encode role-specific agents and explicit responsibility boundaries in Summit configs.

## 5. Infra, standards, and execution models

### 5.1 Agent–chain execution models

- **Autonomous Agents on Blockchains: Standards, Execution Models, and Trust Boundaries**
  - Link: https://arxiv.org/abs/2601.04583
  - Influence on Summit:
    - Treat Summit workflows as “contracts” with explicit state transitions and events.
    - Introduce concepts like Transaction Intent Schemas and Policy Decision Records for auditable decisions.
    - Use their taxonomy of integration patterns (read-only, simulation, delegated execution, autonomous signing, MAS) as patterns for Summit connectors.

  #### Mapping: Summit ↔ Intent Schema ↔ Policy Record

  Summit adopts the paper's model for high-integrity execution:
  1.  **Intent Schema**: The structured JSON payload representing the agent's desired action (e.g., "Transfer Funds", "Deploy Code"). In Summit, this is the normalized Tool Call object.
  2.  **Policy Decision Record**: An immutable log entry generated by the Governance Engine approving or denying the Intent. It links the Intent hash, the Policy ID used, and the decision result.
  3.  **Summit Execution**: The runtime only proceeds if a positive Policy Decision Record exists for the specific Intent Schema hash.

### 5.2 Evaluation and governance

- **The Evolution of Agentic AI Evaluation**
  - Link: https://www.lesswrong.com/posts/iiHReWZKxqn9wo75R/the-evolution-of-agentic-ai-evaluation
  - Influence on Summit:
    - Build an evaluation harness that scores workflows on task success, autonomy, robustness, and safety events.
    - Include adversarial and incident scenarios (tool failures, partial info, conflicting instructions) in Summit CI.

  #### Checklist: Summit Safety Invariants

  Derived from common failure modes:
  - [ ] **No Raw Shell**: All shell execution must go through a structured tool with input validation.
  - [ ] **No Unlogged Mutation**: Every state change (DB write, API POST) must have a corresponding audit log entry.
  - [ ] **Human-in-the-Loop Override**: Any high-risk action (defined by policy) must block for human approval.
  - [ ] **Deterministic Replay**: Workflow execution must be deterministic given the same inputs and tool outputs.

## 6. Living reading list

- **LLM Papers Reading Notes – January 2026**
  - Link: https://www.linkedin.com/posts/jean-david-ruvini_llm-papers-reading-notes-january-2026
  - Use as a curated index for:
    - New agentic papers.
    - Developer-practices studies that inform Summit’s UX, debugging, and tracing features.

> Maintenance: This file is updated alongside major Summit design decisions. Each new feature should link back to the research that motivated it.
