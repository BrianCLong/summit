# Analyst Assistant and Automation Plan

This document outlines a consolidated plan for upcoming Intelgraph capabilities.
It summarizes MVP scope, dependencies, and open questions for the next sprint.

## 1. LLM Analyst Assistant

- **Goal:** context-aware chat assistant leveraging GPT/LLM models.
- **Context injection:** workspace metadata, last five alerts, and pinned entities.
- **Tasks:**
  - Connect to OpenAI/Azure/Open-source LLaMA via abstraction layer.
  - Implement prompt template system with streaming responses.
  - Expose UI chat widget with loading indicator.
- **Open Questions:**
  - Which model provider will be primary?
  - How will analyst credentials be scoped for model usage?

## 2. Report Summaries & Excerpts

- **Goal:** GPT-assisted executive summaries for existing report templates.
- **Tasks:**
  - Add "Summarize graph in three bullets" prompt button.
  - Allow citation of supporting entity IDs.
  - Provide preview/edit step before export.
- **Dependencies:** LLM Analyst Assistant service.

## 3. Adaptive Workflow Automation Engine

- **Goal:** rule-based triggers and actions for analyst workflows.
- **Tasks:**
  - JSON rule schema (conditions + actions).
  - Backend executor to evaluate rules and dispatch notifications or assignments.
  - UI for creating and managing rules.
- **Example Rule:**
  - `if entity.risk == 'HIGH' && source == 'SIGINT' -> auto-alert + assign Analyst X`.

## 4. STIX Export & Interoperability

- **Goal:** one-click export of entities/alerts/graphs as STIX 2.1 bundles.
- **Tasks:**
  - Map Intelgraph schema to STIX objects and relationships.
  - Include MITRE ATT&CK technique references.
  - Provide download endpoint and UI button.

## 5. Predictive Threat Modeling

- **Goal:** improve risk foresight via time-series or activity forecasts.
- **Tasks:**
  - Integrate recent signals into forecasting models.
  - Display graph node indicators such as "Expected Surge" or "Dormant Risk".
  - Track accuracy against test data (>80% target).

## 6. Knowledge Embedding Store

- **Goal:** vector memory for semantic recall and similarity search.
- **Tasks:**
  - Store documents, alerts, and notes as embeddings in Weaviate/Qdrant/FAISS.
  - Expose "What other events resemble this?" query through LLM agent.

## 7. Analyst Feedback Cycle

- **Goal:** incorporate SME feedback to refine LLM prompts, UI flow, and performance.
- **Tasks:**
  - Schedule sessions with 2–3 intelligence SMEs.
  - Capture feedback on assistant usefulness and search UX.
  - Produce iteration summary with prioritized change plan.

---

These items represent the initial scope for delivering an analyst-facing AI assistant with
automation, interoperability, and predictive insights. Further refinements will be captured
through continuous SME feedback and follow-on sprints.
