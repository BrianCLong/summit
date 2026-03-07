# Behavior Forecasting Data Handling

Classification:
- Public benchmark fixtures
- Internal synthetic scenario traces
- Sensitive operational traces
- Restricted agent memory/tool I/O

Retention:
- metrics: 90 days
- deterministic evidence bundles: 30 days
- raw sensitive traces: do not persist in default path

Never log:
- raw chain-of-thought
- secrets / tokens / credentials
- unredacted user content
- production tool payload bodies unless explicitly scrubbed
- proprietary traces copied into benchmark fixtures
