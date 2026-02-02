# Invention Disclosure: Defense CRM Claims v1

**Status**: Draft
**Classification**: Trade Secret / Confidential Commercial Information
**Date**: 2026-01-29
**Inventors**: Summit/IntelGraph Engineering Team

---

## 1. Independent Claims

### C1. Broad Governance-as-Code Medium

A non-transitory computer-readable medium storing instructions that, when executed by a processor, cause a system to govern an intelligence platform by:

- maintaining a plurality of governance policies as a versioned policy bundle hash;
- managing governance policy changes using policy change requests each having a policy RFC identifier and a proposed policy bundle hash;
- evaluating the proposed policy bundle hash via a policy diff artifact and a policy what-if simulation;
- enforcing multi-party attestation quorums prior to enabling a proposed policy bundle hash for production execution;
- generating safety-case artifacts comprising structured argument graphs linking safety claims to evidence identifiers and verification proof artifacts;
- providing a read-only auditor mode interface for inspecting redacted audit logs and safety-case artifacts; and
- recording all policy changes, attestations, and safety-case updates in an append-only audit log.

---

## 2. Dependent Claims

### Cluster 1: Policy change management + RFC workflow (C331–C340)

C331. The medium of claim C1, wherein the instructions cause the system to manage governance policy changes using policy change requests each having a policy RFC identifier and a proposed policy bundle hash.
C332. The medium of claim C331, wherein the instructions cause the system to generate a policy diff artifact describing differences between a current policy bundle hash and the proposed policy bundle hash.
C333. The medium of claim C331, wherein the instructions cause the system to execute a policy what-if simulation using the proposed policy bundle hash prior to enabling the proposed policy bundle hash for production execution.
C334. The medium of claim C331, wherein the system requires approvals from a plurality of approver credentials prior to enabling the proposed policy bundle hash for production execution.
C335. The medium of claim C334, wherein the plurality of approver credentials includes at least one compliance approver credential distinct from an operations approver credential.
C336. The medium of claim C331, wherein the instructions cause the system to perform staged rollout of the proposed policy bundle hash across environments and to record rollout stage transitions in the audit log.
C337. The medium of claim C331, wherein the instructions cause the system to require a rollback plan identifier associated with the proposed policy bundle hash prior to rollout.
C338. The medium of claim C331, wherein the instructions cause the system to deny external publishing defense actions under the proposed policy bundle hash until a rollout stage indicates production-ready status.
C339. The medium of claim C331, wherein the instructions cause the system to record, in the audit log, the policy RFC identifier, the policy diff artifact identifier, and approvals enabling the proposed policy bundle hash.
C340. The medium of claim C331, wherein the instructions cause the system to revoke a proposed policy bundle hash and revert to a prior policy bundle hash when a validation metric degrades beyond a threshold during rollout.

### Cluster 2: Multi-party attestations + external auditor mode (C341–C350)

C341. The medium of claim C1, wherein the instructions cause the system to require a multi-party attestation quorum prior to enabling at least one of a policy bundle hash, a model bundle hash, or a connector SBOM hash for production use.
C342. The medium of claim C341, wherein the multi-party attestation quorum requires signatures from at least two distinct signer identifiers corresponding to different roles.
C343. The medium of claim C341, wherein the instructions cause the system to store attestation records as append-only artifacts linked to bundle hashes and signer identifiers.
C344. The medium of claim C1, wherein the instructions cause the system to provide an auditor mode interface that grants read-only access to redacted audit logs, policy RFC artifacts, and verification proof artifacts.
C345. The medium of claim C344, wherein the auditor mode interface denies access to raw artifacts and never-log fields and provides only hashed identifiers for restricted data.
C346. The medium of claim C344, wherein the auditor mode interface provides a query mechanism that returns proof artifacts linked to a specified snapshot hash and policy bundle hash.
C347. The medium of claim C344, wherein the system enforces that an auditor credential cannot generate approval tokens or modify governance policies.
C348. The medium of claim C1, wherein the instructions cause the system to generate an auditor export package comprising redacted audit entries and a manifest of included proof artifacts.
C349. The medium of claim C348, wherein the auditor export package includes verification proof artifacts for determinism and policy constraint compliance.
C350. The medium of claim C1, wherein the instructions cause the system to record auditor access events, query parameters in redacted form, and export generation events in the audit log.

### Cluster 3: Safety-case assembly + structured argument graphs (C351–C360)

C351. The medium of claim C1, wherein the instructions cause the system to generate a safety-case artifact comprising a structured argument graph linking safety claims to evidence identifiers and proof artifacts.
C352. The medium of claim C351, wherein the structured argument graph includes nodes representing safety requirements, hazard scenarios, mitigations, and verification results.
C353. The medium of claim C351, wherein the instructions cause the system to require that each external publishing defense action references at least one safety requirement node satisfied by associated proof artifacts.
C354. The medium of claim C353, wherein the system denies execution when a referenced safety requirement node lacks a current proof artifact within a validity window.
C355. The medium of claim C351, wherein the instructions cause the system to bind the safety-case artifact to a policy bundle hash and a set of connector capability grant versions.
C356. The medium of claim C351, wherein the instructions cause the system to compute a safety-case hash over the structured argument graph and store the safety-case hash in the audit log.
C357. The medium of claim C351, wherein the instructions cause the system to update the safety-case artifact when governance policies change and to record a before-and-after safety-case diff artifact.
C358. The medium of claim C351, wherein the instructions cause the system to generate a safety-case coverage metric representing a proportion of defense action types mapped to safety requirement nodes.
C359. The medium of claim C358, wherein the system restricts outputs to monitoring-only when the safety-case coverage metric is below a threshold.
C360. The medium of claim C351, wherein the instructions cause the system to export the safety-case artifact in a redacted form for auditor mode without exposing never-log fields.

---

## 3. Definitions

- **policy RFC**: A structured request for a governance policy change, including a unique identifier, proposed changes (e.g., bundle hash), and rationale.
- **attestation quorum**: A requirement for a minimum number of cryptographic signatures from authorized roles to validate a policy, model, or artifact.
- **auditor view**: A restricted, read-only interface providing access to redacted compliance evidence and audit logs without exposing sensitive raw data.
- **argument node**: A discrete element within a safety-case argument graph representing a requirement, hazard, mitigation, or verification result.
- **claim-evidence link**: A verifiable association between a safety claim (or argument node) and a deterministic proof artifact or evidence ID.

---

## 4. Filing Sets & Recommendations

- **Broad Filing Set**: Independent claim C1 covering the integrated RFC, multi-party attestation, and safety-case framework.
- **Medium Filing Set**: Individual clusters focused on specific moats (e.g., Policy RFC workflow).
- **Narrow Filing Set**: Specific technical embodiments such as safety-case coverage metrics or redacted auditor exports.
- **Recommendation**: Cluster 2 (Multi-party attestations + Auditor mode) represents the highest-value continuation with the fastest allowance potential due to its clear applicability to third-party verification standards.
