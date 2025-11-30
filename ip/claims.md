# Patent Claims

## Independent Claims

**1. A method for orchestrating scientific experiments, the method comprising:**
   - Maintaining a typed experiment graph, wherein the graph comprises nodes representing experimental entities and edges representing dependencies between said entities.
   - Processing a declarative curriculum, wherein the curriculum defines a plurality of sequential stages, each stage having a set of goals and constraints.
   - Utilizing a large language model (LLM) to propose one or more new nodes or edges to be added to the experiment graph, wherein the proposal is guided by the goals and constraints of a current curriculum stage.
   - Executing an experiment corresponding to at least one of the proposed new nodes or edges.
   - Recording telemetry from the executed experiment back into the experiment graph.

**2. A system for orchestrating scientific experiments, the system comprising:**
   - A data store containing a typed experiment graph.
   - A curriculum engine configured to process a declarative curriculum of sequential stages.
   - A planner module, comprising a large language model, configured to propose additions to the experiment graph based on a current curriculum stage.
   - An experiment runner configured to execute experiments based on the additions proposed by the planner.
   - A telemetry module configured to capture results from the experiment runner and update the experiment graph.

## Dependent Claims

**3. The method of claim 1, wherein the nodes of the experiment graph are of types selected from the group consisting of: hypothesis, dataset, model, training-run, and evaluation.**

**4. The method of claim 1, wherein the edges of the experiment graph are of types selected from the group consisting of: depends_on, refines, contradicts, and supersedes.**

**5. The method of claim 1, wherein the declarative curriculum is a YAML or JSON file.**

**6. The method of claim 1, wherein the constraints of a curriculum stage include at least one of: a maximum number of runs, a time budget, or a restriction on allowed dataset identifiers.**

**7. The system of claim 2, wherein the planner module is further configured to prune branches of the experiment graph based on telemetry from the telemetry module.**

**8. The system of claim 2, further comprising a governance module configured to annotate nodes in the experiment graph with metadata related to data provenance or safety flags.**

**9. The method of claim 1, wherein the LLM proposes new nodes or edges by generating a structured data object, such as JSON, that defines the additions.**

**10. The system of claim 2, wherein the data store is a JSONL file.**
