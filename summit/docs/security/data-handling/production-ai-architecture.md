# Production Architecture Data Handling & Security

**Evidence Prefix:** PAB

This document outlines the zero-trust data handling, threat mitigation strategies, and security requirements enforced by Summit's Production AI Architecture. It defines how data is classified, retained, and protected from abuse across all architecture planes.

## Data Classification & Retention

### Public Architecture Metadata
**Evidence ID:** PAB-SEC-DC-001
- **Description:** Non-sensitive documentation, public schemas, and architectural blueprints (e.g., this document, `report.json`, `metrics.json`).
- **Retention:** Retained alongside standard repository and build artifacts indefinitely.

### Internal Operational Metadata
**Evidence ID:** PAB-SEC-DC-002
- **Description:** Application logs, telemetry, CI run logs, and trace IDs that do not contain PII or secret material.
- **Retention:** Rolling 30-90 days, or as dictated by the specific observability platform configuration.

### Sensitive Secrets/Config
**Evidence ID:** PAB-SEC-DC-003
- **Description:** API keys, database connection strings, signing material, and OAuth tokens.
- **Retention:** Never retained in plaintext logs or artifacts. Managed strictly via ephemeral secret stores and memory.

### User/Tenant Investigative Data
**Evidence ID:** PAB-SEC-DC-004
- **Description:** Graph payloads, user inputs, retrieved context, generated reports, and OSINT ingestion artifacts.
- **Retention:** Retained securely based on tenant lifecycle policy and strictly separated via zero-trust controls.

## Never-Log List

**Evidence ID:** PAB-SEC-NL-001
The following data classes are explicitly prohibited from appearing in application logs, CI artifacts, or unencrypted storage:
- API keys
- OAuth tokens
- Session cookies
- Raw provider prompts containing tenant data
- Raw graph exports
- Connection strings
- Cryptographic signing material

## Threat-Informed Requirements & Mitigations

**Evidence ID:** PAB-SEC-TR-001

| Threat | Mitigation | CI/Runtime Gate | Test Case / Fixture |
| :--- | :--- | :--- | :--- |
| **Orchestrator Privilege Creep** | Capability allowlist, deny-by-default tools | Policy lint + review gate | Agent attempts to invoke an undeclared tool. |
| **Data Exfiltration via Logging** | Never-log list enforcement, payload redaction, sampled log contract | Log schema check | Fixture containing an API key or PII triggers redaction/failure. |
| **Provenance Loss** | Mandatory Evidence IDs (PAB-*) and bitemporal claims | Artifact validator (`gate:schema`) | Missing PAB-* ID in documentation or data fails CI. |
| **Undocumented Architecture Drift** | Deterministic drift detector workflow monitoring the codebase | PR-required check | Introduction of a new component path without updating the blueprint fails CI. |
| **Unsafe Provider Coupling** | Adapter boundary enforcement defined in the standards doc | Docs contract check | A provider-specific call bypassing the adapter layer is blocked. |
| **Cost Runaway** | Budget thresholds and token limitations enforced at the control plane | Metrics gate | A fixture designed to exceed the allocated token/cost budget is correctly throttled. |
| **Unbounded Queue / Async Failure** | Specific runbooks and SLO alerts for async processing | Smoke tests + Alert schema check | Simulation of a stalled worker scenario triggers appropriate alerts. |

## Abuse-Case Fixtures

**Evidence ID:** PAB-SEC-AB-001
Automated tests MUST validate the mitigations above. Required fixtures include:
- Prompt with secret-like payload (to trigger redaction/block).
- Oversized retrieval request (to test boundaries and limits).
- Agent requesting disallowed connector (to test zero-trust constraints).
- Malformed provenance bundle (to verify strict validation rejection).
- Undeclared component path introduced in a PR (to test the blueprint drift detector).
