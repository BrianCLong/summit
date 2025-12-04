# Claude Code Prompts - Quick Reference

> **TL;DR**: Copy-paste any prompt or use slash commands like `/graphql-gateway` to execute production-ready development tasks.

## One-Liner Prompt Descriptions

| # | Prompt | Command | One-Line Description |
|---|--------|---------|---------------------|
| 01 | [Monorepo Bootstrap](./01-monorepo-bootstrap.md) | `/bootstrap-monorepo` | Scaffold pnpm workspace + Docker + K8s + dev env |
| 02 | [GraphQL Gateway](./02-graphql-gateway.md) | `/graphql-gateway` | Apollo Server + schema + ABAC + caching (p95 < 350ms reads) |
| 03 | [Neo4j Data Model](./03-neo4j-data-model.md) | `/neo4j-schema` | Graph schema + indexes + Cypher templates (1-3 hop queries) |
| 04 | [Ingest Connectors](./04-ingest-connectors.md) | `/ingest-connectors` | S3/CSV + HTTP connectors with provenance (50 MB/s, 1k events/s) |
| 05 | [Provenance Ledger](./05-provenance-ledger.md) | `/provenance-ledger` | Append-only ledger + signed exports + tamper detection |
| 06 | [OPA ABAC Policies](./06-opa-abac-policies.md) | `/opa-policies` | Rego policies for tenant/purpose/retention + PII redaction |
| 07 | [Observability](./07-observability-opentelemetry.md) | `/observability` | OTel + Prometheus + Grafana + SLO dashboards + alerts |
| 08 | [CI/CD Pipeline](./08-cicd-security-gates.md) | `/cicd-pipeline` | GitHub Actions + SBOM + security scanning + canary deploy |
| 09 | [Testing Strategy](./09-testing-strategy.md) | `/testing-strategy` | Jest + Pact + Playwright + k6 + chaos testing |
| 10 | [Cost Guardrails](./10-cost-guardrails.md) | `/cost-guardrails` | Usage metering + budgets + alerts + cost dashboard |
| 11 | [Threat Model](./11-threat-model-privacy.md) | `/threat-model` | STRIDE analysis + DFDs + privacy design + key management |

---

## Common Workflows

### 🚀 New Service End-to-End

```bash
# 1. Bootstrap infrastructure
/bootstrap-monorepo

# 2. Define API contract
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

**Time**: ~4-6 hours with Claude Code
**Result**: Production-ready service with tests, monitoring, and deployment

---

### 🔒 Security Hardening Sprint

```bash
# 1. Define access policies
/opa-policies

# 2. Conduct threat modeling
/threat-model

# 3. Add provenance tracking
/provenance-ledger

# 4. Enable security scanning
/cicd-pipeline  # Includes SBOM, Trivy, Semgrep
```

**Time**: ~2-3 hours
**Result**: ABAC enforcement, threat model, audit trail, SBOM

---

### 📊 Production Readiness Checklist

```bash
# Must-haves before going live:
/observability      # SLO dashboards + alerts
/testing-strategy   # E2E + load tests
/cicd-pipeline      # Security gates + deployment automation
/cost-guardrails    # Budget alerts + usage tracking
/threat-model       # Security review + controls matrix
```

---

### 💰 Cost Optimization Sprint

```bash
# 1. Implement metering
/cost-guardrails

# 2. Add observability for resource usage
/observability

# 3. Load test to validate efficiency
/testing-strategy  # Focus on k6 load tests
```

**Result**: Real-time cost tracking, budget alerts, optimization targets

---

## SLO Quick Reference

| Service/Operation | p95 Target | p99 Target | Throughput Target |
|-------------------|-----------|-----------|-------------------|
| **GraphQL Reads** | ≤ 350ms | ≤ 900ms | - |
| **GraphQL Writes** | ≤ 700ms | ≤ 1.5s | - |
| **1-hop Graph Query** | ≤ 300ms | - | - |
| **2-3 hop Graph Query** | ≤ 1,200ms | - | - |
| **S3/CSV Ingest** | - | - | ≥ 50 MB/s per worker |
| **HTTP Ingest** | - | - | ≥ 1,000 events/s per pod |
| **Pre-storage Processing** | ≤ 100ms | - | - |
| **Policy Evaluation** | ≤ 10ms | - | - |

---

## Cost Targets

| Resource | Unit Cost Target |
|----------|-----------------|
| **Ingest Events** | ≤ $0.10 per 1,000 events |
| **GraphQL Calls** | ≤ $2.00 per 1M calls |
| **Storage** | ≤ $0.05 per GB-month |
| **Copilot Query** | ≤ $0.10 per query |

---

## Prompt Selection by Pain Point

### "Our API is too slow"
→ **Prompts**: 02 (GraphQL), 03 (Neo4j), 07 (Observability), 09 (Testing)
- Profile queries with OTel
- Optimize Neo4j indexes
- Load test with k6 to validate SLOs

### "We have no visibility into production"
→ **Prompts**: 07 (Observability), 10 (Cost)
- Add metrics, traces, logs
- Create SLO dashboards
- Set up alerts

### "Security audit is coming"
→ **Prompts**: 06 (OPA), 11 (Threat Model), 08 (CI/CD)
- Document threat model and mitigations
- Implement ABAC policies
- Generate SBOMs and attestations

### "Data ingestion is unreliable"
→ **Prompts**: 04 (Ingest), 05 (Provenance), 09 (Testing)
- Add retry/backoff logic
- Track provenance for debugging
- Load test ingestion pipeline

### "Costs are out of control"
→ **Prompts**: 10 (Cost), 07 (Observability)
- Implement usage metering
- Set budget alerts
- Identify cost drivers in dashboards

### "We need to prove data integrity"
→ **Prompts**: 05 (Provenance), 11 (Threat Model)
- Implement hash-chained ledger
- Create signed export bundles
- Document chain-of-custody

---

## Testing Coverage by Prompt

| Prompt | Unit Tests | Integration Tests | E2E Tests | Load Tests | Chaos Tests |
|--------|-----------|------------------|-----------|-----------|-------------|
| 01 - Monorepo | ✅ | - | - | - | - |
| 02 - GraphQL | ✅ | ✅ | - | ✅ | - |
| 03 - Neo4j | ✅ | ✅ | - | ✅ | - |
| 04 - Ingest | ✅ | ✅ | - | ✅ | - |
| 05 - Provenance | ✅ | ✅ | - | - | - |
| 06 - OPA | ✅ | - | - | - | - |
| 07 - Observability | - | ✅ | - | - | - |
| 08 - CI/CD | - | - | ✅ | - | - |
| 09 - Testing | ✅ | ✅ | ✅ | ✅ | ✅ |
| 10 - Cost | ✅ | ✅ | - | ✅ | - |
| 11 - Threat Model | - | - | - | - | - |

---

## Deliverables Summary

### Code Artifacts
- TypeScript/JavaScript libraries and services
- GraphQL schemas and resolvers
- Cypher query templates
- Rego policy files
- Docker and Kubernetes configs

### Testing Artifacts
- Jest unit tests
- Integration tests with TestContainers
- Playwright E2E tests
- k6 load test scripts
- Chaos experiment manifests

### Observability Artifacts
- OpenTelemetry instrumentation
- Prometheus scrape configs and alert rules
- Grafana dashboards (JSON)
- Runbooks linked from dashboards

### Security Artifacts
- SBOM (CycloneDX format)
- Vulnerability scan results (Trivy SARIF)
- Threat model documentation
- Controls matrix
- SLSA provenance attestations

### Documentation Artifacts
- Architecture diagrams (Mermaid)
- API documentation
- Runbooks
- Configuration guides
- Testing guides

---

## Tips for Success

### ✅ Do's
- Read entire prompt before executing
- Customize SLO targets to your needs
- Validate acceptance criteria with tests
- Link related prompts (e.g., tests → policies → threat model)
- Iterate on generated code based on results

### ❌ Don'ts
- Don't skip testing (acceptance criteria exist for a reason)
- Don't ignore guardrails (they prevent production issues)
- Don't execute prompts blindly (understand context first)
- Don't forget to update docs after implementations
- Don't optimize prematurely (ship working code first)

---

## Emergency Procedures

### Production Incident
1. Check dashboards: `/observability` artifacts
2. Review runbooks in `RUNBOOKS/` directory
3. Check provenance ledger for recent changes
4. Roll back using CI/CD canary/rollback procedures

### Security Breach
1. Follow incident response in `/threat-model` deliverables
2. Check audit logs in provenance ledger
3. Review access policies from `/opa-policies`
4. Execute warrant procedures if needed

### Budget Exceeded
1. Check cost dashboard from `/cost-guardrails`
2. Identify top cost drivers
3. Review usage anomalies
4. Apply throttling or quota limits

---

## Integration Points

### With Existing Docs
- [CLAUDE.md](../../CLAUDE.md) - Project conventions
- [ARCHITECTURE.md](../ARCHITECTURE.md) - System design
- [TEST_STRATEGY.md](../TEST_STRATEGY.md) - Testing guidelines
- [OBSERVABILITY.md](../OBSERVABILITY.md) - Monitoring guide

### With CI/CD
All prompts generate artifacts compatible with:
- GitHub Actions workflows
- Docker/Kubernetes deployments
- pnpm workspace builds
- Turbo caching

### With Monitoring
- Prometheus metrics exposed on port 9464
- OpenTelemetry traces to OTLP endpoint
- Grafana dashboards in JSON format
- Alert rules in Prometheus format

---

## Maintenance

### Updating SLO Targets
Edit the "Guardrails" section of each prompt to reflect current performance requirements.

### Adding New Prompts
Follow the template structure in existing prompts. See [README.md](./README.md#adding-new-prompts) for guidelines.

### Versioning
Prompts are designed to be evergreen. When platform architecture changes significantly, create versioned variants (e.g., `02-graphql-gateway-v2.md`).

---

**Questions?** Check the [main README](./README.md) or open a GitHub Discussion.
