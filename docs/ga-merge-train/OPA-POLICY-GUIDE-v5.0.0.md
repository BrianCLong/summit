# OPA/ABAC Policy Architecture — IntelGraph v5.0.0

## Overview

IntelGraph enforces fine-grained access control via Open Policy Agent (OPA) Rego policies.
All policies follow **deny-by-default** — access requires an explicit positive match.

## Policy Packages

| Package | File | Purpose |
|---------|------|---------|
| `intelgraph.tenant` | `tenant-isolation.rego` | Multi-tenant data scoping |
| `intelgraph.oidc` | `oidc-claims.rego` | OIDC token validation & claim-based authz |
| `intelgraph.purpose` | `purpose-based-access.rego` | Purpose tag enforcement with hierarchy |
| `intelgraph.retention` | `retention.rego` | 5-tier data lifecycle (ephemeral→legal-hold) |
| `intelgraph.privacy` | `privacy.rego` | PII redaction, k-anonymity, data minimization |
| `intelgraph.rbac` | `rbac.rego` | Role→permission→operation baseline |

## Architecture

```
┌─────────────────────────────────────────────────┐
│  API Gateway / Service Mesh (Envoy/Istio)       │
│  ┌───────────────────────────────────────────┐  │
│  │            OPA Sidecar                    │  │
│  │  ┌─────────┐ ┌──────┐ ┌───────────────┐  │  │
│  │  │ tenant  │ │ rbac │ │   purpose     │  │  │
│  │  └────┬────┘ └──┬───┘ └──────┬────────┘  │  │
│  │       │         │            │            │  │
│  │  ┌────┴────┐ ┌──┴───┐ ┌─────┴─────────┐  │  │
│  │  │  oidc  │ │priv. │ │  retention    │  │  │
│  │  └────────┘ └──────┘ └───────────────┘  │  │
│  └───────────────────────────────────────────┘  │
│                    ↕ Decision                    │
│              Service Backend                     │
└─────────────────────────────────────────────────┘
```

## Decision Flow

1. **OIDC validation** — Verify token issuer, expiry, audience
2. **Tenant isolation** — Confirm user.tenantId == resource.tenantId
3. **RBAC** — Check role grants the requested operation on the resource type
4. **Purpose** — Verify resource purpose is in user's active purposes
5. **Privacy** — Redact PII fields if user lacks `pii:read` permission
6. **Retention** — Enforce lifecycle rules on data access/mutation/purge

All layers must pass. Any deny = request denied.

## Retention Tiers

| Tier | Duration | Use Case |
|------|----------|----------|
| `ephemeral` | 7 days | Temp search results, session data |
| `short` | 30 days | Investigation scratch notes |
| `standard` | 365 days | Default entity/relationship storage |
| `long` | 1,825 days (5yr) | Compliance-required records |
| `legal-hold` | Indefinite | Litigation / regulatory hold |

Tier transitions:
- **Upgrade** (longer): Always allowed
- **Downgrade** (shorter): Requires `retention:admin` permission
- **Legal hold set**: Requires `legal:hold` permission
- **Legal hold release**: Requires `legal:release` permission

## Purpose Hierarchy

```
national-security
├── counter-terrorism
├── counter-intelligence
└── cyber-defense

law-enforcement
├── fraud-investigation
├── organized-crime
└── financial-crime

compliance
├── aml-kyc
├── sanctions-screening
└── regulatory-audit
```

A user with parent purpose (e.g., `national-security`) implicitly gets access to child purposes.

## Privacy Controls

### PII Redaction
Fields automatically redacted without `pii:read` permission:
`ssn`, `dob`, `email`, `phone`, `address`, `passport`, `national_id`, `bank_account`, `ip_address`

### k-Anonymity
- Default k=5 (minimum group size before quasi-identifier disclosure)
- Quasi-identifiers: `age`, `gender`, `zip_code`, `city`, `occupation`, `nationality`
- Age generalized to 5-year buckets
- ZIP codes truncated to 3-digit prefix

### Data Minimization
Operations receive only the fields they need:
- `list`: id, type, tenantId
- `summary`: + name, createdAt
- `detail`: + attributes, updatedAt
- `export`: + metadata

## CLI Usage

```bash
# Run all tests
./scripts/opa-policy-sim.sh test

# Simulate a decision
./scripts/opa-policy-sim.sh sim policy/intelgraph-examples/tenant-allow.json

# Debug with full trace
./scripts/opa-policy-sim.sh trace policy/intelgraph-examples/tenant-deny-cross.json

# Benchmark (target: p95 < 10ms)
./scripts/opa-policy-sim.sh bench

# Coverage report
./scripts/opa-policy-sim.sh coverage
```

## CI Integration

```yaml
# .github/workflows/opa-test.yml
- name: OPA Policy Tests
  run: |
    opa test policy/intelgraph/ -v
    opa test policy/intelgraph/ --coverage --threshold 80
```

## SCIM Integration (Stubs)

SCIM user provisioning maps to OPA input:

| SCIM Attribute | OPA Input Field |
|---------------|-----------------|
| `userName` | `user.userId` |
| `groups[].display` | `user.roles` |
| `urn:...:tenantId` | `user.tenantId` |
| `active` | (gate: reject if false) |

Example SCIM payload → OPA input mapping:

```json
{
  "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User"],
  "userName": "analyst-01",
  "groups": [{"display": "analyst"}],
  "urn:intelgraph:scim:1.0:User": {
    "tenantId": "acme-corp",
    "activePurposes": ["investigation-123"],
    "permissions": ["entity:read", "entity:write"]
  }
}
```

## Performance Tuning

- Cache policy decisions in Redis with 60s TTL
- Use OPA bundles for policy distribution (not filesystem reload)
- Pre-compile policies to Wasm for hot-path evaluations
- Keep policy packages independent to enable partial evaluation
- Target: p95 evaluation latency < 10ms per decision

## Test Coverage

80 tests across 6 test files:
- **Tenant isolation**: 10 tests (positive, negative, edge cases)
- **OIDC claims**: 11 tests (valid tokens, expired, untrusted, groups)
- **Purpose-based**: 11 tests (direct, hierarchy, wildcard, expired)
- **Retention**: 15 tests (purge, tier transitions, legal hold)
- **Privacy**: 18 tests (redaction, k-anonymity, minimization, export risk)
- **RBAC**: 15 tests (role grants, denials, multi-role, edge cases)
