# Assurance Contract

## Overview

This document defines the **Assurance Contract** for the Summit platform. It specifies the machine-verifiable assurances that the platform continuously emits, allowing external parties to validate the system's security, governance, and operational integrity without privileged access.

## Assurance Domains

Summit provides assurances across the following domains:

1.  **Security**: Vulnerability posture, access control, and supply chain integrity.
2.  **Governance**: Policy compliance, audit trail immutability, and data sovereignty.
3.  **Operations**: SLO adherence, disaster recovery readiness, and incident response.
4.  **Provenance**: Code-to-runtime traceability and data lineage.
5.  **Lifecycle**: Entity lifecycle management (creation, deprecation, deletion).

## Claim Vocabulary

Claims are factual, boolean, or quantitative statements about the system state. They are designed to be clear, minimal, and non-aspirational.

### Security Claims

*   `security.vulnerability.scan.passed`: The latest vulnerability scan (SAST/DAST/Container) completed with no critical or high severities.
*   `security.access.mfa.enforced`: Multi-Factor Authentication is enforced for all users in the tenant.
*   `security.supply_chain.sbom.present`: A Software Bill of Materials (SBOM) exists for the running artifacts.
*   `security.supply_chain.signature.valid`: Running artifacts are signed by a trusted authority.

### Governance Claims

*   `governance.policy.compliant`: All active OPA policies are passing for the tenant.
*   `governance.audit.logging.active`: Audit logging is enabled and successfully writing to WORM storage.
*   `governance.data.sovereignty.verified`: Data resides only in verified regions.

### Operations Claims

*   `operations.slo.compliance.met`: The service is meeting its defined Service Level Objectives (SLOs).
*   `operations.backup.verified`: The most recent backup was successfully verified (restored and tested).
*   `operations.dr.drill.recent`: A Disaster Recovery drill was conducted within the validity window.

### Provenance Claims

*   `provenance.code.traceable`: Running code can be traced back to a specific commit in the version control system.
*   `provenance.data.lineage.complete`: Data entities have complete lineage records in the ledger.

## Evidence Types

Every claim must be backed by verifiable evidence.

*   **Signed Artifact**: A digital signature or hash of a build artifact.
*   **Log Reference**: A pointer to an immutable audit log entry (ID + Hash).
*   **Test Result**: A standardized test report (e.g., JUnit XML, JSON) with a cryptographic digest.
*   **Policy Evaluation**: A record of an OPA policy evaluation result.
*   **Metric Snapshot**: A signed snapshot of time-series data demonstrating SLO compliance.

## Validity Periods & Revocation

*   **Validity Period**: Each attestation has a `valid_from` and `valid_until` timestamp.
    *   Continuous claims (e.g., "policy compliant") generally have short validity periods (e.g., 1 hour).
    *   Event-based claims (e.g., "scan passed") are valid until the next scheduled event or a configuration change.
*   **Revocation**: Attestations are revoked if:
    *   The underlying control fails (drift detection).
    *   A critical vulnerability is discovered affecting the claimed state.
    *   The evidence is found to be tampered with.

## Backward Compatibility

*   New claims are added as optional extensions.
*   Existing claims are never removed or redefined within a major API version.
*   Consumers must handle unknown claim types gracefully.
