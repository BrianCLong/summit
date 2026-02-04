# OpenCode Zero-to-Titan Intake Standard

## Readiness Assertion

This intake is governed by the Summit Readiness Assertion and inherits its absolute readiness requirements for evidence, determinism, and auditability.

## Scope

This standard captures defensible signals from the publicly visible excerpt of the ITEM and binds them to Summit’s governance posture. Full-text analysis is **Deferred pending full-text access** to the member-only article body.

## Ground Truth Capture (verbatim-ish)

- **ITEM:CLAIM-01** — Copplestone tweet: OpenCode reached “>80K stars on github… in 8 months.”
- **ITEM:CLAIM-02** — The excerpt notes high tweet views and a positive reception (“nodding along, not arguing”).
- **EXT:CLAIM-03** — Anthropic blocked OpenCode from accessing private Claude Code endpoints, not the paid API.
- **EXT:CLAIM-04** — OAuth subscription usage for Claude violates terms and can trigger bans; API keys and token billing are recommended.
- **SUMMIT:FACT-01** — Summit’s platform posture: privacy-preserving telemetry and default-deny access control.

## Summit-Fit Summary

OpenCode’s rapid adoption signals that developer preference portability can drive sudden growth and that provider integrations built on non-public surfaces can collapse without notice. Summit absorbs the portability benefit while enforcing governance: provider-neutral abstractions, deny-by-default policy gates, and explicit bans on private endpoints or OAuth bypass flows.

## Claim Registry (Planned Elements → Claims)

| Planned Element                                                     | Claims                        |
| ------------------------------------------------------------------- | ----------------------------- |
| Provider-agnostic LLM interface + registry                          | ITEM:CLAIM-01, SUMMIT:FACT-01 |
| “No private endpoints / no OAuth bypass” enforcement policy + tests | EXT:CLAIM-03, EXT:CLAIM-04    |
| Configurable allowlist of provider base URLs + deny-by-default      | SUMMIT:FACT-01                |
| Drift detector CI job to prevent forbidden endpoint patterns        | EXT:CLAIM-03, EXT:CLAIM-04    |
| Documentation: data handling / retention / never-log for LLM calls  | SUMMIT:FACT-01                |
| Positioning: “governed, auditable, vendor-neutral AI backplane”     | ITEM:CLAIM-01                 |

## Interop & Standards Mapping

### Import/Export Matrix

- **Imports**: Provider credentials (API keys), provider base URLs, model IDs, per-provider rate limits.
- **Exports**: Structured `LLMCallRecord` (redacted), policy reports, drift reports, aggregated cost metrics.

### Non-goals

- No interactive CLI agent parity with OpenCode.
- No OAuth-subscription automation for LLM providers.
- No reverse-engineering of private endpoints.

## Threat-Informed Requirements

- **Threat**: Reliance on private endpoints leads to sudden provider blocks.
  - **Mitigation**: Allowlist-only base URLs; forbid private endpoint patterns.
  - **Gate**: Policy CI check.
  - **Test**: Blocked URL must fail.
- **Threat**: OAuth subscription usage triggers bans or access loss.
  - **Mitigation**: Ban OAuth/subscription auth modes; API-key only.
  - **Gate**: Config schema rejects `auth_mode: oauth`.
  - **Test**: Config parse test rejects OAuth mode.
- **Threat**: Sensitive prompt/data leakage.
  - **Mitigation**: Redaction layer + “never-log” enforcement.
  - **Gate**: Logger call lint/test cannot accept raw prompt fields.
  - **Test**: Policy fixture containing PII is redacted in `LLMCallRecord`.

## MAESTRO Security Alignment

- **MAESTRO Layers**: Foundation, Data, Agents, Tools, Observability, Security.
- **Threats Considered**: Provider endpoint abuse, OAuth misuse, prompt exfiltration, policy regression, drift reintroduction.
- **Mitigations**: Deny-by-default allowlist, explicit forbidden patterns, API-key-only auth, deterministic evidence bundles, drift scans in CI.

## Minimal Winning Slice (MWS)

**Statement**: Summit can switch between supported LLM providers via config while automatically rejecting private-endpoint/OAuth-bypass patterns, with CI proving the policy holds.

**Acceptance Tests**

1. Provider registry loads a provider by name; missing provider fails closed.
2. Policy test rejects URLs matching forbidden patterns.
3. Drift test fails CI when forbidden endpoint strings appear.
4. Outputs include stable `evidence_id` and no timestamps in committed artifacts.

## Evidence Artifacts (Deterministic)

- `artifacts/llm_provider_policy/report.json`
- `artifacts/llm_provider_policy/metrics.json`
- `artifacts/llm_provider_policy/stamp.json` (git SHA + `evidence_id` only)

## Roll-Forward Plan

- Providers remain disabled until configured.
- Enable per environment via config plus secret presence gates.

## Positioning Constraints

**Allowed claims after MWS**

- Vendor-neutral LLM provider abstraction with deny-by-default governance.
- CI-enforced policy preventing private endpoint / non-compliant auth regressions.
- Auditable evidence bundles for provider governance.

**Not yet claimable**

- Drop-in OpenCode alternative.
- Guaranteed ToS compliance across all providers.

## Operational Readiness (Embedded)

- **Outage response**: Fail closed with actionable error + escalation path.
- **Rate limit storm**: Switch provider or reduce concurrency via config.
- **Credential rotation failure**: Disable provider until API keys revalidated.
- **Policy regression**: Drift detector and policy tests block merge.

## Data Handling (Embedded)

- **Classification**: Prompts and outputs are sensitive by default.
- **Retention**: Store only redacted summaries + token counts.
- **Never-log**: Secrets, raw prompts, raw outputs, user identifiers.
- **Deterministic IDs**: Hash-based stable IDs; no timestamps.
