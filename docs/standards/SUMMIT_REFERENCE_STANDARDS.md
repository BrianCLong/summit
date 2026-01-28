# Summit Reference Standards

> **Status:** DRAFT STANDARD
> **Owner:** Jules (Chief Architect)
> **Last Updated:** 2025-05-15

## Overview

Summit defines the reference implementation for **Governed Agentic Systems**. To ensure interoperability and trust, we define the following open standards.

## 1. Universal Evidence Format (UEF)

**Purpose:** A standard schema for immutable, cryptographically-linked audit events.

**Schema Reference:** `ProvenanceEntryV2` (`server/src/provenance/types.ts`)

```json
{
  "id": "prov_12345",
  "sequenceNumber": "105",
  "previousHash": "sha256:...",
  "currentHash": "sha256:...",
  "timestamp": "ISO8601",
  "actionType": "DEPLOYMENT",
  "actor": {
    "id": "agent:codex",
    "type": "system"
  },
  "witness": {
    "witnessId": "witness_verifier_1",
    "signature": "..."
  },
  "metadata": {
    "riskScore": 15,
    "policyVersion": "1.2.0"
  }
}
```

**Compliance:**

* Must form a hash chain (`currentHash` depends on `previousHash`).
* Must include a detached signature from a registered authority.

## 2. Policy Exchange Schema (PES)

**Purpose:** A standard way to define and transport risk policies between tenants and agents.

**Schema Reference:** `PolicyContext` & `RiskRules` (`server/src/autonomous/policy-engine.ts`)

```json
{
  "profileId": "strict-compliance-v1",
  "guardrails": {
    "requirePurpose": true,
    "maxBudgetUsd": 50
  },
  "autonomyMatrix": {
    "read": 5,   // Full autonomy
    "write": 2,  // Assisted
    "deploy": 0  // Manual only
  }
}
```

## 3. Agent Task Protocol (ATP)

**Purpose:** A standard interface for delegating work to autonomous agents with safety guarantees.

**Schema Reference:** `Task` (`server/src/autonomous/orchestrator.enhanced.ts`)

**Key Requirements:**

1. **Idempotency Key:** Every task MUST have a deterministic key to prevent replay attacks or accidental double-execution.
2. **Safety Category:** Every task MUST declare its side-effect level (`READ`, `WRITE`, `DEPLOY`).
3. **Kill Switch Support:** Every agent runtime MUST subscribe to a standard `killswitch` signal.
