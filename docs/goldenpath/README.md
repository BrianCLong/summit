# Golden Path Guide

This directory contains guides and templates for adding new features to the IntelGraph platform while following architectural standards (the "Golden Path").

## What is the Golden Path?

The Golden Path is the recommended, supported, and easiest way to build and deploy software in this repository. It ensures:

1.  **Consistency**: Code looks and behaves the same.
2.  **Safety**: Changes are isolated and verified.
3.  **Speed**: CI checks pass on the first try.

## Guides

- [Adding a New Service](./new-service.md)
- [Adding a New API Endpoint](./new-endpoint.md)
- [Adding a Migration](./migration.md)

## Common Patterns

### 1. Feature Flags

Always wrap new logic in a feature flag.

```typescript
if (await flags.isEnabled("my-new-feature")) {
  // ...
}
```

### 2. Validation

Use Zod for all input validation.

```typescript
const InputSchema = z.object({ ... });
const data = InputSchema.parse(req.body);
```

### 3. Observability

Log structured events and use metrics.

```typescript
logger.info({ event: "user_created", userId }, "User created");
```
