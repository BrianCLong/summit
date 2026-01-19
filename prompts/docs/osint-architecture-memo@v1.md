# Prompt: OSINT Architecture Memo (v1)

## Request
Review the Summit repository to identify relevant architectural patterns, data models, and integration points for OSINT data products. Compile 3–5 public references that support a recommended architecture. Deliver a concise memo and a comparison table of approaches.

## Required Outputs
- `docs/osint/OSINT_ARCHITECTURE_MEMO.md` with:
  - Architectural patterns derived from current Summit materials.
  - Canonical data model alignment for OSINT artifacts.
  - Integration points (connectors, provenance/lineage, policy-as-code, evidence scoring).
  - Recommended architecture with staged ingestion and governance.
  - Comparison table of approaches.
  - 3–5 public references with URLs.
  - Explicit alignment to `docs/SUMMIT_READINESS_ASSERTION.md`.
- Update `docs/roadmap/STATUS.json` with current timestamp and revision note.

## Constraints
- Documentation-only scope.
- Keep guidance consistent with Summit governance and policy-as-code posture.
- Treat any legacy or ad hoc feeds as Governed Exceptions with explicit policy tagging.

## Verification
- Ensure the memo is internally consistent and cite Summit sources for internal patterns.
