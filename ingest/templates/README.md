# IO Snapshot 2026 Ingest Templates

This directory contains normalized JSON templates for ingesting Information Operations (IO) and Espionage data into the IntelGraph platform.

## Files

- `io_snapshot_2026.json`: A comprehensive mapping of the February 2026 IO snapshot, including Mexican Cartel disinformation, Russian Olympic operations, and PRC espionage cases.

## Schema Alignment

The data is mapped to the `IntelCraftElement` format used by the IntelGraph ingestion pipeline.

### Core Entity Mapping

- **Actor**: Org or Actor
- **Campaign**: Campaign
- **Narrative**: Narrative
- **Event**: Event
- **Infrastructure**: Infra
- **Platform**: Platform (New Canonical Type)
- **MediaBrand**: MediaBrand (New Canonical Type)
- **IntelligenceService**: IntelligenceService (New Canonical Type)

### Relationship Types

The following custom relationship types are utilized as per the IO Threat Ontology:
- `LAUNCHED`
- `AMPLIFIED_VIA`
- `TARGETED`
- `IMPERSONATED`
- `PLACED_CONTENT_IN`
- `COORDINATED_WITH`
- `TRIGGERED_BY`
- `ASSOCIATED_WITH`

## Usage

These templates can be ingested using the `integrate_intelcraft_elements` helper in the `intelgraph` package.

```python
from intelgraph import Graph, integrate_intelcraft_elements
import json

with open('ingest/templates/io_snapshot_2026.json', 'r') as f:
    payload = json.load(f)

graph = Graph()
integrate_intelcraft_elements(graph, payload)
```

## Verification

The template has been verified using `scripts/verify_io_ingest.py`.
