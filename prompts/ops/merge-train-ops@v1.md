# Prompt: Merge Train Ops Update (v1)

## Intent

Update merge train operational tooling and supporting status metadata to keep
merge-train execution deterministic, auditable, and aligned with governance.

## Required Assertions

- Cite authority files, especially `docs/SUMMIT_READINESS_ASSERTION.md` and
  governance policy sources in `docs/governance/`.
- Treat legacy behaviors as **Governed Exceptions** when noted.
- Keep merge-train outputs deterministic and clearly scoped.

## Scope

- `scripts/ops/merge-train.ts`
- `docs/roadmap/STATUS.json`
- `prompts/ops/merge-train-ops@v1.md`
- `prompts/registry.yaml`

## Guardrails

- No changes outside declared scope.
- Keep merge-train simulation safe (no direct merges to main).
- Ensure outputs provide deterministic guidance for operators.
