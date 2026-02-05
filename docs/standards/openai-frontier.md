# OpenAI Frontier Reference Implementation

**ITEM Slug:** `openai-frontier`
**Source:** [Introducing OpenAI Frontier](https://openai.com/index/introducing-openai-frontier/) (Feb 5, 2026)

## Overview
Frontier is a reference architecture for enterprise agents ("AI Coworkers") characterized by:
*   Shared business context (Semantic Layer)
*   Durable execution environment (Files/Code/Tools)
*   Evaluation & Optimization loops
*   Identity & Permissions (Governance)

## Summit Implementation Mapping

| Frontier Concept | Summit Module |
| :--- | :--- |
| **Shared Context** | `summit.frontier.context` (Mock CRM/Ticketing adapters) |
| **Execution Env** | `summit.frontier.exec` (ToolRouter, Runtime) |
| **Memory** | `summit.frontier.memory` (Auditable MemoryStore with Redaction) |
| **Identity/Perms** | `summit.frontier.iam` (DenyByDefaultPolicy) |
| **Evaluation** | `summit.frontier.eval` (Harness & Scoring) |

## Import/Export Matrix

*   **Imports:** CRM/Ticketing data via Context Providers.
*   **Exports:**
    *   Evidence Artifacts (`SUMMIT-FRONTIER:*:*`)
    *   Policy Decisions (Audit Logs)
    *   Evaluation Scores (`metrics.json`)

## Non-Goals
*   Full UI Shell (Use existing Summit UI)
*   Vendor-specific Agent Marketplace
*   Model Hosting (Use external LLM APIs)
