# Prompt: GitHub App consent + org governance documentation update (v1)

## Objective
Update GitHub App setup documentation to reflect consent-screen behavior changes and
organization-level governance controls that affect app requests. Ensure the roadmap
status log is updated to reflect the documentation update.

## Scope
- `docs/integrations/SETUP_GITHUB_APP.md`
- `docs/roadmap/STATUS.json`
- `prompts/docs/github-app-consent-governance-update@v1.md`
- `prompts/registry.yaml`

## Requirements
- Describe the selective “Act on your behalf” warning behavior (effective 2026-01-12).
- Document organization controls for who can request GitHub Apps or OAuth Apps.
- Keep permissions guidance aligned to least-privilege principles.
- Update `docs/roadmap/STATUS.json` with a precise revision note and timestamp.

## Non-Goals
- No code or policy engine changes.
- No CI/workflow modifications.

## Verification
- Manual review of updated documentation content for accuracy and clarity.
