# Data Handling: OTel + OpenLineage PROV Mapping

## Classification
- **Context + Mapping**: Public, non-sensitive.
- **Sample Payloads**: Synthetic only; **never include real dataset names, namespaces, or run IDs** from production.

## Never Log List
- Environment secrets.
- GitHub tokens.
- Internal URLs.
- Customer identifiers.

## Retention
- CI artifacts are retained according to GitHub project settings.
- Artifacts contain hashes only and error strings (no sensitive data).
