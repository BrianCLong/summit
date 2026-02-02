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
