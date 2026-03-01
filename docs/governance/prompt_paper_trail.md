# Summit Prompt Paper Trail Governance

## Overview
Every AI prompt can create a durable record that may later be reviewed (eDiscovery, regulators, litigation, audits). Summit treats prompts and outputs as business communications with governance, retention, and controls.

## Capabilities
- **Prompt Event Logging:** All prompt events are captured with metadata.
- **Redaction:** Sensitive data (secrets, PII) is redacted before storage.
- **Policy Enforcement:** "Deny by default" policy checks purpose and classification.
- **Retention:** Configurable retention periods with legal hold overrides.

## Data Model
See `evidence/schemas/prompt_event.schema.json` for the canonical event structure.

## Integration
Developers should use the `summit.audit` library to capture events.
