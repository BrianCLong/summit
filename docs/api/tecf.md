# Tradecraft Event Canonical Format (TECF) v0

TECF is a normalized event format designed to capture security signals relevant to enterprise espionage simulations.

## Field Definitions

| Field | Type | Description |
| :--- | :--- | :--- |
| `tenant_id` | string | Unique identifier for the organization/tenant. |
| `event_id` | string | Unique identifier for the event. |
| `event_time` | string (ISO8601) | Time the event occurred. |
| `actor` | object | The entity performing the action (human, bot, service account). |
| `asset` | object | The resource being acted upon (file, database, endpoint). |
| `channel` | string | The platform or application (e.g., m365, slack). |
| `action` | string | The specific action taken (e.g., login, download). |
| `intent_hypothesis` | object (optional) | Initial classification of the tradecraft pattern. |
| `confidence` | number (0-1) | Confidence score of the event or hypothesis. |
| `raw_ref` | object | Reference to the original source system record. |
| `provenance` | object | Metadata about the ingestion process. |

## Actor Types
- `HUMAN`
- `SERVICE_ACCOUNT`
- `BOT`
- `UNKNOWN`

## Asset Types
- `FILE`
- `DATABASE`
- `ENDPOINT`
- `COMMUNICATION_CHANNEL`
- `CREDENTIAL`

## Intent Hypotheses
- `RECON`
- `LATERAL_MOVEMENT`
- `STAGING`
- `EXFIL`
- `BENIGN`
