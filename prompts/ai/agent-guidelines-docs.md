# Prompt: AI Agent Guidance Docs Update

Goal: update Summit documentation to capture AI agent guidance (cross-language and
Python-specific), ensure contributor-facing links are present, and align the
materials with repository governance and readiness sources. Keep changes small
and reviewable; avoid altering product logic or refactoring unrelated areas.

Requirements:

- Update `docs/ai/AGENT_GUIDELINES.md` and `docs/ai/AGENT_GUIDELINES_PYTHON.md`
  with Summit-tailored guidance (security, testing, tooling preferences, and
  governance references).
- Ensure `CONTRIBUTING.md` links to the guidance and references the readiness
  baseline in `docs/SUMMIT_READINESS_ASSERTION.md`.
- Only update `README.md` if a contributing section already exists; keep changes
  minimal and additive.
- Update `docs/roadmap/STATUS.json` with a new revision note and timestamp to
  reflect this documentation work.
- Do not introduce new tooling or CI unless explicitly requested.

Acceptance:

- Documentation is clear, Summit-specific, and linked correctly.
- Changes are confined to documentation and governance metadata updates.
- CI remains green and existing workflows are respected.
