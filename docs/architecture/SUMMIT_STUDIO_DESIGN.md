# Summit Studio Design Spec

## Executive Summary
**Date:** 2026-03-01
**Context:** The AI industry's shift to Governed Autonomous Agents demands a first-class builder and copilot UX. Summit Studio provides a unified workspace for configuring, operating, and collaborating with Summit agents, skills, and workspaces without living in raw YAML or code-only flows.

### Strategic Decision: v1 Target Audience
**Question:** Should Summit Studio's v1 target internal operator/developer workflows, or go straight for a customer-facing builder that non-technical ops teams can use on day one?

**Answer:** We must target **Summit Studio v1 primarily at internal operator/developer workflows**.
*Why?* The Summit "Proof Moat" relies on deterministic execution, strictly governed policy gates, and auditable lineage. Exposing a true "no-code" builder to non-technical users right out of the gate is risky if the underlying policy enforcement and schema versioning are not yet fully battle-tested through dog-fooding. By focusing on a "code-first but UI-assisted" Git-backed approach for operators, we validate our governance primitives (ACP, AEGS, TMAML, ASF, MTWGL) and ensure configuration syncing works flawlessly via CI hooks. Once the operator views and observability dashboards are robust, abstracting them into a non-technical "no-code canvas" is significantly safer and easier, leading directly into the Success Criteria.

---

## 1. Agent & Skill Builder Surfaces

**Goal:** Enable users to define goals, tools, policies, environments, and evaluation configs for agents and skills.

*   **Visual & Prompt-Based Builders:** Modeled after leading agent builders (like Copilot Studio), these surfaces will allow users to construct "playbooks" combining skills and agent configurations.
*   **Dual-Mode UX:**
    *   *No-code Canvas:* For non-devs to visually connect skills and set natural language goals.
    *   *Code-First Editing:* For power users. Backed by strictly typed JSON/YAML schema files and synced via Git. Changes in the UI generate commits, and CI hooks validate them against governance contracts before deployment.

## 2. Workspace & Governance Console

**Goal:** Tenant and workspace administration on top of the Multi-Tenant Workspace Governance Layer (MTWGL).

*   **Tenant Admin Console:** Configure Agent Control Plane (ACP), Agent Execution Guardrail System (AEGS), Threat Modeling & Mitigation Layer (TMAML), and Agent Security Framework (ASF) per workspace.
    *   Set autonomy levels, allowed tools, data sources, and budget quotas.
*   **Access & Policy Management:** Manage RBAC, SSO mappings, approval flows, and policy packs. Complex Open Policy Agent (OPA) rules are summarized in human-readable terms.
*   **Guardrail Configuration:** Setup Human-In-The-Loop (HITL) gates, approval patterns, and "verify-before-act" flows, establishing Summit's "Governed Automation" narrative.

## 3. Operator & Observability Views

**Goal:** Real-time visibility into the execution substrate to fulfill the 6 core capabilities for scaling agent adoption.

*   **Real-time Operations Dashboards:** View active runs, queued plans, pending tool call approvals, token costs, and incident flags.
*   **Deep Drill-Down per Run:** Analyze the plan graph, step-by-step reasoning traces, payload inputs/outputs of tool calls, memory slices retrieved, evaluation scores, and skill usage. All views consume telemetry from our shared metrics schemas (`summit_` namespace, OpenTelemetry).

## 4. End-User Copilot UX

**Goal:** Deliver embedded, context-aware copilot panels that seamlessly integrate into existing workflows.

*   **Embedded Copilot Panels:** Drop-in UI components for Summit itself or customer apps.
*   **Controlled Execution Flow:**
    *   Intent capture → Agent selection → Plan preview (Dry Run) → Controlled execution with inline approvals.
*   **Context Awareness:** Studio-configured agents automatically pull relevant TMAML memory, tenant data, and policies. Users interact without needing to micromanage the context engineering or prompts.

## 5. Collaboration & Lifecycle

**Goal:** Enable safe experimentation and sharing of agentic capabilities.

*   **Versioned Configurations:** Git-style history with branches, previews, and safe rollbacks for agents, skills, policies, and workspaces.
*   **Shared Libraries & Templates:** A curated registry of playbooks, skills, and agent blueprints within Studio. Tenants can fork, adapt, and test templates securely within their isolated workspace environments.

## 6. Success Criteria

1.  **Time-to-Value (No-Code):** A non-developer user can create, test, and publish a governed agent for a real workflow in <60 minutes, with no direct code edits.
2.  **Operator Control:** Operators can see, explain, and if needed halt any agent workflow from Studio in <30 seconds.
3.  **Complete Observability:** All underlying subsystems (ACP, AEGS, TMAML, ASF, MTWGL) are fully configurable and observable via Studio, with no hidden "code-only" configuration requirements.
