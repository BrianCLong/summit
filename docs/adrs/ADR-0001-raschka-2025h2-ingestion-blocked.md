# ADR-0001: Raschka 2025H2 Research Intake Deferred Pending Authorized Access

## Context

Summit must translate Sebastian Raschka's "LLM Research Papers: The 2025 List (July to December)" into backlog items, ADRs, and implementation plans. The Substack post is paywalled in this environment, so the paper list is unavailable. A deterministic ingestion pipeline now exists in `tools/research/raschka2025h2_pipeline.py`, but it requires authorized content input.

Per the Summit Readiness Assertion (`docs/SUMMIT_READINESS_ASSERTION.md`), provenance and traceability are mandatory; no paper claims may be synthesized without authoritative sources.

## Decision

Defer ingestion and scoring until an authorized paper list is provided. This is recorded as a **Governed Exception**: input access is intentionally constrained pending authorized source material. The taxonomy scaffold and pipeline are locked in place to compress turnaround once access is granted.

## Alternatives

- **Attempt unauthenticated scraping**: Rejected; it still returns incomplete data and violates provenance requirements.
- **Infer papers from secondary sources**: Rejected; would create unverifiable claims.
- **Delay pipeline build**: Rejected; pipeline readiness reduces future cycle time.

## Consequences

- Research artifacts remain intentionally constrained until content arrives.
- Stakeholders can unblock ingestion by supplying the paper list or access token.
- The pipeline and tests are available to generate validated backlog artifacts immediately once data exists.

## Security & Privacy Considerations

- Only sanctioned access mechanisms may be used.
- No credentials will be committed to the repository.
- Provenance links (arXiv/DOI URLs) must be preserved for auditability.

## Telemetry / Evaluation Plan

- On ingestion, emit metrics for `research.raschka2025h2.ingestion_success`, `ingestion_failure_reason`, and latency.
- Pipeline tests (`tests/research/test_raschka2025h2_pipeline.py`) validate determinism.
- Use the provenance ledger for ingestion run records once authorized data is supplied.
