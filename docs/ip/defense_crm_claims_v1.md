# Defense CRM Dependent Claims (v1)

This document contains dependent claims for the Defense CRM family, focusing on data provenance, adversarial evaluation, supply-chain controls, formal verification, policy simulation, and federated defense.

## Independent Claim C1

C1. A non-transitory computer-readable medium storing instructions that, when executed by one or more processors, cause the processors to perform operations for adversarial misinformation defense, the operations comprising:
- ingesting content items from one or more sources to generate a plurality of source records;
- constructing a narrative operating graph comprising narrative states and relationships derived from the plurality of source records;
- evaluating candidate defense actions against a set of governance policies using a policy engine, the governance policies being defined as structured-control objects with deny-by-default enforcement for external publishing;
- binding an audit record of the evaluating to a snapshot hash of the narrative operating graph and a policy bundle hash; and
- executing approved defense actions through an execution interface, while recording the executing in an append-only audit log.

## Cluster 1: Data provenance lineage (C91–C104)

C91. The medium of claim C1, wherein the instructions cause the system to store, for each ingested content item, a source record comprising a source identifier, a collection timestamp, and a collection method identifier.
C92. The medium of claim C91, wherein the source record further comprises a confidence score representing reliability of the collection method or integrity of the data source.
C93. The medium of claim C1, wherein the instructions cause the system to represent data lineage in the narrative operating graph by adding lineage nodes and lineage edges linking source records to derived narrative states.
C94. The medium of claim C93, wherein the lineage edges store transformation identifiers corresponding to extraction, clustering, summarization, or embedding steps applied to the ingested content item.
C95. The medium of claim C1, wherein the instructions cause the system to generate a lineage manifest for each candidate defense action, the lineage manifest referencing source records and transformation identifiers contributing to the candidate defense action.
C96. The medium of claim C95, wherein the policy engine denies external publishing of a defense action when the lineage manifest is missing required source records.
C97. The medium of claim C95, wherein the lineage manifest includes a redaction manifest identifying removed sensitive fields and corresponding redaction rules.
C98. The medium of claim C95, wherein the instructions cause the system to compute a lineage hash over the lineage manifest and to store the lineage hash in the audit record.
C99. The medium of claim C91, wherein the source record further comprises a location tag or a language tag associated with the source record.
C100. The medium of claim C1, wherein the instructions cause the system to update narrative states based on new source records and to maintain a history of narrative state changes in the narrative operating graph.
C101. The medium of claim C1, wherein the instructions cause the system to perform extraction using one or more Large Language Model (LLM) agents and to record LLM model version identifiers in the lineage manifest.
C102. The medium of claim C1, wherein the instructions cause the system to identify conflicting source records and to represent the conflict as a node in the narrative operating graph.
C103. The medium of claim C1, wherein the instructions cause the system to verify integrity of a source record by checking a digital signature or a content hash.
C104. The medium of claim C1, wherein the instructions cause the system to generate a provenance report summarizing the lineage of a plurality of defense actions executed within a time period.

## Cluster 2: Adversarial red-team evaluation + robustness (C105–C112)

C105. The medium of claim C1, wherein the instructions cause the system to execute an adversarial red-team simulation by generating a plurality of adversarial counter-narrative scenarios.
C106. The medium of claim C105, wherein the instructions cause the system to evaluate the candidate defense actions against the adversarial counter-narrative scenarios to compute a robustness score.
C107. The medium of claim C106, wherein the policy engine denies external publishing of a defense action when the robustness score is below a threshold.
C108. The medium of claim C105, wherein the instructions cause the system to use a secondary AI agent to generate the adversarial counter-narrative scenarios.
C109. The medium of claim C1, wherein the instructions cause the system to store a robustness proof artifact in the audit record, the robustness proof artifact comprising the adversarial counter-narrative scenarios and corresponding evaluation results.
C110. The medium of claim C1, wherein the instructions cause the system to perform a differential evaluation of candidate defense actions across multiple narrative graph snapshots.
C111. The medium of claim C1, wherein the instructions cause the system to identify sensitive narrative states and to require higher robustness scores for defense actions affecting the sensitive narrative states.
C112. The medium of claim C1, wherein the instructions cause the system to re-evaluate robustness when the governance policies or the policy engine are updated.

## Cluster 3: Supply-chain controls for model/tool/policy updates (C113–C120)

C113. The medium of claim C1, wherein the instructions cause the system to verify a software bill of materials (SBOM) and a signature for each tool or model used by the system.
C114. The medium of claim C1, wherein the instructions cause the system to deny using a tool or model that fails SBOM verification or signature check.
C115. The medium of claim C1, wherein the instructions cause the system to record version identifiers and content hashes of all tools, models, and policy bundles in the audit record.
C116. The medium of claim C1, wherein the instructions cause the system to gate deployment of updated tools, models, or policies based on a set of automated quality gates.
C117. The medium of claim C116, wherein the automated quality gates include at least one of a unit test suite, an integration test suite, or a regression test suite.
C118. The medium of claim C1, wherein the instructions cause the system to maintain a signed ledger of all authorized tool and model versions.
C119. The medium of claim C1, wherein the instructions cause the system to perform a policy-as-code linting and validation step before activating a new policy bundle hash.
C120. The medium of claim C1, wherein the instructions cause the system to generate a supply-chain audit report summarizing the provenance and integrity status of all system components.

## Cluster 4: Formal verification / model checking (C151–C160)

C151. The medium of claim C1, wherein the instructions cause the system to verify a replay manifest by checking presence and consistency of at least a graph snapshot hash, a policy bundle hash, and version identifiers for tools or models used to generate a defense action.
C152. The medium of claim C151, wherein the instructions cause the system to compute a verification proof artifact indicating that the replay manifest satisfies a set of validation rules and to store the verification proof artifact in the audit log.
C153. The medium of claim C1, wherein the instructions cause the system to perform a satisfiability check over governance policies and defense action schemas to determine whether at least one permitted defense action exists under the policies.
C154. The medium of claim C153, wherein the instructions cause the system to enter a safe mode that denies external publishing defense actions when the satisfiability check fails.
C155. The medium of claim C1, wherein the instructions cause the system to check that modify decisions preserve required attribution fields and uncertainty fields for each defense action type.
C156. The medium of claim C155, wherein the instructions cause the system to generate a counterexample artifact when a modify decision would remove a required field and to record the counterexample artifact in the audit log.
C157. The medium of claim C1, wherein the instructions cause the system to verify that a digitally signed defense action is bound to a specific graph snapshot hash and policy bundle hash.
C158. The medium of claim C1, wherein the instructions cause the system to perform a policy constraint compliance check that confirms each executed defense action satisfies all applicable hard constraints derived from governance policies.
C159. The medium of claim C158, wherein the instructions cause the system to deny execution when the policy constraint compliance check produces an unsatisfied constraint and to record an unsatisfied-constraint explanation in the audit log.
C160. The medium of claim C1, wherein the instructions cause the system to validate determinism by re-running at least a portion of simulation or policy evaluation using the replay manifest and confirming byte-identical outputs.

## Cluster 5: Policy simulation (“what-if” governance changes) (C161–C170)

C161. The medium of claim C1, wherein the instructions cause the system to execute a policy what-if simulation by evaluating a same set of candidate defense actions under at least two different policy bundle hashes.
C162. The medium of claim C161, wherein the instructions cause the system to generate a policy delta report comprising differences in allow, deny, and modify decisions between the at least two different policy bundle hashes.
C163. The medium of claim C162, wherein the policy delta report further comprises a differential risk delta for at least one metric comprising policy risk, legal risk, or operational risk.
C164. The medium of claim C1, wherein the instructions cause the system to deny enabling a new policy bundle hash for production execution when the policy delta report indicates an increase in external publishing permissions above a threshold absent human approval.
C165. The medium of claim C1, wherein the instructions cause the system to simulate effects of a policy change on ranking outputs by re-ranking candidate defense actions under each policy bundle hash.
C166. The medium of claim C165, wherein the instructions cause the system to identify defense action types that transition from permitted to denied or from denied to permitted and to record the transitions in the audit log.
C167. The medium of claim C1, wherein the instructions cause the system to require that policy delta reports reference replay manifests and snapshot hashes used to generate the reports.
C168. The medium of claim C1, wherein the instructions cause the system to gate rollout of a new policy bundle hash using staged rollout criteria and to revert to a prior policy bundle hash upon detecting a degradation in trust impact metrics.
C169. The medium of claim C1, wherein the instructions cause the system to generate recommended policy edits that reduce conflicts or gaps while maintaining deny-by-default for external publishing actions.
C170. The medium of claim C1, wherein the instructions cause the system to store policy what-if simulation inputs and outputs as redacted artifacts excluding never-log fields.

## Cluster 6: Cross-org federated defense (privacy-preserving sharing across tenants) (C171–C180)

C171. The medium of claim C1, wherein the instructions cause the system to operate in a multi-tenant configuration comprising a plurality of tenant boundaries and to maintain tenant-isolated narrative operating graphs.
C172. The medium of claim C171, wherein the instructions cause the system to compute tenant-local technique indicator aggregates comprising counts or rates of manipulation technique labels without exporting raw artifacts.
C173. The medium of claim C172, wherein the instructions cause the system to share, across tenant boundaries, only federated aggregates that satisfy a minimum thresholding rule that prevents disclosure of individual-level data.
C174. The medium of claim C171, wherein the instructions cause the system to apply a privacy budget to federated aggregates and to restrict additional sharing when the privacy budget is exceeded.
C175. The medium of claim C171, wherein the instructions cause the system to perform secure aggregation such that a coordinator cannot access individual tenant contributions to an aggregate.
C176. The medium of claim C171, wherein the instructions cause the system to distribute a robustness regression alert across tenants when robustness scores degrade across successive bundle versions, without disclosing tenant-specific raw data.
C177. The medium of claim C171, wherein the instructions cause the system to maintain tenant-specific governance policies and to deny application of a federated recommendation when inconsistent with a tenant’s policies.
C178. The medium of claim C171, wherein the instructions cause the system to record federated aggregate identifiers, privacy parameters, and recipient tenant identifiers in an audit log.
C179. The medium of claim C171, wherein the instructions cause the system to restrict federated sharing to technique indicators and robustness regressions and to prohibit sharing of message content templates across tenants absent explicit approval.
C180. The medium of claim C171, wherein the instructions cause the system to generate a federated defense report summarizing aggregated technique trends and recommended monitoring-only actions for each tenant.

... [C181–C360 intentionally omitted for brevity] ...

## CONTINUATION MOAT CLUSTERS (Independent Claims)

### Moat Cluster A: Jurisdiction & Geofence (C360.1)
C360.1 A non-transitory computer-readable medium storing instructions that, when executed by one or more processors, cause the processors to perform operations for multi-jurisdictional governance of AI defense actions, the operations comprising:
- associating candidate defense actions with jurisdiction tags derived from at least one of target audience location, channel availability region, or applicable legal scope;
- enforcing geofence rules that restrict execution connectors to publishing only in permitted jurisdictions;
- evaluating jurisdiction-specific constraints based on the jurisdiction tags and outputting a deny decision when a required constraint set is unavailable or when a geofence rule violation is detected; and
- recording a geofence violation event in an audit log linked to a policy bundle hash and a connector identifier.

### Moat Cluster B: Forecasting & Drift (C360.2)
C360.2 A non-transitory computer-readable medium storing instructions that, when executed by one or more processors, cause the processors to perform operations for evidence-weighted forecasting in an AI defense platform, the operations comprising:
- computing forecast trajectories for narrative states using evidence-weighted inputs derived from lineage manifests and source reliability scores;
- storing a forecast explanation artifact identifying input features and forecast evidence weights contributing to a forecast;
- detecting a forecast drift event when observed outcomes deviate from predicted trajectories beyond a threshold; and
- restricting external publishing defense actions to monitoring-only when forecast drift events exceed a threshold frequency within a rolling time window.

### Moat Cluster C: Partner Overlay & Brand Safety (C360.3)
C360.3 A non-transitory computer-readable medium storing instructions that, when executed by one or more processors, cause the processors to perform operations for multi-party policy enforcement, the operations comprising:
- applying partner overlay policy bundles representing contractual or brand safety constraints for at least one channel, platform, or partner, wherein the partner overlay policy bundles are restrictive-only and cannot increase permissions relative to governance policies;
- computing an effective policy decision by combining governance policies with partner overlay policy bundles;
- denying execution when a partner overlay policy bundle conflicts with a governance policy and a conflict resolution rule is not satisfied; and
- recording partner overlay hashes and partner identifiers in an audit log for each executed defense action.

## Cluster 7: Jurisdiction/time-zone-aware constraints + geofenced execution (C361–C370)

C361. The medium of claim C1, wherein the instructions cause the system to associate candidate defense actions with jurisdiction tags derived from at least one of target audience location, channel availability region, or applicable legal scope.
C362. The medium of claim C361, wherein the policy engine evaluates jurisdiction-specific constraints based on the jurisdiction tags and outputs a deny decision when a required constraint set is unavailable.
C363. The medium of claim C361, wherein the instructions cause the system to apply time-zone-aware deployment windows by converting a requested deployment time window into one or more local time windows per jurisdiction tag.
C364. The medium of claim C1, wherein the instructions cause the system to enforce geofence rules that restrict execution connectors to publishing only in permitted jurisdictions.
C365. The medium of claim C364, wherein the system denies execution when an execution connector would publish outside a permitted jurisdiction and records a geofence violation event.
C366. The medium of claim C364, wherein the instructions cause the system to store geofence rules as machine-readable policies referenced by geofence rule identifiers and versions.
C367. The medium of claim C365, wherein the system stores the geofence violation event in the audit log linked to a policy bundle hash and connector identifier.
C368. The medium of claim C361, wherein the instructions cause the system to require human approval for defense actions spanning more than a threshold number of jurisdictions.
C369. The medium of claim C361, wherein the instructions cause the system to restrict external publishing defense actions to monitoring-only when jurisdiction tags are ambiguous or below a confidence threshold.
C370. The medium of claim C361, wherein the instructions cause the system to generate a jurisdiction rationale artifact describing how jurisdiction tags were derived, excluding never-log fields.

## Cluster 8: Evidence-weighted forecasting + forecast drift detection (C371–C380)

C371. The medium of claim C1, wherein the instructions cause the system to compute forecast trajectories for narrative states using evidence-weighted inputs derived from lineage manifests and source reliability scores.
C372. The medium of claim C371, wherein the forecast evidence weights increase for sources having verified provenance status and decrease for sources having unknown provenance status.
C373. The medium of claim C371, wherein the instructions cause the system to compute a forecast confidence score and store the forecast confidence score as a node linked to a narrative state.
C374. The medium of claim C371, wherein the system detects a forecast drift event when observed outcomes deviate from predicted trajectories beyond a threshold.
C375. The medium of claim C374, wherein the system records the forecast drift event as a drift artifact linked to a snapshot hash and a forecast model version identifier.
C376. The medium of claim C374, wherein the system restricts external publishing defense actions to monitoring-only when forecast drift events exceed a threshold frequency within a rolling time window.
C377. The medium of claim C371, wherein the system performs backtesting of forecast trajectories on historical snapshots and records backtesting results as evidence artifacts.
C378. The medium of claim C371, wherein the system calibrates forecast parameters using observed outcomes only when a data quality policy indicates sufficient reliability.
C379. The medium of claim C371, wherein the system stores a forecast explanation artifact identifying input features and forecast evidence weights contributing to a forecast, excluding never-log fields.
C380. The medium of claim C371, wherein the system binds forecasts and forecast explanation artifacts to a policy bundle hash and a replay manifest identifier.

## Cluster 9: Contractual/brand safety constraints + partner policy overlays (C381–C390)

C381. The medium of claim C1, wherein the instructions cause the system to apply partner overlay policy bundles representing contractual or brand safety constraints for at least one channel, platform, or partner.
C382. The medium of claim C381, wherein the partner overlay policy bundles are stored as versioned partner policy bundles each having a partner overlay hash.
C383. The medium of claim C382, wherein the system computes an effective policy bundle hash by combining a governance policy bundle hash with a partner overlay hash for a given channel.
C384. The medium of claim C381, wherein the policy engine denies execution when a partner overlay policy bundle conflicts with a governance policy and a conflict resolution rule is not satisfied.
C385. The medium of claim C381, wherein partner overlay policy bundles are restrictive-only and cannot increase permissions relative to governance policies.
C386. The medium of claim C381, wherein the system records partner overlay hashes and partner identifiers in the audit log for each executed defense action.
C387. The medium of claim C381, wherein the system enforces brand safety constraints that restrict references to protected topics or sensitive categories in external publishing defense actions.
C388. The medium of claim C387, wherein the policy engine modifies an external publishing defense action by redacting or rewriting content to satisfy brand safety constraints and records a modify rationale.
C389. The medium of claim C381, wherein the system denies external publishing defense actions when a required partner overlay policy bundle is unavailable or not attested.
C390. The medium of claim C381, wherein the system generates a partner compliance report comprising counts of allowed, denied, and modified defense actions under partner overlay policy bundles.

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
- **no drift** → allow external publishing (subject to other policies).

### Partner Overlay Tests
- **overlay conflict** → deny; log conflict resolution failure.
- **overlay permission expansion** → block (overlays never increase permissions).
- **valid overlay** → allow; log partner overlay hashes.
