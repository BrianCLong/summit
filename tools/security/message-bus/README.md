# Message Bus Hardening Toolkit

## Files
- `schema-lint.js`: validates schemas against registry compatibility rules.
- `dlq-replay.js`: replays sanitized messages from DLQ topics.
- `tenant-quotas.yaml`: per-tenant publish quotas.

## Usage
```bash
node tools/security/message-bus/schema-lint.js --schema schemas/event.avsc --topic intelgraph.events
node tools/security/message-bus/dlq-replay.js --topic dead-letter.events --limit 100
```
