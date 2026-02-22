# OpenClaw Skillpack Ingestion (Index-Only) v1

You are implementing index-only ingestion of OpenClaw-style skill repositories for Summit. Scope:

- Parse SKILL.md frontmatter + body and map into a deterministic index format.
- Emit deterministic artifacts for skill-index.json and evidence.json.
- Label high-risk capabilities (arbitrary transaction submission) based on SKILL.md text.
- Expose CLI commands to ingest, show, and validate approval gating (execution remains disabled).
- Update docs/roadmap/STATUS.json to track the initiative.

Constraints:

- Execution is intentionally constrained: no sandbox runtime or script execution in v1.
- Deterministic outputs: no timestamps, stable ordering, hash-based evidence IDs.
- Use existing repository conventions and avoid cross-zone changes unless strictly coupled.
