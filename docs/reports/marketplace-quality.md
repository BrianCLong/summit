# Marketplace Quality Report Template

## Summary

Provide weekly snapshot of MCP server marketplace health, conformance, and quality badges compared to Metorial catalog.

## KPIs

- Total servers discovered vs. prior week.
- Conformance pass rate (overall + by badge category).
- Average latency badge tier (Gold/Silver/Bronze).
- Sandbox compliance rate.
- Auth scope coverage (capability token completeness).

## Data Sources

- `catalog/registry.json` (auto-ingested server manifests).
- `tests/marketplace/conformance-results/*.json`.
- Benchmark harness cold-start exports (`benchmarks/runtime/*.json`).

## Narrative

1. Highlight top new servers added and their badge outcomes.
2. Call out regressions or delistings with remediation owners.
3. Compare against Metorial public catalog counts and latency claims.
4. Surface SDK adoption metrics (downloads, emulator sessions).

## Next Actions

- Assign follow-ups for failed conformance tests.
- Schedule outreach with top-performing partners for launch demo.
- Update docs/conformance spec based on observed gaps.
