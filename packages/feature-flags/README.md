# @intelgraph/feature-flags

Comprehensive feature flag system for Summit/IntelGraph with provider abstraction, caching, analytics, and A/B testing support.

## Features

- 🎯 **Multiple Providers**: LaunchDarkly and Unleash support with pluggable architecture
- 🚀 **Performance**: Redis-based caching with configurable TTL
- 📊 **Analytics**: Built-in metrics with Prometheus integration
- 🎲 **A/B Testing**: Percentage-based rollouts with consistent hashing
- 🎭 **User Targeting**: Advanced segmentation with custom attributes
- ⚛️ **React Integration**: Hooks and components for seamless frontend integration
- 🔧 **Middleware**: Express middleware for server-side integration
- 📈 **Monitoring**: Grafana dashboards and alerts
- 🛡️ **Type Safe**: Full TypeScript support
- 🔌 **Extensible**: Easy to add custom providers

## Installation

```bash
pnpm add @intelgraph/feature-flags
```

## Quick Start

### Backend (Node.js)

```typescript
import {
  FeatureFlagService,
  LaunchDarklyProvider,
  RedisCache,
  PrometheusMetrics,
} from '@intelgraph/feature-flags';
import Redis from 'ioredis';

// Initialize provider
const provider = new LaunchDarklyProvider({
  sdkKey: process.env.LAUNCHDARKLY_SDK_KEY!,
});

// Initialize cache
const redis = new Redis(process.env.REDIS_URL);
const cache = new RedisCache({ redis });

// Initialize metrics
const metrics = new PrometheusMetrics();

// Create service
const featureFlags = new FeatureFlagService({
  provider,
  cache,
  enableCache: true,
  enableMetrics: true,
  enableAnalytics: true,
});

// Initialize
await featureFlags.initialize();

// Check a flag
const isEnabled = await featureFlags.getBooleanFlag(
  'new-dashboard',
  false,
  { userId: 'user-123' }
);

if (isEnabled) {
  // Show new dashboard
}
```

### Express Middleware

```typescript
import { createFeatureFlagMiddleware } from '@intelgraph/feature-flags/middleware';

// Add middleware
app.use(createFeatureFlagMiddleware({
  service: featureFlags,
  contextBuilder: (req) => ({
    userId: req.user?.id,
    userEmail: req.user?.email,
    tenantId: req.user?.tenantId,
  }),
}));

// Use in routes
app.get('/dashboard', async (req, res) => {
  const useNewDashboard = await req.featureFlags.isEnabled('new-dashboard');

  if (useNewDashboard) {
    res.json({ version: 'v2' });
  } else {
    res.json({ version: 'v1' });
  }
});
```

### Frontend (React)

```tsx
import {
  FeatureFlagProvider,
  useFeatureFlag,
  FeatureFlag,
} from '@intelgraph/feature-flags/react';

// Wrap app with provider
function App() {
  return (
    <FeatureFlagProvider
      apiEndpoint="/api/feature-flags"
      initialContext={{
        userId: currentUser.id,
        userEmail: currentUser.email,
      }}
    >
      <Dashboard />
    </FeatureFlagProvider>
  );
}

// Use hook
function Dashboard() {
  const showNewFeature = useFeatureFlag('new-feature', false);

  return (
    <div>
      {showNewFeature && <NewFeatureComponent />}
    </div>
  );
}

// Use component
function Settings() {
  return (
    <FeatureFlag flag="advanced-settings" defaultValue={false}>
      <AdvancedSettings />
    </FeatureFlag>
  );
}
```

## Providers

### LaunchDarkly

```typescript
import { LaunchDarklyProvider } from '@intelgraph/feature-flags';

const provider = new LaunchDarklyProvider({
  sdkKey: process.env.LAUNCHDARKLY_SDK_KEY!,
  options: {
    // LaunchDarkly SDK options
    diagnosticOptOut: false,
    sendEvents: true,
  },
  timeout: 10000,
});
```

### Unleash

```typescript
import { UnleashProvider } from '@intelgraph/feature-flags';

const provider = new UnleashProvider({
  url: process.env.UNLEASH_URL!,
  appName: 'summit',
  apiToken: process.env.UNLEASH_API_TOKEN,
  instanceId: 'server-1',
});
```

## Caching

### Redis Cache

```typescript
import { RedisCache } from '@intelgraph/feature-flags';
import Redis from 'ioredis';

const cache = new RedisCache({
  redis: new Redis(process.env.REDIS_URL),
  keyPrefix: 'ff:',
  defaultTTL: 300, // 5 minutes
  enableStats: true,
});

// Get cache stats
const stats = await cache.getStats();
console.log(`Hit rate: ${stats.hitRate * 100}%`);
```

## Metrics

### Prometheus Integration

```typescript
import { PrometheusMetrics } from '@intelgraph/feature-flags';
import { Registry } from 'prom-client';

const registry = new Registry();
const metrics = new PrometheusMetrics({ registry });

featureFlags.setMetrics(metrics);

// Expose metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', registry.contentType);
  res.end(await metrics.getMetrics());
});
```

Available metrics:
- `feature_flags_evaluations_total` - Total flag evaluations
- `feature_flags_evaluation_duration_ms` - Evaluation duration
- `feature_flags_cache_hits_total` - Cache hits
- `feature_flags_cache_misses_total` - Cache misses
- `feature_flags_errors_total` - Errors

## Rollouts & A/B Testing

### Percentage Rollout

```typescript
import { createGradualRollout, evaluateRollout } from '@intelgraph/feature-flags';

// Create 20% rollout
const rollout = createGradualRollout(
  'enabled',
  'disabled',
  20, // 20% enabled
  'userId'
);

// Evaluate for user
const variation = evaluateRollout(rollout, { userId: 'user-123' });
```

### A/B Test

```typescript
import { createABTest } from '@intelgraph/feature-flags';

// 50/50 A/B test
const abTest = createABTest('variant-a', 'variant-b', 50);

// Multivariate test
const mvTest = createMultivariateTest([
  { id: 'control', percentage: 33.3 },
  { id: 'variant-a', percentage: 33.3 },
  { id: 'variant-b', percentage: 33.4 },
]);
```

## User Targeting

### Targeting Rules

```typescript
import {
  targetUserId,
  targetRole,
  targetEnvironment,
  targetAttribute,
} from '@intelgraph/feature-flags';

// Target specific users
const userRule = {
  id: 'beta-users',
  description: 'Beta testing users',
  conditions: [
    targetUserId(['user-1', 'user-2', 'user-3']),
  ],
  variation: 'enabled',
};

// Target by role
const adminRule = {
  id: 'admins-only',
  conditions: [
    targetRole(['admin', 'superadmin']),
  ],
  variation: 'enabled',
};

// Complex targeting
const complexRule = {
  id: 'enterprise-prod',
  conditions: [
    targetEnvironment(['production']),
    targetAttribute('plan', 'in', ['enterprise', 'premium']),
    targetAttribute('accountAge', 'greater_than', 30),
  ],
  variation: 'enabled',
};
```

### Condition Operators

- `equals` / `not_equals`
- `in` / `not_in`
- `contains` / `not_contains`
- `starts_with` / `ends_with`
- `greater_than` / `greater_than_or_equal`
- `less_than` / `less_than_or_equal`
- `matches_regex`
- `semver_equal` / `semver_greater_than` / `semver_less_than`

## Advanced Usage

### Kill Switch Pattern

```typescript
// Create a kill switch for emergency disabling
const killSwitch = await featureFlags.getBooleanFlag(
  'payments-enabled',
  true, // Default enabled
  { environment: 'production' }
);

if (!killSwitch) {
  throw new Error('Payments are currently disabled');
}
```

### Feature Flag Guard Middleware

```typescript
import { createFlagGuard } from '@intelgraph/feature-flags/middleware';

// Protect route with feature flag
app.get('/beta/new-feature',
  createFlagGuard('beta-features', {
    service: featureFlags,
    statusCode: 404,
    errorMessage: 'Feature not available',
  }),
  (req, res) => {
    res.json({ message: 'Beta feature!' });
  }
);
```

### React Variation Component

```tsx
import { FeatureVariation } from '@intelgraph/feature-flags/react';

function PricingPage() {
  return (
    <FeatureVariation
      flag="pricing-experiment"
      defaultVariation="control"
      variations={{
        control: <OldPricing />,
        'test-a': <NewPricingA />,
        'test-b': <NewPricingB />,
      }}
      fallback={<LoadingPricing />}
    />
  );
}
```

### Event Tracking

```typescript
// Track conversion
await featureFlags.track('purchase-completed', {
  userId: 'user-123',
}, {
  amount: 99.99,
  plan: 'premium',
});

// React hook
import { useFeatureFlagTracker } from '@intelgraph/feature-flags/react';

function CheckoutButton() {
  const track = useFeatureFlagTracker();

  const handleClick = () => {
    track('checkout-clicked', { source: 'pricing-page' });
  };

  return <button onClick={handleClick}>Checkout</button>;
}
```

## Best Practices

### 1. Use Descriptive Flag Names

```typescript
// ✅ Good
'enable-new-dashboard'
'checkout-redesign-v2'
'beta-ai-features'

// ❌ Bad
'flag1'
'test'
'new'
```

### 2. Set Appropriate Defaults

```typescript
// For new features, default to false
const showNewFeature = await featureFlags.getBooleanFlag(
  'new-feature',
  false, // Safe default
  context
);

// For kill switches, default to true
const serviceEnabled = await featureFlags.getBooleanFlag(
  'payment-service-enabled',
  true, // Service should be enabled by default
  context
);
```

### 3. Clean Up Old Flags

```typescript
// Flag lifecycle:
// 1. Development: 0-10% rollout
// 2. Testing: 10-50% rollout
// 3. General availability: 100% rollout
// 4. Remove flag from code
// 5. Archive flag in provider
```

### 4. Use Caching Wisely

```typescript
// Short TTL for critical flags
const criticalFlags = new FeatureFlagService({
  provider,
  cache,
  cacheTTL: 60, // 1 minute
});

// Longer TTL for stable flags
const stableFlags = new FeatureFlagService({
  provider,
  cache,
  cacheTTL: 3600, // 1 hour
});
```

### 5. Monitor Flag Usage

```typescript
// Set up alerts for flag evaluation errors
featureFlags.on('error', (error) => {
  logger.error('Feature flag error', { error });
  alerting.notify('feature-flag-error', error);
});

// Track flag evaluation events
featureFlags.on('evaluation', (event) => {
  analytics.track('flag-evaluated', {
    flagKey: event.flagKey,
    variation: event.variation,
    reason: event.reason,
  });
});
```

## API Reference

### FeatureFlagService

```typescript
class FeatureFlagService {
  constructor(config: FeatureFlagConfig);

  initialize(): Promise<void>;
  close(): Promise<void>;
  isReady(): boolean;

  getBooleanFlag(key: string, defaultValue: boolean, context?: FlagContext): Promise<boolean>;
  getStringFlag(key: string, defaultValue: string, context?: FlagContext): Promise<string>;
  getNumberFlag(key: string, defaultValue: number, context?: FlagContext): Promise<number>;
  getJSONFlag<T>(key: string, defaultValue: T, context?: FlagContext): Promise<T>;

  getEvaluation<T>(key: string, defaultValue: T, context?: FlagContext): Promise<FlagEvaluation<T>>;
  getAllFlags(context?: FlagContext): Promise<Record<string, FlagVariation>>;

  track(eventName: string, context?: FlagContext, data?: Record<string, any>): Promise<void>;

  getFlagDefinition(key: string): Promise<FlagDefinition | null>;
  listFlags(): Promise<FlagDefinition[]>;

  setMetrics(metrics: FlagMetrics): void;
  getMetrics(): FlagMetrics | undefined;
}
```

### FlagContext

```typescript
interface FlagContext {
  userId?: string;
  userEmail?: string;
  userRole?: string | string[];
  tenantId?: string;
  environment?: string;
  attributes?: Record<string, any>;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  location?: {
    country?: string;
    region?: string;
    city?: string;
  };
}
```

## Examples

See the [examples](./examples) directory for complete examples:

- [Basic Usage](./examples/basic.ts)
- [Express Integration](./examples/express-app.ts)
- [React Integration](./examples/react-app.tsx)
- [A/B Testing](./examples/ab-testing.ts)
- [Gradual Rollout](./examples/gradual-rollout.ts)

## License

MIT
