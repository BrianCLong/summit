# Vercel Agent Skills (Intentionally Constrained)

This directory reserves a pinned, verified import slot for
`vercel-labs/agent-skills`. The current content is intentionally constrained
pending the governed import pipeline.

## Governed Exception

- Authority: `docs/SUMMIT_READINESS_ASSERTION.md`
- Rationale: External fetch path is gated; import requires provenance capture and
  allowlist verification.
- Enforcement: `scripts/skills/verify-registry.mjs` blocks unpinned sources.
