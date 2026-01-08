# CompanyOS Identity & Policy Fabric

Unified identity, authorization, and policy layer for CompanyOS. This is the security backbone that enforces "who can do what, where, and with which data."

## Overview

The Identity & Policy Fabric provides:

- **Identity Management**: Users, service accounts, agents, and workloads
- **Authentication**: OIDC/SAML SSO, MFA, step-up auth, service-to-service auth
- **Authorization**: ABAC/RBAC with OPA policy evaluation
- **Data Protection**: Residency enforcement, DLP, and redaction

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Identity & Policy Fabric                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │   Identity   │  │    Policy    │  │     Auth     │           │
│  │   Service    │  │   Decision   │  │   Service    │           │
│  │              │  │   Service    │  │              │           │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘           │
│         │                 │                 │                    │
│         │    ┌────────────┴────────────┐    │                    │
│         └────┤     OPA Policy Engine   ├────┘                    │
│              └────────────┬────────────┘                         │
│                           │                                      │
│  ┌────────────────────────┴────────────────────────┐            │
│  │              Policy Bundles                      │            │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌────────┐ │            │
│  │  │  ABAC   │ │Residency│ │   DLP   │ │Step-Up │ │            │
│  │  └─────────┘ └─────────┘ └─────────┘ └────────┘ │            │
│  └──────────────────────────────────────────────────┘            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Quick Start

```typescript
import { createIdentityFabric, PolicyInputBuilder } from "./identity-fabric";

// Create the fabric
const fabric = createIdentityFabric({
  policy: {
    mode: "sidecar",
    opaUrl: "http://localhost:8181",
  },
});

// Authenticate a user
const authResult = await fabric.auth.authenticate({
  method: "oidc",
  credentials: {
    type: "oidc",
    idToken: "...",
    accessToken: "...",
    provider: "okta",
  },
  tenantId: "tenant_123",
  clientInfo: {
    ipAddress: "192.168.1.1",
    userAgent: "Mozilla/5.0...",
  },
});

// Check authorization
const policyInput = new PolicyInputBuilder()
  .withSubject(authResult.identity!, authResult.session)
  .withResource("investigation", "inv_456", "tenant_123", {
    classification: "secret",
  })
  .withAction("read")
  .withTenant(tenant)
  .build();

const decision = await fabric.policy.evaluate(policyInput);

if (decision.allow) {
  // Access granted
} else if (decision.stepUpRequired) {
  // Initiate step-up authentication
} else {
  // Access denied
}
```

## Identity Model

### Principal Types

| Type       | Description                          |
| ---------- | ------------------------------------ |
| `human`    | Human user with interactive session  |
| `service`  | Service account (machine-to-machine) |
| `agent`    | AI agent or automated process        |
| `workload` | SPIFFE-identified workload           |

### Classification Levels

| Level            | Description                         |
| ---------------- | ----------------------------------- |
| `unclassified`   | Public information                  |
| `cui`            | Controlled Unclassified Information |
| `confidential`   | Damage if disclosed                 |
| `secret`         | Serious damage if disclosed         |
| `top-secret`     | Grave damage if disclosed           |
| `top-secret-sci` | Sensitive Compartmented Information |

## Policy Bundles

Policy bundles are organized by domain:

```
bundles/
├── access-control/     # ABAC/RBAC policies
├── data-residency/     # Region enforcement
├── dlp/                # Data loss prevention
├── redaction/          # Data masking
└── step-up-auth/       # Step-up requirements
```

### Policy Types

1. **Access Control (ABAC)**: Role + attribute-based access
2. **Data Residency**: Region and sovereignty enforcement
3. **DLP**: Classification and export controls
4. **Redaction**: PII masking and log sanitization
5. **Step-Up Auth**: Risk-based authentication elevation

## Authentication Flows

### Login Flow

```
User → Auth Service → OIDC/SAML Provider → Verify Token →
       Risk Assessment → MFA (if required) → Create Session → Issue Tokens
```

### Step-Up Flow

```
User → Sensitive Action → Policy Check → Step-Up Required →
       WebAuthn Challenge → Verify Response → Grant Elevated Access (TTL)
```

### Service-to-Service Flow

```
Service A → mTLS/SPIFFE → Auth Service → Verify Workload Identity →
            Scope Validation → Issue Service Token → Service B
```

## Configuration

### Identity Service

```typescript
const identity = new IdentityService({
  cacheEnabled: true,
  cacheTtlSeconds: 300,
  auditEnabled: true,
  validationStrict: true,
  spiffeEnabled: true,
  spiffeTrustDomain: "companyos.local",
});
```

### Policy Decision Service

```typescript
const policy = new PolicyDecisionService({
  mode: "sidecar", // 'sidecar' | 'centralized' | 'embedded'
  opaUrl: "http://localhost:8181",
  opaPolicy: "companyos/authz",
  timeout: 100, // ms
  cacheEnabled: true,
  cacheTtlSeconds: 60,
  defaultDecision: "deny",
});
```

### Authentication Service

```typescript
const auth = new AuthenticationService({
  sessionDurationSeconds: 8 * 60 * 60, // 8 hours
  accessTokenDurationSeconds: 15 * 60, // 15 minutes
  stepUpDurationSeconds: 5 * 60, // 5 minutes
  maxLoginAttempts: 5,
  lockoutDurationSeconds: 15 * 60,
  requireMfaForSensitive: true,
  riskBasedAuth: true,
});
```

## Multi-Tenancy

### Tenant Isolation

- Every resource is scoped to exactly one tenant
- Cross-tenant access is denied by default
- Global admins can access any tenant with audit
- Explicit cross-tenant authorization requires approval

### White-Label Support

```typescript
const tenant: Tenant = {
  whiteLabel: {
    enabled: true,
    brandName: "Customer Portal",
    logoUrl: "https://...",
    primaryColor: "#007bff",
    customDomain: "portal.customer.com",
  },
};
```

## Security

See [THREAT_MODEL.md](./THREAT_MODEL.md) for:

- Threat actors and scenarios
- STRIDE analysis
- Security controls
- Risk assessment

## Testing

### Unit Tests

```bash
pnpm test --filter identity-fabric
```

### Policy Tests

```bash
opa test bundles/ -v
```

### Integration Tests

```bash
pnpm test:integration --filter identity-fabric
```

## API Reference

### IdentityService

| Method                           | Description                        |
| -------------------------------- | ---------------------------------- |
| `resolveIdentity(id, tenantId)`  | Resolve identity with full context |
| `createUser(user)`               | Create human user identity         |
| `createService(service)`         | Create service account             |
| `createAgent(agent)`             | Create AI agent identity           |
| `createWorkload(workload)`       | Create workload identity           |
| `deactivateIdentity(id, reason)` | Soft-delete identity               |

### PolicyDecisionService

| Method                  | Description               |
| ----------------------- | ------------------------- |
| `evaluate(input)`       | Evaluate policy decision  |
| `isAllowed(input)`      | Quick allow/deny check    |
| `requiresStepUp(input)` | Check step-up requirement |
| `getRedactions(input)`  | Get redaction rules       |

### AuthenticationService

| Method                              | Description               |
| ----------------------------------- | ------------------------- |
| `authenticate(request)`             | Authenticate user/service |
| `initiateStepUp(request)`           | Start step-up challenge   |
| `completeStepUp(session, response)` | Complete step-up          |
| `authenticateService(request)`      | Service-to-service auth   |
| `invalidateSession(id)`             | Logout session            |
