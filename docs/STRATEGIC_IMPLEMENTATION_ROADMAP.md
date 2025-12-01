# Summit Platform: Strategic Implementation Roadmap

> Comprehensive transformation plan based on 8-theme strategic framework
> Generated: 2025-11-21 | Status: Wave 0 Planning

## Executive Summary

This roadmap consolidates 70+ engineering initiatives into 8 strategic themes with clear ownership patterns for human-AI collaboration. Summit is currently at **~75% maturity** across themes, with strong foundations in governance, provenance, and observability, but gaps in entity modeling, design systems, and model governance.

---

## Current State Assessment

### Maturity by Theme

| Theme | Exists | Partial | Missing | Maturity Level |
|-------|--------|---------|---------|----------------|
| 1. Foundation & DX | 85% | 10% | 5% | Production Ready |
| 2. Governance & Auth | 80% | 15% | 5% | Production Ready |
| 3. Evidence & Provenance | 85% | 10% | 5% | Production Ready |
| 4. AI/ML & Copilot | 70% | 25% | 5% | MVP/Beta |
| 5. Connectors & Orchestration | 75% | 20% | 5% | MVP Ready |
| 6. Observability & Cost | 80% | 15% | 5% | Production Ready |
| 7. UX & Design | 60% | 30% | 10% | Early Stage |
| 8. Docs & Ops | 80% | 15% | 5% | Mature |

### Key Strengths (Leverage)

1. **Provenance Ledger** (`packages/prov-ledger/`) - Merkle trees, JWS signing, manifest generation
2. **GraphRAG + Copilot** (`services/ai-copilot/`, `services/rag/`) - NL→Cypher, citations, policy guards
3. **OTEL + Prometheus** - Full observability stack with Grafana dashboards
4. **Auth/Policy** (`services/authz-gateway/`) - JWT/JWKS, OPA/ABAC, tenant isolation
5. **13 Connectors** - STIX/TAXII, Elasticsearch, CSV, DuckDB, Splunk, etc.

### Critical Gaps (Address in Wave 0-1)

1. **Generic Entity Model** - No typed Person/Org/Asset/Location/Event/Document/Claim/Case
2. **No Bitemporal Fields** - validFrom/validTo, observedAt/recordedAt not in schema
3. **Design System Immature** - Components exist but no documentation/tokens
4. **Model Registry Missing** - No versioning, evaluation, or governance for AI models
5. **Connector Discovery** - 13 connectors but no registry or certification framework

---

## Wave 0: Baseline Stabilization (2-3 weeks)

### Quick Wins (High Impact, Low Effort)

#### QW-1: Canonical Entity Type Definitions
**Effort:** 2 days | **Impact:** High | **Owner:** AI-heavy

Extend GraphQL schema with discriminated entity types:
```graphql
interface CanonicalEntity {
  id: ID!
  canonicalId: ID
  validFrom: DateTime
  validTo: DateTime
  observedAt: DateTime
  recordedAt: DateTime!
  confidence: Float
  source: String
  props: JSON
}

type Person implements CanonicalEntity { ... }
type Organization implements CanonicalEntity { ... }
type Asset implements CanonicalEntity { ... }
type Location implements CanonicalEntity { ... }
type Event implements CanonicalEntity { ... }
type Document implements CanonicalEntity { ... }
type Claim implements CanonicalEntity { ... }
type Case implements CanonicalEntity { ... }
```

#### QW-2: Bitemporal Fields Migration
**Effort:** 1 day | **Impact:** High | **Owner:** Mixed

Add temporal tracking to all entities:
- `validFrom` / `validTo` - Business validity window
- `observedAt` - When the fact was observed in the real world
- `recordedAt` - When recorded in the system (immutable)

#### QW-3: Summit CLI Doctor Enhancement
**Effort:** 1 day | **Impact:** Medium | **Owner:** AI-heavy

Extend `maestro-doctor` to validate full golden path:
- Database connectivity (Neo4j, Postgres, Redis)
- Service health checks
- Schema version compatibility
- Environment variable validation
- Connector availability

#### QW-4: Connector Registry Manifest
**Effort:** 0.5 days | **Impact:** Medium | **Owner:** AI-heavy

Create `connectors/registry.json`:
```json
{
  "connectors": [
    {
      "id": "stix-taxii",
      "name": "STIX/TAXII Connector",
      "version": "1.0.0",
      "status": "stable",
      "capabilities": ["pull", "stream"],
      "entityTypes": ["ThreatActor", "Indicator", "Campaign"]
    }
  ]
}
```

#### QW-5: Structured Logging Consolidation
**Effort:** 1 day | **Impact:** Medium | **Owner:** AI-heavy

Standardize on Pino with correlation ID propagation:
- Unified log format across all services
- Trace ID injection from OTEL
- Sensitive field redaction

### Wave 0 Stories

| ID | Story | Acceptance Criteria | Owner |
|----|-------|---------------------|-------|
| W0-001 | Define CanonicalEntity interface with bitemporal fields | Schema validates, migrations run | AI |
| W0-002 | Create typed entity resolvers (Person, Org, Asset, Location, Event, Document, Claim, Case) | GraphQL introspection shows types | AI |
| W0-003 | Migrate existing entities to include temporal fields | Zero data loss, backfill recordedAt | Mixed |
| W0-004 | Implement Summit CLI `doctor` command | All health checks pass on clean install | AI |
| W0-005 | Create connector registry manifest | JSON schema validates, CI checks | AI |
| W0-006 | Consolidate logging to Pino with OTEL correlation | Trace IDs in all logs | AI |
| W0-007 | Add coverage thresholds to Jest config | CI fails below 70% coverage | AI |
| W0-008 | Document golden path in runnable notebook | Jupyter notebook executes clean | Mixed |

---

## Wave 1: Council-Grade Core (6-8 weeks)

### Epic 1.1: Authority/License Compiler
**Owner:** Mixed (Human designs policy semantics, AI implements)

```
┌─────────────────────────────────────────────────────────┐
│                  Authority Compiler                      │
├─────────────────────────────────────────────────────────┤
│  Policy Bundle   →  Runtime Guards  →  Audit Trail      │
│  (YAML/Rego)        (OPA evaluation)   (prov-ledger)    │
├─────────────────────────────────────────────────────────┤
│  License Rules   →  Selector Min.   →  Two-Person Ctrl  │
│  (data access)      (need-to-know)     (approval flow)  │
└─────────────────────────────────────────────────────────┘
```

Key deliverables:
- Policy schema (YAML) for authority definitions
- Runtime guard middleware for GraphQL resolvers
- License validation on entity access
- Two-person control workflow for sensitive operations

### Epic 1.2: Evidence-First Copilot
**Owner:** AI-heavy (Human validates safety scenarios)

Enhance existing copilot with:
- Inline citations linking to source entities
- Glass-box execution logs (every step recorded)
- Cost preview before expensive operations
- Replay capability for debugging

### Epic 1.3: Provenance Manifest Export
**Owner:** AI-heavy

Build on existing `prov-ledger`:
- Verifiable export bundles with hash trees
- Model cards for AI-generated content
- Revocation support for retracted claims
- External validator integration

### Epic 1.4: Safety & Integrity Harness
**Owner:** Mixed

Create evaluation framework:
- Red-team scenario library
- Bias detection tests
- Policy violation test suite
- Automated regression on model updates

---

## Wave 2: Production Hardening (6-8 weeks)

### Epic 2.1: Chaos Engineering & DR
- Pod/broker kill tests
- Cross-region replica validation
- PITR (Point-in-Time Recovery) drills
- RTO/RPO measurement

### Epic 2.2: Connector Certification
- Golden IO test harness
- Rate limit enforcement
- License rule validation
- Performance benchmarks

### Epic 2.3: Cost Visibility
- Per-tenant cost attribution
- LLM token tracking
- Storage tiering (hot/warm/cold)
- Budget alerts and guardrails

---

## Wave 3: Experience & Adoption (4-6 weeks)

### Epic 3.1: Unified UX
- Tri-pane layout (Graph ↔ Timeline ↔ Map)
- Command palette with keyboard shortcuts
- "Explain this view" panel
- AAA accessibility compliance

### Epic 3.2: Internationalization
- Locale selection infrastructure
- Message catalogs
- Copilot multi-language support
- RTL layout support

### Epic 3.3: Onboarding Autopilot
- Interactive tutorials
- Health check wizard
- Validated docs-site
- CompanyOS dogfooding

---

## Governance Integration Points

### Where to Add Authority Checks

```
┌─────────────────────────────────────────────────────────────┐
│                    REQUEST FLOW                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Client → API Gateway → [AUTH CHECK] → GraphQL Resolver     │
│                              ↓                               │
│                    [POLICY EVALUATION]                       │
│                              ↓                               │
│              ┌──────────────────────────────┐               │
│              │     Integration Points:       │               │
│              │                              │               │
│              │  1. authDirective.ts         │  ← Role check │
│              │  2. budgetDirective.ts       │  ← Cost guard │
│              │  3. dlpPlugin.ts             │  ← PII detect │
│              │  4. auditLogger.ts           │  ← Audit trail│
│              │  5. otelPlugin.ts            │  ← Tracing    │
│              └──────────────────────────────┘               │
│                              ↓                               │
│              [PROVENANCE CAPTURE] → prov-ledger              │
│                              ↓                               │
│                    Data Layer (Neo4j/Postgres)               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Files to Modify

| File | Integration | Priority |
|------|-------------|----------|
| `server/src/graphql/authDirective.ts` | Authority compiler hooks | P0 |
| `server/src/graphql/plugins/dlpPlugin.ts` | Enhanced PII patterns | P0 |
| `server/src/graphql/plugins/auditLogger.ts` | Provenance linkage | P1 |
| `services/ai-copilot/src/main.py` | Citation generation | P1 |
| `services/rag/src/main.py` | Source tracking | P1 |
| `packages/prov-ledger/src/index.ts` | Export manifest | P1 |

---

## Human-AI Collaboration Workflow

### Ownership Matrix

| Activity | Human | AI | Approval |
|----------|-------|-----|----------|
| Architecture decisions | Design | Document | Human |
| Policy semantics | Define | Implement | Human |
| Schema migrations | Review | Generate | Human |
| Test generation | Scenarios | Code | AI auto |
| Refactoring | Approve | Execute | Human |
| Documentation | Review | Generate | AI auto |
| Security fixes | Triage | Implement | Human |
| Performance tuning | Goals | Optimize | Mixed |

### AI Autonomy Levels

**Level 1 - Auto-merge** (AI iterates, no human review):
- Test generation for existing code
- Documentation updates
- Linting/formatting fixes
- Dependency updates (patch)

**Level 2 - Human review** (AI drafts, human approves):
- New feature implementation
- Schema changes
- API modifications
- Security-related changes

**Level 3 - Human-led** (Human designs, AI assists):
- Architecture decisions
- Policy definitions
- UX flows
- Risk acceptance

---

## Success Metrics

### Wave 0 Metrics
- [ ] Golden path passes on fresh clone (`make bootstrap && make up && make smoke`)
- [ ] Test coverage ≥ 70%
- [ ] All entity types have TypeScript interfaces
- [ ] Connector registry has all 13 connectors documented
- [ ] CLI doctor validates full stack health

### Wave 1 Metrics
- [ ] Authority compiler blocks unauthorized access (100% coverage)
- [ ] Copilot responses include citations (≥90%)
- [ ] Provenance exports pass external validation
- [ ] Safety harness catches known red-team scenarios (≥95%)

### Wave 2 Metrics
- [ ] DR drill completes within RTO (4 hours)
- [ ] All connectors pass certification tests
- [ ] Cost attribution accurate to ±5%
- [ ] p95 query latency < 500ms

### Wave 3 Metrics
- [ ] Accessibility audit passes WCAG 2.1 AA
- [ ] Onboarding completion rate ≥ 80%
- [ ] Documentation coverage ≥ 90%
- [ ] User satisfaction score ≥ 4.0/5.0

---

## Appendix: File References

### Key Implementation Files by Theme

**Theme 1 - Foundation:**
- `server/src/graphql/schema.ts` - GraphQL type definitions
- `src/database/migration/` - Migration infrastructure
- `src/cli/maestro-*.ts` - CLI tooling

**Theme 2 - Governance:**
- `services/authz-gateway/src/auth.ts` - JWT/JWKS
- `server/src/graphql/authDirective.ts` - Authorization
- `services/privacy-labeler/main.py` - PII detection

**Theme 3 - Provenance:**
- `packages/prov-ledger/src/` - Merkle ledger, manifests
- `server/src/maestro/provenance/merkle-ledger.ts` - Hash trees
- `services/provenance/jws.ts` - JWS signing

**Theme 4 - AI/ML:**
- `services/ai-copilot/src/main.py` - Copilot service
- `services/rag/src/main.py` - RAG implementation
- `server/src/graphql/resolvers/graphragResolvers.ts` - GraphRAG

**Theme 5 - Connectors:**
- `connectors/` - All connector implementations
- `packages/sdk/connector-js/` - Connector SDK
- `services/ingest/src/sdk/ConnectorSDK.ts` - SDK class

**Theme 6 - Observability:**
- `server/src/middleware/observability/otel-tracing.ts` - OTEL
- `observability/prometheus/prometheus-dev.yml` - Metrics
- `observability/grafana/provisioning/` - Dashboards

**Theme 7 - UX:**
- `apps/web/src/components/ui/` - Component library
- `apps/web/.storybook/` - Storybook config
- `src/documentation/i18n/` - i18n engine

**Theme 8 - Docs:**
- `docs/` - Documentation (125+ subdirectories)
- `adr/` - Architecture Decision Records
- `.github/workflows/` - CI/CD pipelines
