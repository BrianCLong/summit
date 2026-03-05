# Strategy Memo: Defense-Adjacent AI Policy and Summit's Positioning

**Date:** 2026-02-27
**Context:** The evolving landscape of AI governance, specifically the recent cross-company labor movement at Google and OpenAI regarding military AI use, presents significant strategic implications for Summit.

## Executive Summary

The recent pushback from over 200 employees at Google and OpenAI against unrestricted military use of AI (specifically autonomous weapons and domestic surveillance) highlights a critical shift: AI governance is transitioning from executive policy to a workforce and public relations issue.

This memo maps the scenarios and strategic impacts for Summit, an agentic AI OSINT platform with defense-adjacent capabilities (intelligence gathering, knowledge graphs, and multi-agent orchestration).

## 1. The Strategic Landscape

### The Catalyst

* **Employee Activism:** A unified stance across competing labs (Google, OpenAI) demanding Anthropic-style ethical limits.

* **Pentagon Pressure:** The U.S. government is actively pressuring AI firms to weaken safeguards, threatening contract cancellations for non-compliance (as seen with Anthropic).

* **Corporate Contradictions:** Major firms are caught between lucrative defense contracts (e.g., OpenAI's $200M DoD contract) and internal employee values.

### The Tension

This creates a multi-dimensional conflict:

* **National Security vs. AI Safety:** The drive for faster deployment clashes with the need for robust guardrails.

* **Corporate Interests vs. Workforce Values:** The pursuit of government revenue vs. the ethical red lines of the engineering talent building the systems.

## 2. Implications for Summit

As an "auditable, agentic intelligence layer for investigations," Summit is inherently defense-adjacent. Our core features—knowledge graphs, real-time ingestion, and multi-agent orchestration—are highly relevant to intelligence, defense, and law enforcement applications.

### A. Policy Risk & Product Identity

* **The "Governed AI" Wedge:** Summit's existing focus on ABAC/OPA policy enforcement, auditability, and exportable evidence is a massive competitive advantage. If the ecosystem splits into "defense-aligned" (unrestricted) and "civilian-aligned" (strict safeguards) models, Summit can position itself as the **Governed Intelligence Platform**—capable of operating securely in either environment but providing the indispensable audit layer that proves compliance with whichever policy is chosen.

* **Model Agnosticism:** The ability to swap underlying LLMs (e.g., Claude, Gemini, OpenAI) becomes a critical feature. If a client's policy restricts OpenAI due to its defense stance, Summit must seamlessly transition to Anthropic, and vice versa.

### B. Infrastructure and Telemetry Impact

* **Air-Gapped and Sovereign Deployments:** The push for unrestricted military use may drive defense clients toward fully sovereign, air-gapped deployments where they control the model weights. Summit's architecture (Docker, K8s) supports this, but our telemetry and licensing mechanisms must be capable of operating without phoning home to public infrastructure (like Render).

* **Granular Policy Enforcement:** Our OPA/Rego policies must be extensible enough to encode specific ethical red lines (e.g., "deny execution if target is a domestic civilian entity and intent is surveillance").

### C. Workforce and Community Trust

* **Open Source Optics:** As an open-source project, taking a definitive stance on acceptable use (e.g., via an ethical use license clause or a public policy statement) can attract talent alienated by the "unrestricted" defense push at major labs.

* **Internal Alignment:** If Summit pursues defense contracts, we must be prepared for the same internal friction seen at Google and OpenAI.

## 3. Scenario Mapping

### Scenario 1: The "Strict Divide" (Industry adopts rigid ethical lines)

* **What Happens:** AI firms adopt strict Acceptable Use Policies (AUPs) banning specific defense applications. The Pentagon turns to specialized, unrestricted defense contractors (e.g., Palantir, Anduril).

* **Summit's Play:** Lean heavily into our "Governance is the Product" narrative. We provide the auditable layer that allows enterprise and civilian-aligned government agencies (e.g., regulatory bodies, financial compliance) to use AI while proving they are not violating AUPs.

### Scenario 2: The "Defense Mandate" (Government forces compliance)

* **What Happens:** The U.S. government successfully leverages contract threats to force major AI providers to drop their ethical restrictions for defense use.

* **Summit's Play:** If we engage with defense clients, we must emphasize our Sovereign AI capabilities. We offer the platform, but the client brings their own unrestricted model. We remain neutral on the model itself but provide the orchestration and memory.

### Scenario 3: The "Nuanced Audit" (The middle path)

* **What Happens:** A compromise is reached where defense use is allowed but requires unprecedented levels of auditability, human-in-the-loop verification, and specific use-case whitelisting.

* **Summit's Play:** **This is our ideal scenario.** Summit's core architecture—Provenance Ledger, Policy Traces, and Auditable Memory—is exactly what is required to satisfy these new compliance demands.

## 4. Immediate Action Items

1. **Review Acceptable Use Policy (AUP):** Evaluate if our current open-source license and any hosted service AUP need an ethical use clause.
2. **Harden Model Swapping:** Ensure our `CompanyOS SDK` and agent architecture can seamlessly switch between model providers (OpenAI, Anthropic, local OSS models) without code changes, based on policy constraints.
3. **Enhance OPA Policies:** Develop proof-of-concept Rego policies that encode "intent-based" routing (e.g., flagging requests that look like mass surveillance).
4. **Evaluate Render Dependency:** Assess our current reliance on Render for hosting. If defense clients require sovereign deployments, we need to ensure our K8s/Docker compose setups are fully self-sufficient.
