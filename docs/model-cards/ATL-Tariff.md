# ATL (Adaptive Tariff Learner) — Model Card

**Model Name:** Adaptive Tariff Learner (ATL)  
**Version:** v0.1  
**Purpose:** Predict risk scores for incoming payloads (formatSig, timingSig, xformSig) to derive friction parameters (rateLimit, throttleMs, proofLevel).

---

## Data

- **Training Data:** AFL store signatures with outcome labels (accepted, disputed, retracted)
- **Features:** formatSig tokenization, timing bins, xformSig category, prior tariff score
- **Labels:** target tariff score or friction parameters

---

## Evaluation

- **Metrics:** Accuracy of predicted tariff vs actual needed friction, ROC AUC for classification thresholds
- **Baseline:** static tariff function

---

## Use & Risks

- **Use as advisory or autopilot** (with fallback)
- **Risk of adversarial mimicry** — monitor feedback loops and detect overfitting

---

## Governance & Auditing

- Model weight snapshots under version control
- Drift detection alerts when predicted scores deviate from actual outcome
- Model card published with each version
