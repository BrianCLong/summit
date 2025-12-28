# Experimental Velocity Governance Memo (Frontend)

## Why experimentation scales safely

- Experiments are isolated by directory, flag, and review state.
- Every experiment is read-only with explicit expiration and owner accountability.
- Feature flags act as safety devices with instant disable paths.

## Bounded risk

- Max concurrency: 6 global / 2 per owner.
- No default navigation exposure; experimental UX is clearly labeled.
- Instrumentation uses `exp.*` events, preventing GA metric pollution.

## Why GA trust cannot be impacted

- GA modules never import experiments.
- Experiments cannot mutate GA data or semantics.
- Emergency kill switches disable experiments instantly without redeploys.
