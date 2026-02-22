# Repository Assumptions

## Agent Governance Structure
- **Workspace Package**: A workspace package exists at `agents/governance` (`@intelgraph/agent-governance`). This appears to be a library providing governance capabilities.
- **Runtime Integration**: The Summit "Hive Runtime" is assumed to be implemented in `src/agents`. We are implementing runtime-specific governance contracts (ATF levels, identity manifests) in `src/agents/governance` to govern these specific agents. This is distinct from the library package.

## Testing
- **Runner**: `vitest` is used for testing.
- **Imports**: Tests must explicitly import `describe`, `test`, `expect` from `vitest` as globals are not enabled by default.
- **Command**: `pnpm test` runs the tests.

## Directories
- `src/agents` contains the agent implementations.
- `src/agents/governance` will contain the runtime governance logic.
