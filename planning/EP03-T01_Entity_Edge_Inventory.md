# EP03-T01 Canonical Entity/Edge Inventory

## Node Types (Entities)

| Label | Description | Key Properties |
| :--- | :--- | :--- |
| **Person** | An individual human being. | `full_name`, `dob`, `nationality`, `clearance_level` |
| **Organization** | A structured group of people (company, gov agency, NGO). | `name`, `duns`, `jurisdiction`, `sector` |
| **Location** | A physical place or geospatial point. | `name`, `lat`, `lon`, `address`, `country_code` |
| **Event** | An occurrence in time and space. | `title`, `start_time`, `end_time`, `type` (e.g., meeting, incident) |
| **Document** | A file or piece of content (PDF, Email, Report). | `title`, `content_hash`, `source_url`, `classification` |
| **Account** | A digital identity or financial account. | `username`, `platform`, `account_id`, `status` |
| **Device** | A physical computing device or asset. | `hostname`, `ip_address`, `mac_address`, `type` |
| **Topic** | A conceptual tag or subject. | `name`, `wikidata_id` |

## Relationship Types (Edges)

| Type | Source | Target | Description |
| :--- | :--- | :--- | :--- |
| **KNOWS** | Person | Person | Social or professional connection. |
| **EMPLOYS** | Organization | Person | Employment relationship. |
| **LOCATED_AT** | Any | Location | Geospatial positioning. |
| **PARTICIPATED_IN** | Person/Org | Event | Attendance or involvement. |
| **MENTIONS** | Document | Any | Content reference/extraction. |
| **AUTHORED** | Person | Document | Creation of content. |
| **HAS_ACCOUNT** | Person/Org | Account | Ownership of digital identity. |
| **USED** | Person/Account | Device | Logged activity on device. |
| **AFFILIATED_WITH** | Person/Org | Organization | Generic association. |

## Standard Properties (All Nodes/Edges)

*   `id` (UUID): Unique identifier.
*   `created_at` (DateTime): Ingest timestamp.
*   `updated_at` (DateTime): Last modification.
*   `source_id` (String): Origin system ID.
*   `confidence` (Float): 0.0-1.0 score (for inferred data).
*   `classification` (String): Security marking (e.g., UNCLASSIFIED, SECRET).
*   `provenance_hash` (String): Link to immutable ledger entry.

## Taxonomy & Synonyms

*   **Person**: Individual, Human, Subject, Actor.
*   **Organization**: Company, Agency, Group, Entity.
*   **Location**: Place, Site, Geo, Point.
*   **Document**: File, Report, Artifact, Item.
