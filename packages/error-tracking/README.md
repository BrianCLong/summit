# @summit/error-tracking

The `@summit/error-tracking` package centralises Sentry initialisation and instrumentation for Summit services. It ships a strict TypeScript API, React error boundaries, breadcrumb helpers, user context management, performance tracing utilities, automated source map uploads, and alert rule builders that keep operational policies consistent across runtimes.

## Features

- ✅ Unified configuration loader with environment overrides (`SENTRY_*` variables or `.env`).
- ✅ Initialise Sentry SDKs for Node.js and browser/React applications with automatic global handler registration.
- ✅ React error boundary factory with custom fallback rendering and reset hooks.
- ✅ Breadcrumb and console instrumentation utilities for richer diagnostics.
- ✅ User context helpers to attach customer identity and feature flags to events.
- ✅ Promise-friendly performance helpers for spans and transactions.
- ✅ Source map upload orchestration using `@sentry/cli`.
- ✅ Alert rule builder to codify SLO/SLI driven notifications.

## Quick start

Install dependencies and run the workspace build:

```bash
npm install
npm run --workspace=@summit/error-tracking build
```

### Node service integration

```ts
import {
  initialiseNodeSdk,
  registerNodeGlobalHandlers,
  withTransaction,
  captureException
} from '@summit/error-tracking';

initialiseNodeSdk({ environment: process.env.NODE_ENV ?? 'development' });
registerNodeGlobalHandlers();

export async function handler(): Promise<void> {
  await withTransaction({ name: 'job.execute', op: 'queue.process' }, async () => {
    try {
      // business logic...
    } catch (error) {
      captureException(error);
      throw error;
    }
  });
}
```

### React integration

```tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import {
  initialiseBrowserSdk,
  registerBrowserGlobalHandlers,
  createErrorBoundary,
  setUserContext
} from '@summit/error-tracking';

initialiseBrowserSdk({ environment: import.meta.env.MODE });
registerBrowserGlobalHandlers();

const ErrorBoundary = createErrorBoundary({
  fallback: ({ error, resetError }) => (
    <div role="alert">
      <p>Something went wrong.</p>
      <pre>{error.message}</pre>
      <button onClick={resetError}>Try again</button>
    </div>
  )
});

setUserContext({ id: '42', email: 'analyst@summit.dev' });

createRoot(document.getElementById('root') as HTMLElement).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
```

### Uploading source maps

```ts
import { uploadSourceMaps } from '@summit/error-tracking';

await uploadSourceMaps({
  authToken: process.env.SENTRY_AUTH_TOKEN!,
  org: 'summit',
  project: 'intelgraph-ui',
  release: process.env.RELEASE_VERSION!,
  include: ['dist/assets'],
  urlPrefix: '~/assets'
});
```

### Building alert rules

```ts
import { createAlertRule } from '@summit/error-tracking';

const highErrorRate = createAlertRule(
  'High error rate',
  'production',
  'team:platform',
  { errorCountThreshold: 100 },
  { emails: ['oncall@summit.dev'] }
);
```

## Testing & linting

```bash
npm run --workspace=@summit/error-tracking test
npm run --workspace=@summit/error-tracking lint
npm run --workspace=@summit/error-tracking typecheck
```

## Environment variables

| Variable | Description |
| --- | --- |
| `SENTRY_DSN` | Required DSN string for event ingestion. |
| `SENTRY_ENVIRONMENT` | Deployment environment (defaults to `development`). |
| `SENTRY_RELEASE` | Release identifier used for source map correlation. |
| `SENTRY_TRACES_SAMPLE_RATE` | Overrides trace sampling rate. |
| `SENTRY_PROFILES_SAMPLE_RATE` | Overrides profiling sampling rate. |
| `SENTRY_DEBUG` | Enable verbose SDK logs (`true`/`false`). |
| `SENTRY_ENABLE_TRACING` | Toggle performance instrumentation. |
| `SENTRY_REPLAYS_SESSION_SAMPLE_RATE` | Browser session replay sampling. |
| `SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE` | Browser on-error replay sampling. |

Additional values (`SENTRY_DIST`, `SENTRY_SAMPLE_RATE`, etc.) are also surfaced and detailed in `DEPLOYMENT.md`.
