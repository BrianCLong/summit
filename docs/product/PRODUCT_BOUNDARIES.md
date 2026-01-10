# Product Boundaries (GA 1.0)

> **Status**: Active
> **Version**: 1.0
> **Owner**: Product Council

## 1. Purpose

This document establishes clear, defensible boundaries for the Summit General Availability (GA) product. Its purpose is to define what is officially supported, what is provided on a best-effort basis, and what is explicitly out of scope. These boundaries are derived from the canonical GA definition and existing operational and security documentation.

---

## 2. Supported Scope

"Supported" means that the described functionality is actively monitored, maintained, and covered by our operational commitments and incident response protocols. Issues within this scope will be triaged and addressed according to the formal Support Model.

### 2.1. Core Platform Capabilities

- **Authentication & Authorization**: OIDC/JWT-based authentication and RBAC/ABAC authorization as defined in `docs/ga/GA_DEFINITION.md`. This includes tenant isolation, role hierarchies, and policy-enforced workflows.
- **Provenance and Audit**: The immutable audit ledger (`prov-ledger`) and its APIs are fully supported for tracking critical system events.
- **Policy Engine**: The OPA-based policy engine, including all policies required for GA, is supported.
- **Standard Deployment**: Deployment and operation using the provided Docker Compose (`make up`) and Helm chart (`charts/ig-platform`) configurations as described in `docs/ga/OPERATOR_HANDBOOK.md`.
- **Health & Observability**: All documented health endpoints (`/health`, `/health/detailed`, `/health/ready`) and the export of Prometheus metrics and structured logs are supported.

### 2.2. Operational Procedures

- **Backup and Restore**: The backup and restore scripts and procedures documented in the `OPERATOR_HANDBOOK.md` are fully supported.
- **Standard Configuration**: All environment variables and configuration flags documented in the `OPERATOR_HANDBOOK.md` are supported. Undocumented or experimental flags are not.
- **CI/CD Commands**: All `make` and `pnpm` commands listed as required for GA in `docs/ga/GA_DEFINITION.md` are supported for developer and CI environments.

---

## 3. Best-Effort Scope

"Best-Effort" (or "Tolerated but Unsupported") means that the functionality is available but may have known limitations, dependencies on un-remediated risks, or is pending future hardening. We will provide guidance where possible, but we do not guarantee response times or immediate fixes.

### 3.1. Known Security Gaps

- **Dependency Vulnerabilities**: The GA baseline has a known gap in automated `pnpm audit` enforcement. While we commit to addressing critical CVEs, issues arising from non-critical vulnerabilities in third-party dependencies are best-effort until the remediation target is met (post-GA, Week 1).
- **Patching Cadence**: Automated patching is a planned high-priority item as per the `RISK_REGISTER.md`. Until then, support for issues related to unpatched system components is best-effort.

### 3.2. Non-Standard Environments

- **Custom Deployments**: Deployments using configurations, container images, or infrastructure topologies that deviate significantly from the official Helm chart and Docker Compose setup are considered best-effort. While the core application may function, we cannot support issues arising from the environment itself.
- **Third-Party Integrations**: Use of alternative observability stacks (e.g., Datadog instead of the provided Prometheus/Grafana stack) or different identity providers is tolerated, but configuration and troubleshooting support are best-effort.

### 3.3. Performance Tuning

- The `OPERATOR_HANDBOOK.md` provides guidance on scaling and performance knobs. Support for performance issues is best-effort and requires that the user provide detailed performance profiling data (e.g., query plans, load test results). We do not support general performance tuning without specific, reproducible evidence of a bottleneck in our software.

---

## 4. Unsupported Scope

"Unsupported" means that the described use case is explicitly outside the GA product's intended function. Issues in this category will be declined.

### 4.1. Direct Database or Internal API Access

- **Direct Database Modification**: Any manual modification of the PostgreSQL or Neo4j databases outside of application-driven schemas and migrations is unsupported and voids support for any resulting data corruption or system instability.
- **Internal Service APIs**: Direct communication with internal services (e.g., `server`, `prov-ledger`) is unsupported. All interaction must occur through the official, documented Gateway GraphQL API.

### 4.2. Code and Logic Modifications

- **Forking or Modifying Source Code**: Any modification to the application source code, including policies (`.rego` files), is unsupported. Customers wishing to extend the platform should use official extension points when they become available.
- **Unsupported Extensions**: Building or deploying custom plugins, agents, or extensions using undocumented interfaces is unsupported.

### 4.3. Deprecated or Experimental Features

- Any feature, configuration flag, or API endpoint not explicitly listed in the GA documentation is considered experimental or deprecated and is unsupported.
- The Tier 4 (Self-Modify) autonomy level for agents is disabled by default and is explicitly unsupported for GA.

### 4.4. Data Recovery

- We do not provide data recovery services. Customers are responsible for implementing and verifying the backup and restore procedures documented in the `OPERATOR_HANDBOOK.md`. Support for data loss resulting from failure to follow these procedures is not provided.
