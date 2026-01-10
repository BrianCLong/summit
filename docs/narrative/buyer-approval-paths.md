# Approval Paths by Persona

> **Thesis:** Different stakeholders have different fears. We win by specifically addressing the nightmare scenario of each approver.

To deploy Summit, we need consensus. This document outlines the specific value proposition and risk mitigation strategy for each key decision-maker.

---

## 1. The CISO (Chief Information Security Officer)

*   **Core Fear:** "Uncontrolled AI agents will leak data or open backdoors."
*   **The Win:** **Control Plane Visibility.**
*   **The Narrative:**
    > "Summit is not another black box. It is a containment vessel. It wraps your AI and automation in a Zero Trust layer that enforces policy *before* execution. If an agent tries to access PII without authorization, Summit kills the request, not the firewall."
*   **Key Artifact:** The **Provenance Ledger**. "I can show you exactly who did what, when, and why, cryptographically verified."

---

## 2. Legal / Risk Counsel

*   **Core Fear:** "We will be sued for an AI hallucination or a compliance breach we can't explain."
*   **The Win:** **Defensibility & Explanation.**
*   **The Narrative:**
    > "We are moving from 'Black Box' AI to 'Glass Box' operations. Summit records the chain of thought and the chain of custody. If a regulator asks 'Why did the system do this?', we have a pre-generated, immutable answer. We reduce liability by maximizing auditability."
*   **Key Artifact:** **Audit Without Theater**. "We don't create evidence. We *are* the evidence engine."

---

## 3. Compliance Officer (GRC)

*   **Core Fear:** "This new system will break my SOC 2 / ISO certification controls."
*   **The Win:** **Automated Evidence Collection.**
*   **The Narrative:**
    > "Summit doesn't break your controls; it automates them. Instead of chasing engineers for screenshots, Summit pushes compliance evidence directly to your GRC dashboard. It maps natively to SOC 2 CC6 (Monitoring) and CC8 (Change Management)."
*   **Key Artifact:** **Compliance Crosswalk**. "Here is how every Summit feature maps to a line item in your spreadsheet."

---

## 4. Platform / Infrastructure Lead

*   **Core Fear:** "This is 'one more thing' to manage that will destabilize my production cluster."
*   **The Win:** **Operational Stability & Guardrails.**
*   **The Narrative:**
    > "Summit is built to be a good citizen. It runs as a sidecar or a gateway. It has strict resource quotas, circuit breakers, and 'Sunset Mode' for immediate shutdown. It is designed to fail closed and fail safe. It protects your infra from runaway scripts."
*   **Key Artifact:** **System Classes**. "This isn't a script kiddie tool. It's a Governor class system designed for high-reliability environments."

---

## Signature-Risk Mitigation Mapping

| Persona | Risk | Mitigation |
| :--- | :--- | :--- |
| **CISO** | Data Exfiltration | Egress filtering, PII redaction hooks, Identity-Aware Proxy. |
| **Legal** | Liability/Explanation | Full provenance trace, "Human-in-the-loop" arbitration for high-stakes actions. |
| **Compliance** | Audit Failure | Immutable ledger, continuous drift detection, automated reporting. |
| **Platform** | Downtime/Instability | Resource quotas, circuit breakers, standard k8s deployment model. |

## Conclusion
We do not ask for "trust." We offer **verification**.
*   To CISO: "Verify the security."
*   To Legal: "Verify the reasoning."
*   To Platform: "Verify the stability."
