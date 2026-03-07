# Configuration & Feature Flags

This guide explains how configuration and feature flags are managed in the Summit platform.

## Configuration (Backend)

We use a centralized, typed configuration system located at `server/src/config/index.ts`.
This module:

1.  Loads environment variables from `.env` (using `dotenv`).
2.  Validates them using a Zod schema.
3.  Exports a typed `SummitConfig` object.

### Usage

```typescript
import config from "../config";

// Access configuration
const dbHost = config.db.host;
const logLevel = config.observability.logLevel;

// Check feature flags
if (config.featureFlags.isEnabled("maestro.newRunConsole")) {
  // ...
}
```

### Adding New Configuration

1.  Add the environment variable to `EnvSchema` in `server/src/config/index.ts`.
2.  Add the field to the `SummitConfig` interface.
3.  Map the parsed value to the config object in `loadConfig`.
4.  Update `.env.example`.

## Feature Flags

Feature flags are defined in `server/src/config/featureFlags.ts`.
We use a `FeatureKey` type to ensure type safety.

### Adding a New Flag

1.  Add the key to `FeatureKey` type in `server/src/config/featureFlags.ts`:
    ```typescript
    export type FeatureKey = "my.newFeature";
    // ...
    ```
2.  (Optional) Add a default mapping in `loadConfig` if it maps to a specific ENV var.
    By default, any env var starting with `FEATURE_` is auto-mapped.
    e.g. `FEATURE_MY_NEW_FEATURE=true` -> `my.newFeature` enabled.
    Note: underscores in env vars are converted to dots (e.g. `FEATURE_MY_NEW_FEATURE` -> `my.new.feature`).

### Usage (Backend)

```typescript
import config from "../config";

if (config.featureFlags.isEnabled("my.newFeature", { tenantId })) {
  // ...
}
```

## Frontend Configuration

Frontend configuration is handled in `apps/web/src/config.ts`.
It exposes safe configuration values and public feature flags.

### Usage (Frontend)

```typescript
import config, { isFeatureEnabled } from "@/config";

if (isFeatureEnabled("maestro.newRunConsole")) {
  // ...
}
```

### Environment Variables

- **Backend**: Standard `.env` variables.
- **Frontend**: Vite variables (start with `VITE_`).

See `.env.example` for a complete list of supported variables.

## Security

- **NEVER** commit secrets to version control.
- **NEVER** log the full config object. The system automatically sanitizes logs, but be careful.
- Frontend config must **ONLY** contain public/safe values.

## Testing

When writing tests, you can reset the config to test different states:

```typescript
import { resetConfigForTesting } from "../src/config";

beforeEach(() => {
  resetConfigForTesting();
  process.env.FEATURE_SOME_FLAG = "true";
});
```
