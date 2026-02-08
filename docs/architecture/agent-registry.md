# Agent Registry Architecture

**Version:** 1.0
**Status:** GA-Ready
**Owner:** Release Captain (Jules)

## Overview
The Agent Registry is the authoritative source of truth for agent identities, capabilities, and governance within the vendor-agnostic Summit Control Plane. It moves beyond isolated agent definitions toward a governed "Agent Control Plane" that parity-competes with platforms like OpenAI Frontier while maintaining multi-model and multi-cloud independence.

## Core Components

### 1. Agent Manifest (`manifest.schema.json`)
Every agent in the ecosystem must conform to the canonical manifest schema. Key features include:
- **Vendor-Agnostic Runtime**: Decouples agent logic from specific providers while supporting provider-specific "knobs" (e.g., GPT-5.3-Codex effort levels).
- **Capability-Based Access**: Explicitly defines tools and capabilities with associated permissions and sandbox profiles.
- **Governance First**: Mandatory data classification, policy set references, and risk levels.
- **Evidence-Grade Observability**: Declarative artifact requirements for auditability and deterministic replay.

### 2. Registry Index (`registry/index.yaml`)
A versioned collection of agent definitions. The registry ensures that only certified agents are active in the system.

### 3. Validation Pipeline (`scripts/ci/validate_control_plane_agents.ts`)
A CI-enforced gate that verifies:
- Schema conformance.
- Integrity of instruction files (via SHA256 hashes).
- Compliance with the global tool allowlist.

## Governance Workflow

1.  **Definition**: Agent owners define their agent in a new YAML file under `control_plane/agents/registry/`.
2.  **Instruction Registration**: System prompts must be registered in the `prompts/` directory.
3.  **Validation**: CI runs the validation script to ensure the manifest is correct and secure.
4.  **Certification**: Successful validation and human review (via CODEOWNERS) lead to agent certification.

## Determinism Strategy
The Agent Registry enforces determinism by:
- Pinning instruction versions via content hashes.
- Requiring deterministic replay modes for high-risk agents.
- Isolating non-deterministic execution data to signed evidence artifacts (`stamp.json`).
