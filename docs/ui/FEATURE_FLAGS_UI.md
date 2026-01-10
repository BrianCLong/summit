# Feature Flags for UI

This document describes the feature flags used in the UI to gate new features.

## Flags

The following flags are currently supported:

| Flag Name | Description | Default |
|Str |---|---|
| `FEATURE_INVESTIGATION_UI` | Enables the Investigation Console (Workspaces/Cases list). | `false` |
| `FEATURE_TIMELINE_UI` | Enables the Timeline Viewer and Timeline Page. | `false` |
| `FEATURE_REPORT_DOWNLOAD` | Enables the "Download Report" button functionality. | `false` |

## Configuration

Feature flags are configured via environment variables. To enable a feature, set the corresponding environment variable to `true` in your `.env` file or build configuration.

The environment variable name is the flag name prefixed with `VITE_`.

Example:

```bash
VITE_FEATURE_INVESTIGATION_UI=true
VITE_FEATURE_TIMELINE_UI=true
```

## Usage in Code

Use the `isFeatureEnabled` function from `client/src/flags/featureFlags.ts` to check if a feature is enabled.

```typescript
import { isFeatureEnabled, FeatureFlags } from 'client/src/flags/featureFlags';

if (isFeatureEnabled(FeatureFlags.FEATURE_INVESTIGATION_UI)) {
  // Render new UI
}
```
