# Cognitive Security IO Operations Runbook

## How to enable flag
Enable the capability by setting the feature flag `COGSEC_IO_MODELING=1` in your deployment environment variables.

## How to ingest sample dataset
Use the `export-fixture.ts` script to generate a standard deterministic fixture.
```bash
pnpm dlx tsx scripts/evidence/cogsec/export-fixture.ts
```
The output can be imported via standard IntelGraph API ingestion points once schema resolvers are fully mounted.

## Interpreting TempoLinks
**Crucial:** A `TempoLink` represents an *association* (e.g., a narrative surge window occurring 3-6 hours after a kinetic strike), not necessarily verified *causation*.
All TempoLinks must include `rationaleEvidenceIds[]` to explain why the link was drawn. Avoid jumping to causation without attribution confidence.

## Alerts to Monitor
* Spike in `Campaign` object creation rate.
* Increase in `UNKNOWN` synthesis method ratio.
* Schema-compat failure rate spikes during deployments.
* Evidence export script failures.

## Expected Query Patterns
* GraphQL queries can retrieve campaign summaries, show contested hypotheses, and render tempo links using `cogsecCampaign`.
