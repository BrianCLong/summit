# Summit Simplifier Contract Prompt (v1)

Objective: Draft and add a governance-grade Summit Simplifier Contract that formalizes a
post-implementation simplifier pass, semantic-preservation gate, evidence schema, and CI modes.

Requirements:
- Author a new contract document under `docs/governance/` that defines:
  - Mandatory “simplify after” step in Maestro workflows scoped to git diff.
  - Semantic-Preservation Gate with deterministic API surface checks.
  - Evidence bundle schema for `evidence/simplify.json`.
  - CI behavior for advisory vs strict release contexts.
- Update `docs/roadmap/STATUS.json` with a revision note and timestamp.
- Align to governance authority files and policy-as-code requirements.

Constraints:
- Keep behavior-preservation non-negotiable.
- Use evidence-backed, auditable language.
- No changes to runtime logic; documentation-only change.
