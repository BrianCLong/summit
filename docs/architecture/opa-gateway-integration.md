# OPA Gateway Integration Architecture

This document outlines the integration pattern for enforcing OPA policies within the Apollo GraphQL Gateway.

## 1. Architecture

We will use an Apollo Server plugin to create a policy enforcement point before resolvers are executed.

1.  **JWT Claims**: On request, the JWT is decoded. Claims like `tenant_id`, `user_id`, and `roles` are extracted.
2.  **OPA Input Creation**: The plugin constructs an `input` object for OPA, containing the principal's attributes (from JWT), the query being performed, and the resources being accessed.
3.  **Policy Evaluation**: The plugin queries the OPA sidecar via its HTTP API with the `input` object.
4.  **Decision Enforcement**: If OPA returns `allow: true`, the request proceeds. If `allow: false`, the plugin throws a `ForbiddenError` and logs the audit event.

## 2. Example Plugin Code

```typescript
const opaEnforcementPlugin = {
  async requestDidStart(requestContext) {
    return {
      async executionDidStart() {
        const { principal, resource } = buildOpaInput(requestContext);
        const isAllowed = await opaClient.isAllowed({ principal, resource });

        if (!isAllowed) {
          throw new ForbiddenError('Policy violation');
        }
      },
    };
  },
};
```
