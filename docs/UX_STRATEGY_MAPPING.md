# Mapping the 8-Layer UX Doctrine to Summit's Product Strategy

This document applies the 8-layer UX doctrine directly to the Summit platform. It translates the abstract principles of each layer into concrete strategic decisions for Summit, an enterprise intelligence platform for high-stakes analysis.

## Summit's Core Product Strategy (Inferred)
*   **Target User:** Expert analysts and operators in critical environments.
*   **Core Value:** Provide trustworthy, auditable, and powerful graph analytics and AI-driven insights.
*   **Market Position:** A premium, "safe and correct" expert tool, not a flexible, mass-market sandbox.
*   **Strategic Pillars:** Trust, Clarity, Power, Auditability.

---

## Layer 1: Surface Excellence (Qwen)
*   **Application to Summit:** Summit's UI must feel professional, dense with information (but not cluttered), and immediately credible. It is not a "playful" or "lightweight" tool.
*   **Strategic Choice:** Prioritize data density, keyboard shortcuts, and clear information hierarchy over minimalist aesthetics. Use Material-UI's strengths for enterprise-grade components. The theme should be calm, professional, and focused.

## Layer 2: System Architecture (Gemini)
*   **Application to Summit:** The mental model must be consistent across the main `client/` UI, the `conductor-ui/` for ops, and the `cli/`. The user must feel they are interacting with one coherent system, regardless of the interface.
*   **Strategic Choice:** The GraphQL API is the central nervous system. All user-facing tools must reflect the same underlying data model and capabilities. Discrepancies between UIs are treated as P1 bugs.

## Layer 3: Human Failure Resistance (Red Team)
*   **Application to Summit:** In a "high-stakes environment," user error can have severe consequences. This is Summit's most critical UX layer.
*   **Strategic Choice:**
    *   **Destructive actions** (e.g., deleting a graph, merging nodes, running a powerful pipeline) MUST require explicit, multi-step confirmation that restates the consequences.
    *   **Ambiguous AI outputs** must be clearly labeled with confidence scores and links to the source data. The user must never mistake an AI-generated insight for a raw fact without clear signaling.
    *   **Default settings** for any analysis or orchestration job must be the safest, least-privileged option.

## Layer 4: Arbitration & Convergence (Arbiter)
*   **Application to Summit:** When conflicts arise, the Arbiter's heuristics are applied with a bias towards the Summit strategy.
*   **Strategic Choice:** The `priority_hierarchy` defined in `ux_governance.yml` is canon. For Summit, `Safety & Trust` will almost always override `Craft & Aesthetics`. A visually imperfect but safe UI is preferable to a beautiful but dangerous one.

## Layer 5: CI Enforcement (CI Enforcer)
*   **Application to Summit:** The `ux_governance.yml` file becomes a core part of Summit's definition of done.
*   **Strategic Choice:** The `make ga` ("Golden Path / GA Gate") command, which is already part of the repository's culture, will be extended to include the automated UX gates defined in `ux_governance.yml`. A PR that breaks a performance budget or introduces an accessibility violation will be blocked as surely as one that fails unit tests.

## Layer 6: Execution Orchestration (Orchestrator)
*   **Application to Summit:** This provides the end-to-end process for implementing significant UX changes in the Summit monorepo.
*   **Strategic Choice:** Any new epic-level feature (e.g., a new analysis module, a major change to the orchestration UI) must pass through the full 6-stage orchestration process. The output, a "Canonical UX Package," becomes a required artifact for the feature's approval.

## Layer 7: Continuous Learning (Intelligence)
*   **Application to Summit:** We need to know if analysts are actually using the powerful features we build, or if they are falling back to exporting data and using external tools.
*   **Strategic Choice:**
    *   **Instrument for workarounds:** Track behaviors like frequent data exports, copy-pasting large data blocks, or running the same simple query repeatedly. These are signals that the "powerful" features are failing.
    *   **Monitor "Time-to-Insight":** For key analysis workflows, measure the time from starting the workflow to reaching a terminal, insightful state. If this time increases, it triggers a UX review.

## Layer 8: UX as Strategy (Strategy)
*   **Application to Summit:** This layer defines Summit's competitive moat.
*   **Strategic Choice:**
    *   **Positioning:** Summit's UX will definitively position it as an "operational system" and an "expert tool." We will intentionally add friction to "sandbox" or exploratory workflows that could lead to un-auditable conclusions.
    *   **Pricing Power:** Enterprise-grade features like audit trails, role-based access control reflected in the UI, and detailed "why this happened" explanations for AI insights are what justify Summit's premium pricing. The UX must make this value proposition obvious.
    *   **Roadmap Governance:** A proposed feature like "anonymous, untracked analysis mode" would be rejected at the strategic level because it violates the core principle of auditability. The UX doctrine provides the framework for this rejection.
