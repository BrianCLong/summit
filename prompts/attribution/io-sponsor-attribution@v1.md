# IO Sponsor Attribution & Sandbox (v1)

## Objective

Implement a graph-based attribution model that aggregates infrastructure reuse, timing alignment,
content fingerprints, and language markers into sponsor hypotheses with confidence and caveats.
Enable a sandbox for analysts to run what-if weighting scenarios and observe sponsor ranking
changes.

## Scope

- `server/src/services/attribution/`
- `server/src/graphql/schema/`
- `server/src/graphql/resolvers.ts`
- `server/src/services/attribution/__tests__/`
- `docs/roadmap/STATUS.json`
- `agents/examples/`
- `prompts/registry.yaml`

## Requirements

- Provide explicit graph-based attribution aggregation and scenario weighting.
- Return confidence, evidence contributions, and caveats.
- Expose GraphQL queries for baseline and sandbox scenario runs.
- Add unit coverage for ranking and scenario shift.
- Update roadmap status with revision note and timestamp.

## User Request

Attribution and sponsorship inference

Attribution of IO sponsors is still a hard unsolved layer that your stack could support but
doesn’t yet encode.

Attribution framework: Implement an explicit graph-based attribution model that aggregates
indicators (infrastructure reuse, timing, content fingerprints, language markers) into sponsor
hypotheses with confidence and caveats.

Attribution sandbox: Let analysts run “what-if” attribution scenarios (e.g., change weighting of
infrastructure vs. linguistic signals) and see how sponsor rankings shift.
