# Golden Path E2E Test

**Purpose**: One-command validation of the end-to-end flow from data seeding to audit/provenance verification.

**Status**: Implemented for October 2025 delivery

---

## Overview

The Golden Path E2E test validates the complete system workflow:

1. **Seed test data** - Create entities and relationships
2. **Execute NL→Cypher query** - Retrieve seeded data
3. **Attempt export** - Test risky route protection
   - Without step-up → blocked with explanation
   - With step-up → allowed with audit evidence
4. **Verify audit/provenance** - Ensure all events logged correctly
5. **Verify policy outcomes** - OPA policies enforce correctly

---

## Running the Test

### Local Execution

```bash
# Run the complete golden path test
make e2e:golden

# Or run the script directly
./scripts/e2e/golden-path.sh
```

### CI Execution

The test runs automatically in GitHub Actions:

- On every PR to `main`
- On every push to `main`
- Daily at 6 AM UTC (scheduled)
- Manual workflow dispatch

**Workflow**: `.github/workflows/e2e-golden-path.yml`

---

## Test Flow

### Step 1: Seed Test Data

Creates 3 test entities:

- **Person**: Alice Johnson (e2e_entity_001)
- **Organization**: ACME Corporation (e2e_entity_002)
- **Document**: Q4 2025 Report (e2e_entity_003)

Creates 2 relationships:

- Alice WORKS_AT ACME
- Alice AUTHORED Q4 Report

**Assertion**: Seed returns `success: true`

### Step 2: Execute NL→Cypher Query

Queries for entities of type "Person":

```graphql
query {
  entities(filter: { type: "Person" }) {
    id
    type
    properties
  }
}
```

**Assertion**: Response contains `e2e_entity_001`

### Step 3a: Attempt Export Without Step-Up

Tries to export entities without step-up authentication:

```bash
POST /api/export
Authorization: Bearer <token>
```

**Expected Response**: `403 Forbidden`

**Assertions**:
- Status code is 403
- Response contains "Step-up authentication required"
- Response includes `required_action: "webauthn_stepup"`
- Help text provided

### Step 3b: Get Step-Up Token

For E2E testing, a mock step-up token is generated:

```json
{
  "credential_id": "e2e_test_credential",
  "timestamp": <current_timestamp_ns>,
  "verified": true,
  "authenticator_data": "mock_auth_data",
  "attestation_reference": "e2e_test_attestation"
}
```

### Step 3c: Attempt Export With Step-Up

Retries export with step-up authentication:

```bash
POST /api/export
Authorization: Bearer <token>
X-StepUp-Auth: <stepup_token>
```

**Expected Response**: `200 OK`

**Assertions**:
- Status code is 200
- Response contains `success: true`

### Step 4: Verify Audit/Provenance

Retrieves recent audit logs and provenance data:

```bash
GET /api/audit/recent?limit=10
GET /api/provenance/e2e_entity_001
```

**Audit Assertions**:
- Denied event exists with `action: "denied_missing_stepup"`
- Allowed event exists with `action: "allowed_with_stepup"`
- Allowed event includes `attestation_reference`

**Provenance Assertions**:
- Provenance includes export event

### Step 5: Verify OPA Policy Outcomes

Tests OPA policy directly:

**Deny Test**:
```json
{
  "input": {
    "request": { "path": "/api/export", "method": "POST" },
    "stepup_auth": { "present": false, "verified": false }
  }
}
```

**Expected**: `allow: false`

**Allow Test**:
```json
{
  "input": {
    "request": { "path": "/api/export", "method": "POST" },
    "stepup_auth": {
      "present": true,
      "verified": true,
      "timestamp": <current_timestamp_ns>
    }
  }
}
```

**Expected**: `allow: true`

---

## Proof Artifacts

All tests generate proof artifacts in `e2e-proof/`:

| File | Description |
|------|-------------|
| `01_seed_response.json` | Response from data seeding |
| `02_query_response.json` | Response from GraphQL query |
| `03a_export_blocked.json` | Blocked export response (403) |
| `03c_export_allowed.json` | Allowed export response (200) |
| `04_audit_logs.json` | Recent audit events |
| `05_provenance.json` | Provenance for exported entity |
| `06_opa_deny.json` | OPA policy deny result |
| `06_opa_allow.json` | OPA policy allow result |

**Retention**: 30 days in GitHub Actions artifacts

---

## CI Integration

### GitHub Actions Workflow

**File**: `.github/workflows/e2e-golden-path.yml`

**Services**:
- OPA (port 8181) for policy evaluation
- Neo4j (ports 7687, 7474) for graph database

**Steps**:
1. Checkout code
2. Setup Node.js
3. Install dependencies
4. Load OPA policies
5. Start application backend
6. Run golden path test
7. Upload proof artifacts
8. Generate summary
9. Verify proof artifacts

**Triggers**:
- Pull requests to `main`
- Pushes to `main`
- Daily schedule (6 AM UTC)
- Manual dispatch

### Acceptance Criteria

✅ **CI job passes** - All test assertions succeed

✅ **Artifacts include proof objects** - All 8 proof files generated

✅ **Logs captured** - Complete execution logs in artifacts

---

## Troubleshooting

### Test Failures

**"Failed to authenticate"**
- Check backend server is running
- Verify test credentials in seed data

**"Export blocked without step-up" fails**
- Check WebAuthn middleware is applied
- Verify OPA policy loaded correctly

**"Audit log contains denied event" fails**
- Check audit logger is emitting events
- Verify database connection for audit storage

**"OPA policy denies without step-up" fails**
- Check OPA service is running
- Verify policy loaded at `http://localhost:8181/v1/policies`

### Local Development

```bash
# Start OPA locally
docker run -p 8181:8181 openpolicyagent/opa:latest run --server

# Load policies
curl -X PUT http://localhost:8181/v1/policies/webauthn_stepup \
  --data-binary @policies/webauthn_stepup.rego

# Start Neo4j
docker run -p 7687:7687 -p 7474:7474 \
  -e NEO4J_AUTH=neo4j/testpassword \
  neo4j:5-community

# Start backend
npm run start:backend

# Run test
make e2e:golden
```

---

## Configuration

### Environment Variables

```bash
# Base URL for API requests
BASE_URL=http://localhost:3000

# OPA URL
OPA_URL=http://localhost:8181

# Neo4j connection
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=testpassword

# WebAuthn configuration
WEBAUTHN_RP_ID=localhost
WEBAUTHN_ORIGIN=http://localhost:3000
```

---

## Related Documentation

- [WebAuthn Step-Up Authentication](./WEBAUTHN_STEPUP_README.md)
- [OPA Release Gate Policy](../policies/release_gate.rego)
- [k6 Golden Flow Synthetics](../tests/k6/golden-flow.k6.js)

---

## Exit Codes

- `0` - All tests passed
- `1` - One or more tests failed

---

**Contact**: qa@example.com
**Issue Tracking**: #10065
