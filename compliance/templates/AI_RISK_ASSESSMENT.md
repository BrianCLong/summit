# AI System Risk Assessment
**Template Version:** 1.0 (EU AI Act Aligned)
**Date:** [YYYY-MM-DD]
**System Name:** [Name]
**Owner:** [Team/Owner]

## 1. System Classification (EU AI Act Article 6)

### A. Prohibited Practices (Article 5)
*Does the system deploy any of the following? (Must be NO)*
- [ ] Subliminal techniques to distort behavior?
- [ ] Exploitation of vulnerabilities (age, disability)?
- [ ] Biometric categorization (race, religion)?
- [ ] Social scoring?
- [ ] Real-time remote biometric identification in public spaces?

### B. High-Risk Classification (Annex III)
*Does the system fall into these categories?*
- [ ] Biometric identification
- [ ] Critical infrastructure (safety components)
- [ ] Education & Vocational training (access/evaluation)
- [ ] Employment (recruitment/management)
- [ ] Essential private/public services (credit, insurance, benefits)
- [ ] Law enforcement
- [ ] Migration/Asylum/Border control
- [ ] Administration of justice

### C. General Purpose AI (GPAI)
- [ ] Is this a foundation model trained on broad data at scale?
- [ ] Does it have systemic risk capabilities (high impact)?

### D. Limited Risk (Transparency Only)
- [ ] Chatbot / Conversational AI?
- [ ] Emotion recognition system?
- [ ] Deep fake / Synthetic content generation?

**Determined Classification:** [ PROHIBITED | HIGH RISK | GPAI | LIMITED | MINIMAL ]

## 2. Risk Management (Article 9)

### Intended Purpose
> Describe the intended purpose clearly.

### Data Governance (Article 10)
- **Training Data:** [Source / Lineage]
- **Bias Mitigation:** [Techniques used]
- **Privacy:** [PII handling / Masking]

### Human Oversight (Article 14)
- **Measures:** [Review queues / Stop buttons / "Human in the Loop"]
- **Intervention:** [Can a human override the system?]

### Accuracy, Robustness & Cybersecurity (Article 15)
- **Metrics:** [Accuracy scores / Error rates]
- **Adversarial Testing:** [Red teaming results]
- **Fail-safe:** [Fallback mechanisms]

## 3. Transparency (Article 13)
- [ ] Model Card Created?
- [ ] Instructions for Use provided?
- [ ] Output explicitly marked as AI-generated?

## 4. Sign-off
**AI Safety Officer:** ____________________
**Product Owner:** ____________________
