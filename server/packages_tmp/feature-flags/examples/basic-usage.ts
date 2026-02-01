/**
 * Basic Feature Flag Usage Example
 */

import {
  FeatureFlagService,
  LaunchDarklyProvider,
  RedisCache,
  PrometheusMetrics,
} from '@intelgraph/feature-flags';
import Redis from 'ioredis';

async function main() {
  // 1. Initialize provider
  const provider = new LaunchDarklyProvider({
    sdkKey: process.env.LAUNCHDARKLY_SDK_KEY!,
  });

  // 2. Initialize cache (optional)
  const redis = new Redis(process.env.REDIS_URL!);
  const cache = new RedisCache({ redis });

  // 3. Initialize metrics (optional)
  const metrics = new PrometheusMetrics();

  // 4. Create service
  const featureFlags = new FeatureFlagService({
    provider,
    cache,
    enableCache: true,
    enableMetrics: true,
    enableAnalytics: true,
  });

  featureFlags.setMetrics(metrics);

  // 5. Initialize
  await featureFlags.initialize();

  // 6. Use feature flags
  const userId = 'user-123';

  // Boolean flag
  const newDashboard = await featureFlags.getBooleanFlag(
    'new-dashboard',
    false,
    { userId }
  );

  if (newDashboard) {
    console.log('Show new dashboard');
  }

  // String flag
  const theme = await featureFlags.getStringFlag(
    'ui-theme',
    'light',
    { userId }
  );

  console.log(`User theme: ${theme}`);

  // Number flag
  const maxItems = await featureFlags.getNumberFlag(
    'max-items-per-page',
    50,
    { userId }
  );

  console.log(`Show ${maxItems} items per page`);

  // JSON flag
  const config = await featureFlags.getJSONFlag(
    'ui-config',
    { color: 'blue', size: 'medium' },
    { userId }
  );

  console.log('UI Config:', config);

  // Get all flags
  const allFlags = await featureFlags.getAllFlags({ userId });
  console.log('All flags:', allFlags);

  // Track event
  await featureFlags.track('feature-used', { userId }, {
    feature: 'new-dashboard',
    timestamp: Date.now(),
  });

  // 7. Cleanup
  await featureFlags.close();
}

main().catch(console.error);
