# Governance & Policy Fabric

## Overview

The Unified Governance & Policy Fabric enforces security, compliance, and auditability across Summit.

## Policy Configuration

Policies are configured in `policy/governance-config.yaml`.
Environments support:
- `dev`: Permissive, logging-only.
- `staging`: Strict enforcement.
- `prod`: Strict enforcement.

## OPA Policies

Policies are written in Rego and located in `policy/rego/`.
The main entry point is `policy/rego/governance.rego`.

## Runtime Enforcement

The `PolicyEngine` service (`server/src/services/PolicyEngine.ts`) provides runtime evaluation.
It integrates with `AdvancedAuditSystem` to log all decisions.

### Usage in Code

```typescript
import { PolicyEngine } from '../services/PolicyEngine';

const engine = PolicyEngine.getInstance();
const decision = await engine.evaluate({
  environment: 'prod',
  user: req.user,
  action: 'access_data',
  resource: { type: 'sensitive_document' }
});

if (!decision.allow) {
  throw new Error('Access Denied');
}
```

## Dashboard

A Governance Dashboard is available at `/governance` (in the web app) to view status and violations.

## CI/CD Integration

The workflow `.github/workflows/policy-gate.yml` enforces policy checks on PRs.
