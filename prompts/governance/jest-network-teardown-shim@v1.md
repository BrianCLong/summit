# Prompt: Jest Network Teardown Shim

## Intent

Add an opt-in Jest setup shim that tracks and closes network servers and
timers when NO_NETWORK_LISTEN=true to reduce open handle hangs, while
consolidating the scope to include governed test updates, LFS exception
updates, and earlier prompt file edits in this PR.

## Scope

- .gitattributes
- PR_DESCRIPTION.md
- server/tests/setup/jest.setup.cjs
- docs/roadmap/STATUS.json
- prompts/registry.yaml
- prompts/governance/gitattributes-lfs-exception@v1.md
- prompts/governance/nl-graph-query-test-tson-fix@v1.md
- prompts/governance/jest-network-teardown-shim@v1.md

## Constraints

- Keep behavior unchanged unless NO_NETWORK_LISTEN=true.
- Do not modify production runtime code.
- Prefer minimal, reversible edits.
- Metadata-only consolidation for registries and PR descriptions.

## Verification

- Run focused Jest suites or full unit tests when feasible.
- Confirm prompt registry integrity checks pass.
