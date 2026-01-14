# Charter: Platform Engineering Team

**Owner:** `platform-engineering-team`
**Escalation:** `release-captain`

## 1. Mission

To build and operate the core infrastructure, shared services, and APIs that enable product teams to deliver features safely, reliably, and at scale. This team is accountable for the platform's performance, stability, and developer experience.

## 2. Owned Surfaces

This team has primary ownership of the following repository paths and artifacts:

- **/server/**: The core backend server, excluding service-specific business logic owned by other teams.
- **/services/auth/**: The authentication and authorization service.
- **/services/prov-ledger/**: The immutable provenance ledger service.
- **/gateway/**: The API gateway and routing layer.
- **/db/** and **/migrations/**: The database schemas and migration scripts.
- **/infra/**, **/k8s/**, **/terraform/**: All infrastructure-as-code.
- **Platform-specific GA artifacts** under `docs/ga/platform/`.

## 3. Required Artifacts

The Platform Engineering Team is required to produce and maintain the following artifacts as part of the GA process:

- **Platform Evidence Index:** A manifest of evidence demonstrating platform stability, including load tests, uptime reports, and disaster recovery drills.
- **Compatibility Contracts:** Versioned contracts for all public-facing platform APIs, detailing any breaking changes.
- **Developer Documentation:** Clear and comprehensive documentation for all platform services and tools.

## 4. GA Responsibilities

For the platform to be considered "done" and ready for a GA release, the Platform Engineering Team must:

- **Meet all GA criteria** for platform stability, performance, and scalability.
- **Publish compatibility contracts** for any changes to shared services or APIs.
- **Address all P0/P1 platform-level bugs** and security vulnerabilities.
- **Provide a formal attestation** of platform readiness for the Go/No-Go packet.

## 5. Guardrails (What This Team May NOT Change Unilaterally)

The Platform Engineering Team must not:

- **Introduce breaking changes to public APIs** without a documented migration plan and sign-off from all impacted teams.
- **Modify product-specific business logic** within services owned by other teams.
- **Alter the global GA process** without approval from the Release & Operations team.

## 6. Escalation Path

- For technical conflicts with other teams, escalate to the **Release Captain**.
- For architectural disagreements, escalate to the **Chief Architect**.
- For resource and priority conflicts, escalate to the **VP of Engineering**.
All escalations must be documented in the [Decision Log](../DECISION_LOG.md).
