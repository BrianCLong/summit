# Developer Security Guide

This guide outlines the security standards and services available in the Summit/IntelGraph platform.

## 1. Secrets Management

**Do not access `process.env` directly.** Use the `SecretsService`.

### Usage
```typescript
import { secretsService } from '../services/SecretsService.js';
import { SECRETS } from '../config/secretRefs.js';

async function connectToDb() {
  const password = await secretsService.getSecret(SECRETS.POSTGRES_PASSWORD);
  // ...
}
```

### Adding a New Secret
1. Add the environment variable to `.env.example` (empty value) and your local `.env`.
2. Define the secret reference in `server/src/config/secretRefs.ts`.

## 2. Policy & Authorization

We use a unified `PolicyService` to make access control decisions. This replaces ad-hoc RBAC checks.

### Usage
```typescript
import { policyService } from '../services/PolicyService.js';

const ctx = {
  principal: user,
  action: 'document:view',
  resource: { id: docId, tenantId: docTenantId },
  environment: { ... }
};

const decision = await policyService.evaluate(ctx);
if (!decision.allow) {
  throw new Error(`Access denied: ${decision.reason}`);
}
```

## 3. LLM Safety

All LLM interactions must be guarded by `LlmSecurityService`.

### Usage
```typescript
import { llmSecurityService } from '../services/LlmSecurityService.js';

const check = await llmSecurityService.validatePrompt(prompt, {
  tenantId,
  principal,
  purpose: 'analysis',
  dataSensitivity: 'internal'
}, 'gpt-4');

if (!check.allowed) {
  // Handle rejection (e.g. PII detected, policy violation)
  throw new Error(check.reason);
}

const response = await llmClient.complete(check.redactedPrompt);
```

## 4. Audit Logging

Security-critical events are logged automatically by the services. If you need to log a custom security event:

```typescript
import { writeAudit } from '../utils/audit.js';

await writeAudit({
  userId: user.id,
  tenantId: tenant.id,
  action: 'custom.security.event',
  resourceType: 'custom_resource',
  resourceId: id,
  details: { ... }
});
```

## 5. Software Supply Chain

*   **Dependencies**: Use `pnpm`. Do not use `npm` or `yarn`.
*   **SBOM**: Generated automatically on build.
*   **Signing**: Artifacts are signed in the CI pipeline.
