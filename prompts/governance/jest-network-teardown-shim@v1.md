# Prompt: Jest Network Teardown Shim

## Intent
Add an opt-in Jest setup shim that tracks and closes network servers and
timers when NO_NETWORK_LISTEN=true to reduce open handle hangs, while
preserving the existing governed test and LFS exception updates in this PR.

## Scope
- .gitattributes
- server/tests/setup/jest.setup.cjs
- server/src/hunting/ThreatHuntingOrchestrator.ts
- server/src/hunting/__tests__/ThreatHuntingOrchestrator.test.ts
- docs/roadmap/STATUS.json
- prompts/registry.yaml
- prompts/governance/gitattributes-lfs-exception@v1.md
- prompts/governance/nl-graph-query-test-tson-fix@v1.md
- prompts/governance/jest-network-teardown-shim@v1.md
- server/src/ai/nl-graph-query/__tests__/nl-graph-query.routes.test.ts

## Constraints
- Keep behavior unchanged unless NO_NETWORK_LISTEN=true.
- Allow production runtime changes only when needed to safely dispose shared listeners.
- Prefer minimal, reversible edits.

## Verification
- Run focused Jest suites or full unit tests when feasible.
- Confirm prompt registry integrity checks pass.
