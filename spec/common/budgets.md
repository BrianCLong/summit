# Budget Controls

Defines budgets enforced across wedges for safety, privacy, and performance.

## Budget Types

- **Execution budget**: maximum execution time or expansion steps.
- **Egress budget**: maximum returned bytes or entity count.
- **Sensitivity budget**: weighted disclosure limits by sensitivity class.
- **Proof budget**: upper bound on cryptographic proof size or support sets.

## Enforcement Patterns

- Budgets are bound to replay tokens and logged in witness chains.
- Violations trigger hard stops and are recorded in transparency logs.
