# Prompt: Request-first run observability hardening (v1)

You are an implementation agent working in the Summit/IntelGraph repo.

## Goal

Harden the request-first observability slice so it is production-safe and aligns with governance.

## Scope

- Fix API route mounts so the UI hits the correct `/api/observability/runs` endpoints.
- Ensure the run span buffer flush persists to Postgres when `OBS_SPAN_DEV_BUFFER=true`.
- Add PII tag guardrails: block PII-like tag keys by default and allow only when explicitly approved.
- Add tests for tag registry validation (strict mode + PII guard).
- Update observability docs and roadmap status for the hardening.
- Register this prompt in `prompts/registry.yaml` and add a task spec under `agents/examples/`.

## Constraints

- Keep changes minimal and non-breaking.
- Maintain feature flag gating.
- Do not add new dependencies.
- Use existing TypeScript/ESM conventions.

## Verification

- Run `scripts/check-boundaries.cjs`.
- Run the relevant Jest tests for the observability modules.

## Notes

- PII tags must remain blocked by default (governed exception only).
