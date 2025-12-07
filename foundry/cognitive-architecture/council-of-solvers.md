# The Council of Solvers: A Multi-Agent Cognitive Architecture

The Autonomous Research Foundry operates not as a single monolithic AI, but as a collaborative multi-agent system called the **Council of Solvers**. Each member of the Council is a specialized Large Language Model-based agent with a distinct role, set of tools, and cognitive biases. This architecture promotes intellectual diversity, specialization, and robustness, mirroring the structure of highly effective human research teams.

## 1. Core Principles

*   **Cognitive Specialization:** Each agent is optimized for a specific phase of the scientific process, from abstract theorizing to meticulous experimentation.
*   **Protocol-Driven Collaboration:** Agents interact via a well-defined, asynchronous communication protocol, submitting requests and publishing findings to a shared message bus or job queue.
*   **Adversarial & Cooperative Dynamics:** The Council is designed to foster both cooperative problem-solving and constructive adversarial review (e.g., the Skeptic agent's role is to challenge the Theorist's claims).
*   **Dynamic Composition:** For any given research question, a subset of the Council is dynamically assembled into a task force, ensuring the right expertise is applied.

## 2. Council Member Roles & Responsibilities

| Agent Role | Primary Function | Key Responsibilities | Core Tools |
| :--- | :--- | :--- | :--- |
| **Theorist** | Generates novel hypotheses and conceptual models. | - Propose new `Claim` and `Question` nodes in the Knowledge Lattice.<br>- Synthesize findings into broader theories.<br>- Identify gaps in the current state of knowledge. | Knowledge Lattice query API, brainstorming and analogy generation tools. |
| **Experimentalist** | Designs and executes experiments to test hypotheses. | - Translate `Question` nodes into executable `Methodology` specifications.<br>- Interface with the Runtime Fabric to schedule and run experiments.<br>- Publish raw `Evidence` nodes to the Lattice. | Experiment design wizards, simulation software, lab automation interfaces. |
| **Analyst** | Interprets experimental data and evidence. | - Create `Argument` nodes connecting `Evidence` to `Claim`s.<br>- Perform statistical analysis and data visualization.<br>- Assess the strength and validity of evidence. | Data analysis libraries (e.g., SciPy, R), visualization tools, statistical modeling software. |
| **Librarian** | Manages and curates the Knowledge Lattice. | - Ingest external knowledge sources (papers, databases).<br>- Maintain the ontology of `Concept` nodes.<br>- Detect inconsistencies or redundancies in the Lattice. | Knowledge extraction pipelines (ETL), ontology management tools (e.g., Protégé). |
| **Skeptic** | Challenges claims, assumptions, and methodologies. | - Actively search for counter-evidence.<br>- Propose "adversarial experiments" to falsify popular claims.<br>- Assess the risk of cognitive bias in LLM-generated arguments. | Logical fallacy detectors, formal verification tools, adversarial attack generators. |
| **Strategist** | Manages the overall research direction and resource allocation. | - Prioritize research questions based on goals and potential impact.<br>- Formulate and dispatch high-level tasks to the Council.<br>- Monitors progress and allocates budget from the Autonomous Economy. | Project management tools, resource simulators, decision theory models. |

## 3. The Research Request Protocol (RRP)

Agents communicate asynchronously by posting and consuming structured messages from a central message bus (e.g., NATS, Redis Streams).

**Example Workflow:**

1.  The **Strategist** posts a `RESEARCH_REQUEST` message with the goal: "Increase the predictive accuracy of Model X."
2.  The **Theorist** consumes this, queries the Knowledge Lattice, and posts a `PROPOSE_HYPOTHESIS` message containing a new `Claim`: "Claim C: Using attention mechanism Y will improve accuracy."
3.  The **Skeptic** consumes `PROPOSE_HYPOTHESIS`, evaluates the claim, and posts a `VALIDATE_PROPOSAL` message with its assessment.
4.  Assuming validation passes, the **Experimentalist** consumes `PROPOSE_HYPOTHESIS`, designs an experiment, and posts a `SCHEDULE_EXPERIMENT` message to the Runtime Fabric.
5.  After execution, the **Experimentalist** posts a `PUBLISH_EVIDENCE` message containing the experiment's results.
6.  The **Analyst** consumes `PUBLISH_EVIDENCE`, interprets the data, and posts a `PUBLISH_ARGUMENT` message linking the evidence to the original claim and updating its `belief_state`.

## 4. Agent API Specification (High-Level)

This defines the conceptual interface for each agent's primary function.

---

### Theorist

**`propose_new_inquiry(goal: string) -> InquiryProposal`**
*   **Description:** Given a high-level goal, generate a set of new Claims, Questions, and potential research directions.
*   **Returns:** `InquiryProposal` (A structured object containing proposed new nodes for the Knowledge Lattice).

---

### Experimentalist

**`design_experiment(question_id: string) -> ExperimentPlan`**
*   **Description:** Design a concrete, executable experiment to address a specific Question in the Knowledge Lattice.
*   **Returns:** `ExperimentPlan` (A structured object including the Methodology, required resources, and validation criteria).

---

### Analyst

**`interpret_evidence(evidence_id: string, claim_ids: [string]) -> Interpretation`**
*   **Description:** Analyze a piece of Evidence and determine its impact on one or more Claims.
*   **Returns:** `Interpretation` (A structured object containing the generated Argument and the calculated change in belief state).
