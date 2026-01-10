# Summit Trust System Map

**Purpose:** This map unifies all trust-related domains (Security, Privacy, Reliability, Governance) into a single verifiable system. It serves as the primary navigation aid for auditors, operators, and customers.

## 1. Scope of Guarantee ("What is GA?")

We define "General Availability" (GA) not as "finished" but as "certified for production with known constraints."

*   **Definition:** [GA Criteria](../ga/GA_CRITERIA.md) & [GA Readiness Assertion](../SUMMIT_READINESS_ASSERTION.md)
*   **Boundaries:** [Non-Capabilities](../ga/NON-CAPABILITIES.md) (Explicitly excluded features)
*   **Verification:** `grep "READY" docs/SUMMIT_READINESS_ASSERTION.md`

## 2. Evidence & Verification ("What is verified?")

We prove our claims through automated evidence collection and immutable ledgers.

*   **Assurance Contract:** [Public Assurance Memo](../assurance/PUBLIC_ASSURANCE_MEMO.md)
*   **Evidence Bundle:** [GA Control Evidence](../ga/GA_CONTROL_EVIDENCE_BUNDLE.md) (or `docs/ga/claims-vs-evidence.md`)
*   **Verification:** `npm run verify:compliance` (See `package.json` for implementation)

## 3. Reliability & Regressions ("How we prevent regressions")

We use strict error budgets and performance invariants to prevent slide.

*   **SLOs:** [Service Level Objectives](../performance/SLOS.md)
*   **Alerting:** [SLI/SLO Alerts](../ops/SLI_SLO_ALERTS.md)
*   **Verification:** `npm run verify:runtime` or check `docs/ops/RELEASE_READINESS_REPORT.md`

## 4. Incident Response ("How we handle incidents")

When guarantees fail, we follow deterministic runbooks.

*   **Protocol:** [Incident Response](../ops/INCIDENT_RESPONSE.md)
*   **Severity:** [Incident Severity Matrix](../ops/INCIDENT_SEVERITY.md)
*   **Verification:** Check `docs/ops/runbooks/` for latest drills.

## 5. Data & Secrets Governance ("How we handle data")

Data is an asset; secrets are toxic waste. We manage both with strict lifecycle policies.

*   **Data Governance:** [Data Governance Policy](../ops/data-governance.md)
*   **Secrets:** [Secrets & Key Management](../security/SECRETS_AND_KEY_MANAGEMENT_STANDARD.md)
*   **Privacy:** [Fairness & Privacy](../risk/fairness-and-privacy.md)
*   **Verification:** `npm run security:check` (simulated scan)

## 6. Observability ("How we observe safely")

We observe the system without violating user privacy or exfiltrating secrets.

*   **Standard:** [Observability Standard](../observability/OBSERVABILITY_STANDARD.md)
*   **Signals:** [Golden Signals](../ops/OBSERVABILITY_SIGNALS.md)
*   **Verification:** Check `docs/observability/OBSERVABILITY_AUDIT.md`

## 7. Ecosystem & Extensions ("How we extend safely")

Extensions operate in a sandbox with strictly defined capabilities.

*   **Governance:** [Plugin Governance](../plugins/PLUGIN_CONTRACT.md)
*   **Boundaries:** [Trust Boundaries](../ga/TRUST_BOUNDARIES.md)

## 8. Support & Adoption ("How we support users")

We define clear boundaries for support to maintain our engineering velocity.

*   **Support Model:** [Support Plan](../support/SUPPORT_PLAN.md)
*   **Tiers:** [Support Tiers](../support/SUPPORT_TIERS.yaml)

## 9. Risk Management ("How risks expire")

Risks are not ignored; they are logged, tracked, and given an expiration date.

*   **Ledger:** [Risk Ledger](../risk/RISK_LEDGER.md)
*   **Sunset Policy:** [Sunset Policy](../risk/vendor-dependency-governance.md)

---

**Primary Verification Entry Point:**
See [Trust System Verification](./README.md) for the "single command" verification suite.
