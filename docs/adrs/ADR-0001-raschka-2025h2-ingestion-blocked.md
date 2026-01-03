# ADR-0001: Raschka 2025H2 Research Ingestion Blocked by Paywall

## Context

The team intends to convert Sebastian Raschka's "LLM Research Papers: The 2025 List (July to December)" into Summit-ready backlog items, ADRs, and implementation plans. The Substack post is paywalled, and no authenticated content or pasted list is available in the current execution environment. The research pipeline requires paper metadata (title, link, category, claim) to generate downstream artifacts.

## Decision

Defer paper-level ingestion and backlog generation until either (a) authenticated access to the Substack post is provided, or (b) the paper list is supplied manually. We will preserve the taxonomy scaffold and publish an explicit blocker in `papers.json` and `backlog.csv` to prevent silent failure. Once data is available, rerun the pipeline to populate research outputs and prioritize implementation.

## Alternatives

- **Attempt web scraping without credentials**: Rejected because the content is paywalled and would still return incomplete data.
- **Synthesize likely papers from secondary sources**: Rejected to avoid provenance gaps and potential hallucinations.
- **Purchase or request access tokens now**: Not possible in this execution environment; requires human-provided credentials.

## Consequences

- Downstream backlog, ADRs, and PR plans remain placeholders until data arrives.
- The taxonomy scaffold is in place, simplifying ingestion once content is available.
- Stakeholders have a clear blocker record to avoid assuming coverage.

## Security & Privacy Considerations

- Avoid credential stuffing or unauthorized scraping attempts; only use sanctioned access.
- When ingesting the list, capture paper metadata with full provenance (URLs/arXiv IDs) to support auditability.
- Ensure no secrets are committed when adding authenticated fetch capabilities.

## Telemetry / Evaluation Plan

- Track ingestion attempt events and outcomes via the provenance ledger once implemented.
- Add a smoke check that verifies `papers.json` contains at least one paper entry before enabling downstream backlog generation.
- Emit metrics: `research.raschka2025h2.ingestion_success`, `ingestion_failure_reason`, and latency for the fetch/parse step.
