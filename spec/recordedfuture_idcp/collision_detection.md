# Collision and Alias Detection

## Steps
1. Ingest indicator records from multiple feeds with context attributes and provenance.
2. Compute similarity scores:
   - Context similarity (malware family, actor, infrastructure, timestamp, location).
   - Provenance similarity (feed source, reporter trust, sighting quality).
   - Graph neighborhood similarity within hop budget in intelligence graph.
3. Detect multi-modal clusters per indicator value to flag collisions.
4. Build equivalence relations between indicators to identify aliases.
5. Select minimal support sets per collision under proof budgets.
