# Feature Flags

This document describes the minimal feature-flag toolkit for Summit. The goal is to let us roll out new functionality gradually, A/B test safely, and disable risky paths instantly during incidents.

## Flag Types

- **Boolean** – On/off switches for isolated features. Defaults should prefer the safest behavior (typically `false`).
- **Percentage rollout** – Enable a feature for a deterministic slice of users (bucketed by user/session). Defaults should be `0%` or another non-breaking value.
- **Variant** – A/B or multivariate options (e.g., `control`, `v2`). Defaults should stay on the most stable variant (`control`).

## Storage and Overrides

- **Default catalog** – Defined in code so flags are type-safe and easy to audit.
- **Runtime overrides** – Parsed from `FEATURE_FLAGS` (backend) or `VITE_FEATURE_FLAGS` (frontend) environment variables in development. Format: `FEATURE_FLAGS=flagA=true,flagB=15%,flagC=variantB`.
- **Local overrides** – Frontend respects `localStorage.featureFlagOverrides` for quick experiments without a rebuild.
- **Future expansion** – The design keeps space to source values from Redis or a DB-backed service without changing call sites.

## How to Check Flags

### Backend (Node/Express)

Use the lightweight helper in `server/src/lib/featureFlags.ts`:

```ts
import { get, getVariant, isEnabled } from "../lib/featureFlags.js";

if (isEnabled("graph-query-optimizer", { userId: req.user?.id })) {
  enableQueryOptimizer();
}

const cacheStrategy = getVariant("cache-strategy", { sessionId: req.sessionID });
logger.info({ cacheStrategy }, "Using cache strategy");

const rawFlag = get("ai-orchestrator-v2");
```

### Frontend (React)

Use the hook in `client/src/hooks/useFeatureFlag.ts`:

```tsx
import { useFeatureFlag, useFeatureVariant } from "./hooks/useFeatureFlag";

const showNewPanel = useFeatureFlag("ui-insights-panel", { userId: user.id });
const orchestrationArm = useFeatureVariant("ai-orchestrator-v2", { userId: user.id });
```

- Flags can be overridden during local dev with `VITE_FEATURE_FLAGS=flag=true,flag2=variantB`.
- `useFeatureFlag` returns `false` for unknown flags to keep behavior safe.

## Operational Notes

- Defaults should be non-breaking and assume the most conservative behavior.
- Keep the catalog small; add flags with a clear owner and removal date.
- Prefer deterministic bucketing (user/session) over random rollouts for consistency.
- When shipping risky changes, wrap entry points with flags first so they can be disabled instantly.
