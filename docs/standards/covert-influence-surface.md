# Covert Influence Surface Standards

## Plugin I/O Matrix

### TruthScan (IntegrityOracle)
* **In**: Artifact hashes, media metadata
* **Out**: Integrity scores, model metadata, confidence
* **Mapping**: Maps to `IntegritySignal` -> PIE features

### Blackbird (NarrativeIntel)
* **In**: Watchlists (brands, execs)
* **Out**: Narrative items, actors, risk scores
* **Mapping**: Maps to `NarrativeItem` -> CIG nodes/edges

### Summit Exports
* `cie.state.json`: API/UI consumption
* `intervention.bundles.json`: Ticket/webhook payload
* `sealed.evidence.bundle.zip`: Legal/comms bundle (hashes + manifests)

## Non-Goals
* No auto-takedown
* No election-wide mapping
* No KYC replacement
