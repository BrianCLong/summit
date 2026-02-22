# Standard: CogWar Adaptive Influence Systems (2026)

## 1. Overview
This standard defines the defensive capabilities for detecting, measuring, and correlating adaptive influence campaigns targeting cognitive infrastructure.

## 2. Core Concepts
- **Campaign Object:** A normalized entity representing a suspected influence operation across channels and domains.
- **Evidence Bundle:** Immutable pointers + derived features with stable Evidence IDs.
- **Cognitive Infrastructure:** The target system variables—attention, trust, cohesion—that campaigns aim to distort.

## 3. Evidence ID Format
Evidence IDs must follow the format:
`EVD:CW26:<detector>:<fixture-or-run-id>:<8charhash>`

Example: `EVD:CW26:adaptivity:run-123:abc12345`

## 4. Determinism
All outputs must be deterministic. Timestamps in `stamp.json` must be derived from the commit SHA or run context, not wall-clock time, to ensure reproducibility.

## 5. Metrics
- **Adaptivity Score:** Measures the rate of narrative pivoting (A/B testing).
- **Swarm Coordination Score:** Measures timing and identity persistence across accounts.
- **Attention Load:** Proxy for cognitive overwhelm.
- **Trust Shock:** Proxy for institutional degradation.

## 6. Compliance
- **Deny-by-default:** No action without explicit authorization.
- **No PII:** Usernames and message bodies are redacted or hashed unless strictly required and authorized.
