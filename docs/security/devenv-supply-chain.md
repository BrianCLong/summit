# Dev Environment Supply-Chain Risks (Codespaces / VS Code)

## What can go wrong

- Auto-exec via devcontainer lifecycle hooks (`postCreateCommand`, `postStartCommand`, etc.).
- Auto-run tasks on folder/workspace open (`runOptions.runOn`).
- PROMPT_COMMAND injection in terminal settings.

## Contribution rules (deny-by-default)

Summit blocks auto-exec dev environment configuration changes unless a **Governed Exception** is
approved and unexpired. The policy is defined in `.github/policies/devenv-policy.json` and enforced
by the DevEnv Auto-Exec gate in CI.

## Exception process (Governed Exceptions)

File: `.github/policies/devenv-exceptions.json`

Each exception must include:

- `id`, `owner`, `reason`, `paths`, `keys`, `evidenceIds`
- `expiresOn` (TTL required; expired exceptions are rejected)

Exceptions are intentionally constrained and must be replaced with safer alternatives before the
expiry date.

## No secrets in dev environments

- Never store tokens, secrets, or credentials in devcontainer configs, VS Code settings, or tasks.
- Avoid `PROMPT_COMMAND`, embedded tokens, or shell scripts that echo environment variables.
- Use least-privilege tokens for Codespaces and revoke access for forks/untrusted branches.

## Operational guidance

- Prefer org-level Codespaces policies that restrict secrets to trusted repos and branches.
- Disable Codespaces for forks if the contribution model allows it.
- Keep devcontainer commands in controlled scripts checked into the repo with reviewable diffs.
