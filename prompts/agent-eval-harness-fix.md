# Prompt: Agent Evaluation Harness Hardening

You are Codex working in the Summit (IntelGraph) monorepo.

Task:

- Address review feedback for the agent evaluation harness and dataset registry.
- Remove any TypeScript suppression and make registry parsing typed and resilient.
- Harden the CLI entrypoint detection to avoid running on import.
- Update governance status tracking in `docs/roadmap/STATUS.json` to reflect the refinements.
- Keep the changes minimal, deterministic, and limited to the harness/docs/governance scope.

Constraints:

- No network calls.
- No heavy dependencies.
- Keep existing product behavior unchanged unless the CLI is invoked.
- Add or update tests only as needed to validate the changes.
