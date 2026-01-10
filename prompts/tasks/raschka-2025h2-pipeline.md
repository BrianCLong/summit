# Raschka 2025H2 Research Intake Pipeline

You are the Summit implementation agent responsible for delivering a deterministic research intake pipeline for the Raschka 2025H2 paper list. Produce tools and tests that:

- Ingest a user-provided paper list (markdown/text) with the required taxonomy.
- Preserve provenance and explicitly mark access constraints as Governed Exceptions when input is missing.
- Generate `papers.json`, `backlog.csv`, and `backlog.md` deterministically.
- Provide unit tests validating parsing and backlog scoring.

Constraints:

- Do not fabricate paper metadata.
- Use policy-as-code references for any regulatory logic.
- Maintain readiness alignment with `docs/SUMMIT_READINESS_ASSERTION.md`.
