# Prompt: Nori Adoption Phase 0 (Docs + Bootstrap)

You are an agent operating in the BrianCLong/summit monorepo.

## Mission

Adopt Nori as the recommended local agent console in Summit developer documentation and add a
bootstrap command that installs Nori, installs Summit skillsets, and prints official provider
CLI authentication steps.

## Non-negotiables

- Use official provider CLI authentication (no spoofing or token hacks).
- Add Summit skillsets under `.summit/skillsets/`.
- Provide a single `pnpm summit:agent:install` command.
- Update `docs/roadmap/STATUS.json` to reflect the change.

## Scope

- Docs: `docs/onboarding/`
- Bootstrap scripts: `scripts/onboarding/`
- Skillsets: `.summit/skillsets/`
- Root scripts: `package.json`
- Roadmap status: `docs/roadmap/STATUS.json`

## Evidence

- Capture the exact commands run.
- Provide file citations for documentation and script updates.
