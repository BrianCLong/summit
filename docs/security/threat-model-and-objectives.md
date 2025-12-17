# Threat Model & Security Objectives

## 1. As-Is Security Map

### Current Controls
*   **CI/CD Pipeline**:
    *   **Quality**: Strict linting (`eslint`), typechecking (`tsc`), and unit/integration tests (`jest`, `playwright`).
    *   **Scans**: Trivy (filesystem) and CycloneDX SBOM generation are configured in `ci.yml` but are currently **non-blocking** (`exit-code: 0`).
    *   **Provenance**: A comprehensive `slsa-attestation.yml` workflow exists for generating SLSA Level 3 provenance and signing with Cosign, but it is triggered only on `release` or manual dispatch, leaving regular builds unsigned.
*   **Secrets Management**:
    *   **Detection**: `gitleaks` is configured as a `husky` pre-commit hook.
    *   **Runtime**: `server/src/config/security.ts` performs runtime validation of the environment, enforcing `production` security requirements (e.g., checking for weak secrets or missing OIDC config).
*   **Policy**:
    *   **Definition**: A rich library of OPA policies exists in `policy/` (covering supply chain, RBAC, access control), including `policy/supply_chain.rego` which defines strict SLSA and SBOM requirements.
    *   **Enforcement**: These policies are currently **dormant** in the CI pipeline; there is no step in `ci.yml` that evaluates them against the build artifacts.
*   **Authentication & Authorization**:
    *   JWT-based stateless authentication (`AuthService`).
    *   Tenant isolation logic exists in middleware but relies on correct usage in every route.

### Gaps & High-Risk Areas
*   **Non-Blocking Security Gates**: Vulnerabilities found by Trivy or Gitleaks in CI (if running) do not stop the build, allowing insecure code to merge.
*   **Dormant Policy**: The OPA policies are not enforced, meaning the "Supply Chain" policy is effectively documentation, not code.
*   **Artifact Integrity**: Intermediate build artifacts (docker images used in dev/staging) are not consistently signed or attested, creating a risk of tampering before deployment.
*   **External Surface**:
    *   Direct LLM/External API calls need strict rate limiting and data sanitization to prevent leakage or cost attacks.
    *   Webhooks require strict HMAC verification (implemented in some places, needs verification).

## 2. Assets & Threat Actors

### Key Assets
1.  **Tenant Data**:
    *   **Intelligence Graphs**: Sensitive relationships and entities (Neo4j).
    *   **Documents & Evidence**: Raw files and processed text (Postgres/Object Storage).
    *   **Maestro Runs**: Orchestration logic and execution history.
2.  **Credentials**:
    *   **API Keys**: Third-party integrations (LLM providers, Data sources).
    *   **Service Tokens**: Internal JWT signing keys, Database credentials.
3.  **Supply Chain Artifacts**:
    *   **Container Images**: `summit/api`, `summit/web`.
    *   **Source Code**: The monorepo itself.
4.  **Telemetry**:
    *   Logs and traces which may inadvertently contain sensitive query data or PII.

### Threat Actors
*   **External Attackers**: Targeting public APIs (Web, Webhooks) via injection, DoS, or auth bypass.
*   **Rogue Tenants**: Attempting to access other tenants' data via IDOR or logical flaws in isolation.
*   **Supply Chain Attackers**: Compromising dependencies (NPM packages) or the build environment (GitHub Actions) to inject malicious code.
*   **Insider Threats**: Compromised developer accounts or malicious internal actors.

## 3. Security Objectives

### Confidentiality & Integrity
*   **Tenant Isolation**: Strict logical separation of data. No tenant can query another's graph or documents.
*   **Least Privilege**: Services and users operate with the minimum necessary permissions.
*   **Secret Management**: Zero hardcoded secrets. All secrets injected via secure environment variables or secret managers.

### Supply Chain Hardening (SLSA Level 3 Target)
*   **Verifiable Build**: All production artifacts must be built in a trusted, ephemeral CI environment (GitHub Actions).
*   **Provenance**: Every artifact must have signed provenance linking it to the source commit and build instructions.
*   **Clean Dependency Tree**: No critical vulnerabilities in dependencies. SBOMs generated and archived for every release.

### Availability & Resilience
*   **Rate Limiting**: Aggressive per-tenant and per-IP rate limits on all public endpoints.
*   **Input Validation**: Strict schema validation (Zod) on all inputs to prevent crashes and injection.

### Auditability
*   **Security Events**: All security-relevant actions (login, policy violation, secret rotation, schema change) must emit structured audit events.
*   **Immutable Logs**: Security logs must be tamper-evident (forwarded to external storage).
