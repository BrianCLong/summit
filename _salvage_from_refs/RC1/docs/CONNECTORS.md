# Connector SDK

**Goal:** Standardize ingestion from OSINT, SIEM, telemetry, and partner feeds.

## Contract
- **Manifest (YAML):** name, version, authentication, rate limits, mappings.
- **Mapper:** source → Entity/Relationship lists with default confidence.
- **Writer:** batch upsert with provenance.
- **Scheduler:** cron or webhook; backfill supported.

## Example (Wikipedia)
```yaml
name: wikipedia
version: 0.1
endpoints:
  summary: https://en.wikipedia.org/w/api.php
mappings:
  entity:
    id: "wiki:{pageid}"
    type: infer(person|org|place)
    props: [title, fullurl, extract]
  rels: []