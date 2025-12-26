# Security Policy

*This document is auto-generated from the [Due-Diligence Index](./docs/governance/due-diligence/index.yaml). Do not edit it directly.*

## Security Controls and Governance

The following table summarizes the key security controls and governance principles of the Summit platform, with links to their verifiable evidence.

### SEC-S-001: User Impersonation Prevention

**Description:** Measures to prevent an adversary from successfully posing as another user or component.

**Category:** Spoofing | **Source:** [THREAT_MODEL.md](THREAT_MODEL.md)

| Invariant | Evidence Type | Evidence Path | Description |
|-----------|---------------|---------------|-------------|
| Strong authentication and authorization are required for all services. | `documentation` | [docs/governance/CONSTITUTION.md#article-ii--authority--control](docs/governance/CONSTITUTION.md#article-ii--authority--control) | The constitution mandates human authorization for all consequential actions. |
| Strong authentication and authorization are required for all services. | `code` | [server/src/middleware/auth.ts](server/src/middleware/auth.ts) | JWT and RBAC middleware enforce authentication and authorization. |
| LLM-generated content is clearly labeled to prevent impersonation of trusted sources. | `code` | [client/src/components/Chat/Message.tsx](client/src/components/Chat/Message.tsx) | UI components differentiate between user and AI-generated messages. |

### SEC-T-001: Prompt Injection Prevention

**Description:** Measures to prevent adversaries from overriding the LLM's original purpose through malicious inputs.

**Category:** Tampering | **Source:** [THREAT_MODEL.md](THREAT_MODEL.md)

| Invariant | Evidence Type | Evidence Path | Description |
|-----------|---------------|---------------|-------------|
| Input validation and sanitization are implemented to detect and block prompt injection patterns. | `code` | [server/src/services/llm/input-sanitizer.ts](server/src/services/llm/input-sanitizer.ts) | Sanitization logic to strip or flag malicious input patterns before processing. |
| Input validation and sanitization are implemented to detect and block prompt injection patterns. | `test` | [server/tests/services/llm/input-sanitizer.test.ts](server/tests/services/llm/input-sanitizer.test.ts) | Unit tests verifying the effectiveness of the input sanitizer against known prompt injection attacks. |

### GOV-C-001: Human Primacy

**Description:** Ensures that all consequential actions require human authorization and are traceable.

**Category:** Governance | **Source:** [CONSTITUTION.md](docs/governance/CONSTITUTION.md)

| Invariant | Evidence Type | Evidence Path | Description |
|-----------|---------------|---------------|-------------|
| All consequential actions require human authorization. | `policy` | [docs/governance/CONSTITUTION.md#21-human-primacy](docs/governance/CONSTITUTION.md#21-human-primacy) | The constitution explicitly states the requirement for human authorization. |
| All actions are traceable and auditable. | `code` | [server/src/services/audit/logger.ts](server/src/services/audit/logger.ts) | The audit logging service records all significant user and system actions. |
| All actions are traceable and auditable. | `config` | [server/src/config/production.json](server/src/config/production.json) | Audit logging is enabled by default in the production environment. |

### SEC-ID-001: Sensitive Data Leakage Prevention

**Description:** Measures to prevent the exposure of sensitive information to unauthorized individuals through the LLM.

**Category:** Information Disclosure | **Source:** [THREAT_MODEL.md](THREAT_MODEL.md)

| Invariant | Evidence Type | Evidence Path | Description |
|-----------|---------------|---------------|-------------|
| Sensitive information (PII, secrets) is redacted or masked before being processed by the LLM. | `code` | [packages/pii-redactor/src/index.ts](packages/pii-redactor/src/index.ts) | A dedicated package for identifying and redacting PII in text. |
| Sensitive information (PII, secrets) is redacted or masked before being processed by the LLM. | `test` | [packages/pii-redactor/tests/redact.test.ts](packages/pii-redactor/tests/redact.test.ts) | Unit tests for the PII redaction functionality. |

### SEC-DoS-001: Denial of Service Mitigation

**Description:** Measures to protect the platform from Denial of Service (DoS) attacks.

**Category:** Denial of Service | **Source:** [THREAT_MODEL.md](THREAT_MODEL.md)

| Invariant | Evidence Type | Evidence Path | Description |
|-----------|---------------|---------------|-------------|
| Strict rate limiting is applied to API endpoints to prevent resource exhaustion. | `code` | [server/src/middleware/rateLimit.ts](server/src/middleware/rateLimit.ts) | Middleware for rate limiting API requests. |
| Strict rate limiting is applied to API endpoints to prevent resource exhaustion. | `config` | [helm/summit/values.yaml](helm/summit/values.yaml) | Default rate limit values are configured in the Helm chart. |

### SEC-EP-001: Privilege Escalation Prevention

**Description:** Measures to prevent a user or component from gaining unauthorized capabilities.

**Category:** Elevation of Privilege | **Source:** [THREAT_MODEL.md](THREAT_MODEL.md)

| Invariant | Evidence Type | Evidence Path | Description |
|-----------|---------------|---------------|-------------|
| The LLM interacts with other systems through a low-privilege API gateway that enforces access controls. | `documentation` | [docs/adr/005-llm-api-gateway.md](docs/adr/005-llm-api-gateway.md) | Architectural Decision Record for the LLM API gateway, outlining its security design. |
| The LLM interacts with other systems through a low-privilege API gateway that enforces access controls. | `code` | [services/llm-gateway/src/auth.ts](services/llm-gateway/src/auth.ts) | The gateway enforces OPA policies for every request from the LLM. |

### GOV-P-001: Provenance and Auditability

**Description:** Ensures all outputs are attributable, explainable, and auditable.

**Category:** Governance | **Source:** [CONSTITUTION.md](docs/governance/CONSTITUTION.md)

| Invariant | Evidence Type | Evidence Path | Description |
|-----------|---------------|---------------|-------------|
| All significant system events are recorded in an immutable ledger. | `policy` | [docs/governance/CONSTITUTION.md#41-provenance-requirement](docs/governance/CONSTITUTION.md#41-provenance-requirement) | The constitution mandates that all outputs must be attributable and explainable. |
| All significant system events are recorded in an immutable ledger. | `code` | [services/prov-ledger/src/ledger.ts](services/prov-ledger/src/ledger.ts) | The provenance ledger service provides an immutable audit trail. |
| All significant system events are recorded in an immutable ledger. | `ci-job` | [.github/workflows/pr-quality-gate.yml#L150](.github/workflows/pr-quality-gate.yml#L150) | CI checks ensure that new services integrate with the provenance ledger. |

