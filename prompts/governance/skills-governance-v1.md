# Skills Governance Prompt (v1)

## Purpose

Establish and enforce the Summit governed skill supply chain, including registry
validation, pack installation, provenance capture, and skill evaluation harness
changes.

## Scope

Applies to:

- `skills/`
- `evals/skills/`
- `scripts/skills/`
- `.github/workflows/skill-*.yml`
- `docs/roadmap/STATUS.json`

## Requirements

1. Skill sources must be allowlisted and pinned by SHA; any exception must be
   labeled as a governed exception with explicit authority and expiry.
2. Skill packs must reference registry entries and include capability gates for
   deploy-capable skills.
3. Provenance artifacts must be deterministic and include per-file digests.
4. Skill evals must be deterministic and fail on missing assertions.
5. Update `docs/roadmap/STATUS.json` with a revision note for every change.

## Output Contract

When proposing or implementing changes, include:

- Registry and pack updates
- Provenance generation path
- Skill eval summary
