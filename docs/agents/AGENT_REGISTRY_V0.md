# Agent Registry v0

**Summit Readiness Assertion:** This registry aligns agent definitions with the authority sources enumerated in `docs/SUMMIT_READINESS_ASSERTION.md` and the governance constitution.

## Purpose

The Agent Registry is the canonical, versioned catalog of specialist agents. Each agent is declared as YAML and validated at load time to enforce deterministic, policy-aligned definitions. The registry is the foundation for upcoming SOP compilation, Lens Pack critiques, and Decision Artifact generation.

## Registry Location

Agent definitions live in `docs/agents/registry/` and must be authored as single-agent YAML files. Filenames are arbitrary but must end in `.yaml` or `.yml`.

## Required Fields

Each agent definition must include:

- `id` (kebab-case, unique)
- `name`
- `version` (semver)
- `description`
- `role` (`orchestrator`, `specialist`, `critic`, `executor`)
- `inputs[]` and `outputs[]`

Optional fields include `sop_refs`, `allowed_tools`, `policies`, `evals`, `tags`, and `owner`. `data_access` defaults to `internal` if omitted.

## How to Add an Agent

1. Create a new YAML file in `docs/agents/registry/`.
2. Follow the required schema and keep values deterministic (stable ordering, stable IDs).
3. Run validation locally:

```bash
pnpm --filter @summit/cli dev -- agents validate
```

## CLI Usage

- List agents:

```bash
pnpm --filter @summit/cli dev -- agents list
```

- List agents as deterministic JSON:

```bash
pnpm --filter @summit/cli dev -- agents list --json
```

- Validate agents (non-zero exit on failures):

```bash
pnpm --filter @summit/cli dev -- agents validate
```

## Roadmap Connection

- **PR2** will compile SOPs into structured procedures consumed by `sop-compiler`.
- **PR3** will introduce Lens Packs to score and critique proposals.
- **PR4** will generate Decision Artifacts (memos, risks, alternatives) with provenance links.

The registry ensures each of these capabilities is anchored to a validated, policy-aligned agent definition.
