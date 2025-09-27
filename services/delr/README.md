# Dataset End-of-Life Registrar (DELR)

`@summit/delr` provides lifecycle controls for dataset retirement plans. It accepts a
dataset end-of-life plan (EOL) with purge scopes, successor datasets and partner
notifications, then orchestrates purge propagation and produces deterministic
completion receipts.

## Commands

```
npm install
npm test
```

## Key Responsibilities

- Normalize and validate incoming EOL plans.
- Propagate purges to caches, indexes, features and exports.
- Log partner notifications for downstream auditing.
- Reconcile fixture actions to ensure there are zero residuals.
- Generate FNV-1a based deterministic completion receipts.
