# Summit GA: Frequently Asked Questions

**Version:** 1.0
**Last Updated:** October 2025
**Audience:** Customers, Prospects, Partners

---

## Table of Contents

1. [General GA Questions](#general-ga-questions)
2. [Governance & Compliance](#governance--compliance)
3. [Data Provenance & Confidence](#data-provenance--confidence)
4. [API Versioning & Stability](#api-versioning--stability)
5. [Migration from MVP-3 to GA](#migration-from-mvp-3-to-ga)
6. [Security & Threat Model](#security--threat-model)
7. [AI & Copilot Features](#ai--copilot-features)
8. [Performance & Scalability](#performance--scalability)
9. [Deployment & Operations](#deployment--operations)
10. [Pricing & Licensing](#pricing--licensing)
11. [Roadmap & Post-GA Features](#roadmap--post-ga-features)

---

## General GA Questions

### What does "General Availability" mean for Summit?

General Availability (GA) means Summit has been validated for production use with:
- All **Tier-0 journeys** (core user workflows) fully functional and tested
- **Service Level Objectives (SLOs)** defined and monitored (99.9% uptime, latency targets)
- **Enterprise security controls** including formal threat model, audit logging, and access controls
- **API stability guarantees** via semantic versioning and deprecation policies
- **Comprehensive documentation** for deployment, integration, and operations
- **Support commitments** for production customers

GA is the milestone where we confidently recommend production deployments for enterprise customers.

### How is GA different from MVP-3?

| Aspect | MVP-3 | GA |
|--------|-------|-----|
| **Governance** | Basic RBAC | Universal OPA policy enforcement, ABAC, reason-for-access logging |
| **Provenance** | Limited source tracking | Complete claims ledger with source/pipeline/timestamp/confidence for every fact |
| **API Stability** | Breaking changes possible | Semantic versioning, 6-month deprecation policy, parallel version support |
| **CI/CD** | Standard checks | Hard gates with security scanning, SBOM generation, deployment canaries |
| **Security** | Basic controls | Formal STRIDE threat model, SOC 2 alignment, SLSA Level 3 compliance |
| **SLOs** | Best-effort | Committed 99.9% availability with automated monitoring and alerting |
| **Documentation** | Developer-focused | Comprehensive: API specs, migration guides, threat model, runbooks |

### Is GA backward-compatible with MVP-3?

Yes, with documented migration steps. Key changes:
- **API Changes**: Some endpoints have been restructured (see `/docs/MIGRATION-v2.0.0-to-MVP-3.md`)
- **Data Model**: Provenance fields are now required for all entities (migration tool provided)
- **Authentication**: OIDC is now the primary method (legacy session auth deprecated with 6-month EOL)
- **Configuration**: Environment variables have been renamed for consistency (mapping guide provided)

Migration guides and tools are available at `/docs/MIGRATIONS.md`.

### What are "Tier-0 Journeys"?

Tier-0 Journeys are the **critical user workflows** that must work flawlessly for the product to be viable:

1. **Authentication & Authorization**: Sign up, login (with MFA), session management, tenant switching
2. **Data Ingestion**: Connector setup, ingestion job execution, entity/edge verification
3. **Search & Investigation**: Global search, graph exploration, canvas manipulation
4. **AI Analysis**: Copilot chat (natural language to query), RAG inquiry with citations
5. **Administrative & Compliance**: User management, audit log review, data export

All Tier-0 journeys are validated in automated smoke tests before every deployment.

### Where can I find the GA scope documentation?

- **GA Criteria**: `/docs/GA_CRITERIA.md` (Tier-0 journeys, SLOs, supported configs)
- **GA Cut List**: `/docs/GA_CUT_LIST.md` (what's included vs. deferred)
- **GA Core Overview**: `/docs/GA_CORE_OVERVIEW.md` (architecture, backlog, delivery plan)
- **Threat Model**: `/docs/SECURITY_THREAT_MODEL.md`
- **API Versioning**: `/docs/API_VERSIONING_STRATEGY.md`
- **CI Standards**: `/docs/CI_STANDARDS.md`

---

## Governance & Compliance

### How does Summit enforce governance policies?

Summit uses **Open Policy Agent (OPA)** to enforce governance policies as code:

1. **Policy Definition**: Policies are written in Rego and stored in version control (`/policy/`)
2. **Policy Evaluation**: Every query, export, and AI interaction triggers an OPA evaluation
3. **Decision Enforcement**: OPA returns `allow` or `deny` with justification; denials are logged
4. **Audit Trail**: All policy decisions are recorded in immutable audit logs with correlation IDs

**Example Policy Check:**
```rego
# Policy: Users can only query data at or below their clearance level
allow {
    input.user.clearance >= input.data.classification
    has_reason_for_access(input)
}
```

### What governance policies are included out-of-the-box?

Default policies include:
- **Multi-tenant isolation**: Users can only access data within their tenant namespace
- **Classification enforcement**: Users cannot access data above their clearance level
- **Compartment boundaries**: Compartmentalized data requires explicit access grants
- **Reason-for-access prompts**: Sensitive data access requires justification
- **Export controls**: Data exports include k-anonymity assessment and classification tags
- **AI query validation**: AI-generated queries are validated against schema and permissions before execution

Organizations can customize and extend these policies.

### Can I audit who accessed what data and when?

**Yes.** Summit maintains **comprehensive, immutable audit logs** that capture:
- **User Actions**: Login, logout, tenant switching, configuration changes
- **Data Access**: Every query with user, timestamp, query text, and justification
- **Data Exports**: What data was exported, by whom, when, and for what reason
- **Policy Decisions**: Every OPA evaluation with allow/deny decision and policy version
- **System Events**: Ingestion jobs, background tasks, API calls, errors

Audit logs are:
- **Append-only**: Cannot be modified or deleted (WORM storage simulation)
- **Cryptographically chained**: Tamper detection via cryptographic linking
- **Exportable**: Can be exported to SIEM systems (Splunk, Datadog, etc.)
- **Queryable**: Searchable via audit log viewer with filtering and correlation

### Is Summit SOC 2 compliant?

Summit GA is **aligned with SOC 2 Type II control objectives**:
- ✅ **CC1 (Control Environment)**: Documented governance policies and RBAC
- ✅ **CC2 (Communication)**: Audit logs and alerting for security events
- ✅ **CC3 (Risk Assessment)**: Formal STRIDE threat model with residual risk documentation
- ✅ **CC4 (Monitoring)**: Observability stack with metrics, logs, and traces
- ✅ **CC5 (Control Activities)**: OPA policy enforcement and CI/CD hard gates
- ✅ **CC6 (Logical Access)**: OIDC/JWT authentication, RBAC/ABAC authorization, MFA support
- ✅ **CC7 (System Operations)**: SLO monitoring, deployment canaries, incident response runbooks

**Note:** SOC 2 Type II certification is in progress. Alignment documentation is available for customer audits.

### How do I demonstrate compliance during an audit?

Summit provides **evidence bundles** for audit preparation:
- **Audit Logs**: Exportable, timestamped records of all system access and changes
- **Policy Decisions**: OPA decision logs showing governance enforcement
- **SBOM (Software Bill of Materials)**: Component inventory and vulnerability reports
- **Attestations**: Cryptographic signatures on build artifacts and deployment provenance
- **Evidence Packs**: Bundled `evidence-pack-<release>.tgz` with SBOM, attestations, OPA decisions

Generate an evidence bundle for auditors:
```bash
# Export audit logs for date range
./scripts/export-audit-logs.sh --start 2025-01-01 --end 2025-03-31

# Retrieve latest evidence pack
./scripts/download-evidence-pack.sh --release v1.0.0
```

See `/docs/AUDIT_AND_COMPLIANCE.md` for detailed audit preparation guidance.

### Can I enforce custom compliance policies?

**Yes.** Summit's OPA integration allows custom policy authoring:

1. **Write Policy**: Create Rego policy files in `/policy/custom/`
2. **Test Policy**: Run `opa test policy/custom/ -v` to validate logic
3. **Deploy Policy**: Commit policies to version control; CI validates and deploys
4. **Monitor Enforcement**: View policy decision logs in audit log viewer

**Example Custom Policy:**
```rego
# Require PII redaction for all exports
package summit.export

deny[msg] {
    input.export.contains_pii == true
    input.export.redaction_applied == false
    msg := "PII must be redacted before export"
}
```

See `/docs/GOVERNANCE-POLICIES.md` for policy authoring guide.

---

## Data Provenance & Confidence

### What is the "provenance ledger"?

The **provenance ledger** is an immutable, append-only record that tracks the origin and transformation history of every fact in the knowledge graph.

**For every entity and edge, we record:**
- **Source**: Original source system or document (e.g., "STIX feed X", "CSV upload Y")
- **Pipeline**: ETL pipeline and transformation steps applied
- **Timestamp**: When the data was ingested and last updated
- **Confidence**: Confidence score (0.0-1.0) or "deterministic" flag
- **Tags**: Classification labels, simulation flags, quality indicators
- **Actor**: Who or what initiated the ingestion (user, API key, automated job)

**Why it matters:** When you make a decision based on graph data, you can trace every fact back to its source and understand the confidence level.

### How do I see the provenance of a graph entity?

**Via UI:**
1. Click any entity in the graph canvas
2. Open the "Provenance" panel in the entity inspector
3. View source, pipeline, timestamp, confidence, and tags
4. Click "View Source Document" to see the original data

**Via API:**
```graphql
query {
  entity(id: "entity-123") {
    id
    name
    provenance {
      source {
        system
        documentId
        url
      }
      pipeline {
        name
        version
        timestamp
      }
      confidence
      tags
    }
  }
}
```

### What is the difference between "confidence" and "simulation flag"?

- **Confidence**: A **probabilistic measure** (0.0 to 1.0) indicating how certain we are about a fact. Examples:
  - `0.95`: High confidence (e.g., extracted from structured data with validation)
  - `0.60`: Medium confidence (e.g., inferred from fuzzy entity resolution)
  - `1.0` or `"deterministic"`: Absolute certainty (e.g., user-entered ground truth)

- **Simulation Flag**: A **binary marker** indicating whether data came from a model/simulation rather than direct observation. Examples:
  - `simulation: true`: Data generated by predictive model, scenario analysis, or Monte Carlo simulation
  - `simulation: false`: Data observed from real-world sources (sensors, logs, human reports)

**Why both?** A simulation can have high confidence (the model is accurate), but it's still not observed reality. The flag ensures analysts don't confuse model outputs with real-world data.

### Can I filter the graph to show only high-confidence data?

**Yes.** The graph UI and API support filtering by confidence and provenance attributes:

**UI Filters:**
- **Confidence Threshold**: Show only entities with `confidence >= 0.8`
- **Exclude Simulations**: Hide entities with `simulation: true`
- **Source Filter**: Show only data from specific sources (e.g., "STIX-FEED-A")
- **Recency Filter**: Show only data ingested in the last 30 days

**API Filters:**
```graphql
query {
  entities(
    filter: {
      provenance: {
        confidence: { gte: 0.8 }
        tags: { notContains: "simulation" }
        source: { system: "STIX-FEED-A" }
      }
    }
  ) {
    id
    name
    provenance { confidence }
  }
}
```

### How does provenance work with AI-generated insights?

AI-generated insights (e.g., from the Copilot) include **complete provenance chains**:

1. **Query Generation**: Copilot translates natural language to a graph query
2. **Query Preview**: Analyst reviews the query before execution (transparency)
3. **Result Provenance**: Each result includes provenance metadata (source, confidence, etc.)
4. **Citation Chain**: AI answers include citations linking back to source documents
5. **Audit Trail**: The full interaction (prompt, query, results, user approval) is logged

**Example:**
- **User Prompt**: "Show me all organizations linked to suspicious IP addresses"
- **Generated Query**: `MATCH (o:Organization)-[:USES]->(ip:IPAddress) WHERE ip.suspicious = true RETURN o`
- **Result Provenance**: Each organization includes `provenance.source = "Firewall-Logs-2025-01"` and `provenance.confidence = 0.92`
- **Citation**: AI answer cites "Firewall Logs (Jan 2025)" as the evidence source

### Can I export provenance metadata with my data?

**Yes.** All data exports include optional provenance metadata:

**CSV Export:**
```csv
entity_id,entity_name,source_system,confidence,timestamp
e-123,Acme Corp,STIX-FEED-A,0.95,2025-01-15T10:30:00Z
```

**JSON Export:**
```json
{
  "id": "e-123",
  "name": "Acme Corp",
  "provenance": {
    "source": { "system": "STIX-FEED-A" },
    "confidence": 0.95,
    "timestamp": "2025-01-15T10:30:00Z"
  }
}
```

**GraphQL Export** includes full provenance objects (see API documentation).

---

## API Versioning & Stability

### How does Summit version its APIs?

Summit uses **Semantic Versioning (SemVer)** for all APIs:

**Format:** `MAJOR.MINOR.PATCH`

- **MAJOR**: Breaking changes (require client updates)
- **MINOR**: New features (backward-compatible)
- **PATCH**: Bug fixes (backward-compatible)

**Current Versions:**
- REST API: `v1.0.0` (Stable, Supported)
- GraphQL API: `v2.1.0` (Stable, Supported)
- WebSocket API: `v1.0.0` (Beta, Preview)

### What is a "breaking change"?

Breaking changes require a MAJOR version bump and include:
- Removing endpoints or fields
- Changing required fields to optional (or vice versa)
- Modifying response structure or data types
- Changing authentication mechanisms
- Altering error codes or error response formats

**Examples:**
- ❌ **Breaking**: Removing `GET /api/v1/entity` endpoint
- ❌ **Breaking**: Changing `{ "name": "John" }` to `{ "fullName": "John" }`
- ✅ **Non-Breaking**: Adding new optional field `{ "name": "John", "email": "john@example.com" }`
- ✅ **Non-Breaking**: Adding new endpoint `GET /api/v1/entities/search`

### How much notice do I get before a breaking change?

**Minimum 6 months advance notice.**

**Timeline:**
1. **Announcement (T-0)**: Deprecation announced via email, release notes, and documentation
2. **Warning Period (T+3 months)**: HTTP `Warning` headers added to deprecated endpoints
3. **Parallel Support (T+0 to T+6 months)**: Old and new versions supported simultaneously
4. **End of Life (T+6 months)**: Old version becomes unavailable

**Example Timeline:**
- **Jan 1, 2025**: `/api/v1/entity` endpoint deprecated, `/api/v2/entities` announced
- **Apr 1, 2025**: HTTP `Warning: 299` headers added to v1 endpoint responses
- **Jan 1, 2025 - Jul 1, 2025**: Both v1 and v2 endpoints available
- **Jul 1, 2025**: v1 endpoint removed, only v2 available

### How will I know if I'm using a deprecated endpoint?

**Multiple notification channels:**

1. **Email Notifications**: Sent to registered API consumers
2. **HTTP Headers**: Deprecated endpoints return:
   ```http
   Warning: 299 - "This API version will be deprecated on 2025-07-01"
   Sunset: Mon, 01 Jul 2025 23:59:59 GMT
   ```
3. **API Documentation**: Deprecated endpoints are clearly marked in OpenAPI specs
4. **Dashboard**: Customer dashboard shows API usage with deprecation warnings
5. **Release Notes**: Deprecations highlighted in every release announcement

### Can I run multiple API versions in parallel during migration?

**Yes.** Summit supports parallel version operation during the deprecation period:

- **v1 Endpoint**: `https://api.summit.example.com/v1/entity`
- **v2 Endpoint**: `https://api.summit.example.com/v2/entities`

You can migrate your integrations incrementally:
1. Test new v2 endpoints in staging
2. Migrate critical integrations first
3. Run both versions in production during transition
4. Complete migration before v1 EOL

**Migration Guides** are provided for every breaking change with code examples and best practices.

### Are there SDKs available?

**Yes.** Auto-generated SDKs are available for:

- **TypeScript/JavaScript**: `@intelgraph/sdk` (npm)
- **Python**: `intelgraph-sdk` (PyPI)

**SDK Guarantees:**
- SDKs are generated from OpenAPI specifications
- SDK version matches API version (e.g., `@intelgraph/sdk@2.1.0` → API `v2.1.0`)
- Type-safe: TypeScript SDK includes strict types; Python SDK includes type hints
- Tested: SDKs are tested against corresponding API version in CI

**Installation:**
```bash
# TypeScript
npm install @intelgraph/sdk@2.1.0

# Python
pip install intelgraph-sdk==2.1.0
```

### How does GraphQL versioning work?

GraphQL follows a **continuous evolution model** rather than strict versioning:

- **Deprecation Directives**: Fields are marked with `@deprecated` rather than removed
- **Additive Changes**: New fields are added without breaking existing queries
- **Client Control**: Clients explicitly request fields, so new fields don't break old queries

**Example:**
```graphql
type Entity {
  id: ID!
  name: String!
  type: String! @deprecated(reason: "Use 'entityType' instead")
  entityType: EntityType!  # New field, old queries still work
}
```

Clients can query either `type` or `entityType` during the migration period.

---

## Migration from MVP-3 to GA

### Is migration required or optional?

**Required for continued support.** MVP-3 will reach End-of-Life (EOL) **6 months after GA release**.

**Timeline:**
- **GA Release**: October 31, 2025
- **MVP-3 EOL Announcement**: Same day as GA release
- **MVP-3 Support Ends**: April 30, 2026
- **MVP-3 Deprecated**: No security updates or bug fixes after EOL

### What's involved in the migration?

**Four main areas:**

1. **API Updates**: Update client code to use v2 endpoints (migration guide provided)
2. **Data Model**: Add provenance metadata to existing entities (migration script provided)
3. **Authentication**: Migrate from session-based auth to OIDC (SSO configuration guide provided)
4. **Configuration**: Update environment variables to new naming conventions (mapping table provided)

**Estimated Effort:**
- Small deployment (< 10 integrations): 1-2 weeks
- Medium deployment (10-50 integrations): 1-2 months
- Large deployment (> 50 integrations): 2-3 months

### Is there a migration tool?

**Yes.** We provide:

1. **Data Migration Script**: Adds provenance metadata to existing graph data
   ```bash
   ./scripts/migrate-mvp3-to-ga.sh --dry-run  # Preview changes
   ./scripts/migrate-mvp3-to-ga.sh --execute  # Apply migration
   ```

2. **API Compatibility Checker**: Scans your client code for deprecated API usage
   ```bash
   npx @intelgraph/migration-checker ./src
   ```

3. **Configuration Migrator**: Updates environment variables and config files
   ```bash
   ./scripts/migrate-config.sh --input .env.mvp3 --output .env.ga
   ```

See `/docs/MIGRATION-v2.0.0-to-MVP-3.md` for detailed instructions.

### Can I test GA before migrating production?

**Yes.** We recommend:

1. **Staging Environment**: Deploy GA to a staging environment first
2. **Data Snapshot**: Copy a snapshot of production data to staging
3. **Integration Testing**: Test all integrations against GA API
4. **Parallel Run**: Run MVP-3 and GA in parallel for validation
5. **Cutover**: Switch production traffic to GA after successful validation

**Migration Support:**
- Dedicated Slack channel for migration questions
- Office hours with engineering team
- Migration consulting available for enterprise customers

### Will my data be lost during migration?

**No.** The migration process is **non-destructive**:

1. **Data Preservation**: All existing entities, edges, and attributes are preserved
2. **Additive Changes**: Migration adds provenance metadata without removing existing data
3. **Rollback Support**: Migration script supports rollback if issues are detected
4. **Backup Recommended**: We recommend backing up databases before migration (runbook provided)

**Backup Process:**
```bash
# Backup Neo4j graph database
./scripts/backup-neo4j.sh

# Backup PostgreSQL metadata
./scripts/backup-postgres.sh

# Backup Redis cache (optional)
./scripts/backup-redis.sh
```

### What support is available during migration?

**Enterprise customers receive:**
- **Dedicated migration engineer** assigned to your account
- **Migration project plan** with timeline and milestones
- **Weekly check-in calls** during migration period
- **24/7 support** for migration-related issues
- **Post-migration validation** and health checks

**Standard customers receive:**
- **Migration documentation** and guides
- **Community Slack channel** for questions
- **Weekly office hours** with engineering team
- **Email support** with 48-hour SLA

---

## Security & Threat Model

### Where can I see Summit's threat model?

Summit's threat model is **publicly documented** at `/docs/SECURITY_THREAT_MODEL.md`.

It includes:
- **Assets & Classification**: What we protect (intelligence graph, user profiles, audit logs, etc.)
- **Trust Boundaries**: External→Edge→App→Data→Agents
- **Threat Actors**: External attackers, malicious insiders, compromised agents, supply chain
- **STRIDE Analysis**: Spoofing, Tampering, Repudiation, Information Disclosure, DoS, Privilege Escalation
- **Mitigations**: Documented status (Mitigated, Planned, Partially Mitigated)
- **Residual Risks**: Transparently disclosed accepted risks

### What security controls are implemented?

**Authentication:**
- OIDC/SAML SSO integration
- JWT tokens with 1-hour expiry
- Multi-factor authentication (MFA) support
- Session management with automatic timeout

**Authorization:**
- Role-Based Access Control (RBAC)
- Attribute-Based Access Control (ABAC)
- Multi-tenant isolation (PostgreSQL RLS + Neo4j namespaces)
- Compartment boundaries with explicit grants
- Reason-for-access prompts for sensitive data

**Data Protection:**
- Encryption at rest (AES-256)
- Encryption in transit (TLS 1.3)
- PII redaction middleware
- DLP (Data Loss Prevention) scanning
- K-anonymity assessment for exports

**Network Security:**
- API rate limiting (token bucket + adaptive)
- mTLS service mesh (rolling out Sprint N+11)
- Network policies (Kubernetes NetworkPolicy)
- Web Application Firewall (WAF) integration

**Supply Chain Security:**
- SLSA Level 3 compliance
- SBOM (Software Bill of Materials) generation
- Cosign artifact signing
- Dependency vulnerability scanning (daily)
- Automated security updates

### How are audit logs protected from tampering?

Audit logs are **immutable and tamper-evident**:

1. **Append-Only**: Logs are write-once, read-many (WORM storage simulation)
2. **Cryptographic Chaining**: Each log entry includes a hash of the previous entry
3. **Correlation IDs**: Distributed actions are linked via correlation IDs
4. **Periodic Sealing**: Logs are periodically "sealed" with cryptographic checksum
5. **Integrity Checks**: Automated integrity verification detects tampering

**Tamper Detection:**
```bash
# Verify audit log integrity
./scripts/verify-audit-logs.sh --start 2025-01-01 --end 2025-01-31

# Output
✅ All log entries verified (12,458 entries, 0 inconsistencies)
```

### What happens if a vulnerability is discovered?

**Security Incident Response Process:**

1. **Triage (0-24 hours)**: Security team assesses severity (Critical, High, Medium, Low)
2. **Patch Development (24-72 hours)**: Develop and test fix
3. **Customer Notification (within 72 hours)**: Notify affected customers with severity, impact, and recommended actions
4. **Patch Deployment**: Release hotfix with automated or manual deployment guidance
5. **Post-Mortem**: Publish incident report with root cause analysis and preventative measures

**Critical Vulnerabilities:**
- Customers notified immediately (email, Slack, phone)
- Emergency patch released within 72 hours
- Automated deployment available for cloud customers
- Post-incident report published within 2 weeks

### Is Summit certified for government use?

**Current Status:**
- ✅ **SOC 2 Type II**: Alignment in progress, certification expected Q1 2026
- ✅ **SLSA Level 3**: Supply chain compliance implemented
- ⏸️ **FedRAMP**: Not yet certified; air-gap deployment guide available for federal use cases
- ⏸️ **ISO 27001**: Alignment in progress

**Government Deployments:**
- **Air-Gap Mode**: Deployment guide available at `/docs/AIR_GAP_DEPLOY_V1_README.md`
- **Classification Support**: Multi-level security (MLS) with ABAC enforcement
- **Audit Compliance**: NIST 800-53 control mapping available

Contact sales for government-specific deployment guidance.

---

## AI & Copilot Features

### How does the AI Copilot work?

The **AI Copilot** translates natural language questions into structured graph queries:

1. **Natural Language Input**: Analyst types a question (e.g., "Show me suspicious transactions over $10k")
2. **LLM Translation**: Copilot uses LLM to generate a Cypher or GraphQL query
3. **Query Preview**: Analyst reviews the generated query before execution
4. **Governance Check**: OPA policy evaluates whether the query is allowed
5. **Execution**: If approved, query executes against the graph
6. **Results + Provenance**: Results include provenance metadata and citations

**Key Safeguard:** Analysts always see and approve queries before execution—no "blind" AI execution.

### Can the AI Copilot access data I'm not authorized to see?

**No.** The AI Copilot is subject to the same governance policies as manual queries:

- **RBAC/ABAC Enforcement**: OPA evaluates Copilot-generated queries against your permissions
- **Tenant Isolation**: Copilot cannot generate queries crossing tenant boundaries
- **Classification Limits**: Copilot-generated queries are filtered by your clearance level
- **Audit Trail**: All Copilot queries are logged with user, prompt, query, and results

**Example:**
- **User**: Clearance level "Secret", Tenant "Acme Corp"
- **Copilot Query**: `MATCH (n) WHERE n.classification = 'Top Secret' RETURN n`
- **OPA Decision**: `DENY` (user clearance insufficient)
- **Result**: Query blocked, denial logged in audit trail

### What prevents AI hallucination or fabricated data?

**Multiple safeguards:**

1. **Schema Validation**: Copilot queries are validated against the graph schema (can't query non-existent entities)
2. **Query Preview**: Analysts review queries before execution (catch nonsensical queries)
3. **Provenance Enforcement**: All results include provenance metadata (analysts can verify sources)
4. **Citation Requirements**: RAG answers must cite source documents (no fabrication without sources)
5. **Guardrails**: Constitutional AI prompts prevent jailbreaks and out-of-scope queries

**Example Hallucination Prevention:**
- **User**: "Show me the secret meetings between Entity A and Entity B"
- **Copilot**: Generates query `MATCH (a:Entity)-[:MET_WITH]->(b:Entity)`
- **Schema Validation**: `:MET_WITH` relationship doesn't exist in schema
- **Result**: Query rejected with error "Relationship type 'MET_WITH' not found"

### Can I use my own LLM or must I use yours?

**Flexible LLM Integration:**

- **Bring Your Own Model (BYOM)**: Configure Copilot to use your own LLM endpoint
  - OpenAI API
  - Azure OpenAI
  - Anthropic Claude
  - Self-hosted models (LLaMA, Mistral, etc.)

- **Configuration**:
  ```yaml
  copilot:
    llm:
      provider: "azure-openai"  # or "openai", "anthropic", "custom"
      endpoint: "https://your-endpoint.azure.com"
      model: "gpt-4"
      api_key: "${LLM_API_KEY}"
  ```

**Data Privacy:** When using BYOM, ensure your LLM provider's data retention policies align with your compliance requirements.

### Does the Copilot learn from my data?

**No.** The Copilot is **stateless and does not train on your data**:

- **Zero Retention**: Prompts and queries are not sent to LLM providers for training
- **Ephemeral Context**: Each Copilot session is independent (no memory across sessions)
- **Opt-Out**: Even if using OpenAI/Anthropic, we configure "zero data retention" mode
- **Self-Hosted Option**: Use a self-hosted LLM for complete data isolation

**Audit Trail:** All Copilot interactions are logged locally in your audit logs for compliance.

---

## Performance & Scalability

### What are the performance SLOs?

**Service Level Objectives (SLOs):**

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Availability** | 99.9% uptime | Tier-0 APIs, monthly |
| **Latency (Simple Queries)** | p95 ≤ 350ms | GraphQL queries, depth ≤ 1 |
| **Latency (Complex Queries)** | p95 ≤ 1500ms | GraphQL queries, depth ≤ 3 |
| **Ingestion Throughput** | 10,000 records/sec | Streaming ETL pipeline |
| **Error Rate** | < 1% | HTTP/GraphQL requests |
| **Job Success Rate** | > 99% | Background ingestion jobs |

**Monitoring:** Real-time SLO dashboards available at `/observability/dashboards/slo.json`.

### How many concurrent users can Summit support?

**Tested Capacity:**
- **100 concurrent users**: Validated in load testing
- **1,000+ concurrent users**: Supported with horizontal scaling (Kubernetes autoscaling)

**Scalability:**
- **Stateless Services**: API Gateway, GraphQL resolvers scale horizontally
- **Database Scaling**: Neo4j clustering for graph queries, PostgreSQL read replicas for metadata
- **Caching**: Redis caching for frequently accessed queries

**Recommendation:** For > 1,000 concurrent users, contact support for capacity planning and architecture review.

### What is the largest graph size supported?

**Validated Configurations:**
- **10 million nodes**: Tested with acceptable query performance
- **50 million edges**: Tested with graph traversal depth ≤ 3

**Performance Considerations:**
- Complex queries (depth > 3, large subgraphs) may exceed latency SLOs
- Graph complexity limits enforced: max query depth = 5, max results = 10,000
- Pagination recommended for large result sets

**Scaling Beyond:**
- Graph partitioning strategies available for > 100M nodes
- Consult architecture team for multi-billion node deployments

### Can Summit run in air-gapped environments?

**Yes.** Air-gap deployment is supported:

- **Deployment Guide**: `/docs/AIR_GAP_DEPLOY_V1_README.md`
- **Requirements**: Kubernetes cluster with local container registry
- **Dependencies**: All container images and dependencies bundled
- **LLM Support**: Self-hosted LLM models (no internet connectivity required)

**Typical Air-Gap Architecture:**
- Kubernetes cluster (on-premises)
- Local container registry (Harbor, Artifactory)
- Self-hosted LLM (LLaMA, Mistral)
- Offline license validation

---

## Deployment & Operations

### What deployment options are supported?

**Supported Platforms:**

1. **Kubernetes (Recommended for Production)**
   - Helm charts provided (`/helm/summit/`)
   - Supports AWS EKS, Azure AKS, Google GKE, on-premises Kubernetes
   - Autoscaling, rolling updates, health checks included

2. **Docker Compose (Development/Small Deployments)**
   - Single-command startup (`make up`)
   - Suitable for development, demos, small on-premises deployments
   - Not recommended for production (no HA, limited scaling)

3. **Air-Gapped Environments**
   - See `/docs/AIR_GAP_DEPLOY_V1_README.md`

### What are the infrastructure requirements?

**Minimum Production Configuration:**

- **Compute**: 4 vCPUs, 16 GB RAM (for API + UI services)
- **Database**:
  - PostgreSQL 15+: 4 vCPUs, 16 GB RAM, 100 GB storage
  - Neo4j 5.x: 8 vCPUs, 32 GB RAM, 500 GB SSD storage
  - Redis 7+: 2 vCPUs, 8 GB RAM
- **Storage**: 1 TB minimum (adjust based on data volume)
- **Network**: 1 Gbps bandwidth, TLS 1.3 support

**Recommended Production Configuration:**
- 3x API replicas for HA
- Neo4j cluster (3 nodes) for read scaling
- PostgreSQL primary + 2 read replicas
- Redis Sentinel for cache HA

See `/docs/INFRASTRUCTURE.md` for detailed sizing guidance.

### How do I monitor Summit in production?

**Observability Stack:**

- **Metrics**: Prometheus scrapes metrics from all services
  - API latency, error rates, throughput
  - Database query performance
  - Ingestion job metrics
  - SLO compliance dashboards

- **Logs**: Structured JSON logs with correlation IDs
  - Centralized logging (Loki, Elasticsearch, Datadog)
  - Security event logs
  - Audit logs

- **Traces**: Distributed tracing with OpenTelemetry
  - End-to-end request tracing
  - Service dependency mapping
  - Latency bottleneck identification

**Pre-Built Dashboards:**
- SLO Dashboard: `/observability/dashboards/slo.json`
- API Health: `/observability/dashboards/api-health.json`
- Ingestion Pipeline: `/observability/dashboards/ingestion.json`

**Alerting:**
- Prometheus AlertManager rules included
- Pre-configured alerts for SLO violations, security events, job failures

### How are upgrades handled?

**Upgrade Process:**

1. **Review Release Notes**: Check `/docs/RELEASE_NOTES_*.md` for breaking changes
2. **Backup Databases**: Run backup scripts before upgrade
3. **Deploy to Staging**: Test upgrade in staging environment
4. **Run Migration Scripts**: Apply database migrations if required
5. **Deploy to Production**: Use rolling update strategy (zero downtime)
6. **Validate SLOs**: Monitor SLO dashboard during and after deployment
7. **Rollback if Needed**: Automated rollback on SLO violations

**Kubernetes Upgrades:**
```bash
# Helm upgrade with rollback on failure
helm upgrade summit ./helm/summit \
  --namespace summit \
  --timeout 10m \
  --wait \
  --atomic  # Auto-rollback on failure
```

**Downtime:** Zero-downtime upgrades for PATCH and MINOR versions. MAJOR versions may require brief maintenance window (typically < 15 minutes).

---

## Pricing & Licensing

### What is the pricing model?

**Pricing details are available from your sales representative.** Typical models include:

- **Per-User Licensing**: Based on number of active analysts
- **Per-Tenant Licensing**: Based on number of tenant namespaces
- **Data Volume Licensing**: Based on graph size (nodes + edges)
- **Enterprise Licensing**: Unlimited users with committed contract

Contact sales@summit.example.com for a custom quote.

### Is there a free tier or trial?

**Yes.** We offer:

- **Developer Tier (Free)**: Up to 10 users, 100K nodes, community support
- **30-Day Trial**: Full enterprise features, up to 100 users, dedicated support
- **Pilot Program**: Extended evaluation (90 days) for strategic customers

Sign up at [https://summit.example.com/trial](https://summit.example.com/trial).

### What support options are available?

**Support Tiers:**

1. **Community (Free Tier)**
   - Community Slack channel
   - Documentation and guides
   - GitHub issue tracker
   - Best-effort response

2. **Standard (Included with Paid Plans)**
   - Email support (48-hour SLA)
   - Weekly office hours
   - Security updates
   - Bug fix releases

3. **Enterprise (Premium Add-On)**
   - 24/7 support (4-hour SLA for Critical, 8-hour for High)
   - Dedicated Slack channel
   - Named support engineer
   - Quarterly business reviews
   - Custom SLAs available

See `/docs/SUPPORT_PLAN.md` for detailed support policies.

---

## Roadmap & Post-GA Features

### What features are planned for post-GA releases?

**Deferred to Post-GA (based on customer feedback):**

- **Advanced Analytics**:
  - Real-time community detection
  - Predictive anomaly scoring
  - Advanced Course-of-Action (COA) planner

- **Advanced Integrations**:
  - Magic Paste (auto-entity extraction from unstructured text)
  - Visual chat snippets (embed graphs in chat)
  - Bi-directional MISP sync

- **UX Enhancements**:
  - Advanced graph animations
  - Cognitive load guardrails (adaptive dimming)
  - Drag-and-drop narrative builder

- **Operational Tools**:
  - Predictive latency heatmaps
  - Smart query budgeter with optimization hints

See `/docs/GA_CUT_LIST.md` for full deferred feature list.

### Will there be a public roadmap?

**Yes.** We plan to publish:

- **Quarterly Roadmap**: High-level themes and priorities
- **Feature Voting**: Customer input on post-GA feature prioritization
- **Beta Program**: Early access to upcoming features

**Roadmap Transparency:**
- Public: General themes and timelines
- Customer Portal: Detailed feature cards, status updates, and release ETAs

### How do I request a feature?

**Feature Request Process:**

1. **Submit Request**: via customer portal, email, or Slack
2. **Triage**: Product team evaluates feasibility, impact, and alignment
3. **Prioritization**: Weighted by customer votes, strategic value, and effort
4. **Communication**: Requesters notified of status (Planned, Under Review, Declined)
5. **Delivery**: If prioritized, feature is added to roadmap with target quarter

**Enterprise Customers:** Custom feature development available via professional services engagement.

### What items are explicitly excluded from the roadmap ("Won't Build")?

**Summit will not build features that:**

- Violate ethical guidelines (e.g., social credit scoring, bulk surveillance facial recognition)
- Bypass consent or privacy protections (e.g., unlogged access, consent-bypassing tools)
- Create kinetic targeting or weaponization capabilities
- Implement dark-pattern UX or manipulative interfaces
- Monetize sensitive personal data
- Use fully opaque models without explainability

See `/docs/GA_CORE_OVERVIEW.md` Section 1.3 for full "Won't Build" list.

---

## Additional Resources

- **Documentation Home**: `/docs/README.md`
- **API Reference**: `/docs/API_DOCUMENTATION.md`
- **Security**: `/docs/SECURITY.md`
- **Support Portal**: [https://support.summit.example.com](https://support.summit.example.com)
- **Community Slack**: [https://summit-community.slack.com](https://summit-community.slack.com)

---

**Have more questions?**

- **Sales Inquiries**: sales@summit.example.com
- **Technical Support**: support@summit.example.com
- **Security Issues**: security@summit.example.com
- **General Questions**: info@summit.example.com

---

*Last Updated: October 2025*
*Document Version: 1.0*
