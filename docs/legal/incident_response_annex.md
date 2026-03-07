# Incident Response Legal Annex

**Purpose:** This annex provides the legal protocols to be activated alongside the technical Incident Response Plan (IRP). It ensures privilege preservation, compliance with notification laws, and liability mitigation.

## 1. Privilege Protocol (Attorney-Client Privilege)

To protect the investigation under Attorney-Client Privilege:

1.  **Immediate Activation:** Legal Counsel must be involved immediately upon declaration of a SEV-1 or SEV-2 security incident.
2.  **Direction:** The investigation must be directed by Legal Counsel for the purpose of providing legal advice regarding liability and obligations.
3.  **Communication Headers:** All written communications (Slack, Email, Docs) must be marked:
    > **PRIVILEGED AND CONFIDENTIAL // ATTORNEY-CLIENT COMMUNICATION // ATTORNEY WORK PRODUCT**
4.  **External Experts:** Forensics firms must be engaged _by Outside Counsel_, not directly by the IT/Security team, to extend privilege.

## 2. Notification Decision Tree

**Key Question:** Does this incident trigger a legal or contractual notification obligation?

### Step A: Determine Data Impact

- Was **Personal Data (PII/PHI)** compromised? (Yes/No)
- Was **Customer Confidential Information** compromised? (Yes/No)
- Was **Intellectual Property** compromised? (Yes/No)

### Step B: Regulatory Thresholds (examples)

- **GDPR (EU):** Notification to DPA within **72 hours** if "risk to rights and freedoms". Notification to subjects if "high risk".
- **CCPA/CPRA (California):** Notification to individuals/AG for unencrypted PII exfiltration.
- **SEC (Public Co):** Materiality determination within **4 business days** (Form 8-K).

### Step C: Contractual Obligations

- Review MSA/DPA for affected customers.
- Standard Term: Notify within **24-48-72 hours** of _confirmed_ breach.
- **Action:** Compile list of affected customers and specific deadlines.

## 3. Communication Templates

### A. Internal Holding Statement (Privileged)

> "We are investigating a potential anomaly in [System]. Legal Counsel has directed this investigation to assess legal obligations. Please direct all inquiries to [Legal Lead] and do not discuss speculation on public channels. Label all work 'PRIVILEGED AND CONFIDENTIAL'."

### B. Initial Customer Notification (Generic Placeholder)

> "We have become aware of a security incident affecting [Product/Service]. Our security team has secured the environment and is conducting a thorough investigation. At this time, we [have/have not] confirmed impact to your data. We will provide a detailed update within [Timeframe] or as soon as specific information is available."

### C. Regulatory Notification (Skeleton)

> "Pursuant to [Article 33 GDPR / Section XXX], [Company] notifies the [Authority] of a data breach detected on [Date].
>
> - **Nature of breach:** [Description]
> - **Categories of data:** [Types]
> - **Number of subjects:** [Estimate]
> - **Consequences:** [Potential impact]
> - **Measures taken:** [Mitigation steps]
> - **Contact:** DPO @ [Email]"

## 4. Evidence Preservation (Legal Hold)

- **Trigger:** Immediate upon anticipation of litigation or regulatory action.
- **Scope:** Logs, Slack history, emails, code commits, cloud trail.
- **Action:** IT to suspend auto-deletion policies for:
  - Affected systems.
  - Accounts of involved employees.
  - Security team comms channels.

## 5. Decision Authority

- **Notification Decision:** General Counsel + CEO.
- **Public Statement:** CEO + Comms + Legal.
- **Law Enforcement Contact:** General Counsel.
