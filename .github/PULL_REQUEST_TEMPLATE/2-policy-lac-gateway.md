# License/Authority Compiler (LAC) at API Edge

## Scope

- Gateway plugin: gateway/policy-lac (Apollo)
- Policy store: policies/\*.json + compiled bytecode
- API: POST /policy/explain

## Acceptance Criteria

- Unsafe ops are blocked with human-readable reasons
- Policy simulation/diff tool produces stable snapshots
- 100% fixture policy coverage; k6 p95<500ms

## Test Plan

- `npm test -w gateway/policy-lac`
- `npm run k6:policy`
