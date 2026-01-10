# ADR: NHI & Cryptographic Asset Governance for Agentic AI

## Context

Agentic AI workflows introduce a proliferation of non-human identities (NHIs) such as API keys, bot users, CI runners, and workload identities. These identities frequently accumulate long-lived credentials and cryptographic material with insufficient observability. Aligning with World Economic Forum guidance, US OMB M-23-02, and NIST PQC standards, Summit needs first-class inventory, policy, and audit coverage for NHIs and crypto assets.

## Decision

Implement a graph-first governance layer that models NHIs, credentials, and crypto assets; runs discovery locally and in CI; evaluates policy-as-code for least privilege and crypto hygiene; and logs agent executions with scoped, time-bound identities.

## Data Model

- **NHI**: service account, API key, OAuth app, workload identity, bot user, agent identity, CI/CD identity.
- **Credential**: token, secret, certificate, private key, KMS key reference, SSH key, signing key, session, refresh token. Tracks issuance, expiry, rotation interval, owner, secret source.
- **Crypto Asset**: certificate, private key, KMS/HSM key, encryption config, TLS endpoint, signing pipeline. Tracks algorithm, expiry, boundary, PQC plan.
- **Bindings**: NHI → permissions; credential → bound identity; crypto asset → boundary + algorithm. Provenance records discovery source, timestamps, evidence, and confidence.

## Architecture

1. **Discovery**
   - Repository scanner detects inline secrets, tokens, and certificates and emits normalized credentials with provenance.
   - Cloud connector interface supports service accounts, KMS keys, and tokens; a mock adapter demonstrates contract shape.
   - Inventory is merged into a graph stored under `tmp/nhi-inventory.json`.
2. **Policy Evaluation**
   - Rules flag long-lived credentials, expired/inline secrets, wildcard/admin permissions, legacy or expiring crypto, and missing PQC plans.
   - Reports are written to `tmp/nhi-policy-report.json` and fail CI on high severity issues.
3. **Agent Guardrails**
   - Example graph seeds scoped agent identities with session-limited credentials; audit trail is appended to `tmp/nhi-audit.log` whenever discovery runs.
4. **PQC Readiness**
   - Policy hooks mark RSA-2048, SHA-1, or AES-128 assets as legacy and require ML-KEM/ML-DSA migration plans before acceptance.

## Consequences

- Local and CI runs gain immediate visibility into NHIs and crypto material within the repository and connected providers.
- Build pipelines can block on leaked secrets, over-permissioned NHIs, or crypto debt.
- PQC migration is tracked as metadata-first, enabling future enforcement without changing crypto primitives today.

## Follow-ons

- Add real cloud adapters (AWS/GCP/Azure), GitHub Actions identity enumeration, and certificate transparency ingestion.
- Wire policy results into the central policy engine and dashboards.
- Extend agent runtime to request just-in-time credentials from a vault-backed issuer and emit signed audit events.
