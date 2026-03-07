# Security Architecture & Policies

## Overview

Summit adopts a centralized security architecture ensuring:

- **Secrets** are managed via `SecretsService` (Vault/Env).
- **Keys** are encrypted at rest and generated via `KeyService`.
- **Policies** are enforced via `PolicyService`.
- **Audit** logs are captured via `AuditService`.
- **Supply Chain** is hardened via SBOMs and SLSA provenance.

## Core Services

### SecretsService

Abstracts the underlying secret store (Vault or Environment Variables).

- **Usage**: `await SecretsService.getSecret('OPENAI_API_KEY')`
- **Location**: `server/src/services/security/SecretsService.ts`

### KeyService

Handles API key generation, hashing (scrypt), and encryption (AES-256-GCM) of external keys.

- **Key Generation**: Generates `summit_sk_...` high-entropy keys.
- **Encryption**: Encrypts external provider keys before storage in DB.
- **Location**: `server/src/services/security/KeyService.ts`

### PolicyService

Central decision engine for ABAC and Business Logic policies.

- **Interface**: `evaluate({ action, user, resource })`
- **Location**: `server/src/services/security/PolicyService.ts`
- **Integration**: Wraps OPA and internal logic.

### AuditService

Structured security logging.

- **Events**: Login, Policy Denials, Secret Access, High-Risk Actions.
- **Location**: `server/src/services/security/AuditService.ts`

### LLMSafetyService

Ensures prompt hygiene and data protection for LLM interactions.

- **Redaction**: Scans prompts for PII using `ClassificationEngine` and redacts high-severity entities.
- **Policy**: Checks `llm.prompt` permission before execution.
- **Location**: `server/src/services/security/LLMSafetyService.ts`

## Supply Chain Security

All releases generate:

1.  **SBOM**: CycloneDX format (`sbom.json`).
2.  **Provenance**: SLSA Level 3 attestations signed with Cosign.
3.  **Signatures**: Container images are signed and verified before deployment (in supported environments).

## Incident Response

Logs are structured for ingestion into Loki/ELK.
Query for `action="SECURITY_ALERT"` or `decision.allow=false` to find incidents.
