# Feature Flag Standards

This document defines the standard approach for feature flagging in the IntelGraph repository.

## The Standard

All new feature flags must use the **`@intelgraph/feature-flags`** package located in `packages/feature-flags`.

### Usage

1.  **Install**:

    ```bash
    pnpm add @intelgraph/feature-flags --filter <your-service>
    ```

2.  **Initialize**:
    Use the `FeatureFlagService` with a provider (LaunchDarkly, Unleash, or InMemory/File for dev).

3.  **Check Flags**:
    ```typescript
    const isEnabled = await featureFlags.getBooleanFlag("my-new-feature", false, { userId });
    ```

## Deprecated Approaches

The following modules are **DEPRECATED** and should not be used for new code:

- `server/src/flags.ts`
- `server/src/featureFlags/flagsmith.ts`
- `server/src/flags/store.ts`

## Principles

1.  **Default OFF**: New features should be disabled by default.
2.  **Short-lived**: Remove flags once the feature is stable (unless it's a permanent toggle like a kill switch).
3.  **Context-aware**: Always pass `userId` and `tenantId` in the context for granular targeting.
4.  **No Direct DB**: Do not implement ad-hoc flag tables in Postgres/Neo4j. Use the standard service.

## Reference

See `packages/feature-flags/README.md` for full API documentation and examples.
