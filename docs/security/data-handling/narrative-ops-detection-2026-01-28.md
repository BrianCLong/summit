# Data Handling — Narrative Ops Detection

## Data Classes
- **Public**: Published URLs, public posts.
- **Internal**: Analyst notes, workflow metadata.
- **Confidential**: Customer case IDs, internal linkages.
- **Regulated**: Jurisdiction-specific identifiers (kept out of logs by default).

## Retention Defaults
- Raw events: 30 days.
- Derived graphs: 90 days.
- Evidence bundles: 1 year (default).

## Never-Log Fields
- Access tokens, cookies, private account identifiers, customer secrets.

## Audit Export
- Requirement: Export evidence bundle + decision log + manifest + schema versions.

## Access Control Notes
- Analyst role required for full report generation.
