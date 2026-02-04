# Expectation Baselines (Interop & Standards)

## Summary

Expectation-driven collection and validation using explicit baselines.

## Import/Export Matrix

- Import: YAML baselines, JSON event series
- Export: JSON anomaly reports, evidence bundle artifacts

## Non-goals

- No monitoring of private/draft content by default
- No platform-specific scraping logic in core

## Compatibility Notes

- Baselines are versioned and provenance-tagged
- Time-slice alignment requires normalized timestamps (UTC)
