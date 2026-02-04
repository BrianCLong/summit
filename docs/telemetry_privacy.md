# Telemetry & Privacy

## Policy
We minimize data collection. We NEVER log:
- Raw prompts
- Source code
- Secrets / API keys
- File contents

## Allowed Data
We log (opt-in):
- Interaction modes (e.g., "delegation", "engaged")
- Latency / Token counts
- Model names
- Anonymized task IDs

## Redaction
All events pass through `summit.telemetry.redaction` which sanitizes:
- Email addresses
- API keys (sk-...)
