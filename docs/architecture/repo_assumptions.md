# Repository Assumptions for REN/DEG Implementation

This document tracks assumptions made about the Summit repository structure during the implementation of the Regulatory Espionage Navigator (REN).

## Directory Structure
- **Root `src/`**: Contains TypeScript modules for the platform.
  - `src/graphrag/`: (Created) Home for REN GraphRAG logic (`src/graphrag/ren/`).
  - `src/agents/`: (Existing) Home for REN agent logic (`src/agents/ren/`).
  - `src/graphql/`: (Existing) Home for GraphQL schema/resolvers (`src/graphql/ren/`).
- **Root `__tests__/`**: Location for test suites.
  - `__tests__/ren/`: (Created) Tests for REN modules.
- **Root `summit/`**: Python backend package (not primarily used for REN v1 logic which is TS-focused).

## CI/CD Gates
- **`ci:evidence-verify`**: Enforces evidence artifacts structure.
- **`ci:tenant-isolation`**: Enforces tenant ID separation.
- **`ci:narrative-grounding`**: (New) Prevents hallucinated facts.
- **`ci:legal-disclaimer-required`**: (New) Enforces decision-support disclaimers.
- **`ci:policy-envelope-no-evasion`**: (New) Prevents illegal evasion suggestions.
- **`ci:privilege-partition`**: (New) Enforces access controls on privileged data.
- **`ci:no-offense-content`**: (New) Prevents offensive/attacker-helper outputs.

## Evidence IDs
- `EVD-REN-CANON-001`: Canonical formats validation.
- `EVD-REN-RDG-001`: RDG overlay build.
- `EVD-REN-YIELD-001`: Intelligence yield extraction.
- `EVD-REN-DEG-001`: DEG simulation.
- `EVD-REN-GOV-001`: Governance/policy.

## Must-Not-Touch
- Legal-sensitive areas (outside of REN modules).
- Auth/secrets management (consume only).
