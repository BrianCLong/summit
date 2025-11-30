# Claude Code Prompt Library for IntelGraph

> **Purpose**: A curated collection of production-ready prompts for building IntelGraph's intelligence analysis platform with Claude Code.

## Overview

This directory contains **11 stand-alone, self-contained prompts** designed to drive IntelGraph's highest priorities:
- **SLO compliance** (performance targets, error budgets)
- **Provenance & audit** (immutable ledger, signed exports)
- **Policy enforcement** (ABAC, purpose-based access, retention)
- **Security** (threat modeling, privacy-by-design)
- **Cost optimization** (metering, budgets, guardrails)

Each prompt is:
- ✅ **Executable** - Drop into Claude Code as-is
- ✅ **Complete** - Includes context, task, guardrails, and acceptance criteria
- ✅ **Evidence-backed** - Produces tests, docs, and artifacts
- ✅ **Production-focused** - Results in shippable code with security gates

---

## Quick Start

### Using Prompts Directly

```bash
# Option 1: Copy-paste prompt content into Claude Code
cat docs/claude-code-prompts/01-monorepo-bootstrap.md

# Option 2: Reference by path
claude "Execute the prompt in docs/claude-code-prompts/02-graphql-gateway.md"
```

### Using Slash Commands

If you've set up slash commands (see [Setup](#setup)), you can invoke prompts directly:

```bash
/bootstrap-monorepo
/graphql-gateway
/neo4j-schema
# ... etc
```

---

## Prompt Catalog

### 🏗️ Infrastructure & Platform

#### [01. Monorepo + Dev Env Bootstrap](./01-monorepo-bootstrap.md)
**Role**: Senior Platform Engineer
**Focus**: Scaffold pnpm monorepo with packages, Dockerfiles, docker-compose, and Helm charts
**Deliverables**: Workspace structure, dev environment, deployment configs
**Key SLOs**: Developer onboarding < 30 min; `make dev` runs end-to-end

**Use when**:
- Starting a new project or major restructure
- Setting up local development environment
- Configuring Kubernetes deployments

---

#### [02. GraphQL Gateway (Apollo) + Contracts](./02-graphql-gateway.md)
**Role**: Graph/API Engineer
**Focus**: Apollo Server with canonical schema, persisted queries, ABAC hooks
**Deliverables**: GraphQL API, resolvers, data sources, caching, pagination
**Key SLOs**: Read p95 ≤ 350ms, p99 ≤ 900ms; Write p95 ≤ 700ms, p99 ≤ 1.5s

**Use when**:
- Implementing API gateway
- Defining GraphQL schema for entities/relationships
- Adding authentication and authorization hooks

---

#### [03. Neo4j Data Model + Cypher Patterns](./03-neo4j-data-model.md)
**Role**: Graph Data Engineer
**Focus**: Graph schema, indexes, query templates for 1-3 hop traversals
**Deliverables**: Schema, migrations, Cypher library, profiled queries
**Key SLOs**: 1-hop p95 ≤ 300ms; 2-3 hop p95 ≤ 1,200ms

**Use when**:
- Designing graph data model
- Optimizing graph query performance
- Implementing entity resolution patterns

---

### 📥 Data Ingestion & Provenance

#### [04. Ingest Connectors (S3/CSV + HTTP)](./04-ingest-connectors.md)
**Role**: Ingest Engineer
**Focus**: S3/CSV and HTTP connectors with provenance attachment
**Deliverables**: Connector SDKs, dedupe, retry/backoff, idempotency
**Key SLOs**: S3/CSV ≥ 50 MB/s; HTTP ≥ 1k events/s; pre-storage p95 ≤ 100ms

**Use when**:
- Building data ingestion pipelines
- Implementing connector framework
- Attaching provenance metadata to all ingests

---

#### [05. Provenance Ledger + Export Signing](./05-provenance-ledger.md)
**Role**: Reliability/Integrity Engineer
**Focus**: Append-only ledger with hash-chaining and signed export bundles
**Deliverables**: Ledger library, CLI (export/verify), tamper detection
**Key SLOs**: No PII in manifests; signature verification; offline resync

**Use when**:
- Implementing immutable audit trail
- Creating signed export bundles for air-gapped environments
- Ensuring chain-of-custody for evidence

---

### 🔒 Security & Privacy

#### [06. OPA/Rego ABAC Policies + Purpose/Retention](./06-opa-abac-policies.md)
**Role**: Policy Engineer
**Focus**: Rego policies for ABAC, retention tiers, PII redaction
**Deliverables**: Tenant isolation, purpose-based access, k-anonymity helpers
**Key SLOs**: Deny-by-default; policy eval p95 < 10ms

**Use when**:
- Implementing fine-grained access control
- Enforcing retention policies (ephemeral, short, standard, long, legal-hold)
- Privacy-by-default with PII redaction

---

#### [11. Threat Model (STRIDE) + Privacy Design Pack](./11-threat-model-privacy.md)
**Role**: Security Architect
**Focus**: STRIDE threat model, DFDs, abuse cases, field-level encryption
**Deliverables**: Threat model, controls matrix, privacy checklist, runbooks
**Key SLOs**: All threats mitigated; privacy checklist validated

**Use when**:
- Conducting security design reviews
- Documenting threat landscape and mitigations
- Implementing privacy-by-design principles

---

### 📊 Observability & Operations

#### [07. Observability (OpenTelemetry → Prometheus/Grafana)](./07-observability-opentelemetry.md)
**Role**: SRE/Observability Engineer
**Focus**: OTel instrumentation, RED/USE metrics, SLO dashboards, burn-rate alerts
**Deliverables**: Instrumentation, Prometheus scrapes, Grafana dashboards, alert rules
**Key SLOs**: Traces end-to-end; alert at 80% error budget burn

**Use when**:
- Instrumenting services for observability
- Creating SLO dashboards and alerts
- Debugging production issues with distributed tracing

---

#### [08. CI/CD (GitHub Actions) + Security Gates](./08-cicd-security-gates.md)
**Role**: DevEx/SecOps Engineer
**Focus**: Workflows for lint/test/SBOM/scan, canary deploy, auto-rollback
**Deliverables**: GitHub Actions workflows, security gates, provenance artifacts
**Key SLOs**: PRs blocked on failing gates; releases include SBOM + attestations

**Use when**:
- Setting up CI/CD pipelines
- Implementing security scanning (SAST, dependency scanning)
- Automating deployments with canary and rollback

---

#### [09. Testing Strategy (Unit/Contract/E2E/Load/Chaos)](./09-testing-strategy.md)
**Role**: Principal Test Engineer
**Focus**: Comprehensive testing (Jest, Pact, Playwright, k6, Chaos Mesh)
**Deliverables**: Test suites, fixtures, coverage reports, SLO validation
**Key SLOs**: Coverage ≥ 80%; k6 thresholds meet SLOs; chaos degrades gracefully

**Use when**:
- Establishing testing strategy and infrastructure
- Writing unit, integration, E2E, and load tests
- Validating SLOs with load testing

---

### 💰 Cost & Efficiency

#### [10. Cost Guardrails + Usage Metering](./10-cost-guardrails.md)
**Role**: FinOps Engineer
**Focus**: Per-unit metering, cost model, budgets, daily reports, anomaly detection
**Deliverables**: Metering middleware, Prometheus metrics, Grafana cost dashboard
**Key SLOs**: ≤ $0.10/1k events, ≤ $2/1M GraphQL calls; alert at 80% budget

**Use when**:
- Implementing usage-based pricing
- Tracking and optimizing cloud costs
- Setting budget alerts and anomaly detection

---

## Prompt Selection Guide

### By Project Phase

| Phase | Recommended Prompts |
|-------|-------------------|
| **Inception** | 01 (Monorepo), 11 (Threat Model) |
| **Foundation** | 02 (GraphQL), 03 (Neo4j), 06 (OPA Policies) |
| **Data Pipeline** | 04 (Ingest), 05 (Provenance) |
| **Production Readiness** | 07 (Observability), 08 (CI/CD), 09 (Testing) |
| **Operations** | 10 (Cost), 07 (Observability) |

### By Role

| Role | Primary Prompts |
|------|----------------|
| **Platform Engineer** | 01, 08 |
| **Backend Engineer** | 02, 03, 04 |
| **Security Engineer** | 06, 11 |
| **SRE** | 07, 09 |
| **FinOps Engineer** | 10 |
| **Data Engineer** | 03, 04, 05 |

### By Priority

| Priority | Prompts | Rationale |
|----------|---------|-----------|
| **P0 - Critical** | 02, 03, 06, 11 | Core platform + security |
| **P1 - High** | 01, 04, 07, 08 | Infrastructure + observability |
| **P2 - Medium** | 05, 09, 10 | Audit + quality + cost |

---

## Setup

### Creating Slash Commands

To invoke prompts as slash commands (e.g., `/bootstrap-monorepo`):

1. **Create `.claude/commands/` directory**:
   ```bash
   mkdir -p .claude/commands
   ```

2. **Create command files** (example for prompt 01):
   ```bash
   # .claude/commands/bootstrap-monorepo.md
   Execute the prompt in docs/claude-code-prompts/01-monorepo-bootstrap.md
   ```

3. **Repeat for other prompts**:
   ```bash
   # .claude/commands/graphql-gateway.md
   Execute the prompt in docs/claude-code-prompts/02-graphql-gateway.md
   ```

4. **Test**:
   ```bash
   /bootstrap-monorepo
   ```

---

## Contribution Guidelines

### Adding New Prompts

When adding new prompts to this library:

1. **Follow the template structure**:
   - Role
   - Context
   - Task
   - Guardrails (SLOs, security, compliance)
   - Deliverables (checklist format)
   - Acceptance Criteria
   - Examples (code, config, queries)
   - Related Files
   - Usage with Claude Code
   - Notes

2. **Ensure prompts are self-contained**:
   - No dependencies on other prompts
   - Complete context provided
   - Clear success criteria

3. **Include evidence**:
   - Tests (unit, integration, E2E)
   - Docs (architecture, runbooks)
   - Artifacts (SBOM, scan results)

4. **Update this README**:
   - Add to catalog
   - Update selection guide tables
   - Add slash command (if applicable)

### Updating Existing Prompts

- Keep prompts evergreen (not version-specific)
- Update SLO targets as platform evolves
- Add new examples as patterns emerge
- Link to actual implementations when available

---

## Best Practices

### Using Prompts Effectively

1. **Read the entire prompt** before executing
2. **Customize guardrails** to your specific needs (SLO targets, budgets, etc.)
3. **Review deliverables** checklist to understand scope
4. **Validate acceptance criteria** - don't skip testing
5. **Iterate** - prompts are starting points, refine based on results

### Combining Prompts

Some workflows benefit from multiple prompts:

**Example: New Service Development**
```bash
# 1. Set up infrastructure
/bootstrap-monorepo

# 2. Define GraphQL API
/graphql-gateway

# 3. Design data model
/neo4j-schema

# 4. Add observability
/observability

# 5. Set up CI/CD
/cicd-pipeline

# 6. Implement testing
/testing-strategy
```

### Maintaining Context

When using multiple prompts in a session:
- Reference previous outputs explicitly
- Maintain consistent naming conventions
- Link deliverables (e.g., tests → policies → threat model)

---

## Related Documentation

- [CLAUDE.md](../../CLAUDE.md) - Project conventions and standards
- [ARCHITECTURE.md](../ARCHITECTURE.md) - System architecture
- [REPOSITORY_STRUCTURE.md](../REPOSITORY_STRUCTURE.md) - Codebase organization
- [OBSERVABILITY.md](../OBSERVABILITY.md) - Observability guide
- [TEST_STRATEGY.md](../TEST_STRATEGY.md) - Testing guidelines
- [CICD_BEST_PRACTICES.md](../CICD_BEST_PRACTICES.md) - CI/CD guidelines

---

## Support & Feedback

### Getting Help

- **Documentation**: Check [CLAUDE.md](../../CLAUDE.md) for project conventions
- **Issues**: Report problems or suggest improvements via GitHub Issues
- **Discussions**: Share experiences and ask questions in GitHub Discussions

### Improving Prompts

Found a better way to phrase a prompt? Have additional examples? Submit a PR!

---

## Changelog

### 2024-11-28
- **Initial Release**: 11 core prompts covering infrastructure, security, observability, and cost
- Categories: Infrastructure (3), Data Ingestion (2), Security (2), Observability (3), Cost (1)

---

## License

This prompt library is part of the IntelGraph project and follows the same license as the main repository.

---

**Remember**: These prompts are tools, not prescriptions. Adapt them to your specific context, constraints, and priorities. The best prompt is one that helps you ship secure, reliable, and cost-effective software. 🚀
