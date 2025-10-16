### Context

Source: SPRINT_MAESTRO_COMPOSER_BACKEND.md - 0) North Star - Success at Sprint End
Excerpt/why: "Helm chart deploys green in stage"

### Problem / Goal

Create a Helm chart for deploying the Maestro Composer backend, including API and worker deployments, and configuration for dependencies like Postgres, Redis, Neo4j, and OPA endpoints, with secrets via sealed-secrets.

### Proposed Approach

Develop a comprehensive Helm chart that defines all necessary Kubernetes resources for the Maestro Composer backend, ensuring proper configuration and secret management.

### Tasks

- [ ] Define Helm chart structure and templates.
- [ ] Configure deployments for API and worker.
- [ ] Integrate configuration for Postgres, Redis, Neo4j, OPA endpoints.
- [ ] Implement sealed-secrets for sensitive data.

### Acceptance Criteria

- Given the Helm chart, when deployed to stage, then all components deploy successfully and are healthy.
- Metrics/SLO: Helm deployment completes within 5 minutes.
- Tests: Helm lint, Helm template, and E2E deployment tests.
- Observability: Deployment status visible in CI/CD pipeline.

### Safety & Policy

- Action class: DEPLOY
- OPA rule(s) evaluated: N/A

### Dependencies

Blocks: None
Depends on: None

### DOR / DOD

- DOR: Helm chart design approved.
- DOD: Helm chart implemented, tests pass, documentation updated.

### Links

- Docs: SPRINT_MAESTRO_COMPOSER_BACKEND.md
