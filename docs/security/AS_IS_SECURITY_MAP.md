# Summit Security & Supply Chain Map (As-Is)

## 1. Authentication & Authorization

### Existing Capabilities

- **Authentication**:
  - `server/src/auth` provides multi-tenant RBAC and OIDC integration.
  - JWT-based authentication is standard.
- **Authorization**:
  - `server/src/services/AccessControl.js` provides basic rule-based access control (PBAC) with OPA fallback.
  - `server/src/services/PolicyService.ts` wraps GraphQL resolvers to enforce access control.

### Gaps & Risks

- **Fragmentation**: Authorization logic is split between `AccessControl.js` (CommonJS, simple rules) and `PolicyService.ts` (GraphQL-specific).
- **Lack of Centralization**: No unified engine for non-GraphQL decisions (e.g., API routes, background jobs, LLM safety).

## 2. Secrets & Key Management

### Existing Capabilities

- **Secrets Management**:
  - `server/src/lib/secrets/SecretManager.ts` provides a robust abstraction for Secrets (Vault/Env).
  - `server/src/config/secrets.ts` uses Zod to validate environment variables and prevent insecure defaults in production.
- **Key Management**:
  - `server/src/services/KeyVaultService.js` exists for managing API keys.

### Gaps & Risks

- **High Risk - Plaintext Keys**: `KeyVaultService.js` stores API keys in plaintext in the PostgreSQL database (`api_keys` table). This is a critical vulnerability.
- **Lack of Key Rotation**: While `SecretManager` has a `rotateSecret` method, it relies on the provider. `KeyVaultService` has a `rotateKey` method but it just adds a new one; automated rotation policies are missing.
- **No Unified KeyService**: There is no central service for _generating_ secure keys (hashing, entropy) for internal use.

## 3. Supply Chain Integrity

### Existing Capabilities

- **CI/CD**: Extensive GitHub Actions workflows in `.github/workflows`.
- **Scanning**:
  - `gitleaks` for secret scanning.
  - `trivy` for filesystem/dependency scanning.
- **Hardening**:
  - `slsa-attestation.yml` implements SLSA Level 3 provenance generation and signing with Cosign.
  - `sbom.yml` generates CycloneDX SBOMs.
  - `Dockerfile` uses Chainguard images (distroless/hardened).

### Gaps & Risks

- **Enforcement**: While the workflows exist, it's unclear if admission controllers (e.g., Kyverno/Gatekeeper) are actually configured in the deployment manifests to _enforce_ that only signed images run.
- **Consistency**: Need to ensure these security workflows are triggered for _all_ release artifacts, not just on demand.

## 4. Policy & Runtime Security

### Existing Capabilities

- **Audit**: `server/src/utils/audit.ts` provides structured audit logging.
- **Runtime**: Basic Helm charts and Kubernetes manifests exist.

### Gaps & Risks

- **Network Policies**: No evidence of default-deny NetworkPolicies in the codebase (need to verify `k8s/` or `helm/` deeply).
- **LLM Safety**: `SecuredLLMService.ts` exists but needs to be integrated with a central `PolicyService` for consistent prompt safety/redaction.

## 5. Action Plan

1.  **Core Services**: Unify `PolicyService` and `AccessControl`. Create `KeyService` to replace insecure parts of `KeyVaultService`.
2.  **Remediation**: Fix plaintext key storage.
3.  **Integration**: Wire LLM services to use the new `PolicyService`.
4.  **Enforcement**: Document how to enforce supply chain artifacts in K8s.
