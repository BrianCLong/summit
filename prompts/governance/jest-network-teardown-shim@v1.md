# Prompt: Jest Network Teardown Shim

## Intent
Add an opt-in Jest setup shim that tracks and closes network servers when
NO_NETWORK_LISTEN=true to reduce open handle hangs, while preserving the
existing governed test and LFS exception updates in this PR.

## Scope
- .gitattributes
- server/tests/setup/jest.setup.cjs
- docs/roadmap/STATUS.json
- prompts/registry.yaml
- prompts/governance/gitattributes-lfs-exception@v1.md
- prompts/governance/nl-graph-query-test-tson-fix@v1.md
- prompts/governance/jest-network-teardown-shim@v1.md
- server/src/ai/nl-graph-query/__tests__/nl-graph-query.routes.test.ts

## Constraints
- Keep behavior unchanged unless NO_NETWORK_LISTEN=true.
- Do not modify production runtime code.
- Prefer minimal, reversible edits.

## Verification
- Run focused Jest suites or full unit tests when feasible.
- Confirm prompt registry integrity checks pass.
