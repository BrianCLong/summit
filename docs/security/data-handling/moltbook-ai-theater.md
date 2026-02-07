# Moltbook-Class Agentic Platforms: Data Handling & Security Gates

## MAESTRO Security Alignment
- **MAESTRO Layers**: Foundation, Data, Agents, Tools, Observability, Security.
- **Threats Considered**: secrets exposure, unauthenticated writes, PII leakage, provenance ambiguity, prompt injection, tool abuse.
- **Mitigations**: deny-by-default policy gates, static secret scans, PII detectors, provenance-signal requirements, deterministic evidence artifacts.

## Threat → Mitigation → Gate → Test

1. **Threat:** Secrets exposed client-side (API keys in source).
   **Mitigation:** static scan rules for key patterns + public-bundle boundary checks.
   **Gate:** `agentic_platform_secrets_gate` (policy gate).
   **Test:** fixture with embedded key strings must fail; allowlist for false positives.

2. **Threat:** Unauthenticated write/tamper paths.
   **Mitigation:** policy rule: “write requires auth evidence + provenance evidence.”
   **Gate:** policy regression suite.
   **Test:** fixture endpoint missing auth must fail.

3. **Threat:** Sensitive data exposure (emails, DMs).
   **Mitigation:** PII field detector + never-log enforcement.
   **Gate:** unit tests + log-scrub tests.
   **Test:** fixture dataset containing `email`, `dm_body` must be flagged.

4. **Threat:** Provenance ambiguity (human posing as agent).
   **Mitigation:** provenance signals required; status field `unknown|attested|verified`.
   **Gate:** evaluation report must fail when AI-only claims lack provenance signals.
   **Test:** fixture with “AI-only claim” and no provenance signals fails.

## Data Classification
* `public_claims`
* `synthetic_pii`
* `synthetic_secrets`
* `synthetic_messages`

## Never-Log List
* Email addresses
* Bearer tokens
* API keys
* `dm` bodies or private-message payloads

## Retention & Handling
* Fixtures only; synthetic data only.
* Artifacts stored under `artifacts/<slug>/` with deterministic JSON (no timestamps).
* Any regulatory logic must remain policy-as-code; no inline compliance logic.
