# NL→Cypher Sandbox with Cost Estimator

## Scope

- Service: server/ai/nl2cypher
- GraphQL: mutation runNlQuery(text)
- UI devtool with preview/approve, explain panel

## Acceptance Criteria

- ≥95% syntactic validity on prompt suite
- Cost/row estimates shown before approve
- Red-team prompts logged; undo/rollback supported

## Test Plan

- `npm test -w server/ai/nl2cypher`
- `npm run e2e` (playwright/e2e-nl2cypher.spec.ts)
