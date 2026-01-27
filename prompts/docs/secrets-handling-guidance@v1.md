# Prompt: Secrets Handling Guidance Update (v1)

## Objective

Add repository-wide documentation that instructs contributors to avoid leaking secrets in shell
history and to use approved secret-handling patterns. Update contributing guidance to include
Bash history hardening, cleanup steps, and references to governance readiness standards.

## Scope

- `CONTRIBUTING.md`
- `docs/roadmap/STATUS.json`
- `prompts/docs/secrets-handling-guidance@v1.md`
- `prompts/registry.yaml`
- `agents/examples/`

## Requirements

- Provide explicit do/don't guidance for secrets in commands.
- Include Bash history hardening configuration with reload instructions.
- Reference the Summit Readiness Assertion.
- Update `docs/roadmap/STATUS.json` with a concise revision note.
- Keep changes minimal and aligned with existing documentation tone.

## Verification

- Ensure documentation renders in Markdown without lint errors.
- Confirm no secrets or credentials are introduced in the repo.
