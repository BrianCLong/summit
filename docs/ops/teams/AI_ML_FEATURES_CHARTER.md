# Charter: AI/ML Features Team

**Owner:** `ai-ml-features-team`
**Escalation:** `head-of-ai`

## 1. Mission

To develop and integrate innovative, reliable, and ethical AI- and ML-driven capabilities into the Summit platform. This team is accountable for the end-to-end lifecycle of AI/ML features, from research and model development to production deployment and performance monitoring.

## 2. Owned Surfaces

This team has primary ownership of the following repository paths and artifacts:

- **/ai/** and **/ml/**: All core AI/ML models, services, and pipelines.
- **/server/ai/**: The integration point for AI/ML features into the main server.
- **/workers/graph_ai/**: The workers responsible for executing graph-based AI tasks.
- **AI/ML-specific GA artifacts** under `docs/ga/ai-ml/`.
- **Model cards and datasheets** for all production models.

## 3. Required Artifacts

The AI/ML Features Team is required to produce and maintain the following artifacts as part of the GA process:

- **AI/ML Model Evidence:** A comprehensive bundle of evidence for each model, including its training data, performance metrics, bias assessments, and explainability reports.
- **Performance Baselines:** Verifiable performance baselines for all AI/ML features, including latency, throughput, and resource consumption.
- **Model Cards:** Detailed documentation for each model, outlining its intended use, limitations, and ethical considerations.

## 4. GA Responsibilities

For an AI/ML feature to be considered "done" and ready for a GA release, the AI/ML Features Team must:

- **Meet all GA criteria** for model performance, reliability, and ethical guidelines.
- **Produce a complete AI/ML Model Evidence bundle** for each new or updated model.
- **Address all P0/P1 bugs** and performance regressions related to their owned features.
- **Secure sign-off** from the Security & Trust team for any models that handle sensitive data.
- **Provide a formal attestation** of readiness for the Go/No-Go packet.

## 5. Guardrails (What This Team May NOT Change Unilaterally)

The AI/ML Features Team must not:

- **Deploy any model to production** without a complete Model Evidence bundle and a formal risk assessment.
- **Modify core platform or product services** without a compatibility contract and sign-off from the owning team.
- **Make public claims about model capabilities** that are not substantiated by the evidence in the Model Evidence bundle.

## 6. Escalation Path

- For technical conflicts with other teams, escalate to the **Release Captain**.
- For disagreements regarding model performance or ethical considerations, escalate to the **Head of AI**.
- For security or privacy concerns, escalate to the **Security & Trust Team Lead**.
All escalations must be documented in the [Decision Log](../DECISION_LOG.md).
