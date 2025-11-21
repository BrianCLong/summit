# Feature Flags Guide

## Overview

IntelGraph uses feature flags to enable gradual rollouts, A/B testing, and emergency kill switches. This allows us to:

- Deploy features to production while keeping them disabled
- Gradually roll out features to a percentage of users
- Instantly disable problematic features without deploying
- Target specific user segments for beta testing
- Implement circuit breakers for external dependencies

## Architecture

### Feature Flag Provider

We use **LaunchDarkly** as our feature flag provider for staging and production environments. For local development, we use a file-based provider.

### Configuration

Feature flags are defined in `config/feature-flags.json` and follow a structured schema defined in `config/feature-flags.schema.json`.

## Flag Types

### Boolean Flags

Simple on/off switches:

```json
{
  "new-ui-dashboard": {
    "type": "boolean",
    "defaultValue": false
  }
}
```

### String Flags

Select from predefined values:

```json
{
  "cache-strategy": {
    "type": "string",
    "defaultValue": "redis",
    "allowedValues": ["redis", "memory", "hybrid"]
  }
}
```

### JSON Flags

Complex configuration:

```json
{
  "api-rate-limit": {
    "type": "json",
    "defaultValue": {
      "requestsPerMinute": 100,
      "burstSize": 200
    }
  }
}
```

## Rollout Strategies

### Gradual Rollout

Roll out to a percentage of users:

```json
{
  "rollout": {
    "type": "gradual",
    "percentage": 25
  }
}
```

### Targeted Rollout

Roll out to specific user segments:

```json
{
  "rollout": {
    "type": "targeted",
    "rules": [
      {
        "attribute": "organization",
        "operator": "in",
        "values": ["internal", "beta-testers"]
      }
    ]
  }
}
```

## Kill Switches

Kill switches are special flags designed for emergency situations:

- **maintenance-mode**: Put the entire platform in maintenance mode
- **emergency-readonly**: Force all users into read-only mode
- **disable-new-signups**: Temporarily disable new registrations
- **circuit-breaker-external-api**: Disable external API calls

### Using Kill Switches

Kill switches can be activated instantly through the LaunchDarkly dashboard or via API:

```bash
# Via LaunchDarkly CLI
ldcli flag-update --flag maintenance-mode --value true --env production

# Via API
curl -X PATCH https://app.launchdarkly.com/api/v2/flags/default/maintenance-mode \
  -H "Authorization: ${LD_API_KEY}" \
  -d '{"environmentKey": "production", "instructions": [{"kind": "turnFlagOn"}]}'
```

## Usage in Code

### Backend (Node.js)

```typescript
import { FeatureFlagService } from './services/feature-flags';

const flags = new FeatureFlagService();

// Check boolean flag
if (await flags.isEnabled('new-ui-dashboard', user)) {
  // Serve new dashboard
}

// Get string flag value
const cacheStrategy = await flags.getValue('cache-strategy', user);

// Get JSON flag value
const rateLimitConfig = await flags.getJSONValue('api-rate-limit', user);
```

### Frontend (React)

```tsx
import { useFeatureFlag } from './hooks/useFeatureFlag';

function Dashboard() {
  const { isEnabled, loading } = useFeatureFlag('new-ui-dashboard');

  if (loading) return <Spinner />;

  return isEnabled ? <NewDashboard /> : <OldDashboard />;
}
```

## Best Practices

### 1. Default to Safe Values

Always default flags to the safe/stable option:

```json
{
  "experimental-feature": {
    "defaultValue": false  // ✓ Safe default
  }
}
```

### 2. Use Descriptive Names

```json
// ✓ Good
"enable-real-time-collaboration"

// ✗ Bad
"feature1"
```

### 3. Tag Appropriately

Use tags to organize and filter flags:

```json
{
  "tags": ["frontend", "ui", "experimental"]
}
```

### 4. Document Rollout Plans

Include rollout percentage targets in flag descriptions:

```json
{
  "description": "Enable advanced analytics (target: 100% by Q2)",
  "rollout": {
    "type": "gradual",
    "percentage": 10
  }
}
```

### 5. Clean Up Old Flags

Remove flags after features are fully rolled out:

```bash
# List flags older than 90 days
ldcli flags list --older-than 90d

# Archive flag
ldcli flag-archive --flag old-feature
```

## Gradual Rollout Process

### Phase 1: Internal Testing (0-5%)

```json
{
  "rollout": {
    "type": "targeted",
    "rules": [
      {
        "attribute": "organization",
        "operator": "in",
        "values": ["internal"]
      }
    ]
  }
}
```

### Phase 2: Beta Users (5-25%)

```json
{
  "rollout": {
    "type": "gradual",
    "percentage": 25
  }
}
```

### Phase 3: General Availability (25-100%)

Increase percentage gradually:
- 25% → 50% (monitor for 24h)
- 50% → 75% (monitor for 24h)
- 75% → 100% (monitor for 48h)

### Phase 4: Cleanup

Once at 100% for 30 days:
1. Remove flag checks from code
2. Archive flag in LaunchDarkly
3. Update documentation

## Monitoring

### Flag Evaluation Metrics

Track in Grafana:
- Flag evaluation latency
- Flag evaluation errors
- Flag evaluation count by flag
- Rollout percentage changes

### Alerts

Set up alerts for:
- Kill switch activations
- Flag evaluation failures
- Unusual flag toggle patterns

## Emergency Procedures

### Disabling a Feature

If a feature causes issues:

1. **Immediate**: Toggle kill switch in LaunchDarkly dashboard
2. **Verify**: Check metrics to confirm feature is disabled
3. **Communicate**: Notify team via Slack
4. **Investigate**: Determine root cause
5. **Fix**: Deploy fix or adjust rollout strategy

### Kill Switch Activation

```bash
# Activate via CLI
./scripts/feature-flag-manager.js --flag maintenance-mode --enable

# Or via LaunchDarkly UI
# Dashboard → Flags → maintenance-mode → Toggle ON
```

## Integration with CI/CD

Feature flags are validated during CI:

```yaml
# .github/workflows/ci.yml
- name: Validate feature flags
  run: |
    npm run validate-feature-flags
```

## Testing

### Unit Tests

```typescript
describe('Feature with flag', () => {
  it('should use new implementation when flag enabled', async () => {
    mockFeatureFlag('new-feature', true);

    const result = await performAction();

    expect(result).toMatchNewBehavior();
  });

  it('should use old implementation when flag disabled', async () => {
    mockFeatureFlag('new-feature', false);

    const result = await performAction();

    expect(result).toMatchOldBehavior();
  });
});
```

### Integration Tests

Test both flag states in integration tests:

```typescript
describe('API endpoint with feature flag', () => {
  testWithFlag('new-feature', true, 'new implementation');
  testWithFlag('new-feature', false, 'old implementation');
});
```

## Resources

- [LaunchDarkly Documentation](https://docs.launchdarkly.com/)
- [Feature Flag Best Practices](https://launchdarkly.com/blog/feature-flag-best-practices/)
- [Internal Runbook](./RUNBOOK.md)

## Support

For issues with feature flags:
- **Emergency**: Use #incidents Slack channel
- **Non-urgent**: Create ticket in JIRA (PLATFORM project)
- **Questions**: Ask in #platform-engineering Slack channel
