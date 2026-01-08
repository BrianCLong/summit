# Repository Directory Layout & Artifacts

This document defines the canonical directory structure for the CompanyOS repository.

## 1. Directory Structure

### `/platform`

_Core engineering infrastructure and services._

- `platform/maestro/`: Orchestration engine source code.
- `platform/intelgraph/`: Knowledge graph services (Neo4j/Postgres).
- `platform/securiteyes/`: Defensive security capabilities.
- `platform/aurelius/`: IP mining and foresight models.
- `platform/summitsight/`: Analytics and BI backend.
- `platform/common/`: Shared libraries and utilities.

### `/companyos`

_Tenant-facing and operational artifacts._

- `companyos/blueprint/`: Org design and charters.
- `companyos/agents/`: Agent definitions and prompts.
- `companyos/workflows/`: Maestro Task Graph templates (YAML).
- `companyos/governance/`: Governance integration docs.
- `companyos/backlog/`: Project management tracking.
- `companyos/toolchain/`: Developer tooling specs.
- `companyos/examples/`: Sample tenant configs and data.

### `/governance`

_The "Constitution" of the enterprise._

- `governance/charters/`: Human-readable mission documents.
- `governance/policy/`: OPA/Rego policy bundles (source of truth).
- `governance/audit/`: Configuration for the immutable audit log.
- `governance/ethics-board/`: Meeting minutes and decisions (redacted/public).

### `/apps`

_Deployable applications._

- `apps/web/`: The Ops Console and Tenant UI (React).
- `apps/docs/`: The "Docs as Code" site (Docusaurus/VitePress).

### `/infra`

_Infrastructure as Code._

- `infra/terraform/`: AWS/Cloud resource definitions.
- `infra/helm/`: Kubernetes charts for all services.
- `infra/ci/`: Shared CI/CD pipeline definitions.
- `infra/monitoring/`: Prometheus/Grafana configurations.

### `/playbooks`

_Executable runbooks for operators and agents._

- `playbooks/incident/`: Response guides for Securiteyes.
- `playbooks/onboarding/`: Manual steps for tenant setup (if automation fails).
- `playbooks/maintenance/`: Database migration and cleanup guides.

### `/tools`

_Developer experience and utility scripts._

- `tools/cli/`: The `maestro-cli` and `companyos-cli` sources.
- `tools/scripts/`: One-off maintenance scripts.

## 2. Recommended Initial Files

### `platform/maestro/`

- `src/engine.ts`: Core task graph executor.
- `src/scheduler.ts`: Resource allocator.
- `src/api.ts`: Control plane API.

### `governance/policy/`

- `main.rego`: Entry point for all policy decisions.
- `tenancy.rego`: Tenant isolation rules.
- `risk.rego`: Feature risk scoring logic.
- `mission.rego`: Anti-authoritarian guardrails.

### `apps/web/`

- `src/pages/Console.tsx`: Main dashboard view.
- `src/components/TenantSwitcher.tsx`: Context switching component.
- `src/hooks/useGovernance.ts`: Hook to check permissions against OPA.

### `infra/helm/companyos/`

- `values.yaml`: Default configuration.
- `templates/maestro-deployment.yaml`: K8s deployment for Maestro.
- `templates/intelgraph-statefulset.yaml`: K8s statefulset for Neo4j.
