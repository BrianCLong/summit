# Agentic Orchestration Controls

**Owner:** Governance / Compliance
**Effective Date:** 2026-01-24
**Applies To:** All Autonomous Agents & Meta-Orchestrator

## Overview

This document defines the specific controls applied to agent orchestration to ensure safety, auditability, and regulatory compliance. These controls form the "Governance Moat" that differentiates Summit's engineering approach from ad-hoc agent deployments.

## Control Matrix

| Control ID | Control Name | Description | Framework Mapping |
| :--- | :--- | :--- | :--- |
| **AOC-01** | **Deterministic Replay** | The orchestration engine must support full replay of any execution session using the stored `AgentExecutionRecord`, reproducing the exact sequence of tool calls and decisions. | **NIST AI RMF:** MANAGE-2.3<br>**ISO 42001:** B.7.2 (Reliability)<br>**SOC-2:** CC7.4 (Restoration) |
| **AOC-02** | **Intent Scoping (Agent RBAC)** | Agents are denied access to any data or tools not explicitly granted in the `MemoryScopeManifest` for that specific run. Global "admin" agents are prohibited. | **SOC-2:** CC6.1 (Logical Access)<br>**NIST 800-53:** AC-6 (Least Privilege) |
| **AOC-03** | **Pre-Flight Policy Interception** | All `ToolCall` requests are intercepted by the `PolicyEngine` before execution. The engine evaluates the request against current policy and logs the `OrchestrationDecisionLog`. | **EU AI Act:** Art. 14 (Human Oversight)<br>**NIST AI RMF:** GOVERN-1.5 |
| **AOC-04** | **Evidence-First Action** | Agents cannot generate a final report or trigger a downstream action without citing a valid `EvidenceID` from the `ProvenanceLedger`. "Hallucinated" or ungrounded assertions result in a `POLICY_BLOCKED` status. | **NIST AI RMF:** MAP-2.4 (Verification)<br>**ISO 42001:** B.9.2 (Data Quality) |
| **AOC-05** | **Cost Attribution & Cap** | Every `HierarchicalPlanGraph` execution must have a defined budget (USD/Tokens). Execution is halted if the projected cost of the remaining nodes exceeds the budget. | **FinOps:** Resource Optimization<br>**SOC-2:** CC5.2 (Resource Usage) |

## Implementation Guidelines

### For Engineering
*   **Do not** hardcode agent permissions. Use the `MemoryScopeManifest`.
*   **Do not** bypass the `PolicyEngine` for "internal" tools. All side-effects are governed.
*   **Ensure** all agent inputs and outputs are hashed and stored in the `AgentExecutionRecord`.

### For Compliance
*   **Audit frequency:** Automated daily checks via `scripts/ci/verify_governance_logs.ts` (future).
*   **Exception handling:** Any deviation from these controls requires a signed waiver in `governance/security_exceptions.yaml`.
