# FS-Researcher Data Handling & Threat Mitigations

## MAESTRO Alignment

- **MAESTRO Layers**: Data, Agents, Tools, Observability, Security.
- **Threats Considered**: Prompt injection, sensitive data persistence, workspace tampering.
- **Mitigations**: Source hygiene linting, PII redaction, deterministic validators and audit artifacts.

## Threat → Mitigation → Gate → Test

1. **Prompt injection from malicious pages**
   - **Mitigation**: Treat source text as untrusted; KB lines must not include instruction-like text unless quoted.
   - **Gate**: Workspace validator rejects KB bullet lines that contain prompt-injection patterns without quoting.
   - **Test**: Fixture source containing "IGNORE PREVIOUS" yields warning and validator failure if copied verbatim.

2. **Sensitive/copyright persistence**
   - **Mitigation**: Redact emails/phones; enforce excerpt length limits for KB summaries.
   - **Gate**: Redaction warnings recorded in `artifacts/kb_warnings.json` and citation coverage enforced.
   - **Test**: Fixture with email/phone triggers redaction and warning entry.

3. **Workspace tampering / inconsistent state**
   - **Mitigation**: Deterministic validator checks every KB bullet for Evidence ID and source reference.
   - **Gate**: CLI refuses to emit report when validator errors are present.
   - **Test**: Corrupt KB line missing `sources/` reference fails validation.

## Logging & Retention

- Source snapshots remain in `sources/` to support citation integrity.
- Deterministic artifacts exclude runtime timestamps; any `run_meta.json` is out of hash scope.
