# Prompt: OSINT Evidence Gate PR1

Create the OSINT evidence gate and documentation for Summit Lane 1 PR1. The work is additive and
must remain deny-by-default. Deliverables:

- CI workflow `summit-osint-verify` and script `.github/scripts/osint_verify.mjs`.
- OSINT evidence schemas under `schemas/osint/`.
- Governance and architecture docs under `docs/security/` and `docs/architecture/`.
- Update `required_checks.todo.md` with the new check name.
- Update `docs/roadmap/STATUS.json` to reflect the OSINT evidence PR1 initiative.
- Add task spec under `agents/examples/` that conforms to `agents/task-spec.schema.json`.

Constraints:

- No network collection logic.
- No new dependencies.
- Ensure provenance and verification checks are enforced when artifacts exist.
- Reference `docs/SUMMIT_READINESS_ASSERTION.md` in governance and architecture docs.
