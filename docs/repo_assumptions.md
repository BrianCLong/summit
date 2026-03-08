# IntelGraph repo assumptions

## Verified
- Public monorepo for Summit exists
- Node 18+, pnpm, Neo4j 5.x in quickstart
- GraphQL + REST APIs are core
- Collaboration/war-room and timeline issues exist
- CI/workflow surface is large and policy/evidence oriented

## Assumed
- `server/src/api` or equivalent GraphQL service exists
- `client/src` or equivalent React frontend exists
- Neo4j access is centralized behind a shared client
- Evidence artifacts follow repo-wide conventions
- Tenant scoping already exists outside IntelGraph

## Validation checklist before PR1 merges
- Confirm exact package/workspace boundaries
- Confirm existing GraphQL schema location
- Confirm auth context shape
- Confirm standard test command names
- Confirm runbook/docs locations
- Confirm must-not-touch branch protection workflows
