# Maestro "Why?" Panel

**Priority:** P1
**Labels:** `analyst-experience`, `assistants`, `product`, `ui-ux`, `governance`, `explainability`

## Desired Outcome

Provide a dedicated "Why this decision?" panel for explanations and evidence in Analyst Assist v0.2.

## Description

To build trust and provide clear visibility into AI decisions, we need a "Why?" panel. This panel should list key policy checks, thresholds that were hit or missed, and the specific evidence items that drove the decision. Crucially, the evidence items should link back to the corresponding IntelGraph nodes. The panel must support two distinct views: one for analysts and one for governance/audit purposes.

## Acceptance Criteria

- [ ] A dedicated "Why this decision?" panel is accessible from the decision strip.
- [ ] Lists key policy checks evaluated for the decision.
- [ ] Displays thresholds that were hit or missed.
- [ ] Lists specific evidence items driving the decision, including clickable links back to IntelGraph nodes.
- [ ] Supports an **Analyst View**: Provides a short, human-language explanation and highlights key factors.
- [ ] Supports a **Governance View**: Provides structured details for audit trails, including:
  - Policy ID
  - Model version
  - Risk score
  - Applied guardrails
