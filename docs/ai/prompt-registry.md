# Prompt Registry Specification

This registry centralizes all LLM prompt templates to make them discoverable, versioned, and security-reviewed. All new prompts **must** be added here instead of being defined inline in code.

## Goals

- Single source of truth for prompts with clear ownership and versioning
- Safer prompts via static security checks and CI enforcement
- Easy introspection from code (metadata + template access)
- Reduce prompt sprawl and duplicated strings

## Storage Layout

- Directory: `prompts/registry/`
- Format: YAML (one prompt per file). JSON is allowed but YAML is preferred for readability.
- File naming: `<id>.yaml` (e.g., `prompt_maestro_planner_v1.yaml`).

## Prompt Schema

Each file must provide:

| Field         | Required | Description                                                                             |
| ------------- | -------- | --------------------------------------------------------------------------------------- |
| `id`          | Yes      | Stable identifier that includes the version suffix (e.g., `prompt_maestro_planner_v1`). |
| `version`     | Yes      | Semantic version of the template content (e.g., `1.0.0`).                               |
| `type`        | Yes      | `system`, `user`, `tool`, or `few-shot`.                                                |
| `owner`       | Yes      | Owning feature/module (e.g., `documentation`, `retrieval`).                             |
| `module`      | No       | Submodule or service responsible for runtime changes (e.g., `ai-content-assistant`).    |
| `description` | No       | Short summary of intent and scope.                                                      |
| `riskTier`    | No       | `low`, `medium`, or `high` depending on downstream impact/PII/external actions.         |
| `tags`        | No       | Helpful keywords for search.                                                            |
| `variables`   | No       | List of template variables (used for validation and clarity).                           |
| `template`    | Yes      | The actual prompt text. Use `{{variable_name}}` placeholders.                           |

## Referencing Prompts in Code

Use the shared registry helper to load and render prompts with typed metadata:

```ts
import { renderPrompt } from "../core/promptRegistry";

const prompt = renderPrompt("documentation_example_generation_v1", {
  description: "Add an overview section",
  language: "TypeScript",
}).content;
```

### Registry API (Phase 1)

`src/core/promptRegistry.ts` exposes:

- `loadPrompt(id)` — returns the prompt metadata + raw template string.
- `renderPrompt(id, variables?)` — injects provided variables into the template and returns `content` alongside metadata.
- `listPrompts(filter?)` — enumerate registered prompts by owner/module/type/risk/tag/search.

### Versioning

- The `id` includes the version suffix (e.g., `_v1`) **and** a `version` field tracks semantic changes.
- Non-breaking wording tweaks: bump patch (`1.0.1`).
- Structural changes (variables/intent): bump minor/major and update the `_vX` suffix in the ID.
- Deprecations: keep old files for reproducibility; add a `description` note indicating the successor.

### Safety Requirements

- All prompts in `prompts/registry` are scanned by `scripts/ai/scan-prompts.ts` for jailbreak bait and secret-exfil patterns.
- CI workflow `.github/workflows/prompt-lint.yml` runs the scanner on every PR.
- High-risk prompts (PII/external actions) must set `riskTier: high` and include owner/module for traceability.

### Migration Guidance (Phase 1)

- New prompts: add a YAML file under `prompts/registry` and consume via `renderPrompt`.
- Existing inline prompts: migrate opportunistically (3–5 per PR) to avoid large diffs.
- If a prompt must stay inline temporarily, add a TODO referencing the desired registry ID and owner.

### Introspection & Discovery

- Use `listPrompts({ owner: 'documentation' })` to enumerate a feature's prompts.
- Metadata exposes `version`, `description`, `riskTier`, and `sourcePath` for observability and governance.

### Canonical Location

`prompts/registry` is the **only** approved location for production prompts. Inline strings and ad-hoc helpers should be considered legacy and scheduled for migration.
