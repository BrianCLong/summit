# AI System Risk Assessment
**Template Version:** 1.0 (EU AI Act Aligned)
**Date:** 2025-10-27
**System Name:** Summit Narrative Engine & Copilot
**Owner:** Narrative Engine Team

## 1. System Classification (EU AI Act Article 6)

### A. Prohibited Practices (Article 5)
*Does the system deploy any of the following? (Must be NO)*
- [x] Subliminal techniques to distort behavior? (NO)
- [x] Exploitation of vulnerabilities (age, disability)? (NO)
- [x] Biometric categorization (race, religion)? (NO)
- [x] Social scoring? (NO)
- [x] Real-time remote biometric identification in public spaces? (NO)

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
- [x] Is this a foundation model trained on broad data at scale? (Yes, utilizes underlying LLMs)
- [x] Does it have systemic risk capabilities (high impact)? (Potential for information generation)

### D. Limited Risk (Transparency Only)
- [x] Chatbot / Conversational AI? (Yes, Copilot)
- [ ] Emotion recognition system?
- [x] Deep fake / Synthetic content generation? (Yes, Narrative Generation)

**Determined Classification:** **GPAI / LIMITED RISK**
*Rationale: Summit acts as an orchestration layer over GPAI models. Primary obligations are Transparency and Copyright compliance.*

## 2. Risk Management (Article 9)

### Intended Purpose
> Summit is an "Operating System for Scale" that uses AI to analyze data, generate narratives, and assist users in decision making. It is NOT intended for automated legal, medical, or life-critical decisions.

### Data Governance (Article 10)
- **Training Data:** No custom foundation models trained. Fine-tuning uses strictly opt-in tenant data.
- **Bias Mitigation:** System instructions explicitly warn against bias. Output validation layers in place.
- **Privacy:** All PII is masked before being sent to inference providers (OpenAI/Anthropic).

### Human Oversight (Article 14)
- **Measures:** All AI-generated actions require human approval via the `ReviewQueue` UI.
- **Intervention:** Users can edit or reject any generated narrative.

### Accuracy, Robustness & Cybersecurity (Article 15)
- **Metrics:** Continuous evaluation suite run in CI/CD.
- **Adversarial Testing:** Automated prompt injection testing (`tests/adversarial`).
- **Fail-safe:** Circuit breakers trip if error rates exceed 1%.

## 3. Transparency (Article 13)
- [x] Model Card Created? (See `docs/models/`)
- [x] Instructions for Use provided? (In User Guide)
- [x] Output explicitly marked as AI-generated? (UI badges "AI Generated")

## 4. Sign-off
**AI Safety Officer:** *Jules (Agent)*
**Product Owner:** *Summit Governance Board*
