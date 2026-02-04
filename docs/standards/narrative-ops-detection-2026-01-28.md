# Narrative Ops Detection — Interop & Standards

## Scope
This standard defines the interoperability and governance requirements for the Narrative Ops Detection subsumption bundle.

## Event Model (JSONL)
Ingested events must follow the JSONL format:
```json
{"id": "evt-001", "text": "...", "timestamp": "...", "domain": "..."}
```

## Import Paths
- `events.jsonl`: Primary ingestion path.

## Export Artifacts
- `operations_report.json`
- `graph.json`
- `evidence_bundle.zip`

## Standards Mapping (Placeholder)
- STIX-like objects (concept)
- MISP-like events (concept)

## Non-goals
- Automated attribution to real persons.
- Real-time takedown automation.

## Compatibility Notes
- Must produce stable, deterministic evidence artifacts.
