# Data Handling: reddit-ma-adtech-2026-02-06

## Data Classification

- **Class:** Public web content + derived structured facts.
- **Source Types:** TechCrunch articles, Reddit Investor Relations releases.

## Never-Log List

- Cookies or session identifiers
- Authorization headers or tokens
- User identifiers or IP addresses
- Full raw HTML dumps unless hashed and redacted

## Retention Policy

- Retain normalized snippets and hashed source references.
- Store raw HTML only in approved quarantine storage when required by governance.

## Access Controls

- Read-only access for ingestion pipelines.
- Evidence artifacts require provenance URI and snippet hashing.

## Governance Notes

- This pack uses deterministic artifacts to preserve evidence integrity.
- Deviations are treated as governed exceptions and must be logged.
