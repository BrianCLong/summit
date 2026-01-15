# Summit Agent Specification v1

## Overview

The Summit Agent Specification v1 establishes a "governance-by-construction" model for all agents in the ecosystem. Unlike ad-hoc agent scripts, Summit Agents must declare their identity, capabilities, I/O contracts, and governance controls explicitly. This allows the platform to enforce security, provenace, and determinism constraints at runtime.

## Core Principles

1.  **Explicit Capabilities**: Agents cannot execute tools or access data that is not explicitly declared.
2.  **Verifiable Identity**: Every agent has a versioned identity and owner.
3.  **Determinism**: Agents declare their determinism mode, enabling replay and auditability.
4.  **Evidence-First**: Governance controls are mapped directly to agent definitions.

## Schema Reference

The authoritative schema is located at `schemas/agent_spec_v1.schema.json`.

### Fields

#### Identity
*   `name`: Unique URL-safe identifier (e.g., `provenance-notary`).
*   `version`: Semantic version (e.g., `1.0.0`).
*   `risk_tier`: `low`, `medium`, `high`, or `critical`. Determines the level of scrutiny and required approvals.

#### Interface
*   `inputs`: JSON Schema defining valid inputs.
*   `outputs`: JSON Schema defining valid outputs.
*   `determinism_mode`:
    *   `strict`: Same inputs + same state = exact same output bit-for-bit.
    *   `best_effort`: High probability of same semantic output.
    *   `none`: Nondeterministic (e.g., creative writing).

#### Capabilities
*   `tools`: List of tool names allowed (must exist in Tool Registry).
*   `data_classes`: Data sensitivity levels allowed (`public`, `internal`, `confidential`, `restricted`, `secret`).
*   `network`: Network access controls (`allowed_domains`).

#### Governance
*   `controls`: List of control IDs (e.g., `SOC2-CC6.1`, `GDPR-ART-15`) this agent satisfies or requires.
*   `provenance_enabled`: Whether to generate cryptographic receipts for runs (default: true).

#### Evaluation
*   `gates`: List of mandatory evaluation suites and passing thresholds required for promotion.

## Example

```yaml
identity:
  name: "provenance-notary"
  version: "1.0.0"
  description: "Signs every agent run with a cryptographic receipt."
  owner: "security-platform"
  risk_tier: "critical"

interface:
  inputs:
    type: "object"
    required: ["run_id", "metadata"]
  outputs:
    type: "object"
    required: ["receipt_hash", "signature"]
  determinism_mode: "strict"

capabilities:
  tools: ["crypto-sign", "hash-calc"]
  data_classes: ["internal", "confidential"]
  network:
    allowed_domains: []

governance:
  controls: ["SOC2-CC6.1", "NIST-SP-800-53-AU-10"]
  provenance_enabled: true

evaluation:
  gates:
    - suite: "signature-validity"
      threshold: 1.0
```
