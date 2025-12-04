# Patent Claims: Summit Reasoning Evaluator

## Independent Claims

### Claim 1: A Method for Graph-Based Reasoning Evaluation
A computer-implemented method for evaluating an artificial intelligence agent, comprising:
1.  **Ingesting** a raw execution trace of an agent performing a task;
2.  **Transforming** said trace into a Directed Acyclic Graph (DAG) representation, wherein:
    *   Nodes represent discrete events including at least "Thought", "Tool Call", and "Observation";
    *   Edges represent causal or temporal dependencies between said nodes;
3.  **Identifying** specific structural patterns within said DAG, including "Branching", "Backtracking" (self-correction), and "Convergence" (consensus);
4.  **Computing** at least one topological metric based on said patterns, such as a ratio of nodes on a successful path to total nodes;
5.  **Generating** an evaluation report comprising said topological metric correlated with the task outcome.

### Claim 2: A System for Curriculum-Guided Active Evaluation
A system for evaluating an artificial intelligence agent, comprising:
1.  A **Task Repository** containing a plurality of evaluation tasks tagged with complexity vectors;
2.  A **Runtime Harness** configured to execute said tasks using the agent and capture execution graphs;
3.  A **Curriculum Policy** module configured to:
    *   Analyze the evaluation report of a preceding task;
    *   Update an estimated capability model of the agent;
    *   Select a subsequent task from the Task Repository that maximizes the expected information gain regarding the agent's failure boundary;
4.  Wherein the selection process iterates until a convergence criterion regarding the agent's capability frontier is met.

## Dependent Claims

*   **Claim 3**: The method of Claim 1, wherein the graph representation further includes "Communication" nodes representing message exchange between a plurality of agents.
*   **Claim 4**: The method of Claim 1, wherein the topological metric is "Self-Correction Efficiency," defined as the weighted sum of "Correction" edges that lead to a correct final outcome.
*   **Claim 5**: The system of Claim 2, wherein the Curriculum Policy is further configured to inject "Probabilistic Faults" (e.g., tool errors, data noise) into the Runtime Harness during execution.
*   **Claim 6**: The method of Claim 1, further comprising a "Step-Consistency" check wherein a secondary AI model evaluates the logical validity of an edge connecting a "Thought" node to a "Tool Call" node.
*   **Claim 7**: The system of Claim 2, wherein the complexity vector includes dimensions for "Reasoning Depth", "Context Length", and "Tool Variety".
*   **Claim 8**: The method of Claim 1, wherein the transformation step includes resolving implicit dependencies between "Observation" nodes and subsequent "Thought" nodes to generate "DependsOn" edges.
*   **Claim 9**: The system of Claim 2, utilizing a Multi-Armed Bandit algorithm to select the subsequent task category.
*   **Claim 10**: A non-transitory computer-readable medium storing instructions to perform the method of Claim 1.
