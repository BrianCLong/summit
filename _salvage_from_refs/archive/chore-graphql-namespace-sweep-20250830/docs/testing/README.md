# IntelGraph Testing & CI/CD Strategy

This document outlines the comprehensive testing and Continuous Integration/Continuous Delivery (CI/CD) strategy for the IntelGraph monorepo.

## Testing Philosophy

Our testing philosophy is multi-layered, ensuring quality, reliability, and security across all components. We emphasize automated testing at various levels, from granular unit tests to end-to-end system validations.

## Test Categories

### 1. Unit & Contract Tests

*   **Purpose:** Verify individual functions, modules, and component contracts in isolation.
*   **Scope:** Connectors (input/output mapping, rate limiting), GraphQL schema (type definitions, resolvers), core business logic.
*   **Implementation:** Python `unittest` for Python modules, Jest/React Testing Library for React components.
*   **Specifics:**
    *   **Connectors:** Each connector includes dedicated unit tests (`connectors/__tests__/*.py`) to validate manifests, schema mappings, and golden I/O. These serve as contract tests for connector behavior.
    *   **GraphQL Schema:** Tests ensure schema consistency, correct type resolution, and adherence to API contracts.

### 2. Integration Tests

*   **Purpose:** Verify interactions between different modules and services.
*   **Scope:** Data ingestion pipelines, analytics modules interacting with graph core, AI Copilot components with graph services.
*   **Specifics:**
    *   **Ephemeral Neo4j:** For Cypher-based tests, ephemeral Neo4j instances are spun up to provide a realistic graph database environment without affecting persistent data.

### 3. End-to-End (E2E) Tests

*   **Purpose:** Validate critical user flows and system-wide functionality.
*   **Scope:** Full data lifecycle (e.g., `ingest` data → `resolve` entities → `runbook` execution → `report` generation).
*   **Specifics:**
    *   **UI Screenshot Diffs:** For the `apps/web` frontend, visual regression testing is performed using screenshot diffs to catch unintended UI changes.

### 4. Performance & Reliability Tests

*   **Purpose:** Assess system performance under load, identify bottlenecks, and validate resilience.
*   **Scope:** Graph query performance, ingestion throughput, system stability.
*   **Specifics:**
    *   **Load Testing (k6):** Used to simulate high user traffic and data ingestion rates, ensuring SLOs are met (e.g., p95 graph query < 1.5s, ingest 10k docs in < 5m).
    *   **Chaos Engineering:**
        *   **Pod/Broker Kill:** Automated chaos tests simulate failures like pod restarts or message broker outages to verify system resilience and automatic recovery.
        *   **Soak Testing:** Long-duration tests to detect memory leaks, resource exhaustion, or other degradation over time.
    *   **Security Tests:**
        *   **Authorization (Authz):** Tests verify ABAC/RBAC policies are correctly enforced.
        *   **Query Depth/Complexity:** Tests prevent excessive resource consumption from overly complex or deep queries.

### 5. Security & Compliance Tests

*   **Purpose:** Ensure adherence to security best practices, governance policies, and ethical guidelines.
*   **Scope:** Authentication (WebAuthn/FIDO2), authorization (OPA), audit logging, data minimization, license/TOS enforcement.
*   **Specifics:**
    *   Automated checks for policy violations, misuse detection, and data poisoning alerts.

## Continuous Integration / Continuous Delivery (CI/CD)

Our CI/CD pipeline is designed for rapid, reliable, and secure delivery of changes.

*   **Ephemeral Preview Environments:** Every Pull Request (PR) triggers the creation of a dedicated, ephemeral preview environment. This allows developers and reviewers to interact with the proposed changes in a live, isolated setting before merging.
*   **Automated Pipeline Stages:**
    1.  **Linting & Formatting:** Enforce coding standards (e.g., ESLint, Prettier, Ruff).
    2.  **Unit & Integration Tests:** All relevant tests are executed.
    3.  **Security Scans:** Static Application Security Testing (SAST) and dependency vulnerability scans.
    4.  **Build & Packaging:** Application artifacts (Docker images, frontend bundles) are built.
    5.  **Deployment to Preview Env:** Changes are deployed to the ephemeral environment.
    6.  **E2E & Performance Tests:** Critical E2E and performance tests run against the preview environment.
    7.  **SLO Probes:** Automated checks verify that Service Level Objectives (SLOs) are still met.
    8.  **License Gate:** Automated checks ensure all dependencies and code adhere to licensing requirements.

## Definition of Done (DoD)

For a feature or change to be considered "Done" and ready for merge, the following criteria must be met:

*   **Acceptance Pack Updated:** The relevant acceptance criteria and documentation are updated alongside the feature PR.
*   **SLO Probes Green:** All Service Level Objectives (SLOs) are met and verified by automated probes.
*   **Security Checks Pass:** All security scans and tests pass without critical findings.
*   **License Gate Verified:** All licensing requirements are met, and no license violations are detected.
*   All automated tests (unit, integration, E2E, performance, security) pass.
*   Code reviews are completed and approved.
