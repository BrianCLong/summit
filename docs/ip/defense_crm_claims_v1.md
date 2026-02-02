# ADDITIONAL DEPENDENT CLAIMS — CRM (C91–C120)

C1. A non-transitory computer-readable medium storing instructions that, when executed by one or more processors, cause the processors to perform operations for adversarial misinformation defense, the operations comprising:
- ingesting content items from one or more sources to generate a plurality of source records;
- constructing a narrative operating graph comprising narrative states and relationships derived from the plurality of source records;
- evaluating candidate defense actions against a set of governance policies using a policy engine, the governance policies being defined as structured-control objects with deny-by-default enforcement for external publishing;
- binding an audit record of the evaluating to a snapshot hash of the narrative operating graph and a policy bundle hash; and
- executing approved defense actions through an execution interface, while recording the executing in an append-only audit log.

... [C2–C90 intentionally omitted for brevity] ...

## Cluster 1: Data provenance lineage (C91–C104)

C91. The medium of claim C1, wherein the instructions cause the system to store, for each ingested content item, a source record comprising a source identifier, a collection timestamp, and a collection method identifier.
C92. The medium of claim C91, wherein the source record further comprises a confidence score representing reliability of the collection method or integrity of the data source.
C93. The medium of claim C1, wherein the instructions cause the system to represent data lineage in the narrative operating graph by adding lineage nodes and lineage edges linking source records to derived narrative states.
C94. The medium of claim C93, wherein the lineage edges store transformation identifiers corresponding to extraction, clustering, summarization, or embedding steps applied to the ingested content item.
C95. The medium of claim C1, wherein the instructions cause the system to generate a lineage manifest for each candidate defense action, the lineage manifest referencing source records and transformation identifiers contributing to the candidate defense action.
C96. The medium of claim C95, wherein the policy engine denies external publishing of a defense action when the lineage manifest is missing required source records.
C97. The medium of claim C95, wherein the lineage manifest includes a redaction manifest identifying removed sensitive fields and corresponding redaction rules.
C98. The medium of claim C1, wherein the instructions cause the system to store, for each transformation identifier, a version identifier of a tool or model used to perform the transformation.
C99. The medium of claim C98, wherein the instructions cause the system to store, in the audit log, the version identifiers of tools or models used to generate an executed defense action.
C100. The medium of claim C1, wherein the instructions cause the system to compute a lineage hash over the lineage manifest and store the lineage hash in the audit log.
C101. The medium of claim C100, wherein the policy engine denies execution when the lineage hash is missing or does not match the lineage manifest presented for approval.
C102. The medium of claim C1, wherein the instructions cause the system to restrict access to raw source records based on sensitivity tiers while allowing audit queries over hashed identifiers.
C103. The medium of claim C1, wherein the instructions cause the system to generate a provenance report for a defense action that enumerates sources, transformations, and policy rules applied, excluding never-log fields.
C104. The medium of claim C1, wherein the instructions cause the system to update the narrative operating graph with a lineage link from an executed defense action to observed outcomes.

## Cluster 2: Adversarial red-team evaluation + robustness (C105–C112)

C105. The medium of claim C1, wherein the instructions cause the system to generate, using one or more red-team agents, adversarial counter-narrative scenarios for evaluating robustness of candidate defense actions.
C106. The medium of claim C105, wherein the adversarial counter-narrative scenarios are restricted to simulation and are not eligible for execution by the execution interface absent an approval token.
C107. The medium of claim C105, wherein the system computes a robustness score for a candidate defense action based on simulated adversarial response likelihood and predicted trust impact.
C108. The medium of claim C107, wherein the policy engine denies external publishing of a defense action when the robustness score is below a threshold.
C109. The medium of claim C105, wherein the instructions cause the system to generate alternative defense actions adapted to mitigate the adversarial counter-narrative scenarios and re-evaluate the alternatives.
C110. The medium of claim C1, wherein the instructions cause the system to label, in the narrative operating graph, narrative states that are susceptible to adversarial reframing based on the robustness score.
C111. The medium of claim C1, wherein the instructions cause the system to store, in the audit log, adversarial scenarios used in evaluation in a redacted form excluding never-log fields.
C112. The medium of claim C1, wherein the instructions cause the system to gate red-team agent activation under a policy requiring human approval.

## Cluster 3: Supply-chain controls for model/tool/policy updates (C113–C120)

C113. The medium of claim C1, wherein the instructions cause the system to treat governance policies, models, and tools as versioned bundles each having a bundle identifier and a bundle hash.
C114. The medium of claim C113, wherein the instructions cause the system to require an attestation record for a bundle hash prior to using the bundle for policy evaluation or execution.
C115. The medium of claim C114, wherein the attestation record includes a signer identifier, a signature over the bundle hash, and an approval scope defining permitted environments.
C116. The medium of claim C1, wherein the instructions cause the system to perform staged rollout of a new bundle version across environments comprising at least a test environment and a production environment.
C117. The medium of claim C116, wherein the instructions cause the system to deny use of a bundle in a production environment when staged rollout criteria have not been satisfied.
C118. The medium of claim C1, wherein the instructions cause the system to maintain a rollback plan identifier for each bundle version and to revert to a previous bundle version when a validation metric degrades beyond a threshold.
C119. The medium of claim C118, wherein the instructions cause the system to record bundle version changes, staged rollout events, and rollback events in the audit log linked to policy decisions.
C120. The medium of claim C1, wherein the instructions cause the system to deny execution of a defense action when the defense action references a tool or model version not included in an attested bundle.
