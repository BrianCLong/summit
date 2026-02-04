# OSINT Agent Registry

This registry defines the specialized agents available within the Summit Intelligence Foundry for OSINT and analytic workflows. All agents are governed by OPA policies and produce deterministic evidence bundles.

## 1. Agent Swarm Overview

| Agent ID | Role | Key Capabilities | Risk Level | Governance Policy |
| :--- | :--- | :--- | :--- | :--- |
| `osint-collector` | Collection & Ingestion | Social, Dark Web, Media ingestion. Evidence capture. | **High** | `collection.rego` |
| `osint-enricher` | Resolution & Fusion | Entity resolution, IntelGraph mutation. | **Medium** | `enrichment.rego` |
| `osint-reasoner` | Reasoning & Hypothesis | GraphRAG, Path-finding, Trend analysis. | **Medium** | `reasoning.rego` |
| `osint-risk-monitor` | Risk & Early-Warning | Event detection, Multilingual monitoring. | **Medium** | `monitoring.rego` |
| `osint-copilot` | Analyst Copilot | Guided investigation, Case management. | **Low** | `analyst_assist.rego` |

## 2. Shared Governance Directives

All OSINT agents must adhere to the following core directives:

1. **No-Provenance Veto**: Reject any data input that lacks a valid `source_id` or `Evidence-ID`.
2. **Uncertainty Preservation**: Conflicts in data must be explicitly reported as contradictions rather than being silently resolved.
3. **Deterministic Trace**: All tool calls and reasoning steps must be recorded in the `execution_graph.json`.
4. **Policy Pre-flight**: All tool invocations are mediated by the Policy Gateway (OPA).

## 3. Deployment & Lifecycle

Agents are deployed as immutable manifests. Any update to instructions (prompts) or tool access requires a version increment and re-certification.

- **Manifest Root**: `agents/osint/`
- **Instructions**: `agents/osint/instructions/`
- **Registry Source**: `agents/registry.yaml` (Synchronized via CI)

---
**Status:** ACTIVE
**Last Reviewed:** 2026-01-27
**Owner:** @intelgraph/osint-team
