# Summit Skillpack Standard

Summit Skills are portable, agent-agnostic capability modules that adhere to strict governance, provenance, and evaluation standards. They are a superset of the Agent Skills standard, designed to "moat" capabilities with robust trust layers.

## Structure

Each skill MUST reside in its own directory (e.g., `packages/maestro-skills/skill-name`) and contain the following structure:

- **`skill.yaml`**: The canonical identity, interface, and security contract.
- **`SKILL.md`**: Human-readable mission control documentation.
- **`src/`**: TypeScript implementation of the skill. MUST implement the `StepPlugin` interface from `@maestro/core`.
- **`scripts/`**: Utility scripts for validation, testing, or maintenance.
- **`tests/`**: Unit and integration tests.
- **`package.json`**: Standard NPM package definition.

## Manifest (`skill.yaml`)

The `skill.yaml` file is the source of truth for the skill's interface and governance.

```yaml
schema_version: "1.0"
name: "skill-name"
version: "1.0.0"
description: "Short description of the capability."
author: "Team or Individual"
license: "MIT"

inputs:
  type: object
  properties:
    param1:
      type: string
      description: "Description of param1"
  required: ["param1"]

outputs:
  type: object
  properties:
    result:
      type: string
      description: "The output result"

requirements:
  mcp_tools:
    - name: "filesystem"
      version: "^1.0"
  runtime: "node >= 18"

permissions:
  filesystem:
    read: ["/tmp", "${WORKSPACE_ROOT}"]
    write: ["/tmp"]
  network:
    domains: ["api.github.com"]
  env:
    secrets: ["GITHUB_TOKEN"]

governance:
  classification: "public" # public, internal, confidential, restricted
  determinism: "deterministic" # deterministic, best_effort, nondeterministic
  side_effects: ["writes_files", "network_calls"]
```

## Implementation (`src/`)

The entry point (e.g., `src/index.ts`) must export a class implementing `StepPlugin`.

```typescript
import { StepPlugin, RunContext, WorkflowStep, StepExecution } from '@maestro/core';

export class MySkill implements StepPlugin {
    name = "my-skill";
    // ... implementation
}
```

## Policy & Evidence

- **Signed Manifests**: Ensure supply-chain trust.
- **Sandboxed Execution**: Skills execute within the Maestro Engine's context, with access limited by the manifest.
- **Automatic Evidence**: The `StepPlugin` execution result's `metadata` field MUST include an "evidence bundle" containing:
    - Input parameters used.
    - Checksums of generated artifacts.
    - Execution trace ID.
    - Any policy decisions made during execution.

## Governance Moats

1.  **Typed Contracts**: Strictly typed inputs/outputs via JSON Schema.
2.  **Permission Manifests**: Explicit declaration of all required permissions (fs, net, env).
3.  **Supply Chain Trust**: SBOM and signing for every skill package.
4.  **SkillScore**: Continuous evaluation of reliability and safety.
