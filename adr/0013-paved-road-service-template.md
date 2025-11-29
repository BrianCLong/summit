# ADR 0013: Paved-Road Service Template

## Status
Proposed

## Context
We need to standardize how new services are created in CompanyOS to ensure consistency, observability, and policy compliance from day one. Currently, creating a new service requires manual setup of CI/CD, observability hooks, and boilerplate code, leading to drift and lack of governance.

## Decision
We will create a "Paved Road" service template for Node.js/TypeScript services.
This template will provide:
1.  **Standard Structure**: Pre-configured folder structure, `package.json`, and `tsconfig.json`.
2.  **Observability by Default**: Structured logging (Pino), Metrics (Prometheus), and OpenTelemetry tracing hooks.
3.  **Governance**: Pre-configured CI/CD pipelines with SBOM generation, container signing, and OPA policy gates.
4.  **Local Dev Experience**: Docker Compose setup for consistent local development.

The template will be located in `templates/service` and will be instantiable via a CLI script `bin/companyos-new-service`.

## Consequences
**Positive:**
*   Drastically reduced setup time for new services.
*   Guaranteed baseline observability and security for new services.
*   Easier enforcement of policy changes (update the template).

**Negative:**
*   Maintenance burden of the template itself.
*   Potential for "template drift" if services diverge significantly after creation.

## Compliance
This ADR supports the "Proof of Governance" sprint goal by providing the artifact that enforces the governance checks.
