# IntelGraph Roadmap Prompts - Copy-Paste Ready for Claude

**Version**: 1.0
**Created**: 2025-11-29
**Target**: Q3-Q4 2025 (Core GA + Prov-Ledger Beta + Predictive Alpha + Ops)

---

## 🎯 Overview

This directory contains **12 production-ready Claude prompts** aligned with IntelGraph's near-term roadmap. Each prompt has been validated against the actual codebase structure and includes:

- ✅ Pre-flight checklist (verify existing code)
- ✅ Corrected paths (apps/web/src/components/, server/src/, services/)
- ✅ Existing code awareness (extend, don't replace)
- ✅ Technical constraints (Neo4j 5.24.0, APOC, GDS, OIDC/SCIM)
- ✅ Acceptance criteria (testable success metrics)
- ✅ Sample code, schemas, and tests

---

## 📋 Prompt Index

### **Core GA (Q3 2025)**

| # | Prompt | Target | Key Deliverables | Depends On |
|---|--------|--------|------------------|------------|
| **01** | [NL → Cypher](./01-nl-to-cypher-core-ga.md) | Core GA | Cost estimator, sandbox executor, UI panel | Neo4j, APOC, existing NLQ code |
| **03** | [ABAC/OPA + Audit](./03-abac-opa-audit.md) | Core GA | OPA policies, authority binding, audit search | SSO/SCIM (existing), PostgreSQL |
| **08** | [Ingest Wizard + PII](./08-ingest-wizard-pii.md) | Core GA | 10 connectors, AI mapper, PII classifier, DPIA | Ingest service (existing) |
| **09** | [Entity Resolution v1](./09-entity-resolution-v1.md) | Core GA | ER service, explainable merges, human-in-the-loop | Neo4j, ML features |
| **11** | [Runbook Runner](./11-runbook-runner-provers.md) | Core GA | DAG runner, attestations, *.pcq manifests, provers | Agent runtime, OPA |
| **12** | [Security Hardening](./12-security-hardening.md) | Core GA | WebAuthn, tripwires, STRIDE, red team | SSO (existing), audit |

### **Beta Features (Q4 2025)**

| # | Prompt | Target | Key Deliverables | Depends On |
|---|--------|--------|------------------|------------|
| **02** | [Prov-Ledger Beta](./02-prov-ledger-beta.md) | Beta | Evidence registry, claim graphs, export manifests | Neo4j, Redis Streams |
| **10** | [Disclosure Packager](./10-disclosure-packager.md) | Beta | Selective disclosure, signed bundles, revocation | Prov-Ledger (Prompt #2) |

### **Alpha Features (Q4 2025)**

| # | Prompt | Target | Key Deliverables | Depends On |
|---|--------|--------|------------------|------------|
| **07** | [Predictive Suite](./07-predictive-suite-alpha.md) | Alpha | Forecast API, counterfactual, XAI | Graph analytics, ML |

### **Ops & Edge (Q4 2025)**

| # | Prompt | Target | Key Deliverables | Depends On |
|---|--------|--------|------------------|------------|
| **04** | [Cost Guard](./04-cost-guard.md) | Ops | Budget manager, slow-query killer, archival tiering | Neo4j, S3, Prometheus |
| **05** | [SLO Dashboards](./05-slo-dashboards.md) | Ops | OTEL tracing, Prometheus metrics, Grafana dashboards | Observability stack |
| **06** | [Offline Expedition Kit](./06-offline-expedition-kit.md) | Edge | Electron app, CRDT sync, signature chain | Core GA, Yjs/Automerge |

---

## 🚀 Quick Start

### 1. Pick a Prompt

Choose based on priority:
- **Start with #01** (NL → Cypher) if you need Core GA graph querying
- **Start with #03** (ABAC/OPA) if security is blocking GA
- **Start with #08** (Ingest Wizard) if data ingestion is top priority

### 2. Run Pre-Flight Checks

Each prompt has a checklist. Example for Prompt #01:

```bash
# ✅ Check existing NLQ code
ls -la server/src/ai/nl-graph-query/nl-graph-query.service.ts

# ✅ Verify Neo4j stack
docker exec summit-neo4j cypher-shell -u neo4j -p ${NEO4J_PASSWORD} "RETURN 1"

# ✅ Check APOC/GDS plugins
docker exec summit-neo4j cypher-shell -u neo4j -p ${NEO4J_PASSWORD} "CALL apoc.help('meta')"
```

### 3. Copy Prompt to Claude

Open the prompt file (e.g., `01-nl-to-cypher-core-ga.md`), copy the section under `## Claude Prompt`, and paste into Claude.

### 4. Review Outputs

Claude will provide:
- (a) File tree diff
- (b) TypeScript/Python code with JSDoc/docstrings
- (c) Jest/pytest tests
- (d) GraphQL schema additions (if needed)
- (e) Sample API requests/responses
- (f) Migration guide (if extending existing code)

### 5. Run Tests & Validate

```bash
# Example for Prompt #01
pnpm test -- nlq.cost-estimator.test.ts
pnpm test -- nlq.sandbox.test.ts

# Run acceptance criteria
make smoke
```

---

## 🔧 Codebase Validation

All prompts have been validated against the **actual** codebase structure as of **2025-11-29**:

### ✅ Verified Paths

| Prompt Reference | Actual Path | Status |
|------------------|-------------|--------|
| `apps/web/components/` | `apps/web/src/components/` | ✅ Corrected |
| `server/ai/nlq/` | `server/src/ai/nl-graph-query/` | ✅ Extends existing |
| `services/prov-ledger/` | `services/prov-ledger/` | ✅ Scaffolded |
| `services/authz/` | `services/opa-policy-engine/` (new) + `services/enterprise/` (extend) | ✅ Clarified |
| `services/er/` | `services/er/` (new) | ✅ To be created |

### ✅ Verified Dependencies

| Technology | Version | Verified |
|------------|---------|----------|
| Neo4j | 5.24.0-community | ✅ docker-compose.dev.yml:42 |
| APOC | Enabled (apoc.*) | ✅ Line 47 |
| GDS | Enabled (gds.*) | ✅ Line 48 |
| SSO/SCIM | Implemented | ✅ services/enterprise/src/sso-manager.ts |
| Ingest | FastAPI, CSV/JSON/S3/Postgres | ✅ services/ingest/README.md |
| Observability | Prometheus, Grafana, Jaeger, Loki | ✅ docker-compose.dev.yml |

---

## 📊 Coverage Matrix

| Roadmap Goal | Prompts | Status |
|--------------|---------|--------|
| **Core GA** | #01, #03, #08, #09, #11, #12 | 🟢 Ready |
| **Prov-Ledger Beta** | #02, #10 | 🟢 Ready |
| **Predictive Alpha** | #07 | 🟢 Ready |
| **Ops (SLO, Cost, Chaos)** | #04, #05 | 🟢 Ready |
| **Offline/Edge Kit** | #06 | 🟢 Ready |

---

## 🎓 Answers to Original Questions

### 1. Repo Reality Check
- ✅ **Actual paths**: `apps/web/src/components/`, `server/src/`, `services/`
- ✅ **Existing code**: NLQ at `server/src/ai/nl-graph-query/`, Prov-Ledger scaffolded, SSO/SCIM implemented

### 2. Neo4j Version + APOC
- ✅ **Neo4j**: 5.24.0-community
- ✅ **APOC**: Unrestricted (apoc.*)
- ✅ **GDS**: Available (gds.*)
- ✅ **Cost estimation**: Use `EXPLAIN`, `PROFILE`, `apoc.meta.stats()`, `gds.alpha.shortestPath.*`

### 3. Authentication Providers
- ✅ **OIDC**: Generic (Okta, Auth0, Keycloak, AzureAD)
- ✅ **SAML 2.0**: Enterprise SSO
- ✅ **LDAP**: Active Directory
- ✅ **SCIM 2.0**: User/group provisioning (already coded!)
- ✅ **Extend**: `services/enterprise/` for SSO/SCIM, add `services/opa-policy-engine/` for OPA

### 4. Target Infra (Helm/K8s)
- ✅ **Single-cluster** dev with autoscaling
- ✅ **Multi-region**: Helm umbrella chart supports it
- ✅ **SLO**: p95 < 1.5s for graph queries (3-hop, 50k nodes)
- ✅ **Observability**: Prometheus, Grafana, Jaeger (already wired)

### 5. Ingest Wizard Connectors (First 10)
- ✅ **CSV/TSV** (exists)
- ✅ **JSON/NDJSON** (exists)
- ✅ **PostgreSQL** (exists)
- ✅ **S3** (exists)
- 🆕 **MySQL** (add)
- 🆕 **Google Sheets** (add)
- 🆕 **Azure Blob** (add)
- 🆕 **JDBC** (generic: Oracle, SQL Server) (add)
- 🆕 **REST API** (configurable endpoints) (add)
- 🆕 **Email** (IMAP/EML parsing) (add)

---

## 📝 Usage Notes

### When to Use Each Prompt

**Before Core GA:**
- Prompts #01, #03, #08, #09, #11, #12 (all Core GA features)

**After Core GA:**
- Prompts #02, #10 (Prov-Ledger beta)
- Prompt #07 (Predictive alpha)
- Prompts #04, #05 (Ops hardening)
- Prompt #06 (Offline kit)

### Customization

Each prompt is a **template**. Customize:
- Connector list (Prompt #08)
- SLO thresholds (Prompt #05)
- Budget limits (Prompt #04)
- Redaction presets (Prompt #08)

### Sequential Dependencies

Some prompts depend on others:
- **Prompt #10** (Disclosure) depends on **Prompt #02** (Prov-Ledger)
- **Prompt #04** (Cost Guard) depends on **Prompt #01** (Cost estimator from NL→Cypher)
- **Prompt #11** (Runbook Runner) depends on **Prompt #03** (OPA for provers)

**Recommended order:**
1. #01 (NL→Cypher) → #04 (Cost Guard)
2. #03 (ABAC/OPA) → #11 (Runbook Runner) → #12 (Security)
3. #02 (Prov-Ledger) → #10 (Disclosure)
4. #08, #09 (Ingest, ER) - independent
5. #05, #06, #07 - independent

---

## 🧪 Testing Strategy

### Per-Prompt Tests

Each prompt includes:
- **Unit tests**: Jest/pytest for core logic
- **Integration tests**: API endpoints, database operations
- **E2E tests**: Playwright/Cypress for UI flows
- **Acceptance tests**: Golden datasets, benchmark workloads

### Golden Path Validation

After implementing prompts, run:

```bash
make bootstrap
make up
make smoke
```

**Expected**: All services green, smoke tests pass.

---

## 🐛 Troubleshooting

### Issue: Paths don't match

**Solution**: Prompts use corrected paths. If you see mismatches, check:
- `apps/web/src/components/` (not `apps/web/components/`)
- `server/src/` (not `server/`)

### Issue: Existing code conflicts

**Solution**: Prompts are designed to **extend** existing code. Look for:
- "Extend: `server/src/ai/nl-graph-query/nl-graph-query.service.ts`"
- "Verify: `services/enterprise/src/sso-manager.ts`"

### Issue: Missing dependencies

**Solution**: Run pre-flight checks. Example:
```bash
ls -la services/prov-ledger/  # Should exist (scaffolded)
grep -r "OIDC" services/enterprise/  # Should find SSO code
```

---

## 📚 References

- **Codebase guide**: [../CLAUDE.md](../CLAUDE.md)
- **Architecture**: [../ARCHITECTURE.md](../ARCHITECTURE.md)
- **Developer onboarding**: [../DEVELOPER_ONBOARDING.md](../DEVELOPER_ONBOARDING.md)
- **Repository structure**: [../REPOSITORY_STRUCTURE.md](../REPOSITORY_STRUCTURE.md)

---

## 🤝 Contributing

To update these prompts:

1. Validate against codebase: Run pre-flight checks
2. Test with Claude: Verify outputs
3. Update README: Reflect any path changes
4. Commit: Follow conventional commits

---

## 📄 License

These prompts are part of the IntelGraph project. Use them to accelerate development aligned with the roadmap.

---

## ✨ Acknowledgments

- Prompts aligned with **Q3-Q4 2025 roadmap** (Core GA, Prov-Ledger beta, Predictive alpha, Ops)
- Validated against codebase as of **2025-11-29**
- Acceptance criteria sourced from **Wishbooks** and **Near-Term roadmap**

**Ready to ship!** 🚀
