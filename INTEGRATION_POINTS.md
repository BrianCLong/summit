# Summit Platform - Integration Points Quick Reference

## Critical Integration Hubs

### 1. AUTHORIZATION HUB: `authz-gateway`
**Location:** `/home/user/summit/services/authz-gateway/`
**Purpose:** Central authorization and authentication point
**Key Endpoints:**
- `POST /authorize` - Main authorization decision point
- `GET /subject/:id/attributes` - Resolve user attributes
- `GET /resource/:id/attributes` - Resolve resource attributes
- `POST /auth/step-up` - Step-up authentication

**Policy Evaluation:**
- Integration: Open Policy Agent (OPA) at `OPA_URL`
- Input: user, resource, action, context
- Output: { allow: boolean, reason: string, obligations: [] }

**Integration Pattern:**
```javascript
// Make authorization request
POST /authorize
{
  subject: { id: "user-123" },
  resource: { id: "resource-456", tenantId: "tenant-123" },
  action: "dataset:read"
}
```

---

### 2. PROVENANCE HUB: `prov-ledger`
**Location:** `/home/user/summit/services/prov-ledger/`
**Purpose:** Centralized provenance tracking and audit trail
**Key Endpoints:**
- `POST /claims` - Create claim record
- `POST /provenance` - Link provenance chains
- `GET /export/manifest` - Generate compliance manifest

**Policy Requirements:**
- Header: `x-authority-id` - Authority making the claim
- Header: `x-reason-for-access` - Purpose of access
- Support: dry-run mode via `POLICY_DRY_RUN` env var

**Integration Pattern:**
```bash
curl -X POST http://prov-ledger:4010/claims \
  -H "x-authority-id: audit-service" \
  -H "x-reason-for-access: compliance-audit" \
  -H "Content-Type: application/json" \
  -d '{
    "content": { "action": "data_accessed", "user_id": "123" },
    "metadata": { "session_id": "abc-def" }
  }'
```

---

### 3. AUDIT HUB: `audit-log` / `auditlake`
**Location:** 
- `/home/user/summit/services/audit-log/`
- `/home/user/summit/services/auditlake/`

**Purpose:** Central audit event aggregation
**Integration Points:**
- Receives all policy decisions
- Stores all data access events
- Links to provenance ledger
- Exports to compliance reporting

**Audit Event Schema:**
```typescript
{
  ts: string,           // ISO timestamp
  user: User,           // User object
  action: string,       // Action performed
  details: any,         // Additional context
  ip: string,           // Source IP
  authority_id?: string,
  reason_for_access?: string
}
```

---

### 4. ORCHESTRATION HUB: `conductor`
**Location:** `/home/user/summit/services/conductor/`
**Purpose:** Workflow orchestration with provenance tracking
**Key Features:**
- Routes requests through policy gates
- Records all transformations
- Tracks model metadata
- Enforces budget constraints

**Provenance Steps:**
- router → generator → critic → evaluator → normalizer → planner → coordinator
- Each step records input/output hashes
- Policy metadata (retention, purpose, license class)

**Integration Pattern:**
```typescript
// Conductor provenance tracking
{
  reqId: "req-123",
  step: "generator",
  inputHash: "sha256:abc...",
  outputHash: "sha256:def...",
  modelId: "gpt-4",
  policy: {
    retention: "standard-365d",
    purpose: "intelligence-analysis"
  }
}
```

---

### 5. API HUB: `api-gateway`
**Location:** `/home/user/summit/services/api-gateway/`
**Purpose:** GraphQL API gateway with policy enforcement
**Delegation Pattern:**
- Entities → graph service
- Relationships → graph service
- XAI → graph-xai service
- Provenance → prov-ledger service

**Required Headers (All Requests):**
- `x-authority-id` - Authority identifier
- `x-reason-for-access` - Access purpose
- Standard OAuth/JWT tokens

---

## Cross-Service Integration Points

### Authorization → Provenance Flow
```
1. Request arrives at api-gateway
2. authz-gateway validates authorization
3. API records to audit-log
4. Conductor records to prov-ledger
5. Policy-audit validates compliance
```

### Data Access → Audit → Provenance Flow
```
1. Graph service processes query
2. Record in data-quality lineage
3. Record input/output hashes
4. Link to authority binding
5. Export manifest for compliance
```

---

## Key Packages for Integration

### 1. **authority-compiler**
**Purpose:** Runtime policy enforcement
**Usage:**
```typescript
import { AuthorityCompiler } from '@summit/authority-compiler';

const compiler = new AuthorityCompiler();
const policy = compiler.compile(policyText);
const decision = compiler.evaluate(policy, context);
```

### 2. **prov-ledger-sdk**
**Purpose:** TypeScript client for provenance
**Usage:**
```typescript
import { provLedgerClient } from '@intelgraph/prov-ledger-sdk';

const client = provLedgerClient(baseUrl);
const claim = await client.createClaim({
  content: { ... },
  authority: authorityId
});
```

### 3. **maestro-core**
**Purpose:** Orchestration engine
**Integration:**
- OPA policy evaluation
- Plugin system for extensibility
- Web scraping and data collection

---

## Middleware Integration Chain

### Recommended Order:
1. **requestId.ts** - Add correlation ID
2. **auth.ts** - Validate authentication
3. **authority.ts** - Verify authority binding
4. **opa-abac.ts** - Evaluate policy
5. **audit-logger.ts** - Log decision
6. **rfa.ts** - Validate reason-for-access
7. **pii-redaction.ts** - Mask sensitive data
8. **dlpMiddleware.ts** - Data loss prevention
9. **rateLimit.ts** - Apply rate limiting

### Example Express Setup:
```javascript
app.use(requestId());
app.use(auth());
app.use(authority());
app.use(opaAbac(opaClient));
app.use(auditLogger());
app.use(rfa());
app.use(piiRedaction());
app.use(dlpMiddleware());
app.use(rateLimit());
```

---

## Environment Variables for Integration

### Authentication & Authorization:
```bash
OPA_URL=http://localhost:8181/v1/data/summit/abac/decision
POLICY_DRY_RUN=false
JWT_SECRET=<secret>
JWKS_URL=<issuer>/.well-known/jwks.json
```

### Service URLs:
```bash
PROV_LEDGER_URL=http://prov-ledger:4010
AUTHZ_GATEWAY_URL=http://authz-gateway:4000
AUDIT_LOG_URL=http://audit-log:4020
GRAPH_SERVICE_URL=http://graph-core:4001
GRAPH_XAI_URL=http://graph-xai:4002
```

### Data & Storage:
```bash
DATABASE_URL=postgres://postgres:postgres@localhost:5432/summit
NEO4J_URL=neo4j://localhost:7687
ELASTICSEARCH_URL=http://localhost:9200
```

### Compliance:
```bash
RETENTION_DEFAULT=standard-365d
COMPLIANCE_MODE=strict
AUDIT_EXPORT_SCHEDULE=0 0 * * *  # Daily export
```

---

## Common Integration Patterns

### Pattern 1: Policy-Gated Access
```
Request → AuthZ Check → Obligation Enforcement → Action → Audit
```

### Pattern 2: Provenance Tracking
```
Action → Hash Input → Record Step → Hash Output → Link Chain → Export Manifest
```

### Pattern 3: Audit Trail
```
User Action → Audit Log → Policy Audit → Compliance Check → Report Export
```

### Pattern 4: Attribute-Based Control
```
User Attributes + Resource Attributes + Context → OPA → Decision → Obligations
```

---

## Testing Integration Points

### Unit Tests:
- **authz-gateway:** `tests/security.test.ts`, `tests/fuzz/governance-gate.fuzz.test.ts`
- **prov-ledger:** Implicit tests via health checks

### Integration Tests:
- Start authz-gateway, prov-ledger, OPA
- Run GraphQL mutations through api-gateway
- Verify audit logs created
- Verify provenance claims recorded

### Example Test:
```bash
# 1. Create claim
curl -X POST http://localhost:4010/claims \
  -H "x-authority-id: test-auth" \
  -d '{"content": {"test": true}}'

# 2. Verify claim exists
curl http://localhost:4010/claims/{id}

# 3. Check provenance
curl "http://localhost:4010/provenance?claimId={id}"

# 4. Verify hash
curl -X POST http://localhost:4010/hash/verify \
  -d '{"content": {...}, "expectedHash": "..."}'
```

---

## Monitoring Integration Health

### Health Checks:
- `authz-gateway` - metrics at `/metrics`
- `prov-ledger` - health at `/health`
- Audit services - log output monitoring

### Key Metrics:
- Authorization decision latency
- OPA policy evaluation time
- Provenance ledger write latency
- Audit log processing lag

### Observable Events:
- `policy_deny` - Authorization denial
- `prov_claim_created` - Provenance record
- `audit_event` - Audit log entry
- `opa_error` - Policy evaluation error

