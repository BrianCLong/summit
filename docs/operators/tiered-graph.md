# Tiered Graph Architecture

## Routing Guidance

- For high-assurance audit/provenance/evidence use cases, route queries and mutations to the **Curated Evidence Graph**.
- For broad, fast exploration that avoids duplicating data from existing lakehouses, use **Graph-View**.
