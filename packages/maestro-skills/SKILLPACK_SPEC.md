# Summit Skillpack Standard

Summit Skills are portable, agent-agnostic capability modules that adhere to strict governance, provenance, and evaluation standards. They are a superset of the Agent Skills standard, designed to "moat" capabilities with robust trust layers.

## Structure

Each skill MUST reside in its own directory (e.g., `packages/maestro-skills/skill-name`) and contain the following structure:

- **`manifest.json`**: The identity and security contract. MUST be signed.
- **`SKILL.md`**: Mission control documentation. Defines inputs, outputs, purpose, and usage.
- **`src/`**: TypeScript implementation of the skill. MUST implement the `StepPlugin` interface from `@maestro/core`.
- **`scripts/`**: Utility scripts for validation, testing, or maintenance (e.g., `validate.ts`).
- **`resources/`**: Static assets, prompts, checklists, or guides used by the skill.
- **`examples/`**: Reference inputs and gold-standard outputs for testing and few-shot prompting.
- **`package.json`**: Standard NPM package definition.

## Manifest (`manifest.json`)

The manifest provides the security and provenance context for the skill.

```json
{
  "name": "skill-name",
  "version": "1.0.0",
  "description": "Short description of the skill's capability.",
  "permissions": {
    "network": ["api.figma.com", "api.github.com"],
    "filesystem": ["read", "write"],
    "env": ["FIGMA_TOKEN"]
  },
  "signature": "sha256:mock-signature-hash"
}
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

## DesignOS Integration

For design-related skills, artifacts should be backed by the Graph (Design Knowledge Graph) rather than just files.

## Autonomous Loops

Looping skills (like `ui:build-loop`) must use a "baton" object (e.g., `next-prompt.md`) to maintain state across iterations, enforcing a strict "Definition of Done".
