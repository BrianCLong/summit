# Provisional Patent Application: Draft Specification

**Title:** Curriculum-Guided Experiment Graph Orchestration for Large Language Model Scientists

**Abstract:**

A method and system for autonomously conducting scientific experimentation using a Large Language Model (LLM). The system represents the experimental process as a typed, directed acyclic graph (the "experiment-graph"). An LLM-based planner proposes new experiments (nodes and edges) guided by a declarative, multi-stage curriculum. The curriculum imposes goals and constraints at each stage of the scientific process, from baseline reproduction to ablation studies and generalization checks. The system executes proposed experiments, records telemetry to the graph, and uses the updated graph to inform the next cycle of planning. This structured approach improves the efficiency and reproducibility of LLM-driven research compared to unstructured prompting or traditional automated machine learning (AutoML) techniques.

**Background:**

[To be filled in with a detailed description of the prior art and its limitations, drawing from `prior_art.csv`.]

**Summary of the Invention:**

[To be filled in with a high-level overview of the claims.]

**Detailed Description:**

[To be filled in with a detailed walkthrough of the architecture, including the Experiment Graph schema, the Curriculum Engine, the LLM Planner, the Runner, and the Telemetry/Governance modules. Reference will be made to diagrams and figures.]

**Figures:**

[Figure 1: High-level architecture diagram showing the main components and data flow.]
[Figure 2: Example of a populated Experiment Graph for a text classification task.]
[Figure 3: Flowchart of the Planner's decision-making process.]
