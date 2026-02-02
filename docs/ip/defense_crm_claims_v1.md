# Patent Claims: Summit Defense CRM

## Base Claims

C1. A non-transitory computer-readable medium storing instructions that, when executed by a processor, cause a system to:
- Maintain a narrative operating graph comprising a plurality of narrative states and edges representing relationships between said narrative states;
- Generate candidate defense actions based on the narrative states;
- Evaluate the candidate defense actions against a policy bundle; and
- Execute at least one of the candidate defense actions.

---

## Cluster 1: Graph integrity constraints + reconciliation invariants

C421. A non-transitory computer-readable medium storing instructions that, when executed by a processor, cause a system to perform operations for enforcing graph integrity in a narrative operating graph, the operations comprising:
1. Maintaining a narrative operating graph comprising a plurality of narrative states and edges representing relationships between said narrative states;
2. Receiving a proposed update to the narrative operating graph derived from an output of an artificial intelligence agent;
3. Enforcing a plurality of graph invariants on the narrative operating graph prior to committing the proposed update, wherein the graph invariants include at least schema constraints, referential integrity constraints, and temporal consistency constraints;
4. Generating a reconciliation proof artifact indicating pass or fail status for each of the plurality of graph invariants checked for the proposed update;
5. Recording the reconciliation proof artifact in an append-only audit log linked to a pre-update snapshot hash and a post-update snapshot hash of the narrative operating graph; and
6. Rejecting the proposed update and restricting system outputs to monitoring-only actions when any of the plurality of graph invariants fails.

C391. The medium of claim C1, wherein the instructions cause the system to enforce graph invariants on the narrative operating graph prior to committing updates derived from agent outputs.
C392. The medium of claim C391, wherein the graph invariants include schema constraints that restrict permitted node types, edge types, and required properties per node type.
C393. The medium of claim C391, wherein the graph invariants include referential integrity constraints requiring that each edge references existing nodes and that deleted nodes are not referenced by remaining edges.
C394. The medium of claim C391, wherein the graph invariants include temporal consistency constraints requiring that temporal edges do not violate a chronological ordering associated with events.
C395. The medium of claim C391, wherein the system generates a reconciliation proof artifact indicating which constraints were checked and whether each constraint passed or failed for a proposed update.
C396. The medium of claim C395, wherein the system records the reconciliation proof artifact in the audit log linked to a pre-update snapshot hash and a post-update snapshot hash.
C397. The medium of claim C391, wherein the system rejects a proposed update and restricts outputs to monitoring-only actions when any graph invariant fails.
C398. The medium of claim C391, wherein the system performs conflict resolution for duplicate narrative state merges by selecting a canonical narrative identifier based on confidence scores and lineage completeness.
C399. The medium of claim C398, wherein the system records a merge decision artifact comprising merge rationale and contributing sources in the audit log.
C400. The medium of claim C391, wherein the system validates that updates do not decrease lineage completeness below a threshold for narrative states referenced by external publishing defense actions.

## Cluster 2: Human dispute resolution + appeals workflow

C422. A non-transitory computer-readable medium storing instructions that, when executed by a processor, cause a system to perform operations for managing appeals of defense action decisions, the operations comprising:
1. Providing an appeals workflow enabling a human operator to challenge a policy decision associated with a candidate defense action;
2. Receiving an appeal artifact comprising an appealed decision identifier, an objection category, and supporting references to audit entries or proof artifacts;
3. Re-evaluating the candidate defense action by re-running policy evaluation using a stored structured defense action object and a policy bundle hash referenced in the appealed decision identifier;
4. Producing an appeal resolution decision comprising one of uphold, modify, or reverse, and an explanation for the appeal resolution decision; and
5. Recording the appeal artifact and the appeal resolution decision in an append-only audit log.

C401. The medium of claim C1, wherein the instructions cause the system to provide an appeals workflow enabling a human operator to challenge a policy decision associated with a candidate defense action.
C402. The medium of claim C401, wherein the appeals workflow receives an appeal artifact comprising an appealed decision identifier, an objection category, and supporting references to audit entries or proof artifacts.
C403. The medium of claim C402, wherein objection categories include at least incorrect jurisdiction tagging, incorrect authenticity evaluation, incorrect risk scoring, or incorrect policy rule application.
C404. The medium of claim C401, wherein the system re-evaluates the candidate defense action by re-running policy evaluation using a stored structured defense action object and a policy bundle hash referenced in the appealed decision identifier.
C405. The medium of claim C404, wherein the system produces an appeal resolution decision comprising uphold, modify, or reverse and an explanation.
C406. The medium of claim C405, wherein reversing a deny decision for an external publishing defense action requires dual-control approvals and step-up authentication.
C407. The medium of claim C401, wherein the system records appeal artifacts, re-evaluation outputs, and appeal resolution decisions in an append-only audit log.
C408. The medium of claim C401, wherein the system enforces a time-bound validity window for appeals and denies late appeals absent elevated approval.
C409. The medium of claim C401, wherein the system computes appeal analytics comprising reversal rate and most frequent objection categories and stores aggregated appeal analytics in the audit log.
C410. The medium of claim C401, wherein the system restricts external publishing defense actions to monitoring-only while an appeal is pending for an associated narrative state above a risk threshold.

## Cluster 3: Outcome attribution + causal lift estimation guardrails

C423. A non-transitory computer-readable medium storing instructions that, when executed by a processor, cause a system to perform operations for causal lift estimation of defense actions, the operations comprising:
1. Executing a defense action in response to a narrative state in a narrative operating graph;
2. Estimating a causal lift of the executed defense action on at least one outcome metric using a causal inference procedure;
3. Generating a causal assumptions artifact comprising at least one of a covariate set, a matching rule, or an identification strategy;
4. Storing the causal assumptions artifact in an audit log linked to a snapshot hash of the narrative operating graph and a policy bundle hash; and
5. Computing a lift confidence interval and associating a validity window with the causal lift estimate, the validity window defined by an expiration timestamp.

C411. The medium of claim C1, wherein the instructions cause the system to estimate a causal lift of an executed defense action on at least one outcome metric using a causal inference procedure.
C412. The medium of claim C411, wherein the system generates a causal assumptions artifact comprising at least one of a covariate set, a matching rule, a randomization indicator, or an identification strategy identifier.
C413. The medium of claim C412, wherein the causal assumptions artifact is stored in the audit log linked to a snapshot hash and a policy bundle hash.
C414. The medium of claim C411, wherein the system restricts causal lift estimation to actions that satisfy a data quality policy and have lineage completeness above a threshold.
C415. The medium of claim C411, wherein the system computes a lift confidence interval and stores the confidence interval with an expiration timestamp in a stamp artifact.
C416. The medium of claim C415, wherein the system denies using an expired causal lift estimate to gate execution or ranking decisions.
C417. The medium of claim C411, wherein the system performs sensitivity analysis by varying at least one causal assumption and records sensitivity results as an evidence artifact.
C418. The medium of claim C411, wherein the system adjusts causal lift estimates for interference effects across linked narrative states using edges in the narrative operating graph.
C419. The medium of claim C411, wherein the system records attribution explanations that identify which narrative state changes are attributed to an executed defense action versus external events.
C420. The medium of claim C411, wherein the system restricts external publishing defense actions to monitoring-only when causal lift estimation indicates negative trust impact beyond a threshold.
