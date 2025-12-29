---
title: Configuration & Feature Flags
summary: Managing environment variables and dynamic feature toggles.
version: v2.0.0
lastUpdated: 2025-12-29
---

# Configuration & Feature Flags

Summit uses strict configuration management and a sophisticated feature flag system for progressive delivery.

## Environment Variables

Configuration is 12-factor compliant.

- **.env.example**: The template for all required variables.
- **.env**: Local override (never committed).
- **Production**: Injected via Kubernetes Secrets / ConfigMaps.

## Feature Flags

We use a dynamic flagging system to control features without redeploying code.

### Categories

- **Collaboration**: e.g., `realtime-presence`
- **Performance**: e.g., `graph-streaming` (80% rollout)
- **Search**: e.g., `advanced-search`
- **Debug**: e.g., `fps-monitor` (Dev only)

### CLI Management

Manage flags via `npm run flags`:

```bash
# List all flags
npm run flags:list

# Enable for 50% of users
npm run flags enable realtime-presence 50

# Emergency disable
npm run flags:emergency "Critical bug found"
```

### Usage in Code

**Client (React Hook)**

```typescript
const isEnabled = useFlag("realtime-presence");
```

**Server**
Flags are propagated via environment variables or a backing store (Redis/DB) depending on the environment.

## Rollout Strategy

1.  **Canary**: 100% enabled in Dev/Staging.
2.  **Production Ramp**: 5% -> 25% -> 50% -> 100%.
3.  **Circuit Breakers**: Flags like `graph-streaming` have automated P95 latency thresholds (900ms). If exceeded, the flag auto-disables.
