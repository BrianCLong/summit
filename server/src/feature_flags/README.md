# Feature Flags

This module provides a unified way to manage feature flags across the application.

## Registry

Flags are defined in `registry.ts`. To add a new flag:
1. Add it to the `FeatureFlags` object.
2. Add a default value in `DEFAULT_FLAGS`.

## Usage

### Check if enabled

```typescript
import { isEnabled, FeatureFlags } from './feature_flags';

if (isEnabled(FeatureFlags.NEW_SEARCH_ALGORITHM)) {
  // do new thing
}
```

### Decorator

```typescript
import { requireFlag, FeatureFlags } from './feature_flags';

class MyService {
  @requireFlag(FeatureFlags.BETA_DASHBOARD)
  getDashboard() {
    // ...
  }
}
```

## Configuration

Flags can be overridden via environment variables prefixed with `FLAG_`.
Example: `FLAG_NEW_SEARCH_ALGORITHM=true` enables `new_search_algorithm`.
Precedence:
1. Runtime Overrides (Env/Setters)
2. Defaults
