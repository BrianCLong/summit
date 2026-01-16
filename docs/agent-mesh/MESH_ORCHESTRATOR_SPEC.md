# Mesh Orchestrator Specification

## Overview

The Mesh Orchestrator is a deterministic execution engine for the Autonomous Multi-Agent Mesh. It coordinates specialized agents (Security, Ops, Compliance, etc.) to perform complex tasks while enforcing strict policy gates, provenance tracking, and formal handoffs.

## Core Principles

1.  **Determinism**: Same inputs + same policy + same prompt version = same outputs.
2.  **No Fabricated Results**: All outputs must be traceable to actual execution evidence.
3.  **Policy Gating**: Agents cannot execute actions without passing policy checks.
4.  **Formal Handoffs**: Communication between agents occurs via content-addressed "handoff bundles".

## Architecture

### 1. Orchestrator
The central controller that:
- Reads a **Job Definition**.
- Resolves **Agent Contracts**.
- Sequences Agent execution (topological sort).
- Validates **Handoff Bundles**.
- Enforces global policies (e.g., blast radius).

### 2. Agents
Specialized domains (e.g., `security-agent`, `release-agent`) that:
- Accept structured inputs defined by their schema.
- Execute actions using registered Tools.
- Produce a **Handoff Bundle** containing outputs and evidence.

### 3. Prompt Registry
A versioned store for agent prompts ensuring reproducibility. Prompts are referenced by hash or immutable version tags.

## Data Models

### Orchestrator Job
A JSON document defining the sequence of agents to run.

```json
{
  "job_id": "uuid",
  "name": "Nightly Governance",
  "steps": [
    {
      "id": "sec-scan",
      "agent": "security-agent",
      "version": "1.0.0",
      "inputs": {
        "target": "deployment/k8s"
      }
    },
    {
      "id": "compliance-verify",
      "agent": "compliance-agent",
      "dependencies": ["sec-scan"],
      "inputs": {
        "report_ref": "${sec-scan.outputs.report_uri}"
      }
    }
  ]
}
```

### Agent Handoff Bundle
The artifact produced by an agent execution.

```json
{
  "schema_version": "1.0.0",
  "agent": "security-agent",
  "job_id": "uuid",
  "step_id": "sec-scan",
  "timestamp": "2023-10-27T10:00:00Z",
  "inputs_hash": "sha256:...",
  "prompt_ref": {
    "name": "security-audit",
    "version": "v1",
    "hash": "sha256:..."
  },
  "outputs": {
    "status": "pass",
    "report_uri": "artifacts/security/scan-123.json"
  },
  "evidence": [
    {
      "type": "log",
      "uri": "artifacts/logs/exec.log",
      "hash": "sha256:..."
    }
  ],
  "signature": "..."
}
```

## Workflow

1.  **Job Submission**: User/CI submits a Job Definition.
2.  **Plan Generation**: Orchestrator validates the job against schemas and creates an execution plan.
3.  **Execution Loop**:
    *   For each step in topological order:
        *   Resolve inputs (from job definition or upstream outputs).
        *   Fetch Agent Prompt from Registry.
        *   Invoke Agent with Inputs + Prompt.
        *   Agent executes tools and gathers evidence.
        *   Agent generates Handoff Bundle.
        *   Orchestrator validates Handoff Bundle schema.
        *   Orchestrator commits bundle to Artifact Store.
4.  **Completion**: Orchestrator generates a Run Report linking to all Handoff Bundles.
