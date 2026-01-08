# Anti-Capture Incentive Design: A Capture Risk Map

This document outlines the structural mechanisms designed to resist system capture by well-intentioned insiders. Capture is not treated as a malicious act, but as a predictable outcome of misaligned incentives.

## 1. Incentive Vectors (How Capture Begins)

The system is designed to identify and counter the following incentive pressures:

| Incentive Vector                   | Description                                                                                                                                   | Example Anti-Capture Mechanism                                                                                                                                                                 |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Monetization Pressure**          | The drive to generate revenue leads to the weakening of evidence standards or the introduction of biased analytical models.                   | **Provenance-Gated Monetization:** Features that require a lower standard of evidence cannot be monetized. All revenue streams are audited for their impact on evidence quality.               |
| **Velocity Mandates**              | Pressure to deliver features or results quickly leads to the bypassing of critical governance, safety, and review checkpoints.                | **Governance-as-Code:** The core governance logic is embedded in the CI/CD pipeline. Bypassing it requires an explicit, audited, and time-bound exception approved by a quorum of custodians.  |
| **External Influence**             | Pressure from investors, partners, or regulators to alter, suppress, or amplify certain findings in a way that distorts truth-handling.       | **Immutable Reporting:** All generated reports are cryptographically signed and stored in an immutable ledger. Any modification creates a new, distinct version, preserving the original.      |
| **User Experience Simplification** | The desire to simplify the user experience leads to the abstraction or hiding of crucial details about evidence, provenance, and uncertainty. | **Explainability First:** The UI/UX is mandated to always expose the lineage and confidence of a claim. Simplification cannot come at the cost of transparency.                                |
| **Mission Creep**                  | The natural tendency for a system's scope to expand beyond its original, stated purpose into domains it was not designed to handle.           | **Purpose Lock Integration:** The system's core "Purpose Lock" is an executable artifact. Feature flags for new capabilities are checked against the `purpose-lock.md` definitions at runtime. |

## 2. Drift Indicators (Early Warning Signals)

The system continuously monitors for the following indicators of semantic and institutional drift:

- **Increased Exception Rate:** A rising trend in the number of governance exceptions being requested or granted.
- **Language Softening:** Audits of internal and external communications for changes in terminology (e.g., from "verifiable evidence" to "supporting data").
- **Boundary Erosion:** An increase in the number of API calls or feature requests that fall into the "Explicit Non-Purposes" defined in the Purpose Lock Charter.
- **Claim Inflation:** A measurable decrease in the average amount of evidence backing a single analytical claim.

## 3. Automatic Friction Triggers (Structural Responses)

When drift indicators exceed a predefined threshold, the system automatically introduces friction:

- **Mandatory Justification:** A "justification window" is triggered, requiring a formal, written explanation for the drift, which is then reviewed by the Custodianship Council.
- **Temporary Constraint Tightening:** Similar to the Authority Transition Protocol, certain high-risk actions are temporarily disabled or require a higher level of authorization.
- **Circuit Breakers:** For severe drift, automated circuit breakers can halt specific system functions (e.g., new data ingestion, report generation) pending a full review.
