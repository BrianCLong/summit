# Moltbook-Class Agentic Platforms: Data Handling & Security Gates

## Scope
Fixtures-only evaluation pack for agentic-platform security and provenance gates.
All outputs are deterministic and must exclude timestamps from `report.json` and
`metrics.json`.

## Threat-Informed Requirements (Threat → Mitigation → Gate → Test)

1. **Secrets exposed client-side (API keys in source)**
   - **Mitigation**: Static scan rules for key patterns + public bundle boundary checks.
   - **Gate**: `agentic_platform_secrets_gate` (defer to CI gate registry).
   - **Test**: Fixture embedding key-like strings must fail with allowlist controls.

2. **Unauthenticated write/tamper paths (edit/manipulate posts)**
   - **Mitigation**: Policy rule requiring auth evidence + provenance evidence for write actions.
   - **Gate**: Policy regression suite with deny-by-default semantics.
   - **Test**: Fixture endpoint missing auth evidence must fail.

3. **Sensitive data exposure (emails, DMs)**
   - **Mitigation**: PII field detector + never-log list enforcement.
   - **Gate**: Unit tests + log-scrub tests for fixtures.
   - **Test**: Fixture dataset containing `email` or `dm_body` must be flagged.

4. **Provenance ambiguity (human posing as agent)**
   - **Mitigation**: Provenance rubric requiring explicit signals; no attribution claims.
   - **Gate**: Report must include `provenance.status` as `unknown|attested|verified`.
   - **Test**: Fixture asserting "AI-only" with no provenance signals must fail.

## Data Classification
| Class | Definition | Handling |
| --- | --- | --- |
| `public_claims` | Public claims or paraphrased excerpts | May appear in docs/report. |
| `synthetic_pii` | Generated email/DM placeholders | Must never be logged. |
| `synthetic_secrets` | Mock tokens or API keys | Must never be logged. |
| `synthetic_messages` | Non-sensitive fixture content | May appear in report with redaction. |

## Never-Log List
- Emails or email-like patterns.
- Bearer tokens or API-key-like strings.
- Any `dm`/`dm_body` field content.

## Retention
- Fixtures only; synthetic data exclusively.
- Evidence artifacts committed to repo must remain synthetic and redacted.

## MAESTRO Threat Modeling Alignment
- **MAESTRO Layers**: Data, Tools, Observability, Security.
- **Threats Considered**: Prompt injection into evaluation fixtures, spoofed provenance,
  secrets exfiltration via logs, unauthenticated write paths.
- **Mitigations**: Deterministic fixture parsing, deny-by-default policy gates, never-log
  enforcement, artifact validation in CI.

## Reference Authority
See `docs/SUMMIT_READINESS_ASSERTION.md` and `docs/security/threat-modeling-framework.md`.
