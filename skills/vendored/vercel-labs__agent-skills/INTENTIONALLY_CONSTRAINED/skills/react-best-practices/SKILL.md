# React Best Practices (Vendored - Intentionally Constrained)

This vendored skill slot is intentionally constrained pending governed import of
vercel-labs/agent-skills at an approved, pinned SHA.

## Governed Exception

- Authority: `docs/SUMMIT_READINESS_ASSERTION.md`
- Rationale: External fetch path is gated; ingestion must pass skill provenance
  verification and allowlisted source checks.
- Enforcement: `scripts/skills/verify-registry.mjs` blocks unpinned sources and
  marks this slot as governed until the import pipeline populates verified
  content.

## Intended Coverage (Upon Import)

- React/Next.js performance patterns
- Server/client boundary hygiene
- Avoiding costly re-renders and waterfall data fetching
