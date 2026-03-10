# Autonomous Product Surfaces (APS) Data Handling

## Classifications

*   **Public:** template IDs, widget types, generated schema versions
*   **Internal:** graph snapshot IDs, metrics summaries, performance counters
*   **Sensitive:** Figma links, private design metadata, user-behavior traces, access tokens
*   **Restricted:** auth/session material, secrets, raw PII

## Never Log

*   Figma access material
*   private frame URLs
*   auth headers
*   user search terms if classified sensitive
*   raw identifiers that can re-identify users
*   hidden design comments / notes unless explicitly approved

## Retention Policies

*   **Raw telemetry:** shortest approved retention only, default 30 days
*   **Aggregate metrics:** 90 days
*   **Generated artifacts for CI:** 7 days
*   **PR evidence bundle:** tied to PR retention policy

## Threats & Mitigations

| Threat | Mitigation | CI/Runtime Gate | Test Case |
|---|---|---|---|
| Malicious MCP payload | strict schema validation, URL allowlist, no shell interpolation | Semgrep rule + type/schema validation + dependency review | `tests/security/aps_mcp_payload_rejection.spec.ts` |
| Design-text prompt injection | strip executable directives, preserve only structured design metadata | sanitizer unit tests | abuse-case fixtures with hostile layer names |
| Telemetry privacy leakage | never log tokens, raw secrets, private URLs, or PII | redaction tests + log-scrape CI | |
| Unsafe generated code | codegen only from approved widget registry; forbid dynamic eval and arbitrary imports | forbidden AST patterns, import allowlist, CodeQL | `aps_codegen_forbidden_imports.spec.ts` |
| Auto-PR spam / unsafe churn | draft PR only, rate limits, reviewer ownership, improvement-class allowlist | workflow policy check | `aps_autopr_policy.spec.ts` |
| Host-shell breakout in microfrontend | strict contract boundary, no direct access to privileged APIs, CSP | integration contract tests + CSP tests | `aps_microfrontend_isolation.spec.ts` |
