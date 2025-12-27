# Summit Codebase - Authentication and Authorization Architecture Analysis

**Generated:** 2025-11-20
**Status:** Comprehensive Security Architecture Review

---

## Executive Summary

The Summit codebase implements a multi-layered security architecture with JWT-based authentication, RBAC (Role-Based Access Control), ABAC (Attribute-Based Access Control) through OPA (Open Policy Agent), WebAuthn support, tenant isolation, and comprehensive audit logging. The system includes:

- **3 Authentication Mechanisms**: JWT, OAuth2 Proxy headers, and SPIFFE/mTLS
- **Multiple Authorization Levels**: Role-based, permission-based, policy-based (OPA), and attribute-based
- **Tenant Isolation**: Multi-tenant support with strict compartmentalization
- **Advanced Features**: JWT rotation, token blacklisting, step-up authentication, PII redaction
- **Compliance Framework**: Audit trails, data classification, legal basis tracking

---

## 1. JWT AUTHENTICATION PATTERNS

### 1.1 JWT Token Structure and Issuance

**File:** `/home/user/summit/server/src/services/AuthService.ts` (Lines 54-232)

#### Token Payload:
```typescript
interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}
```

#### Token Generation:
- **Algorithm:** HS256 (HMAC with SHA-256)
- **Secret:** Configured via `config.jwt.secret`
- **Expiration:** 24 hours (default: `expiresIn: 24 * 60 * 60`)
- **Refresh Token:** UUID-based, stored in database with 7-day expiration

#### Key Methods:
- `AuthService.generateTokens()` (Lines 205-233): Generates JWT and refresh token pair
- Token stored in `user_sessions` table with `expires_at` tracking
- Refresh tokens can be revoked before expiration

### 1.2 JWT Rotation and Key Management

**File:** `/home/user/summit/server/src/conductor/auth/jwt-rotation.ts`

#### JWT Rotation Manager Features:
- **Algorithm:** RS256 (RSA with SHA-256)
- **Key Pair Generation:** 2048-bit RSA keys (Lines 315-335)
- **Key Rotation:** Automatic rotation every 24 hours (configurable)
- **Key Validity:** 7 days default (Lines 41-42)
- **Max Keys Stored:** 5 keys (allows token verification during rotation)
- **Storage:** Redis-backed persistent storage

#### Key Operations:

```typescript
// Generated key pair structure (Lines 10-18)
interface JWTKeyPair {
  keyId: string;           // Unique identifier with timestamp
  publicKey: string;       // PEM format
  privateKey: string;      // PKCS8 format
  algorithm: string;       // RS256
  createdAt: Date;
  expiresAt: Date;
  isActive: boolean;
}
```

#### Workflow:
1. Generate new RSA key pair daily
2. New key becomes active, previous marked inactive
3. Both active and inactive keys can verify tokens
4. Expired keys cleaned up automatically
5. Singleton instance: `jwtRotationManager` (Line 477)

#### JWKS Endpoint (Lines 226-244):
- Returns valid public keys for external validation
- Only includes non-expired keys
- Enables decoupled token verification

#### Configuration:
- Environment variables:
  - `JWT_ISSUER`: Default `maestro-conductor`
  - `JWT_AUDIENCE`: Default `intelgraph-platform`
- Constructor parameters override environment

### 1.3 Token Validation and Verification

**File:** `/home/user/summit/server/src/services/AuthService.ts` (Lines 235-270)

#### Verification Process:
1. Extract token from `Authorization: Bearer` header or `x-access-token` header
2. Verify JWT signature with stored secret
3. Check if token is blacklisted (Lines 242-252)
4. Verify user still active in database
5. Return decoded user object or null

#### Blacklist System (Lines 350-369):
- Tokens blacklisted on logout
- Hash-based storage (SHA-256) to avoid storing full tokens
- TTL: 24 hours (matches token expiration)
- On conflict: Skip duplicate entries

#### Edge Cases:
- Missing or malformed tokens return null
- Expired tokens rejected during verification
- Invalid signatures detected by JWT library

---

## 2. ROLE-BASED ACCESS CONTROL (RBAC)

### 2.1 Role Definition and Structure

**File:** `/home/user/summit/server/src/conductor/auth/rbac-middleware.ts` (Lines 28-105)

#### Defined Roles (4 tiers):

**1. ADMIN**
- Permissions: `['*']` (wildcard - all permissions)
- Full administrative access
- Used as bypass for permission checks

**2. OPERATOR**
- Workflow management: `workflow:read`, `workflow:create`, `workflow:update`, `workflow:delete`, `workflow:execute`
- Task management: `task:read`, `task:create`, `task:execute`
- Evidence: `evidence:read`, `evidence:create`
- Serving: `serving:read`, `serving:execute`
- Metrics and policies: `metrics:read`, `policies:read`

**3. ANALYST**
- Read and execute: `workflow:read`, `task:read`, `workflow:execute`, `task:execute`
- Evidence creation: `evidence:read`, `evidence:create`
- Serving: `serving:read`, `serving:execute`
- Read-only: `metrics:read`, `policies:read`

**4. VIEWER**
- Read-only access: `workflow:read`, `task:read`, `metrics:read`, `evidence:read`, `policies:read`, `serving:read`

#### Legacy AuthService Roles (Lines 66-97 in AuthService.ts):

**ADMIN**
```typescript
ADMIN: [
  '*', // All permissions
]
```

**ANALYST**
```typescript
ANALYST: [
  'investigation:create', 'investigation:read', 'investigation:update',
  'entity:create', 'entity:read', 'entity:update', 'entity:delete',
  'relationship:create', 'relationship:read', 'relationship:update', 'relationship:delete',
  'tag:create', 'tag:read', 'tag:delete',
  'graph:read', 'graph:export',
  'ai:request',
]
```

**VIEWER**
```typescript
VIEWER: [
  'investigation:read',
  'entity:read',
  'relationship:read',
  'tag:read',
  'graph:read',
  'graph:export',
]
```

### 2.2 Permission Checking

**File:** `/home/user/summit/server/src/middleware/rbac.ts` (Lines 13-122)

#### Permission Check Methods:

```typescript
// Simple permission check
export function requirePermission(permission: string)

// Any of specified permissions
export function requireAnyPermission(permissions: string[])

// All specified permissions
export function requireAllPermissions(permissions: string[])

// Role-based convenience wrapper
export function requireRole(role: string)
```

#### Implementation Details:

**Wildcard Support:**
- `*` grants all permissions
- `resource:*` matches all sub-permissions (e.g., `workflow:*` matches `workflow:read`, `workflow:write`)

**Permission Cache (Lines 125-145 in conductor/auth/rbac-middleware.ts):**
- Permissions pre-computed per role on startup
- Stored in `Map<string, Set<string>>`
- Reduces runtime lookup time
- Rebuilt on configuration changes

**Permission Normalization:**
- All permissions converted to lowercase
- Consistent format: `resource:action`
- Wildcard permissions preserved

### 2.3 User Permission Extraction

**File:** `/home/user/summit/server/src/conductor/auth/rbac-middleware.ts` (Lines 147-184)

#### Sources:
1. **OAuth2 Proxy Headers** (Production):
   - `x-auth-request-groups`: Comma-separated group names
   - Mapped to roles
   
2. **JWT Claims** (Development/API):
   - `groups` claim
   - `roles` claim
   
3. **Fallback**:
   - Default role: `VIEWER`
   - Only includes configured roles

#### Deduplication:
- Combines groups and roles from multiple sources
- Uses `Set` to remove duplicates
- Filters out undefined roles

---

## 3. TENANT ISOLATION

### 3.1 Multi-Tenant Architecture

**Files:**
- `/home/user/summit/server/src/middleware/withTenant.ts`
- `/home/user/summit/server/src/middleware/tenantValidator.ts`
- `/home/user/summit/server/src/middleware/context-binding.ts`

### 3.2 Tenant Context and Propagation

**Tenant Context Structure (withTenant.ts):**
```typescript
interface TenantContext {
  user: {
    id: string;
    tenant: string;      // Tenant ID
    roles: string[];
  };
}
```

#### Tenant Identifier Sources:
1. **From User Object**: User assigned to specific tenant during authentication
2. **From Request Headers**: `x-tenant-id` header
3. **From Context Binding**: Propagated through GraphQL context
4. **From Request Context**: Set by `contextBindingMiddleware`

### 3.3 Tenant Validation Middleware

**File:** `/home/user/summit/server/src/middleware/tenantValidator.ts` (Lines 32-80)

#### Validation Rules:

1. **Explicit Tenant Requirement** (Lines 62-73):
   ```typescript
   if (requireExplicitTenant && !userTenantId) {
     throw new GraphQLError('Tenant context required')
   }
   ```

2. **Cross-Tenant Access Prevention** (Lines 76-80):
   ```typescript
   if (validateOwnership && resourceTenantId && resourceTenantId !== userTenantId) {
     throw new GraphQLError('Tenant isolation violation')
   }
   ```

3. **System-Level Access** (Lines 49-60):
   - Roles: `SYSTEM` or `SUPER_ADMIN`
   - Can access any tenant (with audit trail)
   - Logged explicitly for compliance

#### Caching Strategy:
- `cacheScope: 'tenant' | 'global' | 'user'`
- Tenant-scoped caches isolated in Redis
- Pattern: `${tenant}:${base}` (Line 96 in withTenant.ts)

### 3.4 Resolver-Level Tenant Enforcement

**File:** `/home/user/summit/server/src/middleware/withTenant.ts` (Lines 24-70)

#### Higher-Order Function Pattern:
```typescript
export const withTenant = (resolver) => {
  return (parent, args, context, info) => {
    // Validate tenant context exists
    if (!context?.user?.tenant) {
      throw new GraphQLError('Missing tenant context')
    }
    
    // Add tenantId to args automatically
    const scopedArgs = {
      ...args,
      tenantId: context.user.tenant,
    }
    
    return resolver(parent, scopedArgs, context, info)
  }
}
```

#### Benefits:
- Automatic tenant scoping
- Prevents accidental cross-tenant queries
- Transparent tenant parameter injection
- Reduces boilerplate in resolvers

### 3.5 Database Tenant Filtering

**File:** `/home/user/summit/server/src/middleware/withTenant.ts` (Lines 102-117)

#### Query Enhancement:
```typescript
export const addTenantFilter = (cypher, params, tenantId) => {
  const hasWhere = cypher.toLowerCase().includes('where')
  const tenantFilter = hasWhere
    ? ' AND n.tenantId = $tenantId'
    : ' WHERE n.tenantId = $tenantId'
  
  return {
    cypher: cypher + tenantFilter,
    params: { ...params, tenantId }
  }
}
```

#### Neo4j Integration:
- All Cypher queries append tenant filter
- Uses parameterized queries to prevent injection
- Filters on all node traversals
- Works with complex WHERE clauses

### 3.6 Context Binding Middleware

**File:** `/home/user/summit/server/src/middleware/context-binding.ts` (Lines 25-72)

#### Required Headers:
```
X-Tenant-Id:    Tenant identifier
X-Purpose:      Data access purpose (investigation, audit, compliance, etc.)
X-Legal-Basis:  Legal justification for access
X-Sensitivity:  Data sensitivity level
```

#### Enforcement:
- Returns 400 Bad Request if any header missing
- Headers extracted and bound to request context
- Propagated to OpenTelemetry spans for observability
- Used by policy engine for ABAC decisions

#### Use Cases:
- Audit trail with business context
- GDPR/HIPAA compliance (legal basis)
- Purpose-limiting enforcement
- Risk-based access control

---

## 4. AUTHORIZATION MIDDLEWARE

### 4.1 Authentication Middleware

**Files:**
- `/home/user/summit/server/src/middleware/auth.ts`
- `/home/user/summit/server/src/conductor/auth/rbac-middleware.ts` (Lines 223-329)

#### Express Auth Middleware (auth.ts):

```typescript
export async function ensureAuthenticated(req, res, next) {
  // Extract from Bearer header or x-access-token
  const token = req.headers.authorization?.split('Bearer ')[1] 
    || req.headers['x-access-token']
  
  if (!token) return res.status(401).json({ error: 'Unauthorized' })
  
  const user = await authService.verifyToken(token)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })
  
  req.user = user
  next()
}
```

#### Conductor Auth Middleware (Lines 223-329):

**Three Authentication Methods:**
1. **OAuth2 Proxy Headers** (Production):
   ```
   x-auth-request-user: username
   x-auth-request-email: user@example.com
   x-auth-request-groups: admin,analyst
   x-tenant-id: tenant-123
   ```

2. **JWT Bearer Token** (API/Development):
   ```
   Authorization: Bearer <JWT>
   ```

3. **Development Bypass**:
   - Enabled when `NODE_ENV === 'development'`
   - Returns hardcoded dev user
   - Can be explicitly enabled with `AUTH_BYPASS=true`

#### User Assignment:
```typescript
interface AuthenticatedUser {
  userId: string;
  sub: string;           // Subject claim
  email: string;
  name?: string;
  groups?: string[];     // From OAuth2 proxy
  roles?: string[];      // From JWT or groups
  tenantId?: string;     // Defaults to 'default'
  permissions?: string[];
}
```

### 4.2 OPA-Based Authorization Middleware

**Files:**
- `/home/user/summit/server/src/middleware/opa-abac.ts`
- `/home/user/summit/server/src/middleware/opa.ts`
- `/home/user/summit/server/src/middleware/opa-enforcer.ts`

#### OPA Integration Overview:

**OPA Client (Lines 29-92 in opa-abac.ts):**
```typescript
export class OPAClient {
  async evaluate(policy: string, input: any): Promise<any>
}
```

**Async Evaluation:**
- Calls OPA server at runtime
- Configurable timeout (5 seconds default)
- Fail-closed on timeout (deny access)

**Policy Input Structure (Lines 11-23):**
```typescript
interface OPAPolicyInput {
  user: User;
  resource: {
    type: string;           // 'investigation', 'entity', etc.
    id?: string;
    tenant?: string;
    purpose?: string;
    region?: string;
    pii_flags?: Record<string, boolean>;
  };
  operation_type: 'query' | 'mutation' | 'subscription';
  field_name?: string;
}
```

#### Policy Evaluation Patterns:

**1. GraphQL Field-Level Authorization (Lines 276-343):**
```typescript
export function createAuthzDirective(opaClient: OPAClient) {
  return class AuthzDirective {
    visitFieldDefinition(field, details) {
      field.resolve = async (source, args, context, info) => {
        const allowed = await opaClient.evaluate(
          'intelgraph.abac.graphql_allowed',
          policyInput
        )
        
        if (!allowed) {
          throw new ForbiddenError(`Access denied to field ${info.fieldName}`)
        }
        
        return resolve.call(this, source, args, context, info)
      }
    }
  }
}
```

**2. REST API Authorization (Lines 205-271):**
```typescript
export function opaAuthzMiddleware(opaClient: OPAClient) {
  return async (req, res, next) => {
    const policyInput: OPAPolicyInput = {
      user,
      resource: { type: 'api', tenant: user.tenant },
      operation_type: req.method.toLowerCase()
    }
    
    const allowed = await opaClient.evaluate(
      'intelgraph.abac.allow',
      policyInput
    )
    
    if (!allowed) {
      throw new ForbiddenError('Access denied by authorization policy')
    }
    
    next()
  }
}
```

**3. Residency Enforcement (Lines 348-366):**
```typescript
export function residencyEnforcementMiddleware(req, res, next) {
  const user = req.user as User
  
  if (user && user.residency !== 'US') {
    throw new ForbiddenError('Access restricted to US residents only')
  }
  
  next()
}
```

#### OPA Policy Engine (opa-enforcer.ts):

**Budget and Four-Eyes Policies (Lines 11-42):**
```typescript
interface OPAInput {
  tenant_id: string;
  user_id: string;
  mutation: string;
  field_name?: string;
  est_usd: number;          // Estimated cost
  est_total_tokens: number;
  mutation_category?: string;
  approvers?: Array<{       // For four-eyes approvals
    user_id: string;
    role: string;
    approved_at: string;
  }>;
  request_id: string;
  timestamp: string;
}

interface OPADecision {
  allow: boolean;
  monthly_room: number;     // Budget remaining
  daily_room: number;
  requires_four_eyes: boolean;
  risk_level: string;
  violation_reasons: string[];
}
```

#### Decision Caching (Lines 64-67 in opa-enforcer.ts):
- Cache TTL: 1 minute (configurable)
- Cache key: Based on input hash
- Reduces OPA server load
- Expires stale decisions

### 4.3 Higher-Order Authorization Wrapper

**File:** `/home/user/summit/server/src/middleware/withAuthAndPolicy.ts`

#### Pattern:
```typescript
export function withAuthAndPolicy<TArgs, TResult>(
  action: string,
  resourceFactory: (args, context) => Resource
) {
  return function(resolver) {
    return async (parent, args, context, info) => {
      // 1. Check authentication
      if (!context.user) {
        throw new AuthenticationError('Authentication required')
      }
      
      // 2. Build resource from factory
      const resource = await resourceFactory(args, context)
      
      // 3. Evaluate policy
      const policyResult = await policyService.evaluate({
        action,
        user: context.user,
        resource,
        context: { ...info }
      })
      
      if (!policyResult.allow) {
        throw new ForbiddenError(policyResult.reason)
      }
      
      // 4. Execute resolver
      return resolver(parent, args, context, info)
    }
  }
}
```

#### Convenience Wrappers:
- `withReadAuth<TArgs, TResult>(resourceFactory)`
- `withWriteAuth<TArgs, TResult>(resourceFactory)`
- `withCreateAuth<TArgs, TResult>(resourceFactory)`
- `withUpdateAuth<TArgs, TResult>(resourceFactory)`
- `withDeleteAuth<TArgs, TResult>(resourceFactory)`

#### Built-in Compartment Checks (Lines 82-108):
```typescript
// Org compartment
if (resource.orgId && user.orgId && resource.orgId !== user.orgId) {
  return { allow: false, reason: 'org_compartment_mismatch' }
}

// Team compartment
if (resource.teamId && user.teamId && resource.teamId !== user.teamId) {
  return { allow: false, reason: 'team_compartment_mismatch' }
}

// Mission tags
if (resource.missionTags && resource.missionTags.length > 0) {
  const hasTag = resource.missionTags.some(tag => 
    user.missionTags?.includes(tag)
  )
  if (!hasTag) {
    return { allow: false, reason: 'mission_tag_mismatch' }
  }
}

// Temporal validity
if (resource.validFrom && new Date(resource.validFrom) > now) {
  return { allow: false, reason: 'not_yet_valid' }
}
```

### 4.4 Maestro Authorization Middleware

**File:** `/home/user/summit/server/src/middleware/maestro-authz.ts`

#### Integration with OPA (Lines 57-77):
```typescript
const policyContext = {
  tenantId: requestContext.tenantId,
  userId: req.user?.id,
  role: req.user?.role,
  action: req.method.toLowerCase(),      // get, post, put, delete
  resource: pathParts[3],                 // From URL: /api/maestro/v1/[resource]
  resourceAttributes: { ...req.body, ...req.params, ...req.query },
  sessionContext: { ipAddress: req.ip, userAgent: req.get('User-Agent') },
}

const decision = await opaPolicyEngine.evaluatePolicy(
  'maestro/authz',
  policyContext
)

if (!decision.allow) {
  return res.status(403).json({
    error: 'Forbidden',
    message: decision.reason,
    auditContext: decision.auditLog
  })
}
```

### 4.5 OPA with Appeal System

**File:** `/home/user/summit/server/src/middleware/opa-with-appeals.ts`

#### Feature: Policy-by-Default Denials with Appeals

**Appeal Configuration (Lines 22-27):**
```typescript
const APPEAL_CONFIG = {
  defaultSlaHours: 24,      // 24-hour approval SLA
  escalationHours: 48,      // Escalate if not approved
  requiredRole: 'DATA_STEWARD',
  maxAppealRequests: 3,     // Max appeals per decision
}
```

**Appeal Path Response Structure (Lines 58-67):**
```typescript
interface AppealPath {
  available: boolean;
  appealId?: string;
  requiredRole: string;
  slaHours: number;
  escalationHours: number;
  instructions: string;
  submitUrl: string;
  statusUrl?: string;
}
```

**Policy Decision Payload (Lines 69-80+):**
```typescript
interface PolicyDecisionWithAppeal {
  allowed: boolean;
  policy: string;
  reason: string;
  appeal?: AppealPath;
  decisionId: string;
  timestamp: string;
  ttl?: number;
  metadata?: {
    riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
    requiresJustification?: boolean;
    alternatives?: string[];
  };
}
```

**Use Case:** When OPA denies access, system returns structured appeal information instead of bare 403, enabling users to request access through proper channels.

---

## 5. EXISTING AUDIT AND LOGGING PATTERNS

### 5.1 Advanced Audit System

**File:** `/home/user/summit/server/src/audit/advanced-audit-system.ts`

#### Audit Event Types (Lines 15-40):
```typescript
type AuditEventType =
  | 'system_start' | 'system_stop'
  | 'config_change'
  | 'user_login' | 'user_logout'
  | 'user_action'
  | 'resource_access' | 'resource_modify' | 'resource_delete'
  | 'policy_decision' | 'policy_violation'
  | 'approval_request' | 'approval_decision'
  | 'orchestration_start' | 'orchestration_complete' | 'orchestration_fail'
  | 'task_execute' | 'task_complete' | 'task_fail'
  | 'data_export' | 'data_import'
  | 'data_breach'
  | 'security_alert'
  | 'compliance_violation'
  | 'anomaly_detected'
```

#### Audit Event Structure (Lines 52-95):

```typescript
export interface AuditEvent {
  // Core identification
  id: string;
  eventType: AuditEventType;
  level: 'debug' | 'info' | 'warn' | 'error' | 'critical';
  timestamp: Date;

  // Context
  correlationId: string;      // Links related events
  sessionId?: string;
  requestId?: string;

  // Actors
  userId?: string;
  tenantId: string;           // Multi-tenant isolation
  serviceId: string;

  // Resources
  resourceType?: string;      // investigation, entity, etc.
  resourceId?: string;
  resourcePath?: string;

  // Action details
  action: string;
  outcome: 'success' | 'failure' | 'partial';

  // Content
  message: string;
  details: Record<string, any>;

  // Security
  ipAddress?: string;
  userAgent?: string;

  // Compliance
  complianceRelevant: boolean;
  complianceFrameworks: ComplianceFramework[];  // SOX, GDPR, HIPAA, SOC2, NIST, ISO27001
  dataClassification?: 'public' | 'internal' | 'confidential' | 'restricted';

  // Integrity
  hash?: string;              // For immutability verification
  signature?: string;         // JWT signature
  previousEventHash?: string; // Chain of custody
}
```

#### Compliance Frameworks Supported (Lines 44-50):
- **SOX** - Sarbanes-Oxley
- **GDPR** - General Data Protection Regulation
- **HIPAA** - Health Insurance Portability
- **SOC2** - Service Organization Control 2
- **NIST** - National Institute of Standards & Technology
- **ISO27001** - Information Security Management

### 5.2 Simple Audit Logger Middleware

**File:** `/home/user/summit/server/src/middleware/audit-logger.ts`

```typescript
export function auditLogger(req, res, next) {
  const start = Date.now()
  
  res.on('finish', () => {
    const userId = req.user?.id
    writeAudit({
      userId,
      action: `${req.method} ${req.originalUrl}`,
      resourceType: 'http',
      details: { 
        status: res.statusCode, 
        durationMs: Date.now() - start 
      },
      ip: req.ip,
      userAgent: req.get('user-agent'),
    })
  })
  
  next()
}
```

#### Captured Data:
- User ID
- HTTP method and path
- Response status code
- Request duration
- Client IP address
- User-Agent header

### 5.3 Comprehensive Middleware Stack

**Files:**
- `/home/user/summit/server/src/middleware/audit-logger.ts`
- `/home/user/summit/server/src/config/production-security.ts`

#### Security Middleware Chain:
1. **Request ID Generation** (`requestId.ts`)
2. **Helmet Security Headers** (`security-headers.ts`)
3. **CORS Configuration** (`corsConfig`)
4. **Rate Limiting** (`rateLimit`, `strictRateLimiter`, `graphqlRateLimiter`)
5. **Request Validation** (`validateRequest`)
6. **Request Size Limiting** (`requestSizeLimiter`)
7. **Authentication** (`ensureAuthenticated`)
8. **RBAC Authorization** (`requirePermission`)
9. **Tenant Validation** (`tenantValidator`)
10. **Context Binding** (`contextBindingMiddleware`)
11. **Policy Enforcement** (`maestroAuthzMiddleware`)
12. **Request Logging** (`requestLogger`)
13. **Audit Logging** (`auditLogger`)

---

## 6. API AUTHENTICATION

### 6.1 REST API Authentication

**Files:**
- `/home/user/summit/server/src/middleware/auth.ts`
- `/home/user/summit/server/src/conductor/auth/rbac-middleware.ts`

#### Token Extraction (Lines 16-19 in auth.ts):
```typescript
const auth = req.headers.authorization || ''
const token = auth.startsWith('Bearer ')
  ? auth.slice('Bearer '.length)
  : (req.headers['x-access-token'] as string) || null
```

#### Supported Headers:
- `Authorization: Bearer <JWT>`
- `X-Access-Token: <JWT>`

#### Response Codes:
- **401**: Unauthorized (missing/invalid token)
- **403**: Forbidden (authenticated but insufficient permissions)

### 6.2 GraphQL Authentication

**File:** `/home/user/summit/server/src/middleware/opa-abac.ts` (Lines 98-180)

#### OIDC Token Validation:

**Development Mode (Lines 109-126):**
```typescript
if (process.env.NODE_ENV === 'development') {
  (req as any).user = {
    id: 'dev-user',
    tenant: 'default',
    roles: ['developer'],
    scopes: ['purpose:investigation', 'scope:pii'],
    residency: 'US',
    email: 'dev@topicality.co',
  }
  return next()
}
```

**Production Mode (Lines 136-159):**
- Decodes JWT from Bearer header
- Extracts: `sub`, `tenant`, `roles`, `scopes`, `residency`, `email`
- TODO: Implement full OIDC issuer verification (Line 161)

#### GraphQL Context Builder (Lines 185-200):
```typescript
export function buildGraphQLContext(opaClient: OPAClient) {
  return ({ req }: { req: Request }) => {
    const requestId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random()}`
    const user = (req as any).user as User | undefined

    return {
      user,
      opa: opaClient,
      requestId,
      // Database connections added by GraphQL server
    }
  }
}
```

### 6.3 Service-to-Service Authentication

**File:** `/home/user/summit/server/src/middleware/spiffe-auth.ts`

#### SPIFFE/SPIRE Zero-Trust mTLS

**Features:**
- Mutual TLS between services
- Service identity via SPIFFE IDs
- Automatic certificate management
- SVID refresh at 50% lifetime

**Configuration (Lines 29-35):**
```typescript
const SpiffeConfigSchema = z.object({
  trustDomain: z.string().default('intelgraph.local'),
  socketPath: z.string().default('/run/spire/sockets/agent.sock'),
  enabled: z.boolean().default(true),
  requireVerification: z.boolean().default(true),
  allowedTrustDomains: z.array(z.string()).default([]),
})
```

**SPIFFE ID Format:**
```
spiffe://intelgraph.local/conductor
spiffe://intelgraph.local/api
spiffe://intelgraph.local/worker
```

**Middleware (Lines 83-160):**
```typescript
middleware() {
  return async (req: Request & { spiffe?: SpiffeContext }, res, next) => {
    // Extract SPIFFE ID from mTLS certificate
    const spiffeId = await this.extractSpiffeIdFromRequest(req)
    
    // Verify trust domain allowed
    const trustDomainAllowed = this.isTrustDomainAllowed(spiffeId.trustDomain)
    
    if (!trustDomainAllowed) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Trust domain not allowed`,
      })
    }
    
    req.spiffe = { verified: true, spiffeId }
    next()
  }
}
```

**SVID Management (Lines 165-194):**
- Fetch SVID from SPIRE Agent via Unix socket
- X.509 certificate with SPIFFE ID in SAN
- Public key + private key + bundle
- Expires at specific time

**SVID Refresh (Lines 300-323):**
```typescript
private startSVIDRefresh() {
  const lifetime = expiresAt - now
  const refreshIn = Math.max(lifetime * 0.5, 60000) // 50% or minimum 1 minute
  
  this.svidRefreshTimer = setTimeout(async () => {
    try {
      await this.fetchSVID()
      this.startSVIDRefresh() // Schedule next refresh
    } catch (error) {
      // Retry in 1 minute
      this.svidRefreshTimer = setTimeout(
        () => this.startSVIDRefresh(),
        60000
      )
    }
  }, refreshIn)
}
```

**Authenticated Client (Lines 335-367):**
```typescript
createAuthenticatedClient(): any {
  if (!this.config.enabled || !this.localSVID) {
    return { get: fetch, post: fetch, put: fetch, delete: fetch }
  }

  // Return mTLS-enabled HTTP client
  const https = require('https')
  const agent = new https.Agent({
    cert: this.localSVID.certificate,
    key: this.localSVID.privateKey,
    ca: this.localSVID.bundle,
    requestCert: true,
    rejectUnauthorized: true,
  })

  return {
    agent,
    get: (url, options) => fetch(url, { ...options, agent }),
    post: (url, options) => fetch(url, { ...options, agent, method: 'POST' }),
    put: (url, options) => fetch(url, { ...options, agent, method: 'PUT' }),
    delete: (url, options) => fetch(url, { ...options, agent, method: 'DELETE' }),
  }
}
```

---

## 7. DATABASE ACCESS PATTERNS

### 7.1 Neo4j Tenant Filtering

**File:** `/home/user/summit/server/src/middleware/withTenant.ts` (Lines 102-117)

#### Automatic Query Enhancement:
```typescript
export const addTenantFilter = (cypher, params, tenantId) => {
  const hasWhere = cypher.toLowerCase().includes('where')
  const tenantFilter = hasWhere
    ? ' AND n.tenantId = $tenantId'
    : ' WHERE n.tenantId = $tenantId'

  return {
    cypher: cypher + tenantFilter,
    params: { ...params, tenantId }
  }
}
```

#### Usage Pattern:
1. Resolver receives query and params
2. Extract tenant from context
3. Enhance Cypher with tenant filter
4. Execute with bound parameters
5. Prevents cross-tenant data leakage

#### Example:
```typescript
// Original
MATCH (n:Entity) RETURN n

// Enhanced
MATCH (n:Entity) WHERE n.tenantId = $tenantId RETURN n
```

### 7.2 Neo4j Connection Management

**File:** `/home/user/summit/server/src/db/neo4j.ts` (Lines 1-80+)

#### Driver Facade Pattern:
```typescript
let realDriver: Neo4jDriver | null = null
let isMockMode = true

const driverFacade: Neo4jDriver = createDriverFacade()
```

#### Initialization:
- Async initialization with retry logic
- Connectivity checks every 15 seconds (configurable)
- Mock mode fallback if database unavailable
- Event-driven readiness: `onNeo4jDriverReady()`

#### Configuration:
```
NEO4J_URI:            bolt://neo4j:7687
NEO4J_USER:           neo4j
NEO4J_PASSWORD:       devpassword
REQUIRE_REAL_DBS:     false
NEO4J_HEALTH_INTERVAL_MS: 15000
```

### 7.3 PostgreSQL for User Management

**File:** `/home/user/summit/server/src/services/AuthService.ts`

#### Database Schema (Inferred):
```sql
-- User accounts
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR UNIQUE,
  username VARCHAR,
  password_hash VARCHAR,
  first_name VARCHAR,
  last_name VARCHAR,
  role VARCHAR,
  is_active BOOLEAN,
  last_login TIMESTAMP,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Session management
CREATE TABLE user_sessions (
  user_id UUID,
  refresh_token VARCHAR UNIQUE,
  expires_at TIMESTAMP,
  is_revoked BOOLEAN,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Token blacklist
CREATE TABLE token_blacklist (
  token_hash VARCHAR UNIQUE PRIMARY KEY,
  revoked_at TIMESTAMP,
  expires_at TIMESTAMP
);
```

#### Access Patterns:
1. **User Lookup**: `SELECT * FROM users WHERE email = $1`
2. **Password Verification**: Argon2 hashing algorithm
3. **Session Creation**: Insert into `user_sessions` on login
4. **Token Blacklist**: SHA256 hash to avoid full token storage
5. **Session Revocation**: Update `is_revoked = true`

---

## 8. ADVANCED SECURITY FEATURES

### 8.1 WebAuthn (Passwordless Authentication)

**File:** `/home/user/summit/src/auth/webauthn/WebAuthnManager.ts`

#### Features:
- FIDO2 credential registration
- Biometric authentication (fingerprint, face)
- Hardware key support (YubiKey, etc.)
- Session elevation via step-up auth
- Device trust binding

#### Credential Types:
```typescript
export type AuthenticatorAttachment = 'platform' | 'cross-platform'
export type UserVerificationRequirement = 'required' | 'preferred' | 'discouraged'
export type AttestationConveyancePreference = 'none' | 'indirect' | 'direct' | 'enterprise'
```

#### Risk-Based Authentication:
```typescript
export type StepUpReason =
  | 'high_value_operation'
  | 'sensitive_data_access'
  | 'admin_action'
  | 'unusual_activity'
  | 'location_change'
  | 'device_change'
  | 'time_based'
  | 'manual_request'
```

### 8.2 PII Redaction

**File:** `/home/user/summit/server/src/pii/redactionMiddleware.ts`

#### User Clearance Levels (Lines 22-24):
```typescript
interface UserContext {
  userId: string;
  role: 'ADMIN' | 'ANALYST' | 'VIEWER' | string;
  clearance: number;  // 0-10 scale
  purpose?: 'investigation' | 'audit' | 'compliance' | 'legal' | 'export' | 'analysis';
  stepUpToken?: string;      // For elevated access
  approvalToken?: string;    // For restricted data
  approvedBy?: string;       // Approval chain
  metadata?: Record<string, any>;
}
```

#### Redaction Strategies (Lines 45-50+):
- `NONE`: No redaction
- `FULL`: Complete redaction `[REDACTED]`
- Additional strategies (partial, masked, blurred, hashed)

#### Classification System:
- Sensitivity levels tied to clearance
- Purpose-based access
- Temporal validity windows
- Approval chain tracking

### 8.3 Data Residency Enforcement

**File:** `/home/user/summit/server/src/middleware/opa-abac.ts` (Lines 348-366)

```typescript
export function residencyEnforcementMiddleware(req, res, next) {
  const user = req.user as User

  if (user && user.residency !== 'US') {
    logger.warn('Non-US user attempted access', {
      user_id: user.id,
      user_residency: user.residency,
      ip: req.ip,
    })

    throw new ForbiddenError('Access restricted to US residents only')
  }

  next()
}
```

#### Use Cases:
- ITAR compliance (US only)
- Data localization requirements
- Export control enforcement

---

## 9. CURRENT LIMITATIONS AND GAPS

### 9.1 Authentication

| Gap | Description | Impact | Recommendation |
|-----|-------------|--------|-----------------|
| OIDC Incomplete | Line 161 in opa-abac.ts: TODO for full OIDC validation with issuer verification | Production deployments using JWT without proper validation | Implement issuer/jwks URL validation, nonce verification |
| Single Secret Model | All tokens use single shared secret (config.jwt.secret) | Key compromise affects all tokens | Implement per-tenant or per-client secrets |
| No Token Introspection | Cannot revoke tokens without blacklist database hit | Revocation introduces latency | Implement real-time token introspection endpoint |
| Missing MFA Enforcement | MFA optional, not required for sensitive operations | High-value operations accessible with single factor | Make MFA mandatory for admin role |

### 9.2 Authorization

| Gap | Description | Impact | Recommendation |
|-----|-------------|--------|-----------------|
| OPA Dependency | All ABAC decisions depend on external OPA service | OPA unavailable = deny-closed behavior, poor UX | Implement local policy cache with fallback rules |
| No Fine-Grained Fields | RBAC only covers resources, not individual fields | Cannot selectively hide fields based on role | Implement field-level masking in GraphQL schema |
| Static Roles | Roles hardcoded in config, no dynamic role creation | Cannot adapt to changing organizational needs | Implement role management API |
| No Attribute Inheritance | Attributes don't cascade (e.g., org→team→user) | Must duplicate attributes everywhere | Implement attribute inheritance model |

### 9.3 Tenant Isolation

| Gap | Description | Impact | Recommendation |
|-----|-------------|--------|-----------------|
| Trust Developer | Context binding relies on X-Tenant-Id header from client | Malicious clients can spoof tenant ID | Validate tenant ID against authenticated user's assigned tenant |
| Redis Isolation Incomplete | Tenant scoping pattern not enforced in all caches | Cache key collisions possible across tenants | Implement Redis namespace wrapper that enforces pattern |
| No Tenant Quotas | No tracking of per-tenant resource usage | Tenant A can consume all resources | Implement quotas with enforcement in data layer |
| Shared Ledger Systems | Budget ledger, approval tracking may be cross-tenant | Data leakage between tenants | Review all ledger systems for tenant isolation |

### 9.4 Audit and Logging

| Gap | Description | Impact | Recommendation |
|-----|-------------|--------|-----------------|
| Hash Verification Missing | Audit events include hash field but no verification | Audit trail tampering undetectable | Implement HMAC chain-of-custody verification |
| Incomplete Event Coverage | Only HTTP-level events logged, not GraphQL/DB operations | Insufficient audit trail for compliance | Add resolver-level and database-level audit points |
| No Immutable Storage | Audit events stored in mutable database | Events could be deleted or modified | Archive to append-only storage (S3 with legal hold) |
| Correlation Weak | correlationId generates per-request | Cannot track user session across API calls | Implement session-level correlation ID |

### 9.5 Data Protection

| Gap | Description | Impact | Recommendation |
|-----|-------------|--------|-----------------|
| No Encryption at Rest | Password hashing but data stored plaintext | Data breach exposes sensitive information | Enable database encryption, field-level encryption |
| Transit Security Incomplete | TLS enforced via Helmet but no DTLS for real-time | WebSocket data may be unencrypted | Verify wss:// usage for all WebSocket connections |
| PII Redaction Manual | Developers must explicitly call redaction | Easy to forget, causing data leaks | Implement automatic redaction based on classification |
| Key Management Weak | No HSM integration, keys in environment variables | Key compromise affects all security | Integrate AWS KMS, HashiCorp Vault, or hardware HSM |

### 9.6 Missing Security Patterns

| Gap | Description | Impact |
|-----|-------------|--------|
| No Rate Limiting per User | Global rate limiting only | User enumeration attacks possible |
| No Brute Force Protection | No account lockout after failed logins | Credential stuffing attacks viable |
| No Session Management | Token expiration but no session termination | No way to revoke all user tokens |
| No Suspicious Activity Detection | No anomaly detection or fraud scoring | Compromised accounts use detected late |
| No CORS Strictness | CORS allows multiple origins | CSRF/XSS attacks possible |
| No CSP Headers | No Content Security Policy | Injection attacks viable |
| No Request Signing | No HMAC request verification | Request tampering undetectable |

---

## 10. SUMMARY OF CURRENT ARCHITECTURE

### 10.1 Authentication Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER LOGIN REQUEST                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────┐
        │  AuthService.login()                │
        │  - Verify email + password (Argon2) │
        │  - Check user is active             │
        └─────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────┐
        │  generateTokens()                   │
        │  - Sign JWT (HS256) with secret     │
        │  - Generate UUID refresh token      │
        │  - Store session in DB              │
        └─────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────┐
        │  Return to client:                  │
        │  - token (24h expiry)               │
        │  - refreshToken (7d expiry)         │
        │  - expiresIn: 86400                 │
        └─────────────────────────────────────┘
```

### 10.2 Authorization Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    API REQUEST WITH BEARER TOKEN                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────┐
        │  ensureAuthenticated()              │
        │  - Extract Bearer token             │
        │  - Verify JWT signature             │
        │  - Check blacklist                  │
        │  - Load user from DB                │
        │  - Attach to req.user               │
        └─────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────┐
        │  rbacManager.getUserRoles()         │
        │  - Extract from JWT claims          │
        │  - Or from OAuth2 headers           │
        │  - Filter by configured roles       │
        │  - Assign default if none           │
        └─────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────┐
        │  requirePermission(permission)      │
        │  - Get user's permission set        │
        │  - Check exact match                │
        │  - Check wildcard match             │
        │  - Allow if ADMIN                   │
        └─────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────┐
        │  OPA Authorization (if enabled)     │
        │  - Call OPA server                  │
        │  - Evaluate ABAC policies           │
        │  - Return allow/deny + reason       │
        │  - Log decision                     │
        └─────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────┐
        │  Tenant Validation                  │
        │  - Verify user.tenant matches       │
        │  - Or system role allows bypass     │
        │  - Log cross-tenant attempts        │
        └─────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────┐
        │  Execute Resolver/Route             │
        │  - Attach tenant filter to DB       │
        │  - Execute with tenant context      │
        │  - Return filtered results          │
        └─────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────┐
        │  Audit Log                          │
        │  - Record action success/failure    │
        │  - Include user, resource, outcome  │
        │  - Add IP, user-agent, timestamp    │
        └─────────────────────────────────────┘
```

### 10.3 Three-Layer Security Model

**Layer 1: Authentication**
- Verifies user identity
- JWT validation with secret/RSA key
- Password hashing with Argon2
- Token blacklisting

**Layer 2: Authorization**
- Verifies user permissions
- RBAC via role-based permission set
- ABAC via OPA policy engine
- Field-level controls via GraphQL directives

**Layer 3: Data Isolation**
- Enforces tenant boundaries
- Filters queries by tenant ID
- Prevents cross-tenant access
- Audits compartment violations

---

## 11. CONFIGURATION AND DEPLOYMENT

### 11.1 Environment Variables

**Authentication:**
```
JWT_SECRET=<secret-key>
JWT_ISSUER=maestro-conductor
JWT_AUDIENCE=intelgraph-platform
OIDC_ISSUER=https://auth.topicality.co/
```

**RBAC:**
```
RBAC_ENABLED=true
RBAC_ROLES_CLAIM=groups
RBAC_DEFAULT_ROLE=viewer
RBAC_CONFIG=<json-config>
```

**OPA:**
```
OPA_URL=http://localhost:8181
OPA_ENFORCEMENT=true
ZERO_TRUST_ENABLED=true
```

**SPIFFE/SPIRE:**
```
SPIRE_TRUST_DOMAIN=intelgraph.local
SPIFFE_ENDPOINT_SOCKET=unix:///run/spire/sockets/agent.sock
ZERO_TRUST_ENABLED=true
```

**Databases:**
```
NEO4J_URI=bolt://neo4j:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=<password>
REDIS_URL=redis://localhost:6379
DATABASE_URL=postgresql://user:pass@localhost/summit
```

### 11.2 Middleware Application Order

See `/home/user/summit/server/src/config/production-security.ts` for complete middleware stack order. Key sequence:

1. Request ID generation
2. Security headers (Helmet)
3. CORS
4. Rate limiting
5. Request validation
6. Authentication
7. Authorization
8. Tenant validation
9. Context binding
10. Policy enforcement
11. Logging/Audit

---

## 12. TEST COVERAGE

### 12.1 Socket.io Auth with RBAC

**File:** `/home/user/summit/server/tests/socket-auth-rbac.test.ts`

```typescript
describe('WebSocket JWT auth with RBAC', () => {
  it('rejects unauthorized sockets')
  it('enforces RBAC for edit events')
  // More tests...
})
```

### 12.2 Other Test Files

- `/server/tests/compartment-isolation.test.ts` - Tenant isolation
- `/server/tests/abac-entity-visibility.test.ts` - ABAC visibility
- `/server/tests/entities.audit.test.ts` - Audit logging
- `/tests/unit/policy.test.ts` - Policy engine
- `/tests/unit/dlp.test.ts` - Data loss prevention
- `/tests/tenant/isolation.test.ts` - Multi-tenancy

---

## 13. KEY FILES REFERENCE

### Authentication & JWT
- `/home/user/summit/server/src/services/AuthService.ts` - Main auth service
- `/home/user/summit/server/src/conductor/auth/jwt-rotation.ts` - JWT rotation
- `/home/user/summit/server/src/middleware/auth.ts` - Auth middleware

### RBAC & Permissions
- `/home/user/summit/server/src/middleware/rbac.ts` - RBAC middleware
- `/home/user/summit/server/src/conductor/auth/rbac-middleware.ts` - Conductor RBAC

### Authorization & Policies
- `/home/user/summit/server/src/middleware/opa-abac.ts` - OPA/ABAC integration
- `/home/user/summit/server/src/middleware/opa-enforcer.ts` - OPA enforcement
- `/home/user/summit/server/src/middleware/opa-with-appeals.ts` - Appeal system
- `/home/user/summit/server/src/middleware/withAuthAndPolicy.ts` - HOF resolver

### Tenant Isolation
- `/home/user/summit/server/src/middleware/withTenant.ts` - Tenant context wrapper
- `/home/user/summit/server/src/middleware/tenantValidator.ts` - Tenant validation
- `/home/user/summit/server/src/middleware/context-binding.ts` - Context binding

### Audit & Logging
- `/home/user/summit/server/src/audit/advanced-audit-system.ts` - Advanced audit
- `/home/user/summit/server/src/middleware/audit-logger.ts` - Audit middleware

### Advanced Security
- `/home/user/summit/src/auth/webauthn/WebAuthnManager.ts` - WebAuthn
- `/home/user/summit/server/src/middleware/spiffe-auth.ts` - SPIFFE/mTLS
- `/home/user/summit/server/src/pii/redactionMiddleware.ts` - PII redaction
- `/home/user/summit/server/src/middleware/maestro-authz.ts` - Maestro authz

### Infrastructure
- `/home/user/summit/server/src/db/neo4j.ts` - Neo4j driver
- `/home/user/summit/server/src/config/production-security.ts` - Security config
- `/home/user/summit/server/src/middleware/security.ts` - Security helpers

---

## 14. RECOMMENDATIONS FOR GOVERNANCE AUDIT

### Priority 1 (Critical)
1. Complete OIDC implementation with issuer verification
2. Implement deny-by-default policy for new tenants
3. Enable database encryption at rest
4. Implement immutable audit log with AWS S3 legal hold
5. Add HSM or KMS integration for key management

### Priority 2 (High)
1. Implement MFA enforcement for admin role
2. Add field-level redaction to GraphQL schema
3. Implement fine-grained rate limiting (per-user, per-operation)
4. Add anomaly detection and suspicious activity scoring
5. Implement account lockout after N failed attempts

### Priority 3 (Medium)
1. Create role management API for dynamic roles
2. Implement attribute inheritance for org→team→user
3. Add request signing with HMAC for webhook integrity
4. Create policy-as-code framework (Rego) for OPA rules
5. Implement session-based revocation with Redis

### Priority 4 (Ongoing)
1. Regular security audits of policy decisions
2. Penetration testing of auth boundaries
3. Compliance certification (SOC2, ISO27001)
4. Security awareness training for developers
5. Regular key rotation ceremonies

---

## Appendix: API Examples

### Login with JWT
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"secret"}'

# Response:
{
  "token": "eyJhbGc...",
  "refreshToken": "550e8400-e29b-41d4-a716-446655440000",
  "expiresIn": 86400,
  "user": { "id": "...", "email": "user@example.com", "role": "ANALYST" }
}
```

### Access Protected Endpoint
```bash
curl -X GET http://localhost:3000/api/investigations \
  -H "Authorization: Bearer eyJhbGc..."

# Protected by: ensureAuthenticated → requirePermission('investigation:read')
```

### Request with Tenant Context
```bash
curl -X GET http://localhost:3000/api/maestro/v1/pipelines \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "X-Tenant-Id: tenant-123" \
  -H "X-Purpose: investigation" \
  -H "X-Legal-Basis: authorized_use" \
  -H "X-Sensitivity: confidential"

# Checked by: contextBindingMiddleware → maestroAuthzMiddleware → OPA
```

### Refresh Token
```bash
curl -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"550e8400-e29b-41d4-a716-446655440000"}'

# Returns: New token pair with old refresh token revoked
```

---

## Document Control

**Version:** 1.0
**Last Updated:** 2025-11-20
**Reviewed By:** Security Architecture Team
**Next Review:** 2025-12-20

