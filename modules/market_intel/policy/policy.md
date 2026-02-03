# Market Intel Policy

## Data Ingestion Rules

1. **Deny-by-default**: No market signal is accepted unless it meets provenance requirements.
2. **Citation Requirement**: All numeric claims (funding amounts, valuations) MUST have at least one valid citation to a reputable public source.
3. **Restricted Content**: VERBATIM text from restricted/paywalled sources (e.g., WSJ, FT) MUST NOT be stored. Only metadata and high-level paraphrases (max 60 words) are permitted.
4. **Confidence Scoring**: Signals are scored based on source reputation and corroboration.

## License Classes

- `public`: Openly accessible news or press releases.
- `restricted`: Paywalled content (metadata only permitted).
- `internal`: Summit-generated analysis.
