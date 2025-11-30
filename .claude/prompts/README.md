# Claude Code Prompt Library

> **Purpose**: Production-ready prompts for extending the Summit/IntelGraph platform with high-impact capabilities aligned to intelligence analysis, governance, and operational excellence.

## Overview

This prompt library provides copy-paste-ready instructions for Claude Code to implement complete features, services, and infrastructure components. Each prompt is designed to deliver production-ready code with tests, documentation, and deployment artifacts.

## Philosophy

- **Deployable-First**: Every prompt delivers code that maintains the golden path workflow
- **Complete Artifacts**: Tests, docs, CI/CD, and deployment manifests included
- **Provenance-Native**: All features respect audit trails and chain-of-custody
- **Policy-Aware**: Authorization, compliance, and governance built-in
- **Observable**: OpenTelemetry metrics, structured logs, and health checks standard

## Directory Structure

```
.claude/prompts/
├── README.md              # This file
├── METADATA_SCHEMA.md     # Prompt metadata specification
├── ops/                   # Operations & reliability
├── governance/            # Compliance, audit, policy
├── analytics/             # Graph, geo, temporal analysis
├── security/              # Trust, integrity, defensive
├── finops/                # Cost control, resource optimization
└── integration/           # Federation, interop, migration
```

## Prompt Categories

### Operations & Reliability (`ops/`)
Focus: Runbooks, testing, observability, deployment scaffolding
- Data Quality & Stewardship Command Center
- Runbook Engine: Author → Test → Replay
- Edge/Offline Expedition Kit with CRDT Resync

### Governance (`governance/`)
Focus: Policy simulation, retention, compliance, audit
- Migration & Interop Verifier (Legacy→Canonical)
- Policy Change Simulator & License/TOS Engine
- Retention, Purge & Disclosure Proofs (Dual-Control)

### Analytics (`analytics/`)
Focus: Graph, geospatial, temporal intelligence
- (Additional prompts to be added)

### Security (`security/`)
Focus: Abuse detection, counter-deception, integrity
- Model Abuse & Prompt-Injection Watchtower
- Counter-Deception Lab (Defensive Only)
- XAI Integrity Overlays & Dissent Capture

### FinOps (`finops/`)
Focus: Cost control, resource optimization
- FinOps Cost-Guard & Unit-Economics Governor
- API Gateway with Persisted Queries & Cost Guards

### Integration (`integration/`)
Focus: Federation, interop, legacy migration
- Migration & Interop Verifier
- API Gateway with Persisted Queries & Cost Guards

## Using These Prompts

### 1. Select a Prompt
Browse the category directories or use the [Prompt Index](#prompt-index) below.

### 2. Review Prerequisites
Each prompt lists:
- Required services/dependencies
- Configuration needs
- Test fixtures
- Acceptance criteria

### 3. Execute with Claude Code
```bash
# Example workflow
claude code "Implement prompt: DQ-001-data-quality-dashboard"
# or copy-paste the full prompt text
```

### 4. Validate Deliverables
Every prompt produces:
- ✅ Working code with tests passing
- ✅ Documentation (README, API docs)
- ✅ CI/CD pipeline configuration
- ✅ Deployment manifests (Helm/Terraform)
- ✅ Golden test fixtures
- ✅ Acceptance pack

### 5. Integration Checklist
- [ ] Code follows CLAUDE.md conventions
- [ ] `make smoke` passes
- [ ] `pnpm test` passes (unit + integration)
- [ ] `pnpm lint` clean
- [ ] `pnpm typecheck` clean
- [ ] Security scanning clean (Gitleaks, Trivy)
- [ ] Documentation updated
- [ ] Deployment tested

## Prompt Index

| ID | Name | Category | Priority | Dependencies | Status |
|---|---|---|---|---|---|
| **DQ-001** | Data Quality & Stewardship Command Center | ops | High | PostgreSQL, OpenTelemetry | ✅ Ready |
| **MIG-001** | Migration & Interop Verifier | governance | High | Prisma, STIX/TAXII libs | ✅ Ready |
| **OPS-001** | Runbook Engine | ops | High | DAG runner, k6 | ✅ Ready |
| **EDGE-001** | Edge/Offline Expedition Kit | ops | Medium | CRDT lib, local DB | ✅ Ready |
| **SEC-001** | Model Abuse & Prompt-Injection Watchtower | security | High | OpenTelemetry, LLM libs | ✅ Ready |
| **SEC-002** | Counter-Deception Lab | security | Medium | NLP libs, honeytoken store | ✅ Ready |
| **GOV-001** | Policy Change Simulator | governance | High | OPA, historical query logs | ✅ Ready |
| **INT-001** | API Gateway with Persisted Queries | integration | High | GraphQL, Redis | ✅ Ready |
| **XAI-001** | XAI Integrity Overlays & Dissent Capture | security | High | ML libs, provenance ledger | ✅ Ready |
| **FIN-001** | FinOps Cost-Guard | finops | Medium | Prometheus, cost APIs | ✅ Ready |
| **GOV-002** | Retention, Purge & Disclosure Proofs | governance | High | Hash trees, audit ledger | ✅ Ready |

## Prompt Metadata Schema

Each prompt includes structured metadata:

```yaml
id: DQ-001
name: Data Quality & Stewardship Command Center
category: ops
priority: high | medium | low
tags: [data-quality, observability, governance]
dependencies:
  services: [postgresql, opentelemetry-collector]
  packages: [@intelgraph/db, @intelgraph/telemetry]
deliverables:
  - Service implementation
  - OpenTelemetry metrics export
  - Policy-labeled anomaly alerts
  - Steward workflows
  - Golden test suite
  - README with SLO examples
acceptance_criteria:
  - DQ metrics computed for all datasets
  - Alert rules configured
  - Steward workflows operational
  - Tests passing (coverage > 80%)
test_fixtures:
  - data/golden-path/dq-scenarios.json
```

See [METADATA_SCHEMA.md](./METADATA_SCHEMA.md) for complete specification.

## Blueprint Integration

Each prompt is paired with a monorepo blueprint in `.claude/blueprints/` that provides:

- **Service Template**: Boilerplate structure following Summit conventions
- **CI/CD Pipeline**: GitHub Actions workflow
- **Helm Chart**: Kubernetes deployment manifests
- **Terraform Module**: Infrastructure as code
- **Golden Test Fixtures**: Canonical test data
- **Acceptance Pack**: Validation checklist and scripts

See [../blueprints/README.md](../blueprints/README.md) for details.

## Contributing New Prompts

### Template Structure

```markdown
# [Prompt Name]

**ID**: CAT-NNN
**Category**: [category]
**Priority**: [high|medium|low]

## Objective
[What this prompt delivers]

## Deliverables
- [ ] Item 1
- [ ] Item 2

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2

## Prompt

[Full copy-paste prompt text]

## Integration Notes
[How this integrates with existing services]

## Test Scenarios
[Key test cases to validate]
```

### Contribution Checklist
- [ ] Follows metadata schema
- [ ] Includes complete prompt text
- [ ] Lists clear acceptance criteria
- [ ] Provides test scenarios
- [ ] Aligns with CLAUDE.md conventions
- [ ] Includes integration notes
- [ ] Tagged appropriately

## Maintenance

- **Owner**: Engineering Team
- **Review Cadence**: Quarterly or as needed
- **Update Triggers**:
  - New platform capabilities
  - Changed conventions
  - Security/compliance updates
  - Operational learnings

## Version History

- **2025-11-29**: Initial prompt library creation (11 core prompts)

## Related Documentation

- [CLAUDE.md](/home/user/summit/CLAUDE.md) - Main AI assistant guide
- [Blueprints README](../blueprints/README.md) - Blueprint system documentation
- [METADATA_SCHEMA.md](./METADATA_SCHEMA.md) - Prompt metadata specification

---

**Remember**: Every prompt should deliver production-ready code that maintains the golden path! 🟢
