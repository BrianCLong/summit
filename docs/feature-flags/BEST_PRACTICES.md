# Feature Flags: Best Practices and Patterns

This document outlines best practices, patterns, and guidelines for using feature flags in the Summit/IntelGraph platform.

## Table of Contents

1. [Naming Conventions](#naming-conventions)
2. [Flag Lifecycle](#flag-lifecycle)
3. [Common Patterns](#common-patterns)
4. [Performance Considerations](#performance-considerations)
5. [Security](#security)
6. [Testing](#testing)
7. [Monitoring and Analytics](#monitoring-and-analytics)
8. [Anti-Patterns](#anti-patterns)

## Naming Conventions

### Flag Key Format

Use descriptive, kebab-case names that clearly indicate the feature or behavior:

```
<scope>-<feature>-<variant?>

Examples:
- enable-new-dashboard
- checkout-flow-v2
- ai-copilot-beta
- payments-kill-switch
```

### Naming Guidelines

✅ **Good Names:**
- `new-entity-search` - Clear feature description
- `beta-graph-analytics` - Indicates beta status
- `experiment-pricing-page-a` - A/B test variant
- `kill-switch-external-api` - Emergency control

❌ **Bad Names:**
- `flag1` - Non-descriptive
- `test` - Too vague
- `new-feature` - What feature?
- `temp` - Temporary flags should still be descriptive

### Prefixes

Use prefixes to categorize flags:

- `enable-*` - Enable/disable features
- `beta-*` - Beta features
- `experiment-*` - A/B tests and experiments
- `kill-switch-*` - Emergency controls
- `config-*` - Configuration values

## Flag Lifecycle

### 1. Development Phase

**Rollout:** 0-10% (internal users only)

```typescript
// Create flag with targeting for internal users
const rule = {
  id: 'internal-users',
  conditions: [
    targetAttribute('email', 'ends_with', '@intelgraph.com'),
  ],
  variation: 'enabled',
};
```

**Best Practices:**
- Default to `false`
- Target internal users/testers
- Monitor error rates closely
- Collect feedback

### 2. Beta Testing

**Rollout:** 10-50% (selected users)

```typescript
// Gradual rollout to beta users
const rollout = createGradualRollout('enabled', 'disabled', 25);
```

**Best Practices:**
- Gradually increase percentage
- Monitor key metrics
- A/B test if needed
- Collect analytics

### 3. General Availability

**Rollout:** 50-100% (all users)

```typescript
// Full rollout
const rollout = createGradualRollout('enabled', 'disabled', 100);
```

**Best Practices:**
- Continue monitoring
- Prepare rollback plan
- Document the feature

### 4. Cleanup

**Rollout:** Flag at 100% for 2+ weeks

**Best Practices:**
- Remove flag checks from code
- Replace with permanent implementation
- Archive flag in provider
- Update documentation

```typescript
// Before cleanup:
if (await featureFlags.getBooleanFlag('new-feature', false)) {
  return newImplementation();
} else {
  return oldImplementation();
}

// After cleanup:
return newImplementation();
```

## Common Patterns

### 1. Feature Toggle

Enable/disable entire features:

```typescript
const isEnabled = await featureFlags.getBooleanFlag(
  'enable-new-dashboard',
  false,
  context
);

if (isEnabled) {
  return <NewDashboard />;
} else {
  return <OldDashboard />;
}
```

### 2. Kill Switch

Emergency disable for problematic features:

```typescript
// Default to true - service should be on
const serviceEnabled = await featureFlags.getBooleanFlag(
  'kill-switch-payment-gateway',
  true,
  context
);

if (!serviceEnabled) {
  throw new Error('Payment service temporarily unavailable');
}
```

**Important:** Kill switches should default to `true` (enabled).

### 3. Gradual Rollout

Slowly release to users:

```typescript
// Start at 5%
const rollout = createGradualRollout('new', 'old', 5);

// Increase to 25%
const rollout = createGradualRollout('new', 'old', 25);

// Full rollout
const rollout = createGradualRollout('new', 'old', 100);
```

### 4. A/B Testing

Test different variants:

```typescript
const variant = await featureFlags.getStringFlag(
  'experiment-checkout-flow',
  'control',
  context
);

switch (variant) {
  case 'variant-a':
    return <CheckoutFlowA />;
  case 'variant-b':
    return <CheckoutFlowB />;
  default:
    return <CheckoutFlowControl />;
}

// Track conversion
await featureFlags.track('checkout-completed', context, {
  variant,
  amount: totalAmount,
});
```

### 5. Ops Toggle (Configuration)

Runtime configuration:

```typescript
const config = await featureFlags.getJSONFlag(
  'config-api-rate-limits',
  { requestsPerMinute: 60, burstSize: 10 },
  context
);

rateLimiter.configure(config);
```

### 6. Permission Toggle

User/role-based features:

```typescript
// Target premium users only
const rule = {
  id: 'premium-users',
  conditions: [
    targetAttribute('plan', 'in', ['premium', 'enterprise']),
  ],
  variation: 'enabled',
};

const hasAdvancedFeatures = await featureFlags.getBooleanFlag(
  'advanced-analytics',
  false,
  { userId: user.id, attributes: { plan: user.plan } }
);
```

### 7. Environment Toggle

Different behavior per environment:

```typescript
const debugMode = await featureFlags.getBooleanFlag(
  'enable-debug-logging',
  false,
  { environment: process.env.NODE_ENV }
);

if (debugMode) {
  logger.level = 'debug';
}
```

## Performance Considerations

### 1. Use Caching

```typescript
const service = new FeatureFlagService({
  provider,
  cache: new RedisCache({ redis }),
  enableCache: true,
  cacheTTL: 300, // 5 minutes
});
```

**Guidelines:**
- Use longer TTL for stable flags (1 hour)
- Use shorter TTL for actively changing flags (1 minute)
- Critical flags should have shorter TTL

### 2. Batch Evaluations

```typescript
// ❌ Bad: Multiple individual calls
const flag1 = await featureFlags.getBooleanFlag('flag1', false);
const flag2 = await featureFlags.getBooleanFlag('flag2', false);
const flag3 = await featureFlags.getBooleanFlag('flag3', false);

// ✅ Good: Single call for all flags
const allFlags = await featureFlags.getAllFlags(context);
const flag1 = allFlags.flag1;
const flag2 = allFlags.flag2;
const flag3 = allFlags.flag3;
```

### 3. Async Evaluation

```typescript
// Don't block critical path
async function handleRequest(req, res) {
  // Critical synchronous work
  const data = await fetchData();

  // Feature flag evaluation (can be async)
  const showNewUI = await featureFlags.getBooleanFlag(
    'new-ui',
    false,
    { userId: req.user.id }
  );

  res.json({
    data,
    ui: showNewUI ? 'v2' : 'v1',
  });
}
```

### 4. Minimize Context Size

```typescript
// ❌ Bad: Large context with unnecessary data
const context = {
  userId: user.id,
  userEmail: user.email,
  userRole: user.role,
  attributes: {
    ...user.profile, // Don't send entire profile
    ...user.preferences,
    ...user.metadata,
  },
};

// ✅ Good: Only necessary attributes
const context = {
  userId: user.id,
  userRole: user.role,
  attributes: {
    plan: user.plan,
    tenantId: user.tenantId,
  },
};
```

## Security

### 1. Don't Expose Sensitive Flags to Client

```typescript
// ❌ Bad: Exposing all flags to frontend
app.get('/api/feature-flags', (req, res) => {
  const allFlags = await featureFlags.getAllFlags();
  res.json(allFlags); // Includes internal/admin flags
});

// ✅ Good: Filter flags for client
app.get('/api/feature-flags', (req, res) => {
  const allFlags = await featureFlags.getAllFlags();
  const clientFlags = Object.fromEntries(
    Object.entries(allFlags)
      .filter(([key]) => !key.startsWith('internal-'))
  );
  res.json(clientFlags);
});
```

### 2. Validate User Context

```typescript
// ✅ Good: Validate and sanitize context
function buildContext(req) {
  return {
    userId: req.user?.id,
    userEmail: req.user?.email,
    userRole: req.user?.role,
    // Don't trust client-provided attributes
    tenantId: req.user?.tenantId, // From auth, not query params
  };
}
```

### 3. Use Authorization

```typescript
// Protect admin flags
app.post('/api/admin/feature-flags/:key/toggle',
  requireAdmin,
  async (req, res) => {
    // Admin-only flag management
  }
);
```

## Testing

### 1. Unit Tests

```typescript
describe('UserDashboard', () => {
  it('should show new dashboard when flag is enabled', async () => {
    // Mock feature flag
    mockFeatureFlags.setFlag('new-dashboard', true);

    const { getByTestId } = render(<UserDashboard />);

    expect(getByTestId('new-dashboard')).toBeInTheDocument();
  });

  it('should show old dashboard when flag is disabled', async () => {
    mockFeatureFlags.setFlag('new-dashboard', false);

    const { getByTestId } = render(<UserDashboard />);

    expect(getByTestId('old-dashboard')).toBeInTheDocument();
  });
});
```

### 2. Integration Tests

```typescript
describe('Feature Flag Integration', () => {
  it('should evaluate flags correctly', async () => {
    const result = await request(app)
      .get('/api/features')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    expect(result.body.newFeature).toBe(true);
  });
});
```

### 3. E2E Tests

```typescript
// Test both variations
describe('Checkout Flow', () => {
  it('should complete checkout with variant A', async () => {
    await setFeatureFlag('checkout-variant', 'a');
    await testCheckoutFlow();
  });

  it('should complete checkout with variant B', async () => {
    await setFeatureFlag('checkout-variant', 'b');
    await testCheckoutFlow();
  });
});
```

## Monitoring and Analytics

### 1. Track Flag Usage

```typescript
// Log flag evaluations
featureFlags.on('evaluation', (event) => {
  logger.info('Flag evaluated', {
    flag: event.flagKey,
    variation: event.variation,
    userId: event.context.userId,
  });
});
```

### 2. Monitor Performance

```typescript
// Use metrics
const metrics = new PrometheusMetrics();
featureFlags.setMetrics(metrics);

// Alert on high error rates
if (errorRate > threshold) {
  alert('High feature flag error rate');
}
```

### 3. Track Business Metrics

```typescript
// Track conversions
const variant = await featureFlags.getStringFlag('pricing-test', 'control');

await featureFlags.track('purchase-completed', context, {
  variant,
  amount: total,
  plan: selectedPlan,
});
```

### 4. Dashboard Queries

```promql
# Flag evaluation rate
rate(feature_flags_evaluations_total[5m])

# Cache hit rate
sum(rate(feature_flags_cache_hits_total[5m])) /
(sum(rate(feature_flags_cache_hits_total[5m])) + sum(rate(feature_flags_cache_misses_total[5m])))

# Error rate
rate(feature_flags_errors_total[5m])
```

## Anti-Patterns

### ❌ 1. Nested Feature Flags

```typescript
// Bad
if (await featureFlags.getBooleanFlag('feature-a', false)) {
  if (await featureFlags.getBooleanFlag('feature-b', false)) {
    if (await featureFlags.getBooleanFlag('feature-c', false)) {
      // Too complex!
    }
  }
}
```

**Solution:** Use a single flag or combine conditions in targeting rules.

### ❌ 2. Long-Lived Flags

Don't keep flags indefinitely:

```typescript
// Flag that's been at 100% for 6 months
if (await featureFlags.getBooleanFlag('old-feature-from-2023', false)) {
  // This should be permanent code now
}
```

**Solution:** Remove flags after they're fully rolled out for 2-4 weeks.

### ❌ 3. Flags in Migrations

```typescript
// Bad: Using feature flags in database migrations
async function migrate() {
  const useNewSchema = await featureFlags.getBooleanFlag('new-schema', false);

  if (useNewSchema) {
    await db.migrate('new-schema');
  }
}
```

**Solution:** Don't use feature flags in migrations. Migrations should be deterministic.

### ❌ 4. Flags for Bug Fixes

```typescript
// Bad: Using flags to control bug fixes
if (await featureFlags.getBooleanFlag('fix-critical-bug', false)) {
  return fixedImplementation();
} else {
  return buggyImplementation();
}
```

**Solution:** Deploy bug fixes directly, use feature flags for new features.

### ❌ 5. Too Many Variations

```typescript
// Bad: 10+ variations
const variant = await featureFlags.getStringFlag('complex-test', 'control');

switch (variant) {
  case 'variant-1': ...
  case 'variant-2': ...
  case 'variant-3': ...
  // ... 7 more cases
}
```

**Solution:** Limit to 2-4 variations. Run multiple sequential tests if needed.

### ❌ 6. Flags Without Metrics

```typescript
// Bad: No tracking
const newFeature = await featureFlags.getBooleanFlag('new-feature', false);

if (newFeature) {
  return newImplementation();
}
// No metrics tracked!
```

**Solution:** Always track flag usage and business metrics.

## Checklist

Before deploying a new feature flag:

- [ ] Descriptive, standardized name
- [ ] Appropriate default value
- [ ] Targeting rules configured (if needed)
- [ ] Monitoring and alerts set up
- [ ] Analytics tracking implemented
- [ ] Tests cover all variations
- [ ] Documentation updated
- [ ] Rollback plan defined
- [ ] Cleanup date scheduled

## Resources

- [LaunchDarkly Best Practices](https://docs.launchdarkly.com/guides/best-practices)
- [Feature Flag Best Practices - Martin Fowler](https://martinfowler.com/articles/feature-toggles.html)
- [Unleash Best Practices](https://docs.getunleash.io/topics/best-practices)
