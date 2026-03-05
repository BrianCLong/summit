# Offline-Local Data Handling Policy

- Do not log full prompts or raw completions in persistent logs.
- Store only cryptographic hashes of inputs/outputs for determinism evidence.
- Disable telemetry export in offline mode.
- Retain offline-mode logs for 30 days maximum.
