# Ecosystem Tier 3: Tool Integrations

**Status:** Execution Adjacent, No Authority
**Rights:** Execute only after approval

## Who Belongs Here

### Archetype 5: Execution Tool Integrations

- SOAR tools
- Infra automation
- CI/CD systems
- Ticketing systems

## What They Can Do

- Execute actions **only after Summit approval**
- Report execution outcomes
- Surface failures

## What They Cannot Do

- Decide when to act
- Retry autonomously
- Change scope mid-flight

## Control Pattern: Command–Receipt Model

1.  **Summit issues signed command**: The authority originates from Summit.
2.  **Tool executes**: The partner tool performs the specific, scoped action.
3.  **Tool returns receipt**: Cryptographic or verifiable proof of execution.
4.  **Evidence is recorded**: The receipt is stored in the ledger.

**Key Guardrail**: Execution tools **never decide**, retry, or scope-expand.
