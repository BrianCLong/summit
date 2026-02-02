# Patent Claims: Summit Defense Simulation Apparatus

## Base Claims

S1. A simulation apparatus comprising a processor and a memory storing instructions that, when executed by the processor, cause the apparatus to:
- Maintain a versioned snapshot of a narrative operating graph;
- Execute counterfactual simulations of defense actions using the versioned snapshot;
- Rank the defense actions based on simulation outcomes; and
- Output the ranked defense actions.

---

## Cluster 1: Graph integrity constraints + reconciliation invariants for simulation inputs

S421. A simulation apparatus comprising a processor and a memory storing instructions that, when executed by the processor, cause the apparatus to perform operations for enforcing graph integrity for simulation inputs, the operations comprising:
1. Maintaining a versioned snapshot of a narrative operating graph;
2. Enforcing a plurality of graph invariants on the versioned snapshot prior to executing a counterfactual simulation;
3. Generating a reconciliation proof artifact indicating pass or fail status for each of the plurality of graph invariants;
4. Recording the reconciliation proof artifact in an audit log linked to a snapshot hash and a replay manifest identifier; and
5. Excluding defense actions from a ranking operation when any of the plurality of graph invariants fails and outputting monitoring-only actions.

S391. The apparatus of claim S1, wherein the apparatus enforces graph invariants on a versioned snapshot prior to executing counterfactual simulation.
S392. The apparatus of claim S391, wherein the graph invariants include schema constraints that restrict permitted node types, edge types, and required properties per node type.
S393. The apparatus of claim S391, wherein the graph invariants include referential integrity constraints requiring that each edge references existing nodes.
S394. The apparatus of claim S391, wherein the graph invariants include temporal consistency constraints requiring that temporal edges do not violate chronological ordering associated with events.
S395. The apparatus of claim S391, wherein the apparatus generates a reconciliation proof artifact indicating which constraints were checked and whether each constraint passed or failed for a snapshot used in simulation.
S396. The apparatus of claim S395, wherein the apparatus records the reconciliation proof artifact in an audit log linked to a snapshot hash and a replay manifest identifier.
S397. The apparatus of claim S391, wherein the apparatus excludes external publishing actions from ranking when any graph invariant fails and outputs monitoring-only actions.
S398. The apparatus of claim S1, wherein the apparatus performs conflict resolution for duplicate narrative state merges by selecting a canonical narrative identifier based on confidence scores and lineage completeness.
S399. The apparatus of claim S398, wherein the apparatus records a merge decision artifact comprising merge rationale and contributing sources in an audit log linked to ranked outputs.
S400. The apparatus of claim S391, wherein the apparatus enforces a constraint requiring lineage completeness above a threshold for narrative states referenced by output permitted external publishing actions.

## Cluster 2: Appeals workflow for ranked outputs and policy decisions

S422. A simulation apparatus comprising a processor and a memory storing instructions that, when executed by the processor, cause the apparatus to perform operations for managing appeals of ranked outputs, the operations comprising:
1. Providing an appeals workflow enabling a human operator to challenge a policy decision used in ranking a candidate defense action;
2. Receiving an appeal artifact comprising an appealed decision identifier, an objection category, and supporting references to audit entries or proof artifacts;
3. Re-evaluating the candidate defense action by re-running policy evaluation using a stored structured defense action object and a policy bundle hash;
4. Producing an appeal resolution decision comprising one of uphold, modify, or reverse; and
5. Recording the appeal artifact and the appeal resolution decision in an append-only audit log linked to a replay manifest identifier.

S401. The apparatus of claim S1, wherein the apparatus provides an appeals workflow enabling a human operator to challenge a policy decision used in ranking a candidate defense action.
S402. The apparatus of claim S401, wherein the appeals workflow receives an appeal artifact comprising an appealed decision identifier, an objection category, and supporting references to audit entries or proof artifacts.
S403. The apparatus of claim S402, wherein objection categories include at least incorrect jurisdiction tagging, incorrect authenticity evaluation, incorrect risk scoring, or incorrect policy rule application.
S404. The apparatus of claim S401, wherein the apparatus re-evaluates a candidate defense action by re-running policy evaluation using a stored structured defense action object and a policy bundle hash referenced in the appealed decision identifier.
S405. The apparatus of claim S404, wherein the apparatus produces an appeal resolution decision comprising uphold, modify, or reverse and an explanation.
S406. The apparatus of claim S405, wherein reversing a deny decision for an external publishing action requires dual-control approvals and step-up authentication.
S407. The apparatus of claim S401, wherein the apparatus records appeal artifacts, re-evaluation outputs, and appeal resolution decisions in an append-only audit log linked to replay manifest identifiers.
S408. The apparatus of claim S401, wherein the apparatus enforces a time-bound validity window for appeals and denies late appeals absent elevated approval.
S409. The apparatus of claim S401, wherein the apparatus computes aggregated appeal analytics and records the analytics as redacted artifacts.
S410. The apparatus of claim S401, wherein the apparatus excludes external publishing actions from ranking while an appeal is pending for an associated high-risk narrative state.

## Cluster 3: Outcome attribution + causal lift guardrails in simulation calibration

S423. A simulation apparatus comprising a processor and a memory storing instructions that, when executed by the processor, cause the apparatus to perform operations for causal lift guardrails in simulation calibration, the operations comprising:
1. Estimating a causal lift of an executed defense action on at least one outcome metric;
2. Generating a causal assumptions artifact comprising at least one of a covariate set, a matching rule, or an identification strategy;
3. Using the causal lift to calibrate a transition function for counterfactual simulation when the causal lift estimate satisfies a data quality policy;
4. Associating a validity window with the causal lift estimate; and
5. Denying use of the causal lift estimate to update calibration data when the validity window has expired.

S411. The apparatus of claim S1, wherein the apparatus estimates a causal lift of executed defense actions on at least one outcome metric and uses the causal lift to calibrate transition functions.
S412. The apparatus of claim S411, wherein the apparatus generates a causal assumptions artifact comprising at least one of a covariate set, a matching rule, a randomization indicator, or an identification strategy identifier.
S413. The apparatus of claim S412, wherein the causal assumptions artifact is recorded in an audit log linked to a snapshot hash and a policy bundle hash.
S414. The apparatus of claim S411, wherein the apparatus restricts causal lift estimation to actions that satisfy a data quality policy and have lineage completeness above a threshold.
S415. The apparatus of claim S411, wherein the apparatus computes a lift confidence interval and associates an expiration timestamp stored in a stamp artifact.
S416. The apparatus of claim S415, wherein the apparatus denies using an expired causal lift estimate to gate ranking or to update calibration data.
S417. The apparatus of claim S411, wherein the apparatus performs sensitivity analysis by varying at least one causal assumption and records sensitivity results as evidence artifacts.
S418. The apparatus of claim S411, wherein the apparatus adjusts causal lift estimates for interference effects across linked narrative states using edges in the narrative operating graph.
S419. The apparatus of claim S411, wherein the apparatus records attribution explanations identifying which narrative state changes are attributed to executed defense actions versus external events.
S420. The apparatus of claim S411, wherein the apparatus excludes external publishing actions from ranking when causal lift estimation indicates negative trust impact beyond a threshold.
