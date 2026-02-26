# Threat Model -- IntelGraph Platform v5.0.0 GA Release

**Document Version:** 1.0
**Date:** 2026-02-26
**Methodology:** STRIDE with risk-matrix scoring (Likelihood x Impact)
**Scope:** Full-stack analysis of the v5.0.0 GA release (597 merged PRs)
**Branch:** `claude/merge-prs-ga-release-XjiVk`
**Previous Version:** v4.2.3
**Status:** Pre-GA Security Assessment

---

## Table of Contents

1. [System Overview and Trust Boundaries](#1-system-overview-and-trust-boundaries)
2. [Data Flow Diagrams](#2-data-flow-diagrams)
3. [STRIDE Analysis per Component](#3-stride-analysis-per-component)
4. [Attack Surface Analysis](#4-attack-surface-analysis)
5. [Risk Matrix](#5-risk-matrix)
6. [Mitigations (Existing and Recommended)](#6-mitigations-existing-and-recommended)
7. [Residual Risks](#7-residual-risks)
8. [Recommendations for v5.0.0 GA](#8-recommendations-for-v500-ga)

---

## 1. System Overview and Trust Boundaries

### 1.1 System Description

IntelGraph Platform v5.0.0 is a multi-tenant intelligence analysis platform deployed as containerized microservices. The release merges 597 PRs (170 features, 89 security/governance, 74 infrastructure, 29 bug fixes, 13 dependency upgrades) and introduces major new capabilities: agentic research orchestration (Maestro), an AI-powered Intelligence Copilot, graph-based entity resolution, NLQ (Natural Language Query) with NL-to-Cypher translation, multi-agent swarm coordination, and OSINT ingest connectors.

### 1.2 Component Inventory

| Layer | Component | Technology | Port | Role |
|-------|-----------|------------|------|------|
| Frontend | Web Client | React/Next.js | 3000 | SPA for analysts |
| Frontend | Offline Kit | React | 3001 | Disconnected-environment client |
| Frontend | Conductor UI | React | -- | Orchestration dashboard |
| Frontend | Desktop App | Electron | -- | Desktop client (disabled) |
| Gateway | API Gateway | Node.js/Express/Apollo | 4000 | GraphQL BFF, REST, policy enforcement |
| Gateway | GraphQL BFF | Node.js/Apollo | -- | Federated GraphQL schema composition |
| Gateway | Policy LAC | Node.js | -- | Lightweight authorization client |
| Backend | Graph-Core | Node.js/Express | -- | Entity/relationship CRUD, Cypher query |
| Backend | Prov-Ledger | Node.js | 4010 | Provenance and data lineage |
| Backend | Conductor API | Node.js | 4020 | Workflow orchestration |
| Backend | License Registry | Node.js | 4030 | License management |
| Backend | Agent Runtime | Node.js | 4012 | Autonomous agent execution |
| Backend | Feed Processor | Node.js | -- | Ingest stream processing |
| Backend | Sync Broker | Node.js | -- | Real-time sync |
| Backend | InboundAlertService | Node.js | -- | Webhook ingest for alerts |
| Backend | ER Service | Node.js | -- | Entity resolution |
| Backend | NL2Cypher | Node.js | -- | Natural language to Cypher translation |
| AI/ML | Graph-XAI | Python | 4011 | Explainable AI for graph analysis |
| AI/ML | Predictive Suite | Python | 4013 | ML prediction services |
| AI/ML | Intelligence Copilot | React + Python | -- | AI-powered analysis assistant |
| AI/ML | GraphRAG Pipeline | Python | -- | Retrieval-augmented generation on graph |
| AI/ML | Threat Analytics | Python | -- | IO actor scoring, causal impact |
| Policy | OPA | Go (sidecar) | 8181 | ABAC/RBAC policy decisions |
| Data | Neo4j | Java | 7474/7687 | Graph database (with APOC) |
| Data | PostgreSQL | C | 5432 | Relational data (provenance, licenses, conductor) |
| Data | Redis | C | 6379 | Caching, pub/sub, session store |
| Data | Kafka | Java | 9092 | Event streaming, CDC |
| Data | Elasticsearch | Java | 9200 | Full-text search, GraphRAG backend |
| Data | MinIO | Go | 9000/9001 | Object storage (S3-compatible) |
| Observability | Jaeger | Go | 16686/6831 | Distributed tracing |
| Observability | OTel Collector | Go | 4317/4318 | Telemetry collection |
| Observability | Prometheus | Go | 9090 | Metrics |
| Observability | Grafana | Go | 3005 | Dashboards |
| Observability | Loki | Go | 3100 | Log aggregation |
| CI/CD | GitHub Actions | -- | -- | 256 workflows, SLSA/Sigstore |

### 1.3 Trust Boundaries

```
TB-0: Internet Boundary
 |
 |  [Untrusted: Public Internet / External OSINT Sources]
 |
 +--- TB-1: CDN / Load Balancer Boundary
 |     |
 |     +--- TB-2: Frontend Tier (React SPA, static assets)
 |     |     |
 |     |     +--- TB-3: API Gateway Boundary (authn, authz, rate limiting)
 |     |           |
 |     |           +--- TB-4: Backend Service Mesh (mutual trust, internal network)
 |     |           |     |
 |     |           |     +--- TB-5: Policy Decision Point (OPA)
 |     |           |     +--- TB-6: Data Tier (Neo4j, PostgreSQL, Redis, Kafka, ES)
 |     |           |     +--- TB-7: AI/ML Execution Tier (Python services, LLM APIs)
 |     |           |     +--- TB-8: Agent Execution Sandbox
 |     |           |
 |     |           +--- TB-9: External Integration Boundary (OSINT connectors, webhooks)
 |
 +--- TB-10: CI/CD Pipeline Boundary (GitHub Actions, SLSA, supply chain)
 |
 +--- TB-11: Observability Tier (metrics, logs, traces -- read-only)
```

**Critical trust boundary crossings:**

| Crossing | From | To | Data | Risk Level |
|----------|------|----|------|------------|
| TB-0 to TB-3 | Internet | API Gateway | User requests, JWT tokens | CRITICAL |
| TB-3 to TB-4 | Gateway | Backend Services | Authenticated requests, tenant context | HIGH |
| TB-4 to TB-6 | Services | Data Tier | Cypher queries, SQL, cache ops | HIGH |
| TB-4 to TB-7 | Services | AI/ML Tier | Prompts, user data, model responses | HIGH |
| TB-4 to TB-8 | Services | Agent Sandbox | Agent tasks, tool calls | CRITICAL |
| TB-9 to TB-4 | External | Backend | Webhook payloads, OSINT data | HIGH |
| TB-10 to all | CI/CD | Production | Build artifacts, deployments | CRITICAL |

### 1.4 Data Classification

| Classification | Examples | Storage | Access |
|---------------|----------|---------|--------|
| TOP SECRET | Encryption keys, JWT secrets, OIDC secrets | Env vars / vault (validated by Zod schema, min 32 chars) | Platform admins only |
| SECRET | Database credentials, API keys (OpenAI, VirusTotal) | Env vars (validated at boot) | Service accounts |
| CONFIDENTIAL | Intelligence reports, entity data, case files | Neo4j (tenant-scoped), PostgreSQL | Tenant users via ABAC |
| INTERNAL | Audit logs, provenance records, telemetry | PostgreSQL, Loki, Elasticsearch | Tenant admins |
| PUBLIC | API docs, help articles, static assets | CDN / docs-site | Anyone |

---

## 2. Data Flow Diagrams

### 2.1 Primary Request Flow (Analyst Query)

```
[Analyst Browser]
    |
    | HTTPS (JWT Bearer)
    v
[CDN / Load Balancer]  -- TB-0
    |
    v
[React SPA]  -- TB-2
    |
    | GraphQL over HTTPS
    v
[API Gateway :4000]  -- TB-3
    |
    +---> [Rate Limiter] (RATE_LIMIT_WINDOW_MS / RATE_LIMIT_MAX_REQUESTS)
    +---> [JWT Validation] (OIDC issuer in prod)
    +---> [ABAC Plugin] --> [OPA :8181]  -- TB-5
    |         |
    |         v
    |     OPA evaluates: {subject, action, resource, context(tenantId, caseId, legalBasis)}
    |         |
    |         +-- DENY --> 403 Forbidden (with obligations)
    |         +-- ALLOW --> proceed with obligations
    |
    +---> [Cypher Guardrails] (read-only default, complexity limits, tenant isolation)
    |
    v
[Graph-Core / Backend Services]  -- TB-4
    |
    +---> [Neo4j :7687]  -- TB-6
    |       (READ session, LIMIT enforced, tenant-scoped)
    |
    +---> [PostgreSQL :5432]  -- TB-6
    |       (parameterized queries via pg)
    |
    +---> [Redis :6379]  -- TB-6
    |       (cache, session)
    |
    +---> [Elasticsearch :9200]  -- TB-6
            (full-text search, RBAC-filtered)
```

### 2.2 AI/ML Request Flow (Intelligence Copilot)

```
[Analyst]
    |
    | Natural language query
    v
[React SPA] -- IntelligentCopilot component (safe React rendering, no dangerouslySetInnerHTML)
    |
    | GraphQL mutation
    v
[API Gateway :4000]
    |
    +---> [ABAC Check] --> [OPA]
    |
    v
[NL2Cypher Service]
    |
    +---> [CypherGuardrails] (readOnlyConstraint, complexityConstraint,
    |                          exportConstraint, tenantIsolationConstraint,
    |                          timeBasedConstraint)
    |
    +---> [Cypher Sandbox] (READ-only Neo4j session, mutation regex block,
    |                        LIMIT injection, CALL/LOAD/DROP/etc. blocked)
    |
    v
[Graph-XAI :4011]  -- TB-7
    |
    +---> [External LLM API] (OpenAI, etc.)  -- TB-0
    |       (API key: sk-*, validated at boot)
    |
    v
[Response] --> sanitized, rendered safely in React
```

### 2.3 Inbound Webhook / Alert Flow

```
[External System (PagerDuty, SIEM, etc.)]
    |
    | HTTPS POST with HMAC-SHA256 signature
    v
[API Gateway :4000]  -- TB-9 crossing
    |
    v
[InboundAlertService]
    |
    +---> Fetch config: SELECT * FROM inbound_alert_configs WHERE id=$1 AND tenant_id=$2
    +---> Verify: createHmac('sha256', secret) + timingSafeEqual()
    +---> Create incident (tenant-scoped)
    +---> INSERT into inbound_alerts (parameterized)
    |
    v
[IncidentService] --> [PostgreSQL]
```

### 2.4 Agent Execution Flow

```
[Orchestration Request]
    |
    v
[Maestro Conductor]
    |
    +---> [Agent Router] (modes, policy gates)
    +---> [Safety Layer] (PII detection, rate limiting)
    |
    v
[Agent Runtime :4012]  -- TB-8
    |
    +---> [Dual Reasoning Loop] (feature-flagged)
    +---> [Tool Execution] (sandboxed)
    +---> [Prompt Registry] (centralized, registered prompts only)
    |
    +---> [Kafka :9092]  -- TB-6
    |       (event stream, CDC)
    |
    +---> [Redis :6379]
    |       (state, deduplication)
    |
    v
[Results] --> provenance stamp --> [Prov-Ledger :4010]
```

### 2.5 CI/CD Pipeline Flow

```
[Developer Push / PR]
    |
    v
[GitHub Actions]  -- TB-10
    |
    +---> [256 Workflows]
    |       +---> _reusable-governance-gate.yml (OPA verdict)
    |       +---> _reusable-security-compliance.yml
    |       +---> _reusable-slsa-build.yml (SLSA provenance)
    |       +---> agent-guardrails.yml (no-deception gate)
    |       +---> agentic-policy-drift.yml
    |
    +---> [SBOM Generation] (pinned sbom-action)
    +---> [Sigstore Signing] (Cosign v3.0.2, pinned)
    +---> [Action Pinning Preflight]
    |
    +---> [Build Artifacts]
    |       +---> Docker images
    |       +---> SLSA attestations
    |       +---> Signed SBOMs
    |
    v
[Container Registry] --> [Deployment Environment]
```

### 2.6 Multi-Tenant Data Isolation

```
[Tenant A Request]                    [Tenant B Request]
    |                                     |
    v                                     v
[API Gateway]                        [API Gateway]
    |                                     |
    +-- x-tenant header --+               +-- x-tenant header --+
    |                      |               |                      |
    v                      v               v                      v
[AuthorizationService.checkTenantIsolation()]
    |                                     |
    v                                     v
[OPA ABAC Decision]                  [OPA ABAC Decision]
    |                                     |
    v                                     v
[Tenant A data partition]            [Tenant B data partition]
  Neo4j: WHERE n.tenantId = 'A'       Neo4j: WHERE n.tenantId = 'B'
  PG: WHERE tenant_id = 'A'           PG: WHERE tenant_id = 'B'
```

---

## 3. STRIDE Analysis per Component

### 3.1 API Gateway (Node.js/Express/Apollo)

| STRIDE | Threat | Severity | Status |
|--------|--------|----------|--------|
| **Spoofing** | JWT forgery or stolen tokens | CRITICAL | Mitigated: OIDC validation in prod, min 32-char secrets |
| **Spoofing** | Tenant header spoofing (x-tenant, x-roles, x-subject-id) | CRITICAL | PARTIAL: Headers used for ABAC input; if gateway trusts upstream headers without re-validation, spoofing possible |
| **Tampering** | GraphQL query manipulation to bypass ABAC | HIGH | Mitigated: OPA evaluates every request; Cypher guardrails enforce constraints |
| **Tampering** | Request body modification between gateway and backend | MEDIUM | PARTIAL: Internal network trust; no request signing between services |
| **Repudiation** | Denial of privileged actions | MEDIUM | Mitigated: Structured audit logging with traceId, subject hash, tenant, action |
| **Info Disclosure** | GraphQL introspection leaking schema | HIGH | PARTIAL: persistedOnly plugin exists but must verify it is enforced in prod |
| **Info Disclosure** | Error messages leaking stack traces | MEDIUM | PARTIAL: Express default error handler may leak in non-production |
| **DoS** | GraphQL complexity attacks (deeply nested queries) | HIGH | Mitigated: costLimit plugin, depthCost plugin, query complexity scoring |
| **DoS** | Rate limiting bypass | MEDIUM | Mitigated: RATE_LIMIT_WINDOW_MS / RATE_LIMIT_MAX_REQUESTS (configurable) |
| **Elevation** | ABAC policy bypass via malformed context | HIGH | Mitigated: OPA deny-by-default; fail-closed on OPA unavailability (503) |

### 3.2 React Frontend (Web, Conductor UI, Offline Kit)

| STRIDE | Threat | Severity | Status |
|--------|--------|----------|--------|
| **Spoofing** | Session hijacking via XSS | HIGH | FIXED: dangerouslySetInnerHTML removed from IntelligentCopilot; sanitizeHtml added to HelpArticleView |
| **Tampering** | Client-side authorization bypass | MEDIUM | Mitigated: All authorization enforced server-side via OPA |
| **Info Disclosure** | Sensitive data in browser storage | MEDIUM | REVIEW NEEDED: Verify JWT storage mechanism (httpOnly cookies vs localStorage) |
| **Info Disclosure** | Source map exposure in production | LOW | REVIEW NEEDED: Verify source maps disabled in production builds |
| **DoS** | Client-side ReDoS via user input | LOW | PARTIAL: micromatch/semver ReDoS in dependencies (build-time only) |
| **Elevation** | Remaining dangerouslySetInnerHTML usage | HIGH | OPEN: 20 files still contain dangerouslySetInnerHTML (see Section 4.1) |

### 3.3 Neo4j Graph Database

| STRIDE | Threat | Severity | Status |
|--------|--------|----------|--------|
| **Spoofing** | Direct database access bypassing application auth | CRITICAL | PARTIAL: Default creds `neo4j/test` in docker-compose; must use strong creds in prod |
| **Tampering** | Cypher injection via NL2Cypher | CRITICAL | Mitigated: Cypher sandbox blocks mutations (regex), READ-only sessions, LIMIT injection, CypherGuardrails with 5 constraint checks |
| **Tampering** | Tenant data corruption via cross-tenant writes | HIGH | Mitigated: tenantIsolationConstraint in guardrails; readOnlyConstraint for non-privileged |
| **Info Disclosure** | Cross-tenant data leakage via graph traversal | CRITICAL | PARTIAL: Regex-based tenant filter check in CypherGuardrails may be bypassable with obfuscated queries |
| **Info Disclosure** | APOC procedures exposing file system or network | HIGH | REVIEW NEEDED: APOC plugin enabled; procedures like `apoc.load.json`, `apoc.periodic.commit` could be abused |
| **DoS** | Unbounded graph traversals | HIGH | Mitigated: complexityConstraint limits variable-length paths, MATCH clauses; LIMIT enforced in sandbox |
| **Elevation** | Privileged user bypassing all Cypher constraints | MEDIUM | By design: isPrivileged flag removes guardrails; verify privilege assignment is properly controlled |

### 3.4 AI/ML Services (Python -- Graph-XAI, Predictive Suite, GraphRAG)

| STRIDE | Threat | Severity | Status |
|--------|--------|----------|--------|
| **Spoofing** | Prompt injection impersonating system prompts | CRITICAL | PARTIAL: Prompt registry exists; injection detection in `summit/security/wideseek/injection.py`; test suite in `tests/test_prompt_injection.py` |
| **Tampering** | Model output manipulation via adversarial inputs | HIGH | PARTIAL: Safety layer exists; no output validation framework identified |
| **Tampering** | Training data poisoning via ingest connectors | HIGH | PARTIAL: Provenance tracking via Prov-Ledger; no data integrity checksums on ingest |
| **Info Disclosure** | LLM exfiltrating tenant data via prompt | CRITICAL | PARTIAL: PII detection in safety layer; no confirmed data-loss-prevention (DLP) boundary between LLM API calls and tenant data |
| **Info Disclosure** | Model serving exposing training data | MEDIUM | REVIEW NEEDED: Model cache TTL configured (3600s); verify no sensitive data in cached responses |
| **DoS** | Resource exhaustion via expensive ML inference | HIGH | PARTIAL: Rate limiting at gateway; no per-model concurrency limits identified |
| **Elevation** | Agent escalating privileges via tool calls | CRITICAL | PARTIAL: Agent guardrails workflows exist; no runtime capability restriction framework confirmed in code |

### 3.5 Agent Execution Platform (Maestro, Agent Runtime)

| STRIDE | Threat | Severity | Status |
|--------|--------|----------|--------|
| **Spoofing** | Agent identity spoofing | CRITICAL | GAP: No cryptographic agent identity framework (X.509 or equivalent) confirmed |
| **Spoofing** | Forged inter-agent messages | HIGH | GAP: No message signing between agents |
| **Tampering** | Agent modifying its own policy constraints | CRITICAL | PARTIAL: Policy gates in orchestrator; verify they cannot be bypassed by agent tool calls |
| **Tampering** | Prompt registry poisoning | HIGH | PARTIAL: Registry exists (`prompts/registry.yaml`); verify write access is restricted |
| **Info Disclosure** | Agent accessing data outside its task scope | HIGH | PARTIAL: Enqueue deduplication and scheduler hardening applied (#18057) |
| **DoS** | Runaway agent consuming unbounded resources | HIGH | PARTIAL: Feature-flagged dual reasoning loop; no confirmed execution time/resource limits |
| **Elevation** | Agent escaping sandbox to host system | CRITICAL | PARTIAL: "Safe local model execution sandbox" (#17873) exists; verify container isolation enforced |

### 3.6 Kafka Message Bus

| STRIDE | Threat | Severity | Status |
|--------|--------|----------|--------|
| **Spoofing** | Unauthorized producer publishing to topics | HIGH | GAP: Kafka configured with PLAINTEXT listeners; no authentication or encryption |
| **Tampering** | Message modification in transit | HIGH | GAP: No TLS between Kafka clients and broker |
| **Info Disclosure** | Unauthorized consumer reading sensitive topics | HIGH | GAP: No ACL configuration; any service on the network can consume |
| **DoS** | Topic flooding | MEDIUM | PARTIAL: Consumer concurrency configured (FEED_WORKER_CONCURRENCY=4) |
| **Repudiation** | Untraceable message origin | MEDIUM | PARTIAL: Tracing enabled (FEED_TRACING_ENABLED=true, Jaeger) |

### 3.7 Redis

| STRIDE | Threat | Severity | Status |
|--------|--------|----------|--------|
| **Spoofing** | Unauthorized access to cache/sessions | HIGH | GAP in dev: No password configured in docker-compose; production requires REDIS_PASSWORD (validated by secrets.ts) |
| **Info Disclosure** | Session data exposure | HIGH | PARTIAL: Redis on internal network; verify TLS for inter-service communication |
| **Tampering** | Cache poisoning affecting authorization decisions | HIGH | REVIEW NEEDED: Verify cached ABAC decisions have appropriate TTL and invalidation |

### 3.8 PostgreSQL

| STRIDE | Threat | Severity | Status |
|--------|--------|----------|--------|
| **Spoofing** | Default credentials in deployment | HIGH | GAP in dev: `postgres:postgres` in docker-compose; production validation checks for localhost/password in DATABASE_URL |
| **Tampering** | SQL injection | LOW | Mitigated: Parameterized queries via `pg` library (confirmed in InboundAlertService) |
| **Info Disclosure** | Unencrypted connections | MEDIUM | PARTIAL: No TLS configured in docker-compose connection strings |

### 3.9 CI/CD (256 GitHub Actions Workflows)

| STRIDE | Threat | Severity | Status |
|--------|--------|----------|--------|
| **Spoofing** | Compromised GitHub Actions (supply chain) | CRITICAL | Mitigated: Action pinning preflight gate (#18233); Sigstore signing; SLSA build provenance |
| **Tampering** | Malicious PR injecting code via merge train | HIGH | PARTIAL: 210 PRs merged with `-X theirs` or `checkout --theirs` (conflict resolution); governance gate exists but was bypassed for merge train |
| **Tampering** | Workflow file tampering | HIGH | Mitigated: Branch protection on main; governance gate workflow |
| **Info Disclosure** | Secrets leakage in workflow logs | HIGH | REVIEW NEEDED: 256 workflows; verify no secret echoing |
| **DoS** | CI resource exhaustion | MEDIUM | PARTIAL: Reusable workflows centralize configuration |
| **Elevation** | Workflow with excessive permissions | HIGH | PARTIAL: OIDC-to-AWS STS hardening guide exists (#18231); verify all workflows use least-privilege tokens |

### 3.10 Ingest Connectors (OSINT, Webhooks, External Data)

| STRIDE | Threat | Severity | Status |
|--------|--------|----------|--------|
| **Spoofing** | Forged webhook payloads | CRITICAL | FIXED: HMAC-SHA256 + timingSafeEqual in InboundAlertService (#17890) |
| **Tampering** | Malicious data injection via OSINT feeds | HIGH | PARTIAL: Schema validation exists (Zod); no confirmed content sanitization for all ingest paths |
| **Tampering** | CVE-2026-25145 Melange path traversal | CRITICAL | FIXED: Version gate + secure tar extraction + symlink/device rejection (#17972) |
| **Info Disclosure** | OSINT connector credentials exposure | HIGH | PARTIAL: API key validation at boot; verify rotation and vault integration |
| **DoS** | High-volume ingest overwhelming pipeline | MEDIUM | Mitigated: FEED_BATCH_SIZE=500, FEED_WORKER_CONCURRENCY=4, FEED_PARALLELISM=8 |

---

## 4. Attack Surface Analysis

### 4.1 External Attack Surface

| Entry Point | Protocol | Authentication | Authorization | Known Issues |
|-------------|----------|---------------|---------------|-------------|
| Web client (:3000) | HTTPS | JWT (OIDC in prod) | Client-side routing only | 20 files still use dangerouslySetInnerHTML |
| GraphQL API (:4000) | HTTPS | JWT Bearer | OPA ABAC + RBAC | Introspection may be enabled |
| REST APIs (:4000) | HTTPS | JWT Bearer | OPA ABAC | Rate limiting configurable |
| Webhook endpoints | HTTPS | HMAC-SHA256 | Tenant-scoped config lookup | Fixed: was string comparison |
| Neo4j Browser (:7474) | HTTP | neo4j/test (dev) | Neo4j built-in | Default creds in dev compose |
| MinIO Console (:9001) | HTTP | minioadmin/minioadmin | MinIO built-in | Default creds in dev compose |
| Grafana (:3005) | HTTP | admin/admin | Grafana built-in | Default creds in dev compose |
| Elasticsearch (:9200) | HTTP | None | xpack.security.enabled=false | No auth in dev compose |
| Kafka (:9092) | PLAINTEXT | None | None | No auth, no encryption |
| Redis (:6379) | TCP | None (dev) | None | No password in dev compose |
| PostgreSQL (:5432) | TCP | postgres/postgres (dev) | pg_hba.conf | Default creds in dev compose |
| OPA (:8181) | HTTP | None | None | Internal sidecar, but no auth |
| Jaeger (:16686) | HTTP | None | None | Trace data freely accessible |
| Prometheus (:9090) | HTTP | None | None | Metrics freely accessible |

### 4.2 Remaining dangerouslySetInnerHTML Usage (20 files)

The following files still use `dangerouslySetInnerHTML` and require individual review:

1. `packages/help-overlay/src/components/HelpArticleView.tsx` -- MITIGATED (sanitizeHtml applied)
2. `src/theme/DocItem/Footer/SeoJsonLd.tsx` -- LOW RISK (structured JSON-LD, not user input)
3. `apps/web/src/components/panels/EntityDrawer.tsx` -- REVIEW NEEDED
4. `apps/web/src/components/search/unified-search.tsx` -- REVIEW NEEDED
5. `apps/web/src/features/collab-widget/CollabWidget.tsx` -- REVIEW NEEDED
6. `client/src/components/HelpSystem.tsx` -- REVIEW NEEDED
7. `conductor-ui/frontend/dist-new/app-PfXaWnjm.js` -- BUILD ARTIFACT (review source)

Each instance that renders user-controlled or server-provided HTML without sanitization is a potential Stored XSS vector.

### 4.3 NL2Cypher Injection Surface

The NL-to-Cypher pipeline has multiple defense layers but the attack surface is significant:

1. **Input:** User natural language query (untrusted)
2. **LLM Translation:** LLM generates Cypher (untrusted output)
3. **Guardrails:** 5 regex-based constraints in `CypherGuardrails` class
4. **Sandbox:** Regex mutation block + READ-only session + LIMIT injection

**Bypass risks:**
- Regex-based checks can potentially be bypassed with Unicode normalization, comments, or multi-statement injection
- The sandbox mutation regex `/(CREATE|MERGE|DELETE|SET|DROP|REMOVE|CALL|LOAD)/i` does not account for Neo4j-specific escaping or procedure invocation variants
- LIMIT is appended via string concatenation (`${cypher} LIMIT ${Math.floor(Number(rowLimit))}`) -- if the generated Cypher already contains a LIMIT or UNION, the appended LIMIT may not apply as expected
- The tenant isolation constraint uses regex to check for `tenantId` in the query string, which could be satisfied by a comment or string literal without actually filtering data

### 4.4 Agent Execution Attack Surface

- **Tool calls:** Agents can invoke tools; tool governance is scaffolded but maturity is unclear
- **Inter-agent communication:** No signed messages between agents
- **Prompt registry:** Centralized but write-access controls unconfirmed
- **Execution sandbox:** Feature-flagged; unclear if enforced by container isolation or process-level sandboxing
- **State persistence:** Via Redis -- cache poisoning could alter agent behavior

### 4.5 Supply Chain Attack Surface

| Vector | Exposure | Mitigation Status |
|--------|----------|-------------------|
| npm dependencies | 31 vulnerabilities (2 critical: micromatch ReDoS, semver ReDoS; 14 high) | PARTIAL: Dependabot PRs merged; transitive deps remain |
| GitHub Actions | 256 workflows | Mitigated: Action pinning preflight, Sigstore |
| Docker base images | Multiple Dockerfiles | REVIEW NEEDED: Verify pinned digests vs mutable tags |
| Python dependencies | pip/poetry | REVIEW NEEDED: No confirmed pip audit results |
| Rust crates | Cargo.lock | REVIEW NEEDED: No confirmed cargo audit results |
| Merge train | 210 PRs merged with forced conflict resolution | RISK ACCEPTED: `-X theirs` and `checkout --theirs` may have silently overwritten security controls |

---

## 5. Risk Matrix

### 5.1 Scoring Criteria

**Likelihood:**
- 5 (Almost Certain): Exploitable by automated scanners; public PoC exists
- 4 (Likely): Exploitable by motivated attacker with basic tools
- 3 (Possible): Requires moderate skill and internal knowledge
- 2 (Unlikely): Requires significant resources and insider access
- 1 (Rare): Requires nation-state capability or physical access

**Impact:**
- 5 (Critical): Full system compromise, mass data breach, regulatory action
- 4 (Major): Cross-tenant data access, significant data loss, extended outage
- 3 (Moderate): Single-tenant data exposure, service degradation
- 2 (Minor): Limited data exposure, brief outage, no PII
- 1 (Negligible): No data exposure, cosmetic impact

### 5.2 Risk Register

| ID | Threat | Likelihood | Impact | Risk Score | Priority |
|----|--------|-----------|--------|------------|----------|
| R-01 | Cross-tenant data leakage via NL2Cypher guardrail bypass | 3 | 5 | **15 CRITICAL** | P0 |
| R-02 | Agent privilege escalation via tool calls | 3 | 5 | **15 CRITICAL** | P0 |
| R-03 | Prompt injection in AI Copilot exfiltrating tenant data | 3 | 5 | **15 CRITICAL** | P0 |
| R-04 | Kafka PLAINTEXT allowing data interception on network | 4 | 4 | **16 CRITICAL** | P0 |
| R-05 | Remaining dangerouslySetInnerHTML causing Stored XSS | 3 | 4 | **12 HIGH** | P1 |
| R-06 | Default credentials in deployment configs reaching production | 2 | 5 | **10 HIGH** | P1 |
| R-07 | Merge train silently overwriting security controls | 2 | 5 | **10 HIGH** | P1 |
| R-08 | APOC procedures enabling file system / network access from Neo4j | 3 | 4 | **12 HIGH** | P1 |
| R-09 | npm transitive dependency vulnerabilities (14 high) | 4 | 3 | **12 HIGH** | P1 |
| R-10 | OPA sidecar unauthenticated on internal network | 2 | 4 | **8 MEDIUM** | P2 |
| R-11 | Elasticsearch with security disabled | 3 | 3 | **9 MEDIUM** | P2 |
| R-12 | x-tenant / x-roles header spoofing | 2 | 4 | **8 MEDIUM** | P2 |
| R-13 | CI/CD secret leakage across 256 workflows | 2 | 4 | **8 MEDIUM** | P2 |
| R-14 | GraphQL introspection enabled in production | 3 | 2 | **6 MEDIUM** | P2 |
| R-15 | Agent identity spoofing (no crypto identity) | 2 | 4 | **8 MEDIUM** | P2 |
| R-16 | LLM API key rotation and vault integration | 2 | 3 | **6 MEDIUM** | P3 |
| R-17 | Redis cache poisoning affecting ABAC decisions | 2 | 3 | **6 MEDIUM** | P3 |
| R-18 | Observability tier exposing sensitive data | 3 | 2 | **6 MEDIUM** | P3 |
| R-19 | Source map exposure in production frontend builds | 2 | 2 | **4 LOW** | P3 |
| R-20 | ReDoS in micromatch/semver (build-time) | 4 | 1 | **4 LOW** | P4 |

### 5.3 Risk Heatmap

```
              Impact
           1    2    3    4    5
         +----+----+----+----+----+
    5    |    |    |    |    |    |
L   4    |R20 |    |R09 |R04 |    |
i   3    |    |R14 |R11 |R05 |R01 |
k        |    |R18 |    |R08 |R02 |
e   2    |    |R19 |R16 |R10 |R06 |
l        |    |    |R17 |R12 |R07 |
i   1    |    |    |    |R13 |    |
h        |    |    |    |R15 |    |
o        +----+----+----+----+----+
o
d        GREEN  YELLOW  ORANGE  RED
```

---

## 6. Mitigations (Existing and Recommended)

### 6.1 Existing Mitigations (Verified in Code)

| Control | Implementation | Evidence |
|---------|---------------|----------|
| HMAC-SHA256 webhook verification | `createHmac('sha256', secret)` + `timingSafeEqual()` | `server/src/integrations/inbound/service.ts` |
| XSS fix in IntelligentCopilot | Removed `dangerouslySetInnerHTML`, safe React rendering | `client/src/components/ai/IntelligentCopilot.{jsx,js}` |
| HTML sanitization in HelpArticleView | `sanitizeHtml()` strips scripts, iframes, event handlers, javascript: URLs | `packages/help-overlay/src/components/HelpArticleView.tsx` |
| OPA ABAC enforcement | Every GraphQL request evaluated; deny on OPA failure (503) | `gateway/src/plugins/abac.ts`, `apps/gateway/src/middleware/authz.ts` |
| Tenant isolation in authorization | `AuthorizationService.checkTenantIsolation()` as first check | Verified in security scan report |
| Cypher guardrails (5 constraints) | Read-only, complexity, export, tenant isolation, time-based | `services/gateway/src/nl2cypher/guardrails/constraints.ts` |
| Cypher sandbox | Mutation regex block + READ-only Neo4j session + LIMIT | `server/src/nl2cypher/sandbox.ts` |
| Secret validation at boot | Zod schema: min 32-char JWT/session secrets; production checks block insecure defaults | `server/src/config/secrets.ts` |
| CVE-2026-25145 remediation | Version gate + secure tar extraction + symlink/device rejection | #17972 |
| GraphQL cost/depth limiting | `costLimit` and `depthCost` plugins | `gateway/src/plugins/depthCost.ts`, `apps/gateway/src/plugins/costLimit.ts` |
| RBAC in evidence search | Role hierarchy: PLATFORM_ADMIN > ADMIN (tenant-scoped) > User | #18045, #18322 |
| CI supply chain governance | Action pinning preflight, Sigstore Cosign v3.0.2, SLSA build, SBOM | #18233, #18157, #17991 |
| OPA deny-by-default | Per-env allowlists with deny-by-default preflight | #17980 |
| Prompt injection detection | `summit/security/wideseek/injection.py`; test suite | `tests/test_prompt_injection.py` |
| Structured audit logging | traceId, redacted subject, roles, action, tenant, decision | `apps/gateway/src/middleware/authz.ts` |

### 6.2 Recommended New Mitigations

| ID | Risk Addressed | Recommendation | Priority | Effort |
|----|---------------|----------------|----------|--------|
| M-01 | R-01 | Replace regex-based Cypher tenant isolation check with parameterized query rewriting. Inject `WHERE n.tenantId = $tenantId` at the query plan level rather than checking for its presence in the query string. | P0 | HIGH |
| M-02 | R-01 | Add AST-level Cypher validation (parse Cypher into AST, verify no mutations, verify tenant filter node exists) instead of regex pattern matching. | P0 | HIGH |
| M-03 | R-02 | Implement capability-token-based agent authorization. Each agent receives a signed JWT with explicit tool/data scopes. Tool execution validates the token before proceeding. | P0 | HIGH |
| M-04 | R-03 | Deploy a DLP boundary between the application and external LLM APIs. Scrub PII/classified data from prompts before they leave TB-4. Log all outbound LLM API calls for audit. | P0 | MEDIUM |
| M-05 | R-04 | Enable Kafka SASL/SSL. Configure ACLs per topic. Enforce mTLS between Kafka clients and brokers. | P0 | MEDIUM |
| M-06 | R-05 | Audit all 20 remaining `dangerouslySetInnerHTML` usages. Replace with safe rendering or add DOMPurify sanitization. Ban via ESLint rule (`react/no-danger`). | P1 | MEDIUM |
| M-07 | R-06 | Remove all default credentials from docker-compose files. Use `.env.example` with placeholder values. Add a CI check that rejects commits containing default passwords. | P1 | LOW |
| M-08 | R-07 | Perform targeted code review of the 210 PRs merged with `-X theirs` / `checkout --theirs`. Focus on files touching auth, authorization, cryptography, and policy enforcement. | P1 | HIGH |
| M-09 | R-08 | Restrict APOC procedures to a whitelist. In `neo4j.conf`, set `dbms.security.procedures.allowlist=apoc.coll.*,apoc.convert.*` (only needed procedures). Block `apoc.load.*`, `apoc.periodic.*`, `apoc.export.*`. | P1 | LOW |
| M-10 | R-09 | Run `pnpm audit fix` to resolve transitive vulnerabilities. Pin resolved versions in `pnpm-lock.yaml`. Set up automated Dependabot for remaining high/critical. | P1 | LOW |
| M-11 | R-10 | Add mTLS or API key authentication to the OPA sidecar. Alternatively, use network policy (Kubernetes NetworkPolicy or Docker network isolation) to restrict access to the OPA port. | P2 | MEDIUM |
| M-12 | R-11 | Enable Elasticsearch xpack.security in production. Configure role-based access. Enable TLS. | P2 | MEDIUM |
| M-13 | R-12 | Validate tenant identity at the gateway from the JWT claims, not from `x-tenant` headers. Headers should only be used for internal service-to-service calls behind the gateway, with the gateway being the authoritative source. | P2 | MEDIUM |
| M-14 | R-13 | Audit all 256 workflows for secret handling. Use `actions/attest-build-provenance` and confirm no `echo ${{ secrets.* }}` patterns exist. | P2 | MEDIUM |
| M-15 | R-15 | Implement agent identity using short-lived X.509 certificates or signed JWTs issued by the Maestro Conductor. Require mutual authentication for inter-agent communication. | P2 | HIGH |
| M-16 | R-14 | Disable GraphQL introspection in production via the `persistedOnly` plugin. Verify the plugin is registered in the production Apollo Server configuration. | P2 | LOW |
| M-17 | R-18 | Add authentication to Grafana, Jaeger, and Prometheus. Use network policies to restrict access to the observability tier. Scrub sensitive labels from metrics. | P3 | MEDIUM |

---

## 7. Residual Risks

Even after all recommended mitigations are applied, the following risks remain:

### 7.1 Accepted Residual Risks

| ID | Risk | Residual Score | Justification |
|----|------|---------------|---------------|
| RR-01 | LLM non-determinism producing unexpected Cypher | L:2 x I:3 = 6 (MEDIUM) | Even with AST validation, novel query patterns may expose unintended data. Mitigated by read-only sessions and row limits. Accept with monitoring. |
| RR-02 | Zero-day in Neo4j / APOC | L:1 x I:5 = 5 (MEDIUM) | Vendor risk. Mitigate by staying current on patches. Accept with vulnerability monitoring. |
| RR-03 | Insider threat from privileged administrators | L:2 x I:5 = 10 (HIGH) | PLATFORM_ADMIN role has broad access by design. Mitigate with audit logging, break-glass procedures, and dual-approval for sensitive operations. |
| RR-04 | 597-PR merge train introducing latent bugs | L:3 x I:3 = 9 (MEDIUM) | Unprecedented merge volume. Some interactions between merged PRs may not be testable until production traffic. Mitigate with canary deployment and feature flags. |
| RR-05 | Advanced prompt injection bypassing detection | L:2 x I:4 = 8 (MEDIUM) | Prompt injection detection is evolving. Accept with defense-in-depth (DLP boundary, output sanitization, human-in-the-loop for sensitive operations). |
| RR-06 | Supply chain compromise of transitive npm dependencies | L:2 x I:4 = 8 (MEDIUM) | 14 high-severity transitive vulnerabilities. Accept with continuous monitoring via Dependabot and SBOM attestation. |
| RR-07 | Multi-agent coordination race conditions | L:2 x I:3 = 6 (MEDIUM) | Distributed agent execution may produce inconsistent state. Enqueue deduplication (#18057) mitigates but does not eliminate. |

### 7.2 Risk Acceptance Conditions

Each residual risk above is accepted under these conditions:
1. Continuous monitoring is active (SIEM, audit logs, anomaly detection)
2. Incident response runbooks exist for each scenario
3. Risks are re-evaluated quarterly or upon any related incident
4. Feature flags allow rapid disable of high-risk capabilities (Maestro, NL2Cypher, AI Copilot)

---

## 8. Recommendations for v5.0.0 GA

### 8.1 Pre-GA Blockers (Must Complete Before GA)

| # | Action | Risk Addressed | Owner | Deadline |
|---|--------|---------------|-------|----------|
| 1 | **Targeted security review of 210 force-merged PRs** focusing on auth, authz, crypto, and policy files. Verify no security control was silently overwritten by `-X theirs` merge strategy. | R-07 | Security Team | GA-3 days |
| 2 | **Enable Kafka SASL/SSL** in all non-dev environments. Deploy with ACLs per topic (ingest, CDC, agent-events). | R-04 | Infrastructure | GA-2 days |
| 3 | **Audit remaining dangerouslySetInnerHTML** in `EntityDrawer.tsx`, `unified-search.tsx`, `CollabWidget.tsx`, `HelpSystem.tsx`. Apply DOMPurify or replace with safe rendering. | R-05 | Frontend Team | GA-2 days |
| 4 | **Enable Elasticsearch xpack.security** in staging and production. Verify RBAC-filtered search still works. | R-11 | Infrastructure | GA-1 day |
| 5 | **Remove default credentials** from all docker-compose files used in CI or staging. Replace with env-var references. | R-06 | DevOps | GA-1 day |

### 8.2 GA Release Hardening (Complete Within 2 Weeks of GA)

| # | Action | Risk Addressed |
|---|--------|---------------|
| 6 | Implement parameterized Cypher query rewriting for tenant isolation (M-01, M-02) | R-01 |
| 7 | Deploy DLP boundary for outbound LLM API calls (M-04) | R-03 |
| 8 | Implement agent capability tokens (M-03) | R-02 |
| 9 | Restrict APOC procedures to whitelist (M-09) | R-08 |
| 10 | Resolve remaining npm audit vulnerabilities via `pnpm audit fix` (M-10) | R-09 |
| 11 | Add ESLint rule `react/no-danger` to prevent new `dangerouslySetInnerHTML` usage (M-06) | R-05 |
| 12 | Validate tenant identity from JWT claims at gateway, not from headers (M-13) | R-12 |

### 8.3 Post-GA Roadmap (Complete Within 1 Quarter)

| # | Action | Risk Addressed |
|---|--------|---------------|
| 13 | Implement mTLS for OPA sidecar communication (M-11) | R-10 |
| 14 | Deploy agent X.509 identity framework (M-15) | R-15 |
| 15 | Audit all 256 CI/CD workflows for secret hygiene (M-14) | R-13 |
| 16 | Add authentication to observability tier (M-17) | R-18 |
| 17 | Run `cargo audit` and `pip audit` for Rust and Python dependencies | Supply chain |
| 18 | Conduct full penetration test of NL2Cypher pipeline | R-01 |
| 19 | Implement human-in-the-loop gates for high-impact agent actions | R-02 |
| 20 | Disable GraphQL introspection in production (M-16) | R-14 |

### 8.4 Governance and Compliance Notes

| Requirement | Status | Evidence |
|-------------|--------|----------|
| SOC 2 CC6.1 (Logical Access) | PASS | OPA ABAC + RBAC verified; tenant isolation verified |
| SOC 2 CC6.2 (System Access) | PARTIAL | Agent execution lacks identity framework |
| SOC 2 CC7.1 (System Monitoring) | PASS | Jaeger, OTel, Prometheus, Grafana, Loki deployed |
| SOC 2 CC7.2 (Anomaly Detection) | PARTIAL | Structured audit logging present; no confirmed anomaly alerting |
| SLSA Level 2 | PASS | Sigstore signing, SBOM generation, action pinning |
| SLSA Level 3 | PARTIAL | Build provenance exists; verify non-falsifiable |
| EU Omnibus 2026 | IN PROGRESS | Evidence packs scaffolded (#17813) |
| NIST SSDF | PASS | CI/CD signal delta action register (#18089) |

### 8.5 Monitoring and Detection Requirements

For all identified threats, the following detection capabilities must be operational before GA:

| Detection | Source | Alert Threshold |
|-----------|--------|-----------------|
| Cross-tenant query attempts | OPA decision logs | Any deny with reason "tenant_isolation" |
| Cypher mutation attempts by non-privileged users | CypherGuardrails logs | Any violation with constraint "read-only-default" |
| HMAC signature verification failures | InboundAlertService logs | > 3 failures per hour per config |
| Prompt injection attempts | Prompt injection detector | Any detected injection |
| Agent execution anomalies | Agent Runtime logs | Execution time > 5x baseline |
| Authentication failures | Gateway authz logs | > 10 failures per minute per IP |
| XSS payload attempts | WAF/Gateway logs | Any script/iframe in request body |
| ABAC policy evaluation failures | OPA metrics | Error rate > 1% |

---

## Appendix A: Security Fixes Applied in v5.0.0

| CVE/ID | Severity | Component | Fix | PR |
|--------|----------|-----------|-----|-----|
| CWE-347 | CRITICAL | InboundAlertService | HMAC-SHA256 + timingSafeEqual | #17890 |
| CWE-79 | HIGH | IntelligentCopilot | Removed dangerouslySetInnerHTML | #18063 |
| CWE-79 | HIGH | HelpArticleView | sanitizeHtml() added | #18063 |
| CVE-2026-25145 | HIGH | Melange/tar extraction | Version gate + path traversal validation | #17972 |
| -- | HIGH | AuthorizationService | Tenant isolation enforcement | #17899 |
| -- | HIGH | Evidence Search | RBAC + tenant scoping | #18045, #18322 |

## Appendix B: Dependency Vulnerability Summary

| Package | Severity | Type | Status |
|---------|----------|------|--------|
| micromatch | CRITICAL | ReDoS | In transitive dependency; awaiting upstream fix |
| semver | CRITICAL | ReDoS | In transitive dependency; awaiting upstream fix |
| braces | HIGH | ReDoS | Transitive |
| tar | HIGH | Arbitrary File Overwrite | Transitive |
| tough-cookie | HIGH | Prototype Pollution | Transitive |
| ws | HIGH | ReDoS | Transitive |
| word-wrap | HIGH | ReDoS | Transitive |
| postcss | HIGH | Line Return Parsing | Transitive |
| + 8 additional | HIGH | Various | Transitive |

## Appendix C: Files Reviewed for This Threat Model

| File | Purpose |
|------|---------|
| `server/src/integrations/inbound/service.ts` | Webhook HMAC verification |
| `apps/gateway/src/middleware/authz.ts` | ABAC middleware with OPA integration |
| `gateway/src/plugins/abac.ts` | Apollo ABAC plugin |
| `gateway/src/services/opa.ts` | OPA client |
| `services/gateway/src/nl2cypher/guardrails/constraints.ts` | Cypher query guardrails |
| `server/src/nl2cypher/sandbox.ts` | Cypher execution sandbox |
| `server/src/config/secrets.ts` | Secret validation and production checks |
| `packages/help-overlay/src/components/HelpArticleView.tsx` | HTML sanitization |
| `deploy/compose/docker-compose.full.yml` | Full deployment topology |
| `docs/ga-merge-train/SECURITY-SCAN-REPORT.md` | Security scan results |
| `docs/ga-merge-train/GA-MERGE-ASSESSMENT.md` | Merge train assessment |
| `docs/ga-merge-train/RELEASE-NOTES-v5.0.0-rc.1.md` | Release notes |
| `SECURITY/threat-models/05-agent-execution.md` | Existing agent threat model |
| `SECURITY/threat-models/00-threat-model-catalog.md` | Threat model catalog |

---

**Document prepared by:** Security Architecture (automated analysis)
**Review required by:** Security Team Lead, Platform Architect, CISO
**Next review date:** 2026-05-26 (quarterly) or upon any P0/P1 incident
