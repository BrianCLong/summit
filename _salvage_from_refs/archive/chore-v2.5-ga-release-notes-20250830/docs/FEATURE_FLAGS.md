# Feature Flag Management

## Overview

IntelGraph uses a sophisticated feature flag system to manage rollouts, A/B tests, and emergency toggles across environments. This system provides fine-grained control over features with percentage rollouts, tenant-specific overrides, and role-based restrictions.

## Quick Commands

```bash
# List all feature flags
npm run flags:list

# Enable a flag with 50% rollout
npm run flags enable realtime-presence 50

# Disable a flag
npm run flags disable k-shortest-paths

# Set rollout percentage
npm run flags rollout graph-streaming 75

# Tenant override
npm run flags tenant advanced-search enterprise true

# Emergency disable all non-essential flags
npm run flags:emergency "High error rate detected"

# Export for environment
npm run flags:export production

# Validate performance
npm run flags validate graph-streaming 450 0.5
```

## Feature Flag Categories

### Collaboration
- `realtime-presence`: Platform-wide presence indicators with avatar groups
- `optimistic-updates`: Optimistic mutations with conflict rollback

### Performance
- `graph-streaming`: Neighborhood streaming with progress indicators (80% rollout)
- `fps-monitor`: Development FPS monitoring (dev only)

### Search & Analysis
- `advanced-search`: Query chips and keyboard DSL search
- `bulk-actions`: Bulk operations on search results (90% rollout)
- `k-shortest-paths`: K-shortest paths UI (k≤5, depth≤6)

### Reports
- `report-templates`: Executive and Forensics report templates
- `forensics-reports`: Advanced forensics reporting with chain of custody

### Debug
- `event-inspector`: Development event inspector (dev only)

### Localization
- `multi-language`: NATO locale support (50% rollout)

## Flag Configuration

Each feature flag supports:

- **Enabled/Disabled**: Global on/off switch
- **Rollout Percentage**: 0-100% user bucketing
- **Environment Restrictions**: development, staging, production
- **Role Restrictions**: analyst, admin, investigator, forensics, legal
- **Tenant Overrides**: Per-tenant enable/disable
- **Performance Thresholds**: P95 latency and error rate gates

## Performance Monitoring

Flags with performance thresholds:

### Graph Streaming
- **P95 Threshold**: 900ms
- **Error Rate**: <1.0%
- **Current Rollout**: 80%

Monitor with:
```bash
npm run flags validate graph-streaming $(curl prometheus:9090/metrics | grep p95) $(curl prometheus:9090/metrics | grep error_rate)
```

## Admin Panel

Access the feature flag admin panel at:
`https://app.intelgraph.com/admin/feature-flags`

Features:
- Real-time flag toggling
- Rollout percentage sliders
- Category organization
- Emergency disable button
- Reset to defaults

## Client-Side Usage

```typescript
import { useFlag } from '@/hooks/useFlag';

function MyComponent() {
  const hasRealtimePresence = useFlag('realtime-presence', {
    userId: user.id,
    tenantId: tenant.id,
    role: user.role,
    env: import.meta.env.MODE
  });

  if (!hasRealtimePresence) {
    return <FallbackComponent />;
  }

  return <RealtimePresenceComponent />;
}
```

## Rollout Strategy

### 1. Canary Phase (Development)
- Enable at 100% in development
- Test with internal users
- Monitor error rates

### 2. Staged Rollout (Staging)
- Start at 10% rollout
- Increase to 25%, 50%, 75%
- Monitor P95 latency and errors

### 3. Production Rollout
- Begin with 5% rollout
- Gradual increase: 10% → 25% → 50% → 75% → 100%
- Automatic rollback if performance thresholds exceeded

## Emergency Procedures

### Immediate Disable
```bash
# Disable specific flag
kubectl set env deployment/ui-prod FEATURE_GRAPH_STREAMING=false

# Or via admin panel
curl -X POST https://api.intelgraph.com/admin/flags/disable \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"flag": "graph-streaming"}'
```

### Emergency Disable All
```bash
npm run flags:emergency "Production incident"
```

This generates kubectl commands to disable all non-essential flags:
- Keeps `advanced-search` (essential)
- Disables all other features
- Provides rollback plan

## Kubernetes Integration

Generate ConfigMap for environment:
```bash
npm run flags k8s-manifest production
kubectl apply -f k8s-feature-flags-production.yaml
```

## Best Practices

### Flag Naming
- Use kebab-case: `realtime-presence`
- Descriptive and concise
- Group by feature: `graph-streaming`, `graph-virtualization`

### Rollout Guidelines
- Start conservative (≤25%)
- Monitor for 24-48 hours before increasing
- Set performance gates before production
- Have rollback plan ready

### Performance Gates
- P95 latency thresholds
- Error rate limits
- Automatic disable on breach
- Alert integration

### Role Restrictions
- `forensics-reports`: forensics, admin, legal only
- `report-templates`: analyst, admin, investigator
- Debug flags: development environment only

## Tenant Management

```bash
# Disable for enterprise tenant
npm run flags tenant k-shortest-paths enterprise false

# Enable early access
npm run flags tenant advanced-search beta-tenant true
```

## Monitoring & Alerts

Feature flag metrics are exported to Prometheus:

- `feature_flag_enabled{flag, tenant}`: Current flag state
- `feature_flag_rollout_percentage{flag}`: Rollout percentage
- `feature_flag_evaluations_total{flag, result}`: Evaluation counts

Grafana dashboard: "Feature Flag Usage"

## Troubleshooting

### Flag Not Working
1. Check flag is enabled: `npm run flags:list`
2. Verify rollout percentage includes user
3. Check environment/role restrictions
4. Inspect browser localStorage for overrides

### Performance Issues
1. Check flag performance gates
2. Monitor P95 latency after rollout
3. Consider reducing rollout percentage
4. Add caching for expensive operations

### Emergency Rollback
1. Use emergency disable: `npm run flags:emergency`
2. Execute generated kubectl commands
3. Monitor metrics recovery
4. Plan systematic re-enablement

## Development

### Adding New Flags

1. Update `scripts/feature-flag-manager.js` FLAG_DEFINITIONS
2. Add to admin panel categories
3. Update documentation
4. Add performance thresholds if needed

### Testing Flags
- Use localStorage overrides in dev
- Test percentage rollouts with multiple users
- Verify environment restrictions
- Test emergency disable procedures

## Integration Points

- **Client**: `useFlag` hook with context
- **Server**: Environment variables for backend flags  
- **Admin**: Real-time management panel
- **CI/CD**: Automated flag export and validation
- **Monitoring**: Prometheus metrics and Grafana dashboards
- **Kubernetes**: ConfigMap generation and deployment