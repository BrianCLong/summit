# Feature Flags Integration Guide

This guide walks through integrating the feature flag system into your Summit application.

## Server Integration

### 1. Environment Variables

Add to `.env`:

```env
# Feature Flag Provider (launchdarkly or unleash)
FEATURE_FLAG_PROVIDER=launchdarkly

# LaunchDarkly
LAUNCHDARKLY_SDK_KEY=sdk-key-here

# Unleash
UNLEASH_URL=https://unleash.example.com
UNLEASH_APP_NAME=summit
UNLEASH_API_TOKEN=token-here

# Cache
FEATURE_FLAG_CACHE_TTL=300
```

### 2. Initialize in Server Bootstrap

Add to `server/src/app.ts`:

```typescript
import { initializeFeatureFlags } from './feature-flags/setup.js';
import { featureFlagMiddleware, exposeFeatureFlags } from './feature-flags/middleware.js';

// Bootstrap
async function bootstrap() {
  // Initialize feature flags
  await initializeFeatureFlags();

  // ... other initialization
}

// Add middleware
app.use(featureFlagMiddleware);

// Expose endpoint
app.get('/api/feature-flags', exposeFeatureFlags);

// Use in routes
app.get('/api/dashboard', async (req, res) => {
  const newDashboard = await req.featureFlags.isEnabled('new-dashboard');

  if (newDashboard) {
    res.json({ version: 'v2', data: await getNewDashboard() });
  } else {
    res.json({ version: 'v1', data: await getOldDashboard() });
  }
});
```

### 3. Metrics Endpoint

Add to Prometheus scrape config:

```typescript
import { getFeatureFlagService } from './feature-flags/setup.js';

app.get('/metrics', async (req, res) => {
  const service = getFeatureFlagService();
  const metrics = service.getMetrics();

  if (metrics) {
    res.set('Content-Type', metrics.getRegistry().contentType);
    res.end(await metrics.getMetrics());
  } else {
    res.status(404).send('Metrics not enabled');
  }
});
```

## Frontend Integration

### 1. Setup Provider

Wrap your app in `FeatureFlagProvider`:

```tsx
// App.tsx
import { FeatureFlagProvider } from '@intelgraph/feature-flags/react';

function App() {
  return (
    <FeatureFlagProvider
      apiEndpoint="/api/feature-flags"
      initialContext={{
        userId: currentUser?.id,
        userEmail: currentUser?.email,
        tenantId: currentUser?.tenantId,
      }}
      pollingInterval={60000} // Poll every minute
    >
      <AppContent />
    </FeatureFlagProvider>
  );
}
```

### 2. Use Hooks

```tsx
import { useFeatureFlag } from '@intelgraph/feature-flags/react';

function Dashboard() {
  const showNewDashboard = useFeatureFlag('new-dashboard', false);

  if (showNewDashboard) {
    return <NewDashboard />;
  }

  return <OldDashboard />;
}
```

### 3. Use Components

```tsx
import { FeatureFlag } from '@intelgraph/feature-flags/react';

function Settings() {
  return (
    <div>
      <h1>Settings</h1>

      <FeatureFlag flag="advanced-settings" defaultValue={false}>
        <AdvancedSettings />
      </FeatureFlag>

      <FeatureFlag
        flag="beta-features"
        defaultValue={false}
        fallback={<BetaComingSoon />}
      >
        <BetaFeatures />
      </FeatureFlag>
    </div>
  );
}
```

## GraphQL Integration

### 1. Add to Context

```typescript
import { getFeatureFlagService } from './feature-flags/setup.js';

interface GraphQLContext {
  user: User;
  featureFlags: FeatureFlagService;
}

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ req }) => ({
    user: req.user,
    featureFlags: getFeatureFlagService(),
  }),
});
```

### 2. Use in Resolvers

```typescript
const resolvers = {
  Query: {
    dashboard: async (_parent, _args, context: GraphQLContext) => {
      const useNewDashboard = await context.featureFlags.getBooleanFlag(
        'new-dashboard',
        false,
        {
          userId: context.user.id,
          tenantId: context.user.tenantId,
        }
      );

      if (useNewDashboard) {
        return getNewDashboard();
      }

      return getOldDashboard();
    },
  },
};
```

## Common Integration Patterns

### Kill Switch

```typescript
// Protect external API calls
async function callExternalAPI() {
  const apiEnabled = await featureFlags.getBooleanFlag(
    'kill-switch-external-api',
    true, // Default to enabled
    { environment: process.env.NODE_ENV }
  );

  if (!apiEnabled) {
    throw new Error('External API temporarily disabled');
  }

  return fetch('https://api.example.com/data');
}
```

### A/B Test with Conversion Tracking

```typescript
// Server
app.post('/api/checkout', async (req, res) => {
  const variant = await req.featureFlags.getString(
    'checkout-flow-experiment',
    'control'
  );

  // Process checkout
  const result = await processCheckout(req.body, variant);

  // Track conversion
  await req.featureFlags.track('checkout-completed', {
    variant,
    amount: result.total,
    items: result.items.length,
  });

  res.json(result);
});
```

### Gradual Feature Rollout

```typescript
// Start at 5%
await provider.createFlag({
  key: 'new-search-algorithm',
  name: 'New Search Algorithm',
  rollout: createGradualRollout('enabled', 'disabled', 5),
});

// Monitor metrics, increase to 25%
await provider.updateFlag('new-search-algorithm', {
  rollout: createGradualRollout('enabled', 'disabled', 25),
});

// Eventually 100%
await provider.updateFlag('new-search-algorithm', {
  rollout: createGradualRollout('enabled', 'disabled', 100),
});

// After 2 weeks at 100%, remove flag from code
```

### Permission-Based Features

```typescript
const hasAdvancedAnalytics = await featureFlags.getBooleanFlag(
  'advanced-analytics',
  false,
  {
    userId: user.id,
    attributes: {
      plan: user.subscription.plan,
      role: user.role,
    },
  }
);

// In LaunchDarkly/Unleash, configure targeting rule:
// If plan IN [premium, enterprise] AND role IN [admin, analyst]
// Then variation = enabled
```

## Testing

### Unit Tests

```typescript
import { SimpleFeatureFlagClient } from '@intelgraph/feature-flags/react';

describe('Dashboard', () => {
  it('shows new dashboard when flag enabled', () => {
    const client = new SimpleFeatureFlagClient({
      'new-dashboard': true,
    });

    const { getByTestId } = render(
      <FeatureFlagProvider client={client}>
        <Dashboard />
      </FeatureFlagProvider>
    );

    expect(getByTestId('new-dashboard')).toBeInTheDocument();
  });
});
```

### Integration Tests

```typescript
beforeEach(async () => {
  // Set up test flags
  await testFeatureFlags.setFlag('test-feature', true);
});

afterEach(async () => {
  // Clean up
  await testFeatureFlags.clearAllFlags();
});
```

## Monitoring

### Grafana Alerts

```yaml
# Alert on high error rate
- alert: FeatureFlagHighErrorRate
  expr: rate(feature_flags_errors_total[5m]) > 0.1
  for: 5m
  annotations:
    summary: High feature flag error rate
    description: Error rate is {{ $value }} errors/sec

# Alert on low cache hit rate
- alert: FeatureFlagLowCacheHitRate
  expr: |
    sum(rate(feature_flags_cache_hits_total[5m])) /
    (sum(rate(feature_flags_cache_hits_total[5m])) + sum(rate(feature_flags_cache_misses_total[5m]))) < 0.7
  for: 10m
  annotations:
    summary: Low feature flag cache hit rate
    description: Cache hit rate is {{ $value | humanizePercentage }}
```

## Troubleshooting

### Service Not Initializing

Check environment variables:
```bash
# LaunchDarkly
echo $LAUNCHDARKLY_SDK_KEY

# Unleash
echo $UNLEASH_URL
echo $UNLEASH_APP_NAME
```

### High Latency

1. Check cache is enabled
2. Increase cache TTL
3. Monitor Redis performance
4. Check provider API latency

### Inconsistent Flag Values

1. Check cache TTL (may need shorter TTL)
2. Verify user context is consistent
3. Check targeting rules in provider UI

## Best Practices

1. **Always set defaults** - Never rely on flags existing
2. **Use caching** - Reduces latency and provider API calls
3. **Monitor usage** - Set up Grafana dashboards
4. **Clean up** - Remove flags after full rollout
5. **Test both paths** - Test flag enabled and disabled
6. **Document flags** - Maintain flag registry
7. **Use kill switches** - For risky external dependencies

## Resources

- [Feature Flags Package README](../../packages/feature-flags/README.md)
- [Best Practices Guide](./BEST_PRACTICES.md)
- [LaunchDarkly Documentation](https://docs.launchdarkly.com)
- [Unleash Documentation](https://docs.getunleash.io)
