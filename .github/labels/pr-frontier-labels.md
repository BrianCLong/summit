# PR Frontier Labels

Create these labels in the repository:

## Frontier
- `canonical-survivor`
  - color: `0E8A16`
  - description: `Single active merge frontier PR for a concern cluster`

## Supersedence states
- `superseded`
  - color: `BFDADC`
  - description: `High-confidence non-survivor PR`

- `supersedence:pending-close`
  - color: `FBCA04`
  - description: `Likely superseded; grace period before possible closure`

- `supersedence:review`
  - color: `D93F0B`
  - description: `Requires human review before any destructive action`

- `do-not-supersede`
  - color: `5319E7`
  - description: `Blocks automatic supersedence actions`

## Queue
- `queue:merge-now`
  - color: `1D76DB`
  - description: `Eligible for merge queue admission`

- `queue:blocked`
  - color: `B60205`
  - description: `Blocked from queue admission`
