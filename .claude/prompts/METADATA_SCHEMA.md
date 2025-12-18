# Prompt Metadata Schema

> **Version**: 1.0.0
> **Last Updated**: 2025-11-29

## Overview

This document defines the canonical metadata structure for all prompts in the Claude Code prompt library. Consistent metadata enables discoverability, dependency tracking, and automated tooling.

## Schema Definition

### Complete Example

```yaml
---
id: DQ-001
name: Data Quality & Stewardship Command Center
slug: data-quality-dashboard
category: ops
subcategory: observability
priority: high
status: ready
version: 1.0.0
created: 2025-11-29
updated: 2025-11-29
author: Engineering Team

description: |
  Builds a comprehensive DQ dashboard service that computes completeness,
  consistency, timeliness, duplication, and provenance coverage per dataset/connector.

objective: |
  Deliver a production-ready data quality monitoring system with OpenTelemetry
  integration, policy-labeled alerts, and steward workflows.

tags:
  - data-quality
  - observability
  - governance
  - stewardship
  - opentelemetry

dependencies:
  services:
    - postgresql
    - opentelemetry-collector
    - prometheus
    - grafana
  packages:
    - "@intelgraph/db"
    - "@intelgraph/telemetry"
    - "@intelgraph/policy"
  external:
    - "@opentelemetry/api@^1.0.0"
    - "pg@^8.11.0"

prerequisites:
  - PostgreSQL 15+ running
  - OpenTelemetry collector configured
  - Policy engine (OPA) available
  - Prometheus/Grafana stack

deliverables:
  - type: service
    description: DQ dashboard service with REST/GraphQL API
  - type: metrics
    description: OpenTelemetry metrics export (completeness, consistency, etc.)
  - type: alerts
    description: Policy-labeled anomaly alert rules
  - type: workflows
    description: Steward workflows (owner→custodian→ombuds)
  - type: tests
    description: Golden IO test suite (unit + integration)
  - type: documentation
    description: README with SLO examples and runbooks
  - type: deployment
    description: Helm chart and Terraform module

acceptance_criteria:
  - description: DQ metrics computed for all datasets/connectors
    validation: Query Prometheus for dq_completeness, dq_consistency metrics
  - description: Alert rules configured and firing correctly
    validation: Trigger test anomaly, verify alert delivery
  - description: Steward workflows operational
    validation: Complete owner→custodian→ombuds workflow in test env
  - description: Test coverage > 80%
    validation: Run jest --coverage
  - description: Golden path maintained
    validation: make smoke passes
  - description: Documentation complete
    validation: README includes setup, usage, SLO examples

test_fixtures:
  - path: data/golden-path/dq-scenarios.json
    description: Canonical DQ test scenarios
  - path: tests/fixtures/dq-datasets.sql
    description: Test dataset samples

integration_points:
  - service: "@intelgraph/api"
    type: graphql
    description: Exposes DQ metrics via GraphQL federation
  - service: policy-engine
    type: opa
    description: Consumes policy labels for alert routing
  - service: audit-svc
    type: event-bus
    description: Publishes DQ events to audit stream

estimated_effort: 3-5 days
complexity: medium

related_prompts:
  - OPS-001  # Runbook Engine
  - GOV-001  # Policy Change Simulator
  - XAI-001  # XAI Integrity Overlays

blueprint_path: ../blueprints/templates/dq-dashboard

references:
  - title: "Data Quality Dimensions"
    url: "https://en.wikipedia.org/wiki/Data_quality"
  - title: "OpenTelemetry Metrics API"
    url: "https://opentelemetry.io/docs/specs/otel/metrics/api/"
  - title: "Summit Architecture"
    url: "/home/user/summit/docs/ARCHITECTURE.md"

notes: |
  - Ensure steward workflows respect RBAC/ABAC policies
  - Consider integration with existing provenance ledger
  - Alert thresholds should be configurable per dataset
  - Support both batch and streaming DQ computation
---
```

## Field Definitions

### Required Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `id` | string | Unique identifier (CATEGORY-NNN) | `DQ-001` |
| `name` | string | Human-readable prompt name | `Data Quality Dashboard` |
| `category` | enum | Primary category | `ops`, `governance`, `security` |
| `priority` | enum | Implementation priority | `high`, `medium`, `low` |
| `status` | enum | Prompt readiness | `ready`, `draft`, `deprecated` |
| `description` | string | Brief description (1-3 sentences) | See example |
| `objective` | string | What this prompt delivers | See example |
| `deliverables` | array | List of artifacts produced | See schema |
| `acceptance_criteria` | array | Validation requirements | See schema |

### Optional Fields

| Field | Type | Description | Default |
|-------|------|-------------|---------|
| `slug` | string | URL-friendly identifier | Derived from name |
| `subcategory` | string | Secondary categorization | `null` |
| `version` | semver | Prompt version | `1.0.0` |
| `created` | date | Creation date (ISO 8601) | Current date |
| `updated` | date | Last update date | `created` |
| `author` | string | Prompt author | `Engineering Team` |
| `tags` | array[string] | Searchable tags | `[]` |
| `dependencies` | object | Service/package deps | `{}` |
| `prerequisites` | array[string] | Setup requirements | `[]` |
| `test_fixtures` | array | Golden test data | `[]` |
| `integration_points` | array | How this integrates | `[]` |
| `estimated_effort` | string | Time estimate | `null` |
| `complexity` | enum | Implementation complexity | `medium` |
| `related_prompts` | array[string] | Related prompt IDs | `[]` |
| `blueprint_path` | string | Path to blueprint template | `null` |
| `references` | array | External links/docs | `[]` |
| `notes` | string | Additional context | `null` |

## Enumerated Values

### Category
- `ops` - Operations & Reliability
- `governance` - Compliance, Audit, Policy
- `analytics` - Graph, Geo, Temporal Analysis
- `security` - Trust, Integrity, Defensive
- `finops` - Cost Control, Resource Optimization
- `integration` - Federation, Interop, Migration

### Priority
- `high` - Critical capability, implement first
- `medium` - Important but not blocking
- `low` - Nice-to-have, future consideration

### Status
- `ready` - Fully specified, ready for implementation
- `draft` - Work in progress, may have gaps
- `deprecated` - Superseded by newer prompt

### Complexity
- `low` - 1-2 days, straightforward
- `medium` - 3-5 days, moderate integration
- `high` - 1-2 weeks, complex dependencies

## Deliverable Types

Standard deliverable types:

- `service` - Microservice or API
- `package` - Shared library/module
- `metrics` - OpenTelemetry metrics/instrumentation
- `alerts` - Alert rules and configurations
- `workflows` - Business process implementations
- `tests` - Test suites (unit, integration, e2e)
- `documentation` - README, API docs, runbooks
- `deployment` - Helm charts, Terraform, Docker
- `ci` - GitHub Actions workflows
- `fixtures` - Golden test data
- `ui` - Frontend components/pages
- `migration` - Database migration scripts

## Acceptance Criteria Structure

Each criterion should include:

```yaml
- description: What must be validated
  validation: How to verify (command, test, inspection)
  priority: optional | required  # defaults to required
```

Example:
```yaml
acceptance_criteria:
  - description: Service starts successfully
    validation: docker-compose up <service> && curl http://localhost:8080/health
  - description: GraphQL schema valid
    validation: pnpm graphql:schema:check
  - description: E2E tests pass
    validation: pnpm e2e
    priority: required
```

## Integration Point Structure

```yaml
integration_points:
  - service: Service name or @package/name
    type: graphql | rest | grpc | event-bus | database
    description: How they integrate
    required: true | false  # defaults to true
```

## Test Fixture Structure

```yaml
test_fixtures:
  - path: Relative path from repo root
    description: What this fixture contains
    type: json | sql | csv | cypher  # optional
```

## Dependency Structure

```yaml
dependencies:
  services:          # Docker services, Kubernetes deployments
    - service-name
  packages:          # Internal @intelgraph/* packages
    - "@intelgraph/package"
  external:          # npm/pip packages with versions
    - "package@^1.0.0"
  infrastructure:    # Cloud resources, clusters
    - "k8s-cluster"
```

## ID Convention

Format: `{CATEGORY_CODE}-{SEQUENCE}`

Category codes:
- `DQ` - Data Quality (ops)
- `OPS` - Operations
- `MIG` - Migration (governance)
- `GOV` - Governance
- `ANA` - Analytics
- `SEC` - Security
- `XAI` - Explainability (security)
- `FIN` - FinOps
- `INT` - Integration
- `EDGE` - Edge/Offline (ops)

Sequence: Zero-padded 3-digit number (001, 002, etc.)

Examples:
- `DQ-001` - Data Quality Dashboard
- `SEC-001` - Model Abuse Watchtower
- `GOV-002` - Retention & Purge Engine

## Usage in Markdown Files

Prompts are stored as markdown files with YAML frontmatter:

```markdown
---
id: DQ-001
name: Data Quality Dashboard
category: ops
[... rest of metadata ...]
---

# Data Quality & Stewardship Command Center

## Objective

[Description of what this prompt delivers]

## Prompt

[Full copy-paste-ready prompt text for Claude Code]

## Implementation Notes

[Additional context, gotchas, recommendations]

## Test Scenarios

[Key test cases to validate deliverables]
```

## Validation

### Required Field Validation
All `required` fields must be present and non-empty.

### ID Uniqueness
Each `id` must be unique across the entire prompt library.

### Dependency Resolution
All referenced prompts in `related_prompts` must exist.

### Blueprint Path
If specified, `blueprint_path` must point to an existing directory.

### Acceptance Criteria
At least one acceptance criterion is required.

## Automated Tooling

Future tooling will use this schema for:

- **Prompt Discovery**: Search/filter prompts by category, tags, priority
- **Dependency Graph**: Visualize prompt relationships
- **Implementation Tracking**: Mark prompts as implemented
- **Validation**: Ensure acceptance criteria met
- **Blueprint Generation**: Auto-scaffold from metadata

## Version History

- **1.0.0** (2025-11-29): Initial schema definition

## Related Documentation

- [Prompt Library README](./README.md)
- [Blueprint System](../blueprints/README.md)
- [CLAUDE.md](/home/user/summit/CLAUDE.md)
