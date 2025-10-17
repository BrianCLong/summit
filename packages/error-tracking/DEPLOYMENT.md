# Deployment guide

This guide describes how to roll out `@summit/error-tracking` across environments while maintaining parity between Node services, browser applications, and CI automation.

## 1. Provision Sentry projects

1. Create or select a Sentry organisation for Summit operations.
2. Create distinct projects for each runtime (e.g. `intelgraph-api`, `intelgraph-ui`).
3. Generate an **auth token** with `project:releases` scope for CI-driven source map uploads.
4. Record DSN strings for each project and store them in the appropriate secret stores (Vault, GitHub Actions, etc.).

## 2. Configure environment variables

Set the following variables in each deployment environment:

| Variable | Purpose |
| --- | --- |
| `SENTRY_DSN` | Required DSN for the respective project. |
| `SENTRY_ENVIRONMENT` | Deployment tier (`development`, `staging`, `production`). |
| `SENTRY_RELEASE` | Build identifier (commit SHA or semver). |
| `SENTRY_DIST` | Optional distribution channel (e.g. build number). |
| `SENTRY_TRACES_SAMPLE_RATE` | Numeric sample rate (`0` – `1`) for transactions. |
| `SENTRY_PROFILES_SAMPLE_RATE` | Numeric sample rate for profiles. |
| `SENTRY_ENABLE_TRACING` | Enables `withSpan`/`withTransaction` instrumentation. |
| `SENTRY_AUTO_SESSION_TRACKING` | Toggle automatic Node session tracking. |
| `SENTRY_REPLAYS_SESSION_SAMPLE_RATE` | Browser session replay sampling (0 – 1). |
| `SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE` | Browser replay sampling when an error occurs. |
| `SENTRY_DEBUG` | Emits verbose SDK logs for troubleshooting. |

## 3. Application bootstrapping

### Node services

```ts
import {
  initialiseNodeSdk,
  registerNodeGlobalHandlers,
  setUserContext
} from '@summit/error-tracking';

const config = initialiseNodeSdk();
if (config.enabled) {
  registerNodeGlobalHandlers();
}

setUserContext({ id: request.userId, segment: request.segment });
```

### Browser/React apps

```tsx
import {
  initialiseBrowserSdk,
  registerBrowserGlobalHandlers,
  createErrorBoundary
} from '@summit/error-tracking';

initialiseBrowserSdk();
registerBrowserGlobalHandlers();

const Boundary = createErrorBoundary({
  fallback: ({ error, resetError }) => (
    <FullScreenError error={error} onRetry={resetError} />
  )
});
```

## 4. Source map uploads in CI

Add a build step after bundling artifacts:

```bash
node scripts/sentry-upload.js
```

Example `scripts/sentry-upload.js`:

```ts
import { uploadSourceMaps } from '@summit/error-tracking';

await uploadSourceMaps({
  authToken: process.env.SENTRY_AUTH_TOKEN!,
  org: 'summit',
  project: process.env.SENTRY_PROJECT!,
  release: process.env.SENTRY_RELEASE!,
  dist: process.env.SENTRY_DIST,
  include: ['dist/assets'],
  urlPrefix: '~/assets'
});
```

## 5. Alert rules

Use `createAlertRule` to codify SLO thresholds as code:

```ts
import { createAlertRule } from '@summit/error-tracking';

export const prodAlert = createAlertRule(
  'API high error rate',
  'production',
  'team:platform',
  { errorCountThreshold: 250, transactionDurationMs: 1500 },
  { emails: ['platform-oncall@summit.dev'], teamSlugs: ['platform'] }
);
```

Publish the resulting JSON to Sentry via their REST API or Terraform provider to keep alerts in sync with infrastructure as code.

## 6. Performance monitoring rollout

- Wrap I/O intensive sections with `withSpan` and high-level flows with `withTransaction`.
- Start with a conservative sampling rate (e.g. `0.1`) and increase once budgets are established.
- Use `withScope` to attach feature flags or tenant identifiers for better triage.

## 7. Verification checklist

- [ ] SDK initialises without console warnings in each environment.
- [ ] Errors from intentional smoke tests appear in Sentry with breadcrumbs and user context.
- [ ] Source maps resolve stack traces to TypeScript lines.
- [ ] Alert rules trigger notifications when thresholds are artificially breached.
- [ ] Performance spans show up in the Sentry Performance UI.

Once all checkpoints pass, promote the configuration to production and document the release in the change log.
