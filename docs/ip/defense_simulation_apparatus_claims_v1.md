<<<<<<< HEAD
# Invention Disclosure: Defense Simulation Apparatus Claims v1

**Status**: Draft
**Classification**: Trade Secret / Confidential Commercial Information
**Date**: 2026-01-29
**Inventors**: Summit/IntelGraph Engineering Team

---

## 1. Independent Claims

### S1. Broad Simulation and Ranking Apparatus

An apparatus for simulating and ranking defense actions in an intelligence platform, comprising a processor and a memory storing instructions that, when executed by the processor, cause the apparatus to:

- maintain governance policies and ranking parameters as versioned bundle hashes;
- manage governance policy changes using policy change requests each having a policy RFC identifier and a proposed policy bundle hash;
- execute policy what-if simulations using the proposed policy bundle hash to evaluate impact on ranking candidate defense actions;
- rank a plurality of candidate defense actions based on the governance policies and ranking parameters;
- generate a safety-case artifact comprising a structured argument graph linking safety claims to evidence identifiers for the ranked candidate defense actions;
- provide a redacted auditor mode interface for inspecting ranked outputs and associated safety-case artifacts; and
- record simulation results, policy RFC identifiers, and safety-case hashes in an append-only audit log.

---

## 2. Dependent Claims

### Cluster 1: Policy change management + RFC workflow for ranking (S331–S340)

S331. The apparatus of claim S1, wherein the apparatus manages governance policy changes using policy change requests each having a policy RFC identifier and a proposed policy bundle hash.
S332. The apparatus of claim S331, wherein the apparatus generates a policy diff artifact describing differences between a current policy bundle hash and the proposed policy bundle hash.
S333. The apparatus of claim S331, wherein the apparatus executes a policy what-if simulation using the proposed policy bundle hash prior to enabling ranking under the proposed policy bundle hash.
S334. The apparatus of claim S331, wherein the apparatus requires approvals from a plurality of approver credentials prior to enabling ranking under the proposed policy bundle hash.
S335. The apparatus of claim S334, wherein the plurality of approver credentials includes at least one compliance approver credential distinct from an operations approver credential.
S336. The apparatus of claim S331, wherein the apparatus performs staged rollout of the proposed policy bundle hash for production ranking and records rollout stage transitions in an audit log.
S337. The apparatus of claim S331, wherein the apparatus requires a rollback plan identifier associated with the proposed policy bundle hash prior to rollout.
S338. The apparatus of claim S331, wherein the apparatus excludes external publishing actions from ranking under the proposed policy bundle hash until a rollout stage indicates production-ready status.
S339. The apparatus of claim S331, wherein the apparatus records the policy RFC identifier, the policy diff artifact identifier, and approvals enabling the proposed policy bundle hash in a replay manifest or audit log.
S340. The apparatus of claim S331, wherein the apparatus revokes the proposed policy bundle hash and reverts to a prior policy bundle hash when a validation metric degrades beyond a threshold during rollout.

### Cluster 2: Multi-party attestations + external auditor mode for ranked outputs (S341–S350)

S341. The apparatus of claim S1, wherein the apparatus requires a multi-party attestation quorum prior to enabling at least one of a policy bundle hash, a transition function bundle hash, or a connector SBOM hash for production ranking.
S342. The apparatus of claim S341, wherein the multi-party attestation quorum requires signatures from at least two distinct signer identifiers corresponding to different roles.
S343. The apparatus of claim S341, wherein the apparatus stores attestation records as append-only artifacts linked to bundle hashes and signer identifiers.
S344. The apparatus of claim S1, wherein the apparatus provides an auditor mode interface that grants read-only access to redacted audit logs, policy RFC artifacts, and verification proof artifacts for ranked outputs.
S345. The apparatus of claim S344, wherein the auditor mode interface denies access to raw artifacts and never-log fields and provides only hashed identifiers for restricted data.
S346. The apparatus of claim S344, wherein the auditor mode interface provides a query mechanism that returns proof artifacts linked to a specified snapshot hash and policy bundle hash.
S347. The apparatus of claim S344, wherein the apparatus enforces that an auditor credential cannot modify governance policies, transition functions, or ranking parameters.
S348. The apparatus of claim S1, wherein the apparatus generates an auditor export package comprising redacted ranked outputs, replay manifests, and proof artifacts.
S349. The apparatus of claim S348, wherein the auditor export package includes determinism verification proof artifacts and policy constraint compliance proof artifacts.
S350. The apparatus of claim S1, wherein the apparatus records auditor access events, query parameters in redacted form, and export generation events in an append-only audit log.

### Cluster 3: Safety-case assembly + structured argument graphs for simulation (S351–S360)

S351. The apparatus of claim S1, wherein the apparatus generates a safety-case artifact comprising a structured argument graph linking safety claims to evidence identifiers and proof artifacts for ranked outputs.
S352. The apparatus of claim S351, wherein the structured argument graph includes nodes representing safety requirements, hazard scenarios, mitigations, and verification results.
S353. The apparatus of claim S351, wherein the apparatus requires that each output permitted defense action references at least one safety requirement node satisfied by associated proof artifacts.
S354. The apparatus of claim S353, wherein the apparatus denies producing an output permitted defense action when a referenced safety requirement node lacks a current proof artifact within a validity window.
S355. The apparatus of claim S351, wherein the apparatus binds the safety-case artifact to a policy bundle hash and a set of connector capability grant versions used for ranked outputs.
S356. The apparatus of claim S351, wherein the apparatus computes a safety-case hash over the structured argument graph and records the safety-case hash in an audit log.
S357. The apparatus of claim S351, wherein the apparatus updates the safety-case artifact when governance policies change and records a safety-case diff artifact.
S358. The apparatus of claim S351, wherein the apparatus computes a safety-case coverage metric representing a proportion of defense action types mapped to safety requirement nodes.
S359. The apparatus of claim S358, wherein the apparatus excludes external publishing actions from ranking when the safety-case coverage metric is below a threshold.
S360. The apparatus of claim S351, wherein the apparatus exports the safety-case artifact in a redacted form for auditor mode without exposing never-log fields.

---

## 3. Definitions

- **policy RFC**: A structured request for a governance policy change, including a unique identifier, proposed changes (e.g., bundle hash), and rationale.
- **attestation quorum**: A requirement for a minimum number of cryptographic signatures from authorized roles to validate a policy, model, or artifact.
- **auditor view**: A restricted, read-only interface providing access to redacted compliance evidence and audit logs without exposing sensitive raw data.
- **argument node**: A discrete element within a safety-case argument graph representing a requirement, hazard, mitigation, or verification result.
- **claim-evidence link**: A verifiable association between a safety claim (or argument node) and a deterministic proof artifact or evidence ID.

---

## 4. Filing Sets & Recommendations

- **Broad Filing Set**: Independent claim S1 covering the integrated RFC, ranking, and safety-case framework for simulations.
- **Medium Filing Set**: Individual clusters focused on specific moats (e.g., Safety-case argument graphs).
- **Narrow Filing Set**: Specific technical embodiments such as safety-case coverage metrics for simulation outputs.
- **Recommendation**: Cluster 2 (Multi-party attestations + Auditor mode) represents the highest-value continuation with the fastest allowance potential due to its focus on verifiable ranking integrity.
=======
# Patent Claims: Summit Defense Simulation Apparatus

## Defined Terms

- **Graph invariant**: A consistency rule applied to a versioned narrative snapshot prior to simulation.
- **Reconciliation proof artifact**: A logged record enumerating integrity checks and pass/fail outcomes for a simulation snapshot.
- **Appeal artifact**: A structured objection record containing the appealed decision identifier, objection category, and supporting references.
- **Causal assumptions artifact**: A structured record capturing identification assumptions, covariates, and methodology identifiers used for causal lift estimation.
- **Validity window**: A time-bounded interval during which an appeal or causal estimate remains eligible for gating decisions.

## Base Claims

S1. A simulation apparatus for evaluating adversarial misinformation defense actions, comprising:
- a memory storing instructions and a narrative operating graph representing narrative states derived from source records;
- one or more processors configured to execute the instructions to:
  - receive a plurality of candidate defense actions;
  - execute a counterfactual simulation of each candidate defense action within a simulated environment to predict a trust impact metric;
  - rank the plurality of candidate defense actions based on the predicted trust impact metric and a set of governance policies;
  - record a replay manifest for the counterfactual simulation, the replay manifest being bound to a snapshot hash of the narrative operating graph; and
  - output a permitted defense action based on the ranking for execution by an execution interface.

---

## Cluster 1: Lineage-aware simulation inputs (S91–S100)

S91. The apparatus of claim S1, wherein the apparatus receives a lineage manifest for each candidate defense action, the lineage manifest referencing source records and transformation identifiers contributing to the candidate defense action.
S92. The apparatus of claim S91, wherein the apparatus computes a lineage hash over the lineage manifest and includes the lineage hash in the replay manifest.
S93. The apparatus of claim S91, wherein the apparatus denies ranking a candidate defense action above monitoring-only actions when the lineage manifest lacks required source records.
S94. The apparatus of claim S1, wherein the apparatus conditions predicted trust impact on a reliability score stored in source records referenced by the lineage manifest.
S95. The apparatus of claim S1, wherein the apparatus increases predicted uncertainty for impact metrics when a fraction of sources referenced by the lineage manifest are below a reliability threshold.
S96. The apparatus of claim S1, wherein the apparatus outputs, for each ranked action, a structured explanation identifying at least one source category contributing to the ranking.
S97. The apparatus of claim S1, wherein the apparatus stores transformation identifiers and tool/model version identifiers used for simulation in the replay manifest.
S98. The apparatus of claim S1, wherein the apparatus supports selecting among multiple snapshots and selects a snapshot set whose sources satisfy a minimum reliability constraint.
S99. The apparatus of claim S1, wherein the apparatus records a redaction manifest associated with simulation inputs in an audit log excluding never-log fields.
S100. The apparatus of claim S1, wherein the apparatus outputs a “lineage completeness score” and uses the score as a ranking constraint.

## Cluster 2: Adversarial red-team simulation + robustness scoring (S101–S110)

S101. The apparatus of claim S1, wherein executing the counterfactual simulation comprises simulating one or more adversarial counter-narrative scenarios generated by a red-team agent.
S102. The apparatus of claim S101, wherein the red-team agent is restricted to generating scenarios for simulation and is denied access to the execution interface absent an approval token.
S103. The apparatus of claim S101, wherein the apparatus computes a robustness score for each candidate defense action based on simulated outcomes across the plurality of adversarial counter-narrative scenarios.
S104. The apparatus of claim S103, wherein the apparatus excludes from ranking any candidate defense action having a robustness score below a threshold.
S105. The apparatus of claim S1, wherein the apparatus performs a differential simulation across at least two different narrative graph snapshots and records the results in the replay manifest.
S106. The apparatus of claim S1, wherein the apparatus identifies sensitive narrative states and applies stricter ranking constraints for defense actions affecting the sensitive narrative states.
S107. The apparatus of claim S1, wherein the apparatus re-simulates defense actions when the set of governance policies is updated and records a policy-change simulation artifact.
S108. The apparatus of claim S1, wherein the apparatus includes adversarial scenario identifiers and evaluation parameters in the replay manifest.
S109. The apparatus of claim S1, wherein the apparatus outputs a robustness explanation artifact identifying specific adversarial scenarios that contributed to a low robustness score.
S110. The apparatus of claim S1, wherein the apparatus verifies that simulation outputs are reproducible by re-executing a portion of the counterfactual simulation using the replay manifest.

## Cluster 3: Formal verification / model checking for simulation outputs (S151–S160)

S151. The apparatus of claim S1, wherein the apparatus verifies a replay manifest by checking presence and consistency of at least a snapshot hash, a policy bundle hash, and version identifiers used in counterfactual simulation.
S152. The apparatus of claim S151, wherein the apparatus generates a verification proof artifact indicating that ranked outputs are reproducible under the replay manifest and records the proof artifact in an audit log.
S153. The apparatus of claim S1, wherein the apparatus performs a satisfiability check over governance policies and candidate defense action schemas prior to producing ranked outputs.
S154. The apparatus of claim S153, wherein the apparatus enters a safe mode that excludes external publishing actions from ranking when the satisfiability check fails.
S155. The apparatus of claim S1, wherein the apparatus checks that modify decisions preserve required attribution and uncertainty fields and generates a counterexample artifact when a modified action violates a required-field constraint.
S156. The apparatus of claim S155, wherein the apparatus records the counterexample artifact and a policy bundle hash in an append-only audit log.
S157. The apparatus of claim S1, wherein the apparatus performs a policy constraint compliance check confirming that each output permitted defense action satisfies all applicable hard constraints derived from governance policies.
S158. The apparatus of claim S157, wherein the apparatus denies producing an output permitted defense action when the compliance check yields an unsatisfied constraint and records an unsatisfied-constraint explanation.
S159. The apparatus of claim S1, wherein the apparatus validates determinism by re-running counterfactual simulations using canonical ordering and fixed seeds specified in a replay manifest and confirming byte-identical ranked outputs.
S160. The apparatus of claim S1, wherein the apparatus digitally signs a replay manifest or proof artifact and stores a signature identifier linked to snapshot hash and policy bundle hash.

## Cluster 4: Policy simulation (“what-if” governance changes) in ranking (S161–S170)

S161. The apparatus of claim S1, wherein the apparatus executes a policy what-if simulation by evaluating a same set of candidate defense actions under at least two different policy bundle hashes.
S162. The apparatus of claim S161, wherein the apparatus generates a policy delta report comprising differences in allow, deny, and modify decisions between the at least two different policy bundle hashes.
S163. The apparatus of claim S162, wherein the policy delta report comprises differential risk deltas for at least one metric comprising policy risk, legal risk, or trust impact.
S164. The apparatus of claim S1, wherein the apparatus denies enabling production ranking under a new policy bundle hash when the policy delta report indicates an increase in externally publishable actions above a threshold absent approval.
S165. The apparatus of claim S1, wherein the apparatus re-ranks candidate defense actions under each policy bundle hash and outputs a ranking delta summary.
S166. The apparatus of claim S165, wherein the apparatus identifies defense action types that change permission status between policy bundles and records the changes in an audit log linked to the policy bundle hashes.
S167. The apparatus of claim S1, wherein the apparatus includes in a replay manifest the policy bundle hashes compared in the policy what-if simulation and the snapshot hash used for the comparison.
S168. The apparatus of claim S1, wherein the apparatus gates rollout of a new policy bundle hash via staged rollout criteria and reverts to a prior policy bundle hash when validation metrics degrade.
S169. The apparatus of claim S1, wherein the apparatus computes a policy coverage metric and excludes from ranking any candidate defense action whose required fields are not governed by at least one applicable rule.
S170. The apparatus of claim S1, wherein the apparatus stores policy delta reports as redacted artifacts excluding never-log fields.

## Cluster 5: Cross-org federated defense in simulation (S171–S180)

S171. The apparatus of claim S1, wherein the apparatus operates in a multi-tenant configuration and maintains tenant-isolated simulation inputs comprising tenant-specific snapshots and tenant-specific governance policies.
S172. The apparatus of claim S171, wherein the apparatus receives federated aggregates comprising technique indicator rates computed across tenants without receiving raw artifacts.
S173. The apparatus of claim S172, wherein the apparatus conditions transition function parameters on the federated aggregates to adjust simulated adversarial response likelihood.
S174. The apparatus of claim S171, wherein the apparatus applies thresholding rules that exclude federated aggregates that do not satisfy minimum aggregation criteria.
S175. The apparatus of claim S171, wherein the apparatus applies a privacy budget to the use of federated aggregates and restricts further use when the privacy budget is exceeded.
S176. The apparatus of claim S171, wherein the apparatus performs secure aggregation such that a coordinator cannot access individual tenant contributions to a federated aggregate.
S177. The apparatus of claim S171, wherein the apparatus outputs tenant-specific rankings that incorporate federated robustness regression alerts while respecting tenant-specific governance constraints.
S178. The apparatus of claim S171, wherein the apparatus denies applying a federated recommendation when inconsistent with a tenant’s governance policies and records the denial reason.
S179. The apparatus of claim S171, wherein the replay manifest includes identifiers of federated aggregates used and privacy parameters associated with the federated aggregates.
S180. The apparatus of claim S171, wherein the apparatus records federated aggregate usage events in an audit log without recording raw tenant contributions.

## Cluster 6: Jurisdiction/time-zone-aware constraints + geofenced ranking/output (S361–S370)

S361. The apparatus of claim S1, wherein candidate defense actions include jurisdiction tags derived from at least one of target audience location, channel availability region, or applicable legal scope.
S362. The apparatus of claim S361, wherein the policy engine evaluates jurisdiction-specific constraints based on the jurisdiction tags and denies outputting an external publishing action when a required constraint set is unavailable.
S363. The apparatus of claim S361, wherein the apparatus applies time-zone-aware deployment windows by converting a requested deployment time window into one or more local time windows per jurisdiction tag.
S364. The apparatus of claim S1, wherein the apparatus enforces geofence rules that restrict outputting external publishing actions to those permitted in jurisdictions supported by an execution connector.
S365. The apparatus of claim S364, wherein the apparatus excludes from ranking any external publishing action that would publish outside a permitted jurisdiction and records a geofence violation event.
S366. The apparatus of claim S364, wherein geofence rules are stored as machine-readable policies referenced by geofence rule identifiers and versions.
S367. The apparatus of claim S365, wherein the apparatus records the geofence violation event in an audit log linked to a policy bundle hash and connector identifier.
S368. The apparatus of claim S361, wherein the apparatus requires approval for actions spanning more than a threshold number of jurisdictions and records the requirement in a replay manifest.
S369. The apparatus of claim S361, wherein the apparatus outputs monitoring-only actions when jurisdiction tags are ambiguous or below a confidence threshold.
S370. The apparatus of claim S361, wherein the apparatus outputs a jurisdiction rationale artifact describing how jurisdiction tags were derived, excluding never-log fields.

## Cluster 7: Evidence-weighted forecasting + forecast drift in simulation (S371–S380)

S371. The apparatus of claim S1, wherein the apparatus computes forecast trajectories for narrative states using evidence-weighted inputs derived from lineage manifests and source reliability scores.
S372. The apparatus of claim S371, wherein forecast evidence weights increase for sources having verified provenance status and decrease for sources having unknown provenance status.
S373. The apparatus of claim S371, wherein the apparatus computes a forecast confidence score and includes the forecast confidence score in ranking explanations.
S374. The apparatus of claim S371, wherein the apparatus detects a forecast drift event when observed outcomes deviate from predicted trajectories beyond a threshold.
S375. The apparatus of claim S374, wherein the apparatus records the forecast drift event as a drift artifact linked to a snapshot hash and a forecast model version identifier.
S376. The apparatus of claim S374, wherein the apparatus excludes external publishing actions from ranking when forecast drift events exceed a threshold frequency within a rolling time window.
S377. The apparatus of claim S371, wherein the apparatus performs backtesting of forecast trajectories on historical snapshots and records backtesting results as evidence artifacts.
S378. The apparatus of claim S371, wherein the apparatus calibrates forecast parameters using observed outcomes only when a data quality policy indicates sufficient reliability.
S379. The apparatus of claim S371, wherein the apparatus outputs a forecast explanation artifact identifying input features and forecast evidence weights contributing to a forecast, excluding never-log fields.
S380. The apparatus of claim S371, wherein the replay manifest includes forecast model version identifiers and identifiers of forecast explanation artifacts used in ranking.

## Cluster 8: Partner policy overlays + brand safety constraints in ranking (S381–S390)

S381. The apparatus of claim S1, wherein the apparatus applies partner overlay policy bundles representing contractual or brand safety constraints for at least one channel, platform, or partner.
S382. The apparatus of claim S381, wherein partner overlay policy bundles are stored as versioned partner policy bundles each having a partner overlay hash.
S383. The apparatus of claim S382, wherein the apparatus computes an effective policy bundle hash by combining a governance policy bundle hash with a partner overlay hash for a given channel.
S384. The apparatus of claim S381, wherein the policy engine denies outputting an external publishing action when a partner overlay policy bundle conflicts with governance policies and a conflict resolution rule is not satisfied.
S385. The apparatus of claim S381, wherein partner overlay policy bundles are restrictive-only and cannot increase permissions relative to governance policies.
S386. The apparatus of claim S381, wherein the replay manifest includes partner overlay hashes and partner identifiers for each ranked external publishing action.
S387. The apparatus of claim S381, wherein the apparatus enforces brand safety constraints that restrict references to protected topics or sensitive categories in candidate defense actions.
S388. The apparatus of claim S387, wherein the policy engine modifies a candidate defense action by redacting or rewriting content to satisfy brand safety constraints and the apparatus re-simulates modified actions.
S389. The apparatus of claim S381, wherein the apparatus denies outputting an external publishing action when a required partner overlay policy bundle is unavailable or not attested.
S390. The apparatus of claim S381, wherein the apparatus generates a partner compliance report comprising counts of allowed, denied, and modified actions under partner overlay policy bundles.

## Cluster 9: Graph integrity constraints + reconciliation invariants for simulation inputs (S391–S400)

S391. The apparatus of claim S1, wherein the apparatus enforces graph integrity constraints on a versioned snapshot prior to executing counterfactual simulation.
S392. The apparatus of claim S391, wherein the graph integrity constraints include schema constraints that restrict permitted node types, edge types, and required properties per node type.
S393. The apparatus of claim S391, wherein the graph integrity constraints include referential integrity constraints requiring that each edge references existing nodes.
S394. The apparatus of claim S391, wherein the graph integrity constraints include temporal consistency constraints requiring that temporal edges do not violate chronological ordering associated with events.
S395. The apparatus of claim S391, wherein the apparatus generates a reconciliation proof artifact indicating which constraints were checked and whether each constraint passed or failed for a snapshot used in simulation.
S396. The apparatus of claim S395, wherein the apparatus records the reconciliation proof artifact in an audit log linked to a snapshot hash and a replay manifest identifier.
S397. The apparatus of claim S391, wherein the apparatus excludes external publishing actions from ranking when any graph integrity constraint fails and outputs monitoring-only actions.
S398. The apparatus of claim S1, wherein the apparatus performs conflict resolution for duplicate narrative state merges by selecting a canonical narrative identifier based on confidence scores and lineage completeness.
S399. The apparatus of claim S398, wherein the apparatus records a merge decision artifact comprising merge rationale and contributing sources in an audit log linked to ranked outputs.
S400. The apparatus of claim S391, wherein the apparatus enforces a constraint requiring lineage completeness above a threshold for narrative states referenced by output permitted external publishing actions.

## Cluster 10: Appeals workflow for ranked outputs and policy decisions (S401–S410)

S401. The apparatus of claim S1, wherein the apparatus provides an appeals workflow enabling a human operator to challenge a policy decision used in ranking a candidate defense action.
S402. The apparatus of claim S401, wherein the appeals workflow receives a structured appeal artifact comprising an appealed decision identifier, an objection category, and supporting references to audit entries or proof artifacts.
S403. The apparatus of claim S402, wherein objection categories include at least incorrect jurisdiction tagging, incorrect authenticity evaluation, incorrect risk scoring, or incorrect policy rule application.
S404. The apparatus of claim S401, wherein the apparatus re-evaluates a candidate defense action by re-running policy evaluation using a stored structured defense action object and a policy bundle hash referenced in the appealed decision identifier.
S405. The apparatus of claim S404, wherein the apparatus produces an appeal resolution decision comprising uphold, modify, or reverse and an explanation.
S406. The apparatus of claim S405, wherein reversing a deny decision for an external publishing action requires dual-control approvals and step-up authentication.
S407. The apparatus of claim S401, wherein the apparatus records appeal artifacts, re-evaluation outputs, and appeal resolution decisions in an append-only audit log linked to replay manifest identifiers.
S408. The apparatus of claim S401, wherein the apparatus enforces a time-bound validity window for appeals and denies late appeals absent elevated approval.
S409. The apparatus of claim S401, wherein the apparatus computes aggregated appeal analytics and records the analytics as redacted artifacts.
S410. The apparatus of claim S401, wherein the apparatus excludes external publishing actions from ranking while an appeal is pending for an associated high-risk narrative state.

## Cluster 11: Outcome attribution + causal lift guardrails in simulation calibration (S411–S420)

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

## Cluster 12: Higher-order reconciliation + audit log binding (S421-S423)

S421. A simulation apparatus comprising a processor and a memory storing instructions that, when executed by the processor, cause the apparatus to perform operations for enforcing graph integrity for simulation inputs, the operations comprising:
1. Maintaining a versioned snapshot of a narrative operating graph;
2. Enforcing a plurality of graph invariants on the versioned snapshot prior to executing a counterfactual simulation;
3. Generating a reconciliation proof artifact indicating pass or fail status for each of the plurality of graph invariants;
4. Recording the reconciliation proof artifact in an audit log linked to a snapshot hash and a replay manifest identifier; and
5. Excluding defense actions from a ranking operation when any of the plurality of graph invariants fails and outputting monitoring-only actions.

S422. A simulation apparatus comprising a processor and a memory storing instructions that, when executed by the processor, cause the apparatus to perform operations for managing appeals of ranked outputs, the operations comprising:
1. Providing an appeals workflow enabling a human operator to challenge a policy decision used in ranking a candidate defense action;
2. Receiving an appeal artifact comprising an appealed decision identifier, an objection category, and supporting references to audit entries or proof artifacts;
3. Re-evaluating the candidate defense action by re-running policy evaluation using a stored structured defense action object and a policy bundle hash;
4. Producing an appeal resolution decision comprising one of uphold, modify, or reverse; and
5. Recording the appeal artifact and the appeal resolution decision in an append-only audit log linked to a replay manifest identifier.

S423. A simulation apparatus comprising a processor and a memory storing instructions that, when executed by the processor, cause the apparatus to perform operations for causal lift guardrails in simulation calibration, the operations comprising:
1. Estimating a causal lift of an executed defense action on at least one outcome metric;
2. Generating a causal assumptions artifact comprising at least one of a covariate set, a matching rule, or an identification strategy;
3. Using the causal lift to calibrate a transition function for counterfactual simulation when the causal lift estimate satisfies a data quality policy;
4. Associating a validity window with the causal lift estimate; and
5. Denying use of the causal lift estimate to update calibration data when the validity window has expired.

---

## CONVERGENCE PROTOCOL

1. **Geofence is a hard constraint:** violations deny; log the geofence rule ID.
2. **Forecast drift is conservative:** drift triggers monitoring-only and/or requires re-calibration approval.
3. **Partner overlays only restrict:** never expand permissions; conflicts default deny.
4. **Audit binding:** record jurisdiction tags, forecast drift events, partner overlay hashes with snapshot hash + policy bundle hash.

---

## CI VERIFIER SPEC

### Geofence Tests
- **forbidden jurisdiction** → deny; log geofence rule IDs.
- **permitted jurisdiction** → allow; log geofence rule IDs.

### Forecast Drift Tests
- **drift detected** → triggers monitoring-only mode; log drift artifact.
- **no drift** → allow simulation output (subject to other policies).

### Partner Overlay Tests
- **overlay conflict** → deny; log conflict resolution failure.
- **overlay permission expansion** → block (overlays never increase permissions).
- **valid overlay** → allow; log partner overlay hashes.
>>>>>>> main
