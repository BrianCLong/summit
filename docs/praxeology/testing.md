# Praxeology Testing Guidelines

## Quarantine Invariants
- No unvalidated writes to production PostgreSQL allowed.
- Trust lanes must be strictly enforced.

All write operations from the cognitive battlespace must pass through the `Quarantine Validator` before being written to the core Database.
