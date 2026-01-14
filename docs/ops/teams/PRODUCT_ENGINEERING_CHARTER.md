# Charter: Product Engineering Team

**Owner:** `product-engineering-team`
**Escalation:** `release-captain`

## 1. Mission

To design, build, and deliver reliable, high-quality, end-user-facing features that address customer needs and drive the Summit platform's mission. This team is accountable for the end-to-end product experience, from ideation to GA release.

## 2. Owned Surfaces

This team has primary ownership of the following repository paths and artifacts:

- **/apps/web/**: The primary user-facing web application.
- **/client/**: The legacy web client.
- **/conductor-ui/**: The user interface for administrators and operators.
- **/services/cases/**: The microservice for managing cases.
- **/services/reporting/**: The microservice for generating and managing reports.
- **Product-specific GA artifacts** under `docs/ga/product/`.

## 3. Required Artifacts

The Product Engineering Team is required to produce and maintain the following artifacts as part of the GA process:

- **Product Evidence Index:** A manifest of all evidence demonstrating that product features meet their requirements, including test results, performance benchmarks, and UX validation.
- **Go/No-Go Attestation:** A signed attestation confirming that all product-related GA criteria have been met.
- **User-Facing Documentation:** Clear, accurate, and up-to-date documentation for all owned features.

## 4. GA Responsibilities

For a feature to be considered "done" and ready for a GA release, the Product Engineering Team must:

- **Meet all GA criteria** as defined in the global `GA_CHECKLIST.md`.
- **Produce a complete Product Evidence Index** for all new or modified features.
- **Address all P0/P1 bugs** related to their owned surfaces.
- **Secure sign-off** from the Security & Trust team for any changes with security implications.
- **Provide a formal attestation** of readiness for the Go/No-Go packet.

## 5. Guardrails (What This Team May NOT Change Unilaterally)

The Product Engineering Team must not:

- **Modify core platform services, APIs, or infrastructure** without a formal compatibility contract and sign-off from the Platform Engineering team.
- **Alter global security policies or controls** without approval from the Security & Trust team.
- **Bypass the merge train or GA gates** for any reason.
- **Make public claims or announcements** without coordinating with the Growth & External Surfaces team.

## 6. Escalation Path

- For technical conflicts with other teams, escalate to the **Release Captain**.
- For product-related disagreements, escalate to the **Head of Product**.
- For security-related issues, escalate to the **Security & Trust Team Lead**.
All escalations must be documented in the [Decision Log](../DECISION_LOG.md).
