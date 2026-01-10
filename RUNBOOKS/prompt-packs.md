# Prompt Pack Manifest & Management

## Overview

We have unified our prompt management into a single "Prompt Pack" structure located in `prompts/packs/`. This replaces scattered configurations in `.grok`, `.claude`, `agents/`, etc.

Each prompt pack is a directory containing:
1.  `manifest.json` (or `.yaml`): Defines the metadata, roles, variables, and tests.
2.  `template.md` (Optional): A monolithic template if distinct roles are not used.

## Adding a New Prompt Pack

1.  Create a directory in `prompts/packs/<pack-id>/`. The ID must match `^[a-z0-9-]+(\.[a-z0-9-]+)*(@v[0-9]+)?$`.
2.  Create `manifest.json`.

Example `manifest.json`:
```json
{
  "id": "my-feature.task@v1",
  "version": "1.0.0",
  "description": "A new feature prompt.",
  "roles": {
    "system": "You are a helpful assistant..."
  },
  "vars": {
    "context": { "type": "string" }
  },
  "tests": [
    {
      "input": { "context": "hello" },
      "expected": "world",
      "seed": 42
    }
  ],
  "guardrails": {
    "tags": ["feature"]
  }
}
```

## Validation (Linting)

We have a custom linter to ensure prompt packs adhere to the schema.

```bash
pip install -e tools/promptpack_lint
promptpack-lint --repo .
```

This runs automatically in CI.

## Migration

A script exists to migrate legacy prompts into this structure.

```bash
python3 scripts/migrate_prompt_dirs.py
```

## Schema

The schema is defined in `prompts/manifest.schema.json`.

## Migration Strategy & Cleanup

The migration script `scripts/migrate_prompt_dirs.py` creates new Prompt Packs in `prompts/packs/` based on existing files.

**Important:** This is a non-destructive operation. The original files (in `.claude/`, `agents/`, etc.) remain in place to prevent breaking existing application logic.

### Phase 1: Creation (Current)
- Run `python3 scripts/migrate_prompt_dirs.py` to generate packs.
- Verify packs with `promptpack-lint`.

### Phase 2: Application Update (Next)
- Update application code (`PromptRegistry`, `Agent` classes) to load prompts from `prompts/packs/` instead of legacy paths.
- Verify application behavior.

### Phase 3: Cleanup
- Once application code is updated, delete the legacy files (`agents/*/prompt.md`, `.claude/prompts/*.md`, etc.).
- Remove the `legacy-import` tag from `manifest.json`.
