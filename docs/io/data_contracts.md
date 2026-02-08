# IO Data Contracts

## Canonical IDs

Stable identifiers are essential for cross-platform tracking and fusion.

-   **`entity_id`**: Unique identifier for an actor, organization, or persona.
-   **`content_id`**: Unique identifier for a piece of content (post, article, video).
-   **`campaign_id`**: Unique identifier for a coordinated influence campaign.
-   **`evidence_id`**: Unique identifier for a specific evidence artifact.

## Provenance Envelope

All data entering the IO pipeline must be wrapped in a provenance envelope.

Fields:
-   `source`: Origin of the data (platform, feed).
-   `collection_method`: How the data was acquired (API, scrape, partner).
-   `timestamp`: When the data was collected.
-   `hash`: Cryptographic hash of the raw content.
-   `license`: Usage rights and restrictions.
-   `retention_class`: Data retention policy tag.
-   `tenant_id`: Owner of the data.
-   `chain_of_custody`: List of systems/processes that handled the data.

## Evidence ID Pattern

All evidence artifacts must use the following deterministic ID pattern:

`EVID::<tenant>::<domain>::<artifact>::<yyyy-mm-dd>::<gitsha7>::<runid8>`

**Components:**
-   `<tenant>`: Tenant identifier (e.g., `acme`).
-   `<domain>`: Domain area (e.g., `io`).
-   `<artifact>`: Type of artifact (e.g., `cib_eval`, `attrib_report`).
-   `<yyyy-mm-dd>`: Date of generation.
-   `<gitsha7>`: Short Git commit SHA of the code used.
-   `<runid8>`: Unique run identifier (deterministic or random depending on context).

**Examples:**
-   `EVID::acme::io::cib_eval::2026-02-07::a1b2c3d::9f2a1c0b`
-   `EVID::acme::io::attrib_report::2026-02-07::a1b2c3d::f0e1d2c3`

Every pipeline run must generate:
-   `report.json` (Human-readable summary + artifact links)
-   `metrics.json` (Machine-readable KPIs)
-   `stamp.json` (Provenance metadata: code hash, config hash, dataset hash)
