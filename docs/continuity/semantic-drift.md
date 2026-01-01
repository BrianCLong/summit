# Drift Sentinel: Counter-Intelligence for Meaning

The Drift Sentinel is an automated system designed to detect and counteract semantic drift—the slow erosion of meaning, standards, and boundaries that can lead to institutional capture. It operates on the principle that by the time abuse is obvious, it is already normalized.

## 1. Monitored Drift Vectors

The Drift Sentinel continuously monitors the following vectors for signs of semantic drift:

| Drift Vector              | Description                                                                                                                             | Measurement Method                                                                                                                              |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **Claim Inflation**       | The tendency for the evidentiary standard required for a single analytical claim to decrease over time.                                   | **Evidence-to-Claim Ratio:** Tracks the average number and quality of evidence nodes backing each claim node in the graph. A declining ratio triggers an alert. |
| **Language Softening**    | The gradual replacement of precise, high-commitment language with softer, more ambiguous terminology in reports, UI elements, and internal documentation. | **Lexical Analysis:** Periodically scans key documents and UI text against a baseline lexicon of "strong" vs. "weak" terms (e.g., "verifies" vs. "suggests"). |
| **Boundary Erosion**      | An increase in the frequency of operations or data requests that approach or fall within the "Explicit Non-Purposes" defined in the Purpose Lock Charter. | **API and Query Auditing:** Analyzes API gateway logs and database queries for patterns that correlate with defined anti-patterns or non-purpose domains.          |
| **Increased Exception Rates** | A rising trend in the number of approved exceptions to core governance rules, security policies, or data handling protocols.           | **Exception Rate Monitoring:** Tracks the rate of policy overrides in the OPA/Rego engine and other governance checkpoints. A statistically significant increase is flagged. |

## 2. Baseline Doctrine Comparison

The Drift Sentinel's primary mechanism is the comparison of current system state and behavior against a set of version-controlled, cryptographically signed "baseline doctrine" documents. These include:

*   `docs/continuity/purpose-lock.md`
*   `docs/governance/CONSTITUTION.md`
*   `SAFETY_INVARIANTS.md`

Any change to these core documents is a high-gravity event. The Sentinel ensures that operational reality does not drift away from these documented principles, even when the documents themselves are static.

## 3. Alerting and Response Workflow

When a drift threshold is breached, the Sentinel initiates the following automated workflow:

1.  **Trend Alert:** A high-priority, non-dismissible alert is generated and sent to the on-call Custodian. The alert includes a detailed report on the detected drift, including trend analysis and supporting data.
2.  **Friction Trigger:** The system automatically engages pre-defined friction mechanisms, such as requiring additional approval layers for related actions (as defined in `anti-capture-incentives.md`).
3.  **Mandatory Justification:** The alert remains active until a formal justification is entered into the system. This justification must explain the cause of the drift and propose a remediation plan.
4.  **Custodian Review:** The justification is automatically added to the agenda for the next Custodianship Council review. The Council must formally accept or reject the justification.
