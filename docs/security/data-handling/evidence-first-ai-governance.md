# Evidence-First AI Governance — Data Handling

## MAESTRO Alignment

- **MAESTRO Layers**: Foundation, Data, Agents, Tools, Observability, Security.
- **Threats Considered**: evidence tampering, PII leakage, privilege escalation, log injection.
- **Mitigations**: hash-chained ledger, deny-by-default redaction, role-bound export, structured JSON sanitation.

## Threat → Mitigation → Gate → Fixture

1. **Evidence tampering** → hash-chained event ledger → CI verifies chain integrity → fixture: mutate event, expect failure.
2. **PII leakage** → deny-by-default fields + redaction rules → CI policy regression tests → fixture: labeled PII fields.
3. **Privilege escalation** → role/identity required for export API (CLI local-only in MWS) → future API auth tests.
4. **Log injection** → structured JSON only; escape untrusted strings → unit tests for sanitizer.

## Evidence Pack Handling Rules

- Evidence packs are immutable once generated.
- Redaction rules are applied before bundle emission.
- No secrets or tokens in evidence packs.
- Deterministic output required for evidence manifests.

## Abuse-Case Fixtures (planned)

- `tests/governance/fixtures/tamper_event.json`.
- `tests/governance/fixtures/pii_payload.json`.
- `tests/governance/fixtures/log_injection.json`.
