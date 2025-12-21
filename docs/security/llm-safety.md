# LLM Safety for CompanyOS

## Threat Model
- Prompt injection attempts to access non-allowlisted tools.
- Data exfiltration by asking for raw retrieval of sensitive classes (PII, secrets, national-security data).
- Jailbreak prompts attempting to bypass safety guardrails.

## Defenses
- **Tool Permissioning:** Per-request allowlist in `tools/security/llm-safety/policy.yaml` with least-privilege scopes.
- **Input Filtering:** Secret/PII redaction via regex + classifier; hard block on known injection patterns defined in `tools/security/llm-safety/tests/injections.txt`.
- **Output Filtering:** No raw retrieval for sensitive classes; enforce response wrapping with citations for any internal data source.
- **Provenance:** Every response must include citations and decision log stored in `tools/security/llm-safety/logs/`.

## Testing
- Regression suite in `tools/security/llm-safety/test_llm_safety.py` executes injection and exfil attempts; expected to block and emit alerts.
- Violations generate audit events and can be paged via existing alerting.

## ADR
- The system must never execute shell/file-system tools without explicit allowlist; model is sandboxed without network egress.
- See `docs/security/llm-safety-adr.md` for boundaries and non-goals.
