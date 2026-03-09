---
name: security-boundary-check
description: Threat-model and validate changes that touch auth/permissions/network/policy.
---

When to use:
- Files under auth, policy, permissions, identity, secrets, network edges.
- Required by S-AOS (CLAUDE.md §6) for any change touching security boundaries.

## How to Perform a Security Boundary Check

### 1. Identify What You're Touching

Classify the change against these boundary types:

| Boundary | Examples | Escalation |
|----------|----------|------------|
| **Authentication** | Login, JWT, session, OAuth | Requires threat model |
| **Authorization** | RBAC, ABAC, OPA policies | Requires policy test |
| **Network** | API endpoints, CORS, TLS | Requires abuse case |
| **Data** | PII, secrets, encryption | Requires data flow check |
| **Infrastructure** | Docker, K8s, Terraform | Requires rollback plan |

### 2. Map Trust Boundaries

Identify the trust boundaries your change crosses:

```
[User Browser] --HTTPS--> [API Gateway] --internal--> [GraphQL Server] --bolt--> [Neo4j]
                                |
                           [OPA Sidecar] <-- policy decisions
```

Mark which boundary your change affects and what the trust level is on each side.

### 3. List Abuse Cases + Mitigations

| Abuse Case | Mitigation | Tested? |
|------------|------------|---------|
| Unauthenticated access to endpoint | JWT validation middleware | Yes — `auth.test.ts:22` |
| Privilege escalation via role spoofing | OPA policy check on every mutation | Yes — `opa-policies.test.ts:45` |
| SQL/Cypher injection via user input | Parameterized queries only | Yes — verified no string interpolation in queries |

### 4. Verify Policy Enforcement Points

```bash
# Run security-specific tests
pnpm test -- --testPathPattern="auth|policy|security"

# Run OPA policy evaluation
make opa-test

# Scan for common vulnerabilities
pnpm security:scan
```

### 5. Sign-off Checklist

Include this in the PR body when the security boundary check applies:

- [ ] No secrets or credentials in code or config
- [ ] All user input validated and sanitized
- [ ] Authentication required on new/modified endpoints
- [ ] Authorization checks enforce least privilege
- [ ] Audit logging covers the new operation
- [ ] No new `any` casts that bypass type safety in security paths
- [ ] Dependencies scanned — no critical CVEs introduced
- [ ] Threat model notes included in PR description

### 6. Output Format

Add a `## Security` section to the PR body with:
- Boundaries touched
- Abuse cases considered
- Mitigations verified
- Sign-off checklist (above)

## When to Escalate

Stop and ask for human review if:
- Change modifies authentication flow
- Change introduces new trust boundary
- Change handles PII or secrets
- Change modifies OPA policies that affect production
- You're unsure whether a mitigation is sufficient
