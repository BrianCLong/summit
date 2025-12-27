# Threat Model (Logging, Path Sanitization, and Least-Privilege Assurance)

## Objective and Scope

This document refines the repo-wide threat modeling work with a narrow focus on logging hygiene, path handling, and enforcement of least-privilege. It covers Summit platform services (API, background workers, CLI utilities, and data pipelines) and the supporting observability stack used for collection and storage of audit logs.

## Crown-Jewel Assets

- **Tenant and user identity data:** authentication tokens, session cookies, and tenant claims embedded in access tokens.
- **Customer content and derived intelligence:** stored documents, graph entities/relationships, embeddings, and LLM prompt/response transcripts.
- **Signing and encryption keys:** KMS-managed keys for JWT signing, envelope encryption, and SOPS/Helm secrets.
- **Operational telemetry:** audit logs, security events, anomaly detections, and provenance ledgers that provide forensics value.
- **Service-to-service credentials:** short-lived workload identities, service accounts, API keys, and OIDC federated roles.

## Trust Boundaries and Entry Points

- **Public API Gateway and Web App:** ingress for user and tenant traffic; enforces authN/Z, rate limiting, and schema validation.
- **File and URL ingestion paths:** upload endpoints, OSINT fetchers, and connectors that retrieve external content.
- **Background workers and schedulers:** job dispatchers that consume queue messages and execute file/URL operations.
- **Admin and operations tooling:** CLI and internal consoles that manage tenants, quotas, and model configurations.
- **Build and deployment pipelines:** CI/CD runners and artifact registries used to package and deliver services.

## Threats, Mitigations, and Control Mapping

| Threat                                                                 | Mitigations                                                                                                                                                     | Control Mapping                                              |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Directory traversal or unsafe path construction in ingestion/workers   | Input canonicalization (strip `..`, absolute path guards), allowlisted storage roots, and static analysis checks for `path.join` misuse.                        | OWASP ASVS V5.1, NIST 800-53 SI-10, CIS Controls 8 IG2 8.9   |
| Sensitive data leakage through logs                                    | Structured logging with redaction of headers/body fields (tokens, PII), log sampling for high-volume routes, and production-only masked stack traces.           | SOC 2 CC6.6/CC7.2, ISO 27001 A.8.10, NIST 800-53 AU-13       |
| Over-privileged service accounts or connectors                         | Principle-of-least-privilege IAM roles, role-per-connector separation, and periodic access review with automatic revocation of unused roles.                    | CIS Controls 6.3/6.7, NIST 800-53 AC-2/AC-6, ISO 27001 A.8.2 |
| Unvalidated external fetches enabling SSRF or internal metadata access | URL schema validation (no `file://` or RFC1918), DNS re-resolution checks, outbound egress filtering, and connector-scoped allowlists.                          | OWASP ASVS V4.3, NIST 800-53 SC-7(3), CIS Controls 8 IG2 4.8 |
| Log tampering or loss impacting forensic integrity                     | Append-only audit sink, TLS/mutual TLS in transit, object storage with retention locks, and integrity verification (hashing/signing).                           | NIST 800-53 AU-9/AU-11, ISO 27001 A.8.12, SOC 2 CC7.1        |
| Abuse of debug or verbose logging in production                        | Build-time disallow of debug flags, runtime guardrails to reject `LOG_LEVEL=debug` in production, and SRE playbooks for temporary scoped overrides with expiry. | CIS Controls 8 IG2 8.2, NIST 800-53 SI-4, OWASP ASVS V1.10   |

## Validated Assumptions

- **Logging and path sanitization are enforced:**
  - Logging frameworks use field redaction for tokens, credentials, and PII; production error responses are masked to avoid path or stack disclosure.
  - File and URL handlers normalize and validate inputs, disallow relative path escapes, and constrain storage operations to tenant-scoped buckets or directories.
- **Least-privilege is the default posture:**
  - Service accounts are provisioned with minimal scopes; connectors operate under isolated roles; and admin operations require step-up authentication.
  - Background workers execute with per-queue IAM roles, preventing lateral access to unrelated datasets or tenants.

## Verification and Monitoring

- **Preventive checks:** schema validators on all ingress routes, path canonicalization utilities with unit coverage, and lint rules preventing raw `fs` path concatenation.
- **Detective controls:** centralized log scrubbing metrics, anomaly detection on log volume spikes, and alerts for attempts to write outside configured storage roots.
- **Responsive actions:** runbook-driven containment (rotate keys, disable offending connector), and rapid log-level reduction when redaction drift is detected.

## Residual Risk and Follow-Ups

- Residual risk remains for novel parser confusion or deserialization bugs; maintain fuzzing on ingestion parsers and enforce dependency scanning to catch newly disclosed CVEs.
- Review least-privilege mappings quarterly to account for service expansion and newly added connectors.
